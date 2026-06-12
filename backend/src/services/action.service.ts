import prisma from "../lib/prisma.js";
import { archetypeTriggerService } from "./archetype/archetype-trigger.service.js";
import { recordSpellbookEntry } from "./spellbook.service.js";
import { addExperience } from "./character.service.js";

// ── KONFIGURACJA AKCJI ───────────────────────────────
const STUDY_CONFIG = [
  { level: 1, durationSeconds: 5,  minPoints: 1,  maxPoints: 4,  spellChance: 0.95, requiredTowerLevel: 1  },
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
  include: {
    spells: true,
    tower: { include: { buildings: true } },
  },
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

// Sprawdź czy nie ma już aktywnej akcji JAKIEGOKOLWIEK typu
const activeAction = await prisma.characterAction.findFirst({
  where: {
    characterId: character.id,
    status: "in_progress",
  },
});

if (activeAction) {
  const typeLabel = activeAction.actionType === "study" ? "studiów" : "eksploracji";
  throw new Error(`Masz już aktywną akcję ${typeLabel}. Poczekaj na jej zakończenie.`);
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
    include: {
      spells: true,
      tower: { include: { buildings: true } },
    },
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
  const xpEarned = randomInt(config.minPoints, config.maxPoints);

  let discoveredSpellName: string | null = null;
  let spellDestination: string = "none";
  let overflowSpellName: string | null = null;

  if (randomChance(config.spellChance)) {
    const knownSpellIds = character.spells.map(cs => cs.spellId);

    const availableSpells = await prisma.spell.findMany({
      where: {
        id: knownSpellIds.length > 0 ? { notIn: knownSpellIds } : undefined,
      },
    });

    if (availableSpells.length > 0) {
      const chosen = availableSpells[randomInt(0, availableSpells.length - 1)];
      const knownCount = character.spells.length;

      if (knownCount < character.maxSpells) {
        await prisma.characterSpell.create({
          data: { characterId: character.id, spellId: chosen.id },
        });
        discoveredSpellName = chosen.name;
        spellDestination = "library";
      } else {
        await prisma.chaosVaultItem.create({
          data: { characterId: character.id, spellId: chosen.id },
        });
        discoveredSpellName = chosen.name;
        spellDestination = "chaos_vault";
      }
      if (discoveredSpellName && chosen) {
        await recordSpellbookEntry(character.id, chosen.id, "study");
      }
    }
  }

  // Zapis akcji jako odebranej — bez aktualizacji skillPoints, to teraz robi addExperience
  await prisma.characterAction.update({
    where: { id: action.id },
    data: {
      status: "claimed",
      skillPointsEarned: xpEarned,
      spellDiscovered: discoveredSpellName,
      report: "{}", // dopiszemy report niżej, po przeliczeniu poziomu
    },
  });

  const levelResult = await addExperience(character.id, xpEarned);

  const report = {
    experienceEarned: xpEarned,
    discoveredSpell: discoveredSpellName,
    spellDestination,
    overflowSpellName,
    levelUp: levelResult.levelsGained > 0
      ? { newLevel: levelResult.level, skillPointsGained: levelResult.skillPointsGained }
      : null,
    message: spellDestination === "library"
      ? `Zdobyłeś ${xpEarned} pkt doświadczenia i odkryłeś czar: ${discoveredSpellName}!`
      : spellDestination === "chaos_vault"
      ? `Zdobyłeś ${xpEarned} pkt doświadczenia i odkryłeś czar: ${discoveredSpellName}! Niestety, wszystkie regały w Twojej bibliotece są już zajęte, więc postanowiłeś wrzucić pergamin do Komnaty Nieładu. Rozbuduj bibliotekę, aby uzyskać do niego dostęp!`
      : `Zdobyłeś ${xpEarned} pkt doświadczenia.`,
  };

  await prisma.characterAction.update({
    where: { id: action.id },
    data: { report: JSON.stringify(report) },
  });

  const studyLevelsDone = await prisma.characterAction.groupBy({
    by: ["actionLevel"],
    where: {
      characterId: character.id,
      actionType: "study",
      status: "claimed",
    },
  });

  const allLevelsDone = studyLevelsDone.length >= 5;

  await archetypeTriggerService.checkTrigger(
    character.id,
    "CRAZY_STUDIES_ALL",
    { allStudiesDone: allLevelsDone }
  );

  return {
    ...report,
    level: levelResult.level,
    experience: levelResult.experience,
    xpToNextLevel: levelResult.xpToNextLevel,
  };
}
// ── STATUS AKTYWNYCH AKCJI ───────────────────────────
export async function getActiveActions(userId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  const { newActions: newStudyActions, newLastRegen: newStudyRegen } = calculateRegenActions(
    character.studyActions,
    character.lastStudyRegen,
    STUDY_ACTION_MAX,
    STUDY_REGEN_SECONDS
  );

  const EXPLORATION_MAX = 15;
  const EXPLORATION_REGEN_SECONDS = 60 * 60;

  const { newActions: newExplorationActions, newLastRegen: newExploreRegen } = calculateRegenActions(
    character.explorationActions,
    character.lastExploreRegen,
    EXPLORATION_MAX,
    EXPLORATION_REGEN_SECONDS
  );

  // Zapisz zaktualizowane akcje do bazy jeśli się zmieniły
  if (
    newStudyActions !== character.studyActions ||
    newExplorationActions !== character.explorationActions
  ) {
    await prisma.character.update({
      where: { id: character.id },
      data: {
        studyActions: newStudyActions,
        lastStudyRegen: newStudyRegen,
        explorationActions: newExplorationActions,
        lastExploreRegen: newExploreRegen,
      },
    });
  }

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
    studyActionsAvailable: newStudyActions,
    studyActionsMax: STUDY_ACTION_MAX,
    explorationActionsAvailable: newExplorationActions,
    explorationActionsMax: EXPLORATION_MAX,
    activeActions,
  };
}