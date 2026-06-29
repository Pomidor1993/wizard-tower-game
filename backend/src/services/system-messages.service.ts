// ═══════════════════════════════════════════════════════════════════
// SYSTEM MESSAGES SERVICE
// src/services/messages/system-messages.service.ts
//
// Obsługuje 3 z 4 typów wiadomości w zakładce "Wiadomości":
//   A — "random"   — losowe komunikaty klimatyczne (raz dziennie, 5-10% szans)
//   C — "levelup"  — powiadomienie o awansie na nowy poziom
//   D — "tutorial" — wiadomości triggerowane eventami tutorialowymi
//
// Wiadomości prywatne (B) obsługuje osobny serwis: private-messages.service.ts
// ═══════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";
import { RANDOM_MESSAGES, getRandomMessageByKey } from "../data/random-messages.js";

const RETENTION_DAYS = 30;
const DAILY_ROLL_CHANCE = 0.08; // 8% — środek widełek 5-10% ustalonych w specyfikacji

export type SystemMessageType = "random" | "levelup" | "tutorial" | "school" | "rift";

// ── LAZY CLEANUP ──────────────────────────────────────────────────
// Usuwa niezapisane wiadomości systemowe starsze niż 30 dni dla danej postaci.
// Wywoływane przy każdym GET /messages — proste, bez dodatkowej infrastruktury.
// Celowo NIE dotyka wiadomości prywatnych (te nie mają limitu czasowego).
async function cleanupOldMessages(characterId: number): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  await prisma.systemMessage.deleteMany({
    where: {
      characterId,
      isSaved: false,
      createdAt: { lt: cutoff },
    },
  });
}

// ── A: LOSOWANIE CODZIENNEGO KOMUNIKATU ───────────────────────────
// Wywoływane raz dziennie po zalogowaniu (np. z poziomu auth/character controllera).
// Zwraca nowo utworzoną wiadomość, jeśli los się powiódł, w przeciwnym razie null.
// Bezpieczne przy wielokrotnym wywołaniu tego samego dnia — drugi raz nic nie zrobi.
export async function rollDailyRandomMessage(characterId: number): Promise<{ rolled: boolean; message?: { id: number; content: string } }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingRoll = await prisma.dailyMessageRoll.findUnique({
    where: { characterId },
  });

  if (existingRoll) {
    const lastRoll = new Date(existingRoll.lastRollDate);
    lastRoll.setHours(0, 0, 0, 0);
    if (lastRoll.getTime() === today.getTime()) {
      // Już losowaliśmy dzisiaj — nic nie rób.
      return { rolled: false };
    }
  }

  // Zapisz / zaktualizuj znacznik PRZED próbą losowania, żeby uniknąć
  // podwójnego losowania przy równoległych requestach.
  await prisma.dailyMessageRoll.upsert({
    where: { characterId },
    create: { characterId, lastRollDate: today },
    update: { lastRollDate: today },
  });

  const won = Math.random() < DAILY_ROLL_CHANCE;
  if (!won) {
    return { rolled: false };
  }

  // Wybierz spośród jeszcze nieobejrzanych komunikatów.
  const seen = await prisma.seenRandomMessage.findMany({
    where: { characterId },
    select: { sourceKey: true },
  });
  const seenKeys = new Set(seen.map(s => s.sourceKey));
  const available = RANDOM_MESSAGES.filter(m => !seenKeys.has(m.key));

  if (available.length === 0) {
    // Gracz obejrzał już wszystkie — pula wyczerpana, nic nie wysyłamy.
    return { rolled: false };
  }

  const picked = available[Math.floor(Math.random() * available.length)]!;

  const [message] = await prisma.$transaction([
    prisma.systemMessage.create({
      data: {
        characterId,
        type: "random",
        title: picked.title ?? null,
        content: picked.content,
        sourceKey: picked.key,
      },
    }),
    prisma.seenRandomMessage.create({
      data: { characterId, sourceKey: picked.key },
    }),
  ]);

  return { rolled: true, message: { id: message.id, content: message.content } };
}

// ── C: POWIADOMIENIE O AWANSIE NA POZIOM ──────────────────────────
// Wywoływane z character.service.ts -> addExperience(), gdy levelsGained > 0.
export async function createLevelUpMessage(
  characterId: number,
  newLevel: number,
  skillPointsGained: number
): Promise<void> {
  await prisma.systemMessage.create({
    data: {
      characterId,
      type: "levelup",
      title: "Nowy poziom!",
      content: `Twoja magia się rozwija! Awansujesz na ${newLevel} poziom i otrzymujesz ${skillPointsGained} punktów rozwoju postaci.`,
    },
  });
}

// ── D: WIADOMOŚĆ TUTORIALOWA ──────────────────────────────────────
// Wywoływane z tutorial.service.ts / home-repair.service.ts przy konkretnych eventach.
export async function createTutorialMessage(
  characterId: number,
  content: string,
  title?: string
): Promise<void> {
  await prisma.systemMessage.create({
    data: {
      characterId,
      type: "tutorial",
      title: title ?? "Wskazówka",
      content,
    },
  });
}

// ── E: WIADOMOŚĆ O SZCZELINIE ─────────────────────────────────────
// Wywoływane z rift.service.ts gdy niestabilna szczelina się otworzy.
export async function createSystemMessage(
  characterId: number,
  data: { type: SystemMessageType; title?: string; content: string }
): Promise<void> {
  await prisma.systemMessage.create({
    data: {
      characterId,
      type: data.type,
      title: data.title ?? null,
      content: data.content,
    },
  });
}

// ── POBIERANIE LISTY WIADOMOŚCI (z filtrowaniem) ──────────────────
export interface GetSystemMessagesOptions {
  type?: SystemMessageType;
  savedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function getSystemMessages(characterId: number, options: GetSystemMessagesOptions = {}) {
  await cleanupOldMessages(characterId);

  const page = options.page && options.page > 0 ? Math.floor(options.page) : 1;
  const pageSize = options.pageSize
    ? Math.min(options.pageSize, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

const where = {
    characterId,
    ...(options.type ? { type: options.type } : {}),
    ...(options.savedOnly ? { isSaved: true } : { isSaved: false }),
  };

  const [totalEntries, messages, unreadCount] = await Promise.all([
    prisma.systemMessage.count({ where }),
    prisma.systemMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.systemMessage.count({ where: { characterId, isRead: false } }),
  ]);

  return {
    page,
    pageSize,
    totalEntries,
    totalPages: Math.max(1, Math.ceil(totalEntries / pageSize)),
    unreadCount,
    messages,
  };
}

// ── OZNACZ JAKO PRZECZYTANE ────────────────────────────────────────
export async function markSystemMessageRead(characterId: number, messageId: number) {
  const message = await prisma.systemMessage.findUnique({ where: { id: messageId } });
  if (!message || message.characterId !== characterId) {
    throw new Error("Wiadomość nie znaleziona");
  }

  return prisma.systemMessage.update({
    where: { id: messageId },
    data: { isRead: true },
  });
}

export async function markAllSystemMessagesRead(characterId: number) {
  await prisma.systemMessage.updateMany({
    where: { characterId, isRead: false },
    data: { isRead: true },
  });
}

// ── ZAPISZ / ODEPNIJ ZAPIS WIADOMOŚCI ──────────────────────────────
// Zapisana wiadomość nie podlega usunięciu po 30 dniach (patrz cleanupOldMessages).
export async function setSystemMessageSaved(characterId: number, messageId: number, isSaved: boolean) {
  const message = await prisma.systemMessage.findUnique({ where: { id: messageId } });
  if (!message || message.characterId !== characterId) {
    throw new Error("Wiadomość nie znaleziona");
  }

  return prisma.systemMessage.update({
    where: { id: messageId },
    data: { isSaved },
  });
}

export async function markSystemMessageUnread(characterId: number, messageId: number) {
  const message = await prisma.systemMessage.findUnique({ where: { id: messageId } });
  if (!message || message.characterId !== characterId) {
    throw new Error("Wiadomość nie znaleziona");
  }
  return prisma.systemMessage.update({
    where: { id: messageId },
    data: { isRead: false },
  });
}

// ── USUŃ WIADOMOŚĆ RĘCZNIE ─────────────────────────────────────────
export async function deleteSystemMessage(characterId: number, messageId: number) {
  const message = await prisma.systemMessage.findUnique({ where: { id: messageId } });
  if (!message || message.characterId !== characterId) {
    throw new Error("Wiadomość nie znaleziona");
  }

  await prisma.systemMessage.delete({ where: { id: messageId } });
}