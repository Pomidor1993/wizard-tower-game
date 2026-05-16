import prisma from "../lib/prisma.js";

// ── KONFIGURACJA AKCJI ───────────────────────────────
const STUDY_CONFIG = [
  { level: 1, durationSeconds: 5,  minPoints: 1,  maxPoints: 4,  spellChance: 0.20, requiredTowerLevel: 1  },
  { level: 2, durationSeconds: 120, minPoints: 5,  maxPoints: 10, spellChance: 0.30, requiredTowerLevel: 3  },
  { level: 3, durationSeconds: 180, minPoints: 11, maxPoints: 22, spellChance: 0.40, requiredTowerLevel: 6  },
  { level: 4, durationSeconds: 240, minPoints: 23, maxPoints: 50, spellChance: 0.40, requiredTowerLevel: 10 },
  { level: 5, durationSeconds: 300, minPoints: 51, maxPoints: 100,spellChance: 0.50, requiredTowerLevel: 15 },
];

const STUDY_ACTION_MAX = 30;
const STUDY_REGEN_SECONDS = 30 * 60; // 30 minut

// ── HELPERS ──────────────────────────────────────────
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChance(chance: number): boolean {
  return Math.random() < chance;
}

// ── REGENERACJA AKCJI ────────────────────────────────
// Oblicza ile akcji powinno się odnowić od ostatniej regeneracji
export function calculateRegenActions(
  currentActions: number,
  lastRegen: Date,
  maxActions: number,
  regenSeconds: number
): { newActions: number; newLastRegen: Date } {
  const now = new Date();
  const secondsElapsed = (now.getTime() - lastRegen.getTime()) / 1000;
  const actionsToAdd = Math.floor(secondsElapsed / regenSeconds);

  if (actionsToAdd === 0) {
    return { newActions: currentActions, newLastRegen: lastRegen };
  }

  const newActions = Math.min(currentActions + actionsToAdd, maxActions);
  const newLastRegen = new Date(
    lastRegen.getTime() + actionsToAdd * regenSeconds * 1000
  );

  return { newActions, newLastRegen };
}

// ── ROZPOCZĘCIE AKCJI STUDIÓW ────────────────────────
export async function startStudyAction(userId: number, level: number) {
  const config = STUDY_CONFIG[level - 1];
  if (!config) throw new Error("Nieprawidłowy poziom akcji");

  const character = await prisma.character.findUnique({
    where: { userId },
    include: { tower: true },
  });

  if (!character) throw new Error("Postać nie znaleziona");
  if (!character.tower) throw new Error("Brak wieży");

  // Sprawdź poziom wieży
  if (character.tower.level < config.requiredTowerLevel) {
    throw new Error(
      `Wymagany poziom wieży: ${config.requiredTowerLevel} (masz: ${character.tower.level})`
    );
  }

  // Przelicz regenerację akcji
  const { newActions, newLastRegen } = calculateRegenActions(
    character.studyActions,
    character.lastStudyRegen,
    STUDY_ACTION_MAX,
    STUDY_REGEN_SECONDS
  );

  if (newActions <= 0) {
    throw new Error("Brak dostępnych akcji. Poczekaj na odnowienie.");
  }

  // Sprawdź czy nie ma już aktywnej akcji tego samego typu
  const activeAction = await prisma.characterAction.findFirst({
    where: { characterId: character.id, actionType: "study", status: "in_progress" },
  });

  if (activeAction) {
    throw new Error("Masz już aktywną akcję studiów");
  }

  const finishesAt = new Date(Date.now() + config.durationSeconds * 1000);

  // Zapisz akcję i pobierz akcję z puli
  const [action] = await prisma.$transaction([
    prisma.characterAction.create({
      data: {
        characterId: character.id,
        actionType: "study",
        actionLevel: level,
        status: "in_progress",
        finishesAt,
      },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        studyActions: newActions - 1,
        lastStudyRegen: newLastRegen,
      },
    }),
  ]);

  return {
    actionId: action.id,
    level,
    finishesAt,
    actionsRemaining: newActions - 1,
  };
}

// ── ZAKOŃCZENIE AKCJI STUDIÓW ────────────────────────
export async function claimStudyAction(userId: number, actionId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { spells: true },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  const action = await prisma.characterAction.findFirst({
    where: { id: actionId, characterId: character.id },
  });

  if (!action) throw new Error("Akcja nie znaleziona");
  if (action.status === "claimed") throw new Error("Akcja już odebrana");
  if (action.status === "in_progress" && new Date() < action.finishesAt) {
    throw new Error("Akcja jeszcze nie zakończona");
  }

  const config = STUDY_CONFIG[action.actionLevel - 1];
  const skillPointsEarned = randomInt(config.minPoints, config.maxPoints);

  // Losuj czar z bazy — wyklucz te które gracz już zna
  let discoveredSpellName: string | null = null;

  if (randomChance(config.spellChance)) {
    const knownSpellIds = character.spells.map(cs => cs.spellId);

    const availableSpells = await prisma.spell.findMany({
      where: {
        id: knownSpellIds.length > 0
          ? { notIn: knownSpellIds }
          : undefined,
      },
    });

    if (availableSpells.length > 0) {
      const chosen = availableSpells[randomInt(0, availableSpells.length - 1)];

      // Dodaj czar do kolekcji gracza
      await prisma.characterSpell.create({
        data: {
          characterId: character.id,
          spellId: chosen.id,
        },
      });

      discoveredSpellName = chosen.name;
    } else {
      // Gracz zna już wszystkie czary
      discoveredSpellName = null;
    }
  }

  const report = {
    skillPointsEarned,
    discoveredSpell: discoveredSpellName,
    message: discoveredSpellName
      ? `Zdobyłeś ${skillPointsEarned} pkt umiejętności i odkryłeś czar: ${discoveredSpellName}!`
      : `Zdobyłeś ${skillPointsEarned} pkt umiejętności.`,
  };

  await prisma.$transaction([
    prisma.characterAction.update({
      where: { id: action.id },
      data: {
        status: "claimed",
        skillPointsEarned,
        spellDiscovered: discoveredSpellName,
        report: JSON.stringify(report),
      },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: { skillPoints: { increment: skillPointsEarned } },
    }),
  ]);

  return report;
}

// ── STATUS AKTYWNYCH AKCJI ───────────────────────────
export async function getActiveActions(userId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  const { newActions } = calculateRegenActions(
    character.studyActions,
    character.lastStudyRegen,
    STUDY_ACTION_MAX,
    STUDY_REGEN_SECONDS
  );

  // Auto-aktualizuj status zakończonych akcji
  await prisma.characterAction.updateMany({
    where: {
      characterId: character.id,
      status: "in_progress",
      finishesAt: { lte: new Date() },
    },
    data: { status: "completed" },
  });

  const activeActions = await prisma.characterAction.findMany({
    where: {
      characterId: character.id,
      status: { in: ["in_progress", "completed"] },
    },
    orderBy: { startedAt: "desc" },
  });

  return {
    studyActionsAvailable: newActions,
    studyActionsMax: STUDY_ACTION_MAX,
    activeActions,
  };
}