import prisma from "../lib/prisma.js";
import { recordSpellbookEntry } from "./spellbook.service.js";
import { addExperience } from "./character.service.js";
import { getOrCreateTutorial, advanceTutorialStep } from "./tutorial/tutorial.service.js";
import { TUTORIAL_STEPS, TUTORIAL_MESSAGES } from "./tutorial/tutorial.constants.js";
import { getCharacterSchoolBonuses } from "./magic-school.service.js";
import { tryTriggerUnstableRift } from "./rift.service.js";
import {
  STUDY_START_MESSAGES,
  STUDY_FAIL_MESSAGES,
  STUDY_SUCCESS_MESSAGES,
} from "../data/shared-messages.js";
import { getStudyEntitiesForLevel } from "../data/minor-entities.js";
import { buildEntityFighter } from "./pve-engine.js";
import { simulateBattle, buildFighter, Fighter } from "./combat.service.js";
import type { TurnLog } from "./combat.service.js";
import { createReport } from "./report.service.js";
import { MAX_UPGRADE_TIER } from "../types/spell-upgrade.js";

// ── KONFIGURACJA AKCJI ───────────────────────────────
export const STUDY_SUBCATEGORIES: Record<number, [string, string, string]> = {
  1: [
    "Chaotyczne machanie rękoma",
    "Losowy bełkot",
    "Kiepska inscenizacja",
  ],
  2: [
    "Pozornie sensowne gesty dłońmi",
    "Ciche mamroczenie",
    "Szalone wygibasy",
  ],
  3: [
    "Gwałtowne, synchroniczne wymachy dłońmi",
    "Mamroczenie słów brzmiących zagranicznie",
    "Energiczny taniec",
  ],
  4: [
    "Opanowane, konsekwentne ruchy dłońmi",
    "Rymowane skandowanie trudnych słów",
    "Rytualne ruchy",
  ],
  5: [
    "Precyzyjne gesty godne maga",
    "Doniosła recytacja starożytnych formuł",
    "Ceremonialny rytuał",
  ],
};

const STUDY_CONFIG = [
  { level: 1, durationSeconds: 5,  minPoints: 1,  maxPoints: 4,  spellChance: 0.25, requiredTowerLevel: 1  },
  { level: 2, durationSeconds: 120, minPoints: 5,  maxPoints: 10, spellChance: 0.30, requiredTowerLevel: 3  },
  { level: 3, durationSeconds: 180, minPoints: 11, maxPoints: 22, spellChance: 0.40, requiredTowerLevel: 6  },
  { level: 4, durationSeconds: 240, minPoints: 23, maxPoints: 50, spellChance: 0.40, requiredTowerLevel: 10 },
  { level: 5, durationSeconds: 300, minPoints: 51, maxPoints: 100,spellChance: 0.50, requiredTowerLevel: 15 },
];

const STUDY_ACTION_MAX = 30;
const STUDY_REGEN_SECONDS = 30 * 60; // 30 minut



// ── KONFIGURACJA SPOTKAŃ W STUDIACH ──
const STUDY_ENCOUNTER_BASE_CHANCE: Record<number, number> = {
  1: 0.75,   // 5% szansy na walkę
  2: 0.10,
  3: 0.15,
  4: 0.20,
  5: 0.25,
};

// ── HELPERS ──────────────────────────────────────────
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChance(chance: number): boolean {
  return Math.random() < chance;
}

// ── REGENERACJA AKCJI ────────────────────────────────
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

// ── SPOTKANIE W STUDIACH ──────────────────────────────────────────────

async function resolveStudyEncounter(
  characterId: number,
  studyLevel: number
): Promise<{
  encountered: boolean;
  entityName: string | null;
  entityImageKey: string | null;
  playerMaxHp: number;
  entityMaxHp: number;
  playerWon: boolean;
  shardsEarned: number;
  summary: string;
  log: TurnLog[] | null;
  metadata: any | null;
}> 
{
  const pool = getStudyEntitiesForLevel(studyLevel);
  if (pool.length === 0) {
    return {
      encountered: false, entityName: null, entityImageKey: null,
      playerMaxHp: 0, entityMaxHp: 0, playerWon: false,
      shardsEarned: 0, summary: "", log: null, metadata: null,
    };
  }

  const entity = pool[Math.floor(Math.random() * pool.length)];
  const playerFighter = await buildFighter(characterId);
  const initialPowerShards = playerFighter.powerShards;

  const entityFighter = buildEntityFighter(entity);
  const playerMaxHp = playerFighter.maxHp;
  const entityMaxHp = (entityFighter as any).hp as number;
  const battleResult = simulateBattle([playerFighter], [entityFighter as unknown as Fighter]);

  const playerWon = battleResult.winnerId === playerFighter.id;
  const shardsEarned = playerWon ? entity.reward.runicShards : 0;

  const shardsSpent = initialPowerShards - playerFighter.powerShards;
  if (shardsSpent > 0) {
    await prisma.character.update({
      where: { id: characterId },
      data: { powerShards: { decrement: shardsSpent } },
    });
  }

  await prisma.pveEncounter.create({
    data: {
      characterId, locationLevel: studyLevel, entityId: entity.id,
      entityName: entity.name, playerWon, runicShardsEarned: shardsEarned,
      battleLog: JSON.stringify(battleResult.log), summary: battleResult.summary,
      source: "study", studyLevel: studyLevel,
    },
  });

  return {
    encountered: true, entityName: entity.name,
    entityImageKey: (entity as any).imageKey ?? null,
    playerMaxHp, entityMaxHp, playerWon, shardsEarned,
    summary: battleResult.summary, log: battleResult.log, metadata: battleResult.metadata,
  };
}

// ── ROZPOCZĘCIE AKCJI STUDIÓW ────────────────────────
export async function startStudyAction(userId: number, level: number, subcategory: 1 | 2 | 3) {
  const config = STUDY_CONFIG[level - 1];
  if (!config) throw new Error("Nieprawidłowy poziom akcji");

  const subcategoryNames = STUDY_SUBCATEGORIES[level];
  if (!subcategoryNames || subcategory < 1 || subcategory > 3) {
    throw new Error("Nieprawidłowa podkategoria");
  }
  const subcategoryName = subcategoryNames[subcategory - 1];

  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      tower: { include: { buildings: true } },
    },
  });

  if (!character) throw new Error("Postać nie znaleziona");
  if (!character.tower) throw new Error("Brak wieży");

  if (character.tower.level < config.requiredTowerLevel) {
    throw new Error(
      `Wymagany poziom wieży: ${config.requiredTowerLevel} (masz: ${character.tower.level})`
    );
  }

  const { newActions, newLastRegen } = calculateRegenActions(
    character.studyActions,
    character.lastStudyRegen,
    STUDY_ACTION_MAX,
    STUDY_REGEN_SECONDS
  );

  if (newActions <= 0) {
    throw new Error("Brak dostępnych akcji. Poczekaj na odnowienie.");
  }

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

  const startMessage = STUDY_START_MESSAGES[level]?.[subcategory - 1] ?? "Rozpoczynasz naukę...";

  const [action] = await prisma.$transaction([
    prisma.characterAction.create({
      data: {
        characterId: character.id,
        actionType: "study",
        actionLevel: level,
        actionSubcategory: subcategory,
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
    subcategory,
    subcategoryName,
    finishesAt,
    actionsRemaining: newActions - 1,
    startMessage,
  };
}

// ── ZAKOŃCZENIE AKCJI STUDIÓW ────────────────────────
// ── NOWA: wspólna logika przetwarzania akcji studiów ──

async function processStudyCompletion(actionId: number): Promise<any> {
  const action = await prisma.characterAction.findUnique({
    where: { id: actionId },
    include: { character: true },
  });
  if (!action) throw new Error("Akcja nie znaleziona");
  if (action.status !== "in_progress") {
    return JSON.parse(action.report || "{}");
  }

  const character = action.character;
  const config = STUDY_CONFIG[action.actionLevel - 1];
  if (!config) throw new Error("Nieprawidłowy poziom studiów");

  const xpEarned = randomInt(config.minPoints, config.maxPoints);
  const baseChance = STUDY_ENCOUNTER_BASE_CHANCE[action.actionLevel] || 0;
  const hasEncounter = Math.random() < baseChance;

  const subIdx = action.actionSubcategory ? action.actionSubcategory - 1 : 0;
  const level = action.actionLevel;
  const subcategoryName = STUDY_SUBCATEGORIES[level]?.[subIdx] ?? null;

  let discoveredSpellName: string | null = null;
  let upgradedSpellName: string | null = null;
  let totalXP = 0;
  let encounterResult: Awaited<ReturnType<typeof resolveStudyEncounter>> | null = null;
  let narrative = "";
  let levelUpResult = null;

  if (!hasEncounter) {
    // ── ŚCIEŻKA 1: BRAK SPOTKANIA — normalna nauka ──
    totalXP = xpEarned;

    const schoolBonuses = await getCharacterSchoolBonuses(character.id);
    const spellFindBonus = (schoolBonuses?.spell_find ?? 0) / 100;
    const effectiveSpellChance = Math.min(config.spellChance + spellFindBonus, 1);

    if (randomChance(effectiveSpellChance)) {
      // Pula obejmuje: nieodkryte czary + odkryte, ale jeszcze nie w pełni ulepszone
      const maxedEntries = await prisma.spellbookEntry.findMany({
        where: { characterId: character.id, upgradeTier: { gte: MAX_UPGRADE_TIER } },
        select: { spellId: true },
      });
      const maxedIds = maxedEntries.map(e => e.spellId);
      const availableSpells = await prisma.spell.findMany({
        where: maxedIds.length > 0 ? { id: { notIn: maxedIds } } : undefined,
      });

      if (availableSpells.length > 0) {
        const chosen = availableSpells[randomInt(0, availableSpells.length - 1)];
        const spellResult = await recordSpellbookEntry(character.id, chosen.id, "study");
        if (spellResult.isNew) {
          discoveredSpellName = chosen.name;
        } else {
          upgradedSpellName = chosen.name;
        }
      }
    }

    const flavorPool = (discoveredSpellName || upgradedSpellName)
      ? STUDY_SUCCESS_MESSAGES[level]?.[subIdx]
      : STUDY_FAIL_MESSAGES[level]?.[subIdx];

    narrative = Array.isArray(flavorPool)
      ? flavorPool[Math.floor(Math.random() * flavorPool.length)]
      : (typeof flavorPool === "string" ? flavorPool : "Nic się nie wydarzyło.");

    levelUpResult = await addExperience(character.id, totalXP);
  } else {
    // ── ŚCIEŻKA 2: SPOTKANIE — walka ──
    encounterResult = await resolveStudyEncounter(character.id, action.actionLevel);
    narrative = `Podczas próby wynalezienia nowego czaru, przypadkiem przywołałeś ${encounterResult.entityName}, który rzuca się na Ciebie wściekle!`;

    if (encounterResult.playerWon) {
      totalXP = xpEarned * 5;
      levelUpResult = await addExperience(character.id, totalXP);
    } else {
      totalXP = 0;
      levelUpResult = null;
    }
  }

  const reportObj = {
    actionLevel: action.actionLevel,
    subcategoryName,
    avatarIndex: character.avatarIndex ?? 0,
    viewerCharacterId: character.id,
    narrative,
    encounter: encounterResult
      ? {
          entityName: encounterResult.entityName,
          entityImageKey: encounterResult.entityImageKey,
          playerMaxHp: encounterResult.playerMaxHp,
          entityMaxHp: encounterResult.entityMaxHp,
          playerWon: encounterResult.playerWon,
          log: encounterResult.log,
          metadata: encounterResult.metadata,
        }
      : null,
    summary: {
      xpEarned: totalXP,
      discoveredSpell: discoveredSpellName,
      spellUpgraded: upgradedSpellName,
      encounterOutcome: encounterResult ? (encounterResult.playerWon ? "won" : "lost") : null,
      entityName: encounterResult?.entityName ?? null,
      levelUp: levelUpResult && levelUpResult.levelsGained > 0
        ? { newLevel: levelUpResult.level, skillPointsGained: levelUpResult.skillPointsGained }
        : null,
    },
  };

  await createReport(character.id, "study", reportObj, action.finishesAt);

  await prisma.characterAction.update({
    where: { id: action.id },
    data: {
      status: "claimed",
      skillPointsEarned: totalXP,
      spellDiscovered: discoveredSpellName,
      report: JSON.stringify(reportObj),
    },
  });

  const tutorial = await getOrCreateTutorial(character.id);
  if (tutorial.step === TUTORIAL_STEPS.EXPLORATION_DONE) {
    await advanceTutorialStep(character.id, TUTORIAL_STEPS.EXPLORATION_DONE, TUTORIAL_STEPS.STUDY_DONE);
  }

  const riftActionKey = `study_${action.actionLevel}` as import("../data/rifts.js").ActionTrigger;
  await tryTriggerUnstableRift(character.id, riftActionKey);

  return reportObj;
}

// ── ZMODYFIKOWANE claimStudyAction ──

export async function claimStudyAction(userId: number, actionId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      tower: { include: { buildings: true } },
    },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const action = await prisma.characterAction.findFirst({
    where: { id: actionId, characterId: character.id, actionType: "study" },
  });
  if (!action) throw new Error("Akcja nie znaleziona");

  // Jeśli akcja już odebrana – zwróć raport
  if (action.status === "claimed") {
    return JSON.parse(action.report || "{}");
  }

  // Jeśli wciąż w toku, ale czas minął – przetwórz
  if (action.status === "in_progress" && new Date() >= action.finishesAt) {
    const report = await processStudyCompletion(action.id);
    return report;
  }

  // Jeśli akcja oznaczona jako "completed" – przetwórz (zabezpieczenie)
  if (action.status === "completed" && new Date() >= action.finishesAt) {
    const report = await processStudyCompletion(action.id);
    return report;
  }

  // Jeśli jeszcze nie minął czas – błąd
  if (action.status === "in_progress" && new Date() < action.finishesAt) {
    throw new Error("Akcja jeszcze nie zakończona");
  }

  // Fallback
  throw new Error("Nieznany status akcji");
}

// ── OPCJONALNIE: getStudyReport (czysty odczyt) ──

export async function getStudyReport(userId: number, actionId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const action = await prisma.characterAction.findFirst({
    where: { id: actionId, characterId: character.id, actionType: "study" },
  });
  if (!action) throw new Error("Akcja nie znaleziona");
  if (action.status !== "claimed") throw new Error("Akcja nie została jeszcze zakończona");

  return JSON.parse(action.report || "{}");
}

// ── STATUS AKTYWNYCH AKCJI ───────────────────────────
export async function getActiveActions(
  userId: number,
  options?: { currentPage?: string }
) {
  const character = await prisma.character.findUnique({
    where: { userId },
  });
  if (!character) throw new Error("Postać nie znaleziona");
  

  // USUŃ oba istniejące bloki (study auto-process + currentPage === "study" mark completed
// + exploration mark completed). ZASTĄP jednym:

const dueActions = await prisma.characterAction.findMany({
  where: {
    characterId: character.id,
    status: "in_progress",
    finishesAt: { lte: new Date() },
  },
});

for (const action of dueActions) {
  try {
    if (action.actionType === "study") {
      await processStudyCompletion(action.id);
    } else if (action.actionType === "exploration") {
      const { processExplorationCompletion } = await import("./exploration.service.js");
      await processExplorationCompletion(action.id);
    }
  } catch (err) {
    console.error(`[auto-process] Akcja ${action.id}:`, err);
  }
}

// Filtr activeActions: status "in_progress" tylko (nie "completed" — już go nie używamy)
const activeActions = await prisma.characterAction.findMany({
  where: {
    characterId: character.id,
    status: "in_progress",
  },
  orderBy: { startedAt: "desc" },
});

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
  
  const activeActionsWithMessages = activeActions.map(action => {
    if (
      action.actionType === "study" &&
      action.status === "in_progress" &&
      action.actionSubcategory !== null &&
      action.actionLevel !== null 
    ) {
      const level = action.actionLevel;
      const subIndex = action.actionSubcategory - 1; // 0, 1, 2
      const startMsg = STUDY_START_MESSAGES[level]?.[subIndex];
      return { ...action, startMessage: startMsg || null };
    }
    return action;
  });

  const tower = await prisma.tower.findUnique({
    where: { characterId: character.id },
    select: { level: true },
  });

  return {
    studyActionsAvailable: newStudyActions,
    studyActionsMax: STUDY_ACTION_MAX,
    explorationActionsAvailable: newExplorationActions,
    explorationActionsMax: EXPLORATION_MAX,
    activeActions: activeActionsWithMessages,   
    towerLevel: tower?.level ?? 0,
  };
}