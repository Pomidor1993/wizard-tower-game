// ═══════════════════════════════════════════════════════════════════
// PRIVATE MESSAGES SERVICE
// src/services/messages/private-messages.service.ts
//
// Obsługuje wiadomości prywatne (B) — model wątków 1-na-1 ("jak Messenger").
// Plus: blokowanie graczy oraz cooldown anty-spam per para nadawca→odbiorca.
//
// Wiadomości prywatne NIE podlegają automatycznemu usuwaniu po 30 dniach
// (w przeciwieństwie do wiadomości systemowych) — zostają do ręcznego usunięcia.
// ═══════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";

const MAX_MESSAGE_LENGTH = 1000;
const COOLDOWN_SECONDS = 120; // 2 minuty, per para graczy

// ── HELPER: znormalizowana para uczestników ───────────────────────
// Conversation.participantAId zawsze < participantBId, niezależnie od
// tego, kto pisał pierwszy — dzięki temu wątek A↔B jest zawsze ten sam.
function normalizePair(idOne: number, idTwo: number): { a: number; b: number } {
  return idOne < idTwo ? { a: idOne, b: idTwo } : { a: idTwo, b: idOne };
}

// ── BLOKOWANIE ──────────────────────────────────────────────────────
export async function blockPlayer(blockerId: number, blockedId: number) {
  if (blockerId === blockedId) {
    throw new Error("Nie możesz zablokować samego siebie");
  }

  const targetExists = await prisma.character.findUnique({ where: { id: blockedId } });
  if (!targetExists) throw new Error("Gracz nie znaleziony");

  await prisma.blockedPlayer.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    create: { blockerId, blockedId },
    update: {},
  });

  return { blocked: true };
}

export async function unblockPlayer(blockerId: number, blockedId: number) {
  await prisma.blockedPlayer.deleteMany({
    where: { blockerId, blockedId },
  });
  return { blocked: false };
}

export async function getBlockedPlayers(blockerId: number) {
  const rows = await prisma.blockedPlayer.findMany({
    where: { blockerId },
    include: { blocked: { select: { id: true, name: true, level: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(r => ({ characterId: r.blocked.id, name: r.blocked.name, level: r.blocked.level, blockedAt: r.createdAt }));
}

async function isBlocked(senderId: number, receiverId: number): Promise<boolean> {
  // Sprawdzamy w obie strony: odbiorca zablokował nadawcę, ALBO nadawca
  // wcześniej zablokował odbiorcę (sam sobie też nie powinien wtedy pisać).
  const block = await prisma.blockedPlayer.findFirst({
    where: {
      OR: [
        { blockerId: receiverId, blockedId: senderId },
        { blockerId: senderId, blockedId: receiverId },
      ],
    },
  });
  return block !== null;
}

// ── COOLDOWN ANTY-SPAM (per para nadawca→odbiorca) ─────────────────
async function checkAndUpdateCooldown(senderId: number, receiverId: number): Promise<void> {
  const existing = await prisma.messageCooldown.findUnique({
    where: { senderId_receiverId: { senderId, receiverId } },
  });

  if (existing) {
    const elapsedMs = Date.now() - existing.lastSentAt.getTime();
    const remainingMs = COOLDOWN_SECONDS * 1000 - elapsedMs;
    if (remainingMs > 0) {
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      throw new Error(`Musisz poczekać ${remainingSeconds}s przed wysłaniem kolejnej wiadomości do tego gracza`);
    }
  }

  await prisma.messageCooldown.upsert({
    where: { senderId_receiverId: { senderId, receiverId } },
    create: { senderId, receiverId },
    update: { lastSentAt: new Date() },
  });
}

// ── WYSYŁANIE WIADOMOŚCI ───────────────────────────────────────────
export async function sendPrivateMessage(senderId: number, receiverId: number, content: string) {
  if (senderId === receiverId) {
    throw new Error("Nie możesz wysłać wiadomości do samego siebie");
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new Error("Wiadomość nie może być pusta");
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Wiadomość jest zbyt długa (maks. ${MAX_MESSAGE_LENGTH} znaków)`);
  }

  const receiver = await prisma.character.findUnique({ where: { id: receiverId } });
  if (!receiver) throw new Error("Odbiorca nie znaleziony");

  if (await isBlocked(senderId, receiverId)) {
    throw new Error("Nie możesz wysłać wiadomości do tego gracza");
  }

  // Cooldown sprawdzamy i aktualizujemy PRZED zapisem wiadomości —
  // jeśli rzuci błąd, żadna wiadomość się nie zapisze.
  await checkAndUpdateCooldown(senderId, receiverId);

  const { a, b } = normalizePair(senderId, receiverId);

  const conversation = await prisma.conversation.upsert({
    where: { participantAId_participantBId: { participantAId: a, participantBId: b } },
    create: { participantAId: a, participantBId: b },
    update: { lastMessageAt: new Date() },
  });

  const message = await prisma.privateMessage.create({
    data: {
      conversationId: conversation.id,
      senderId,
      content: trimmed,
    },
  });

  return message;
}

// ── LISTA WĄTKÓW (skrzynka odbiorcza) ──────────────────────────────
export async function getConversations(characterId: number) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ participantAId: characterId }, { participantBId: characterId }] },
    orderBy: { lastMessageAt: "desc" },
    include: {
      participantA: { select: { id: true, name: true, level: true } },
      participantB: { select: { id: true, name: true, level: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return Promise.all(
    conversations.map(async (c) => {
      const otherParticipant = c.participantAId === characterId ? c.participantB : c.participantA;
      const unreadCount = await prisma.privateMessage.count({
        where: { conversationId: c.id, senderId: { not: characterId }, isRead: false },
      });

      return {
        conversationId: c.id,
        otherCharacter: otherParticipant,
        lastMessage: c.messages[0] ?? null,
        lastMessageAt: c.lastMessageAt,
        unreadCount,
      };
    })
  );
}

// ── WIADOMOŚCI W KONKRETNYM WĄTKU ──────────────────────────────────
export async function getConversationMessages(
  characterId: number,
  otherCharacterId: number,
  page = 1,
  pageSize = 50
) {
  const { a, b } = normalizePair(characterId, otherCharacterId);

  const conversation = await prisma.conversation.findUnique({
    where: { participantAId_participantBId: { participantAId: a, participantBId: b } },
  });

  if (!conversation) {
    // Brak historii — nie traktujemy tego jako błąd, po prostu pusty wątek.
    return { conversationId: null, messages: [], totalEntries: 0, page, pageSize, totalPages: 1 };
  }

  const clampedPageSize = Math.min(pageSize, 100);
  const totalEntries = await prisma.privateMessage.count({ where: { conversationId: conversation.id } });

  const messages = await prisma.privateMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * clampedPageSize,
    take: clampedPageSize,
  });

  // Oznacz jako przeczytane wiadomości, które otrzymał pytający gracz.
  await prisma.privateMessage.updateMany({
    where: { conversationId: conversation.id, senderId: { not: characterId }, isRead: false },
    data: { isRead: true },
  });

  return {
    conversationId: conversation.id,
    messages: messages.reverse(), // chronologicznie rosnąco do wyświetlenia
    totalEntries,
    page,
    pageSize: clampedPageSize,
    totalPages: Math.max(1, Math.ceil(totalEntries / clampedPageSize)),
  };
}

// ── ZAPISZ / ODEPNIJ ZAPIS WIADOMOŚCI (osobno per strona) ──────────
export async function setPrivateMessageSaved(characterId: number, messageId: number, isSaved: boolean) {
  const message = await prisma.privateMessage.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });
  if (!message) throw new Error("Wiadomość nie znaleziona");

  const isSender = message.senderId === characterId;
  const isReceiver =
    message.conversation.participantAId === characterId || message.conversation.participantBId === characterId;
  if (!isSender && !isReceiver) throw new Error("Brak dostępu do tej wiadomości");

  const data = isSender ? { isSavedBySender: isSaved } : { isSavedByReceiver: isSaved };

  return prisma.privateMessage.update({ where: { id: messageId }, data });
}

// ── USUWANIE WĄTKU (tylko dla siebie — proste podejście: usuwa cały wątek) ─
export async function deleteConversation(characterId: number, otherCharacterId: number) {
  const { a, b } = normalizePair(characterId, otherCharacterId);
  const conversation = await prisma.conversation.findUnique({
    where: { participantAId_participantBId: { participantAId: a, participantBId: b } },
  });
  if (!conversation) return;

  await prisma.privateMessage.deleteMany({ where: { conversationId: conversation.id } });
  await prisma.conversation.delete({ where: { id: conversation.id } });
}

// ── ŁĄCZNA LICZBA NIEPRZECZYTANYCH (np. do badge'a w UI) ───────────
export async function getUnreadPrivateMessageCount(characterId: number): Promise<number> {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ participantAId: characterId }, { participantBId: characterId }] },
    select: { id: true },
  });

  if (conversations.length === 0) return 0;

  return prisma.privateMessage.count({
    where: {
      conversationId: { in: conversations.map(c => c.id) },
      senderId: { not: characterId },
      isRead: false,
    },
  });
}