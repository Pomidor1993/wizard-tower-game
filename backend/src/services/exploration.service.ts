import prisma from "../lib/prisma.js";
import { calculateRegenActions } from "./study.service.js";
import {
  getExplorationEntitiesForLevel,
  type ExplorationEntityDef,
} from "../data/minor-entities.js";
import { buildEntityFighter } from "./pve-engine.js";
import { simulateBattle, buildFighter, Fighter } from "./combat.service.js";
import { addExperience } from "./character.service.js";
import { addItemToChaosVaultWithMessage } from "./chaos_vault.service.js";
import { getOrCreateTutorial, advanceTutorialStep } from "./tutorial/tutorial.service.js";
import { TUTORIAL_STEPS, TUTORIAL_ENEMIES, TUTORIAL_ITEM_POOL, TUTORIAL_MESSAGES } from "./tutorial/tutorial.constants.js";
import { getLocation, LocationLetter } from "../data/exploration-locations.js";
import { getUtilityBonuses, resolveRandomBonus } from "./utility-spell.service.js";
import { getCharacterSchoolBonuses, getExplorationLevelUnlock } from "./magic-school.service.js";
import { getRiftTrophyBonuses, applyItemTierBonus } from "./rift-trophy-bonus.service.js";
import { tryTriggerUnstableRift } from "./rift.service.js";
import { createReport } from "./report.service.js";
import {
  EXPLORATION_FAIL_MESSAGES,
  EXPLORATION_SUCCESS_MESSAGES,
  buildExplorationEncounterIntro,
} from "../data/shared-messages.js";
// ── KONFIGURACJA ─────────────────────────────────────────────────────────────

const EXPLORATION_CONFIG = [
  { level: 1, durationSeconds: 5,   minPoints: 40, maxPoints: 60,  itemChance: 0.90 },
  { level: 2, durationSeconds: 240, minPoints: 20, maxPoints: 40,  itemChance: 0.40 },
  { level: 3, durationSeconds: 360, minPoints: 40, maxPoints: 60,  itemChance: 0.50 },
  { level: 4, durationSeconds: 480, minPoints: 60, maxPoints: 80,  itemChance: 0.60 },
  { level: 5, durationSeconds: 600, minPoints: 70, maxPoints: 90,  itemChance: 0.70 },
];

const ENCOUNTER_BASE_CHANCE: Record<number, number> = {
  1: 0.90,
  2: 0.35,
  3: 0.40,
  4: 0.45,
  5: 0.50,
};

const RARITY_WEIGHTS_BY_LOCATION: Record<number, Record<string, number>> = {
  1: { common: 95, uncommon: 4,  rare: 1,  unique: 0 },
  2: { common: 86, uncommon: 9,  rare: 4,  unique: 1 },
  3: { common: 78, uncommon: 14, rare: 6,  unique: 2 },
  4: { common: 69, uncommon: 20, rare: 8,  unique: 3 },
  5: { common: 60, uncommon: 25, rare: 10, unique: 5 },
};

const EXPLORATION_ACTION_MAX = 15;
const EXPLORATION_REGEN_SECONDS = 60 * 60;

// ── HELPERY ───────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChance(chance: number): boolean {
  return Math.random() < chance;
}

function pickItemRarity(locationLevel: number): string {
  const weights = RARITY_WEIGHTS_BY_LOCATION[locationLevel] ?? RARITY_WEIGHTS_BY_LOCATION[1]!;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return "common";
}

// ── TYPY ──────────────────────────────────────────────────────────────────────

interface DroppedItemResult {
  chaosVaultItemId: number;
  ownedItemId: number;
  itemId: number;
  name: string;
  rarity: string;
  slot: string;
  message: string;
  overCapacity: boolean;
}

interface EncounterResult {
  fought: boolean;
  entityId: string | null;
  entityName: string | null;
  entityImageKey: string | null;
  entity: ExplorationEntityDef | null;
  playerWon: boolean;
  runicShardsEarned: number;
  battleLog: object[] | null;
  metadata: any | null;
  summary: string | null;
  playerMaxHp: number;
  entityMaxHp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROZPOCZĘCIE EKSPLORACJI
// ═══════════════════════════════════════════════════════════════════════════════

export async function startExploration(userId: number, level: number, location: LocationLetter) {
  const config = EXPLORATION_CONFIG[level - 1];
  if (!config) throw new Error("Nieprawidłowy poziom eksploracji");

  const loc = getLocation(level, location);
  if (!loc) throw new Error("Nieprawidłowa lokacja");

  const character = await prisma.character.findUnique({
    where: { userId },
    include: { tower: true },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  if (level === 2 && (character.tower?.level ?? 0) < 5) {
    throw new Error("Poziom 2 eksploracji wymaga wieży na poziomie 5.");
  }
  if (level >= 3) {
    const schoolBonusesForLevel = await getExplorationLevelUnlock(character.id, level);
    if (!schoolBonusesForLevel) {
      throw new Error(`Poziom ${level} eksploracji wymaga Wieży Astronomicznej w szkole magii.`);
    }
  }

  const rawBonuses = await getUtilityBonuses(character.id);
  const bonuses    = resolveRandomBonus(rawBonuses);

  const baseDuration  = config.durationSeconds * 1000;
  const reduction     = bonuses.explorationTimeReduction / 100;
  const finalDuration = Math.floor(baseDuration * (1 - reduction));
  const finishesAt    = new Date(Date.now() + finalDuration);

  const tutorial = await getOrCreateTutorial(character.id);
  if (tutorial.step === TUTORIAL_STEPS.INTRO && level !== 1) {
    throw new Error("Samouczek: pierwsza eksploracja musi być na poziomie 1");
  }

  const { newActions, newLastRegen } = calculateRegenActions(
    character.explorationActions,
    character.lastExploreRegen,
    EXPLORATION_ACTION_MAX,
    EXPLORATION_REGEN_SECONDS
  );

  if (newActions <= 0) throw new Error("Brak dostępnych akcji eksploracji. Poczekaj na odnowienie.");

  const activeAction = await prisma.characterAction.findFirst({
    where: { characterId: character.id, status: "in_progress" },
  });
  if (activeAction) {
    const typeLabel = activeAction.actionType === "study" ? "studiów" : "eksploracji";
    throw new Error(`Masz już aktywną akcję ${typeLabel}. Poczekaj na jej zakończenie.`);
  }

  const [action] = await prisma.$transaction([
    prisma.characterAction.create({
      data: {
        characterId:         character.id,
        actionType:          "exploration",
        actionLevel:         level,
        actionSubcategory:   ["A", "B", "C"].indexOf(location) + 1,
        explorationLocation: location,
        status:              "in_progress",
        finishesAt,
      },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        explorationActions: newActions - 1,
        lastExploreRegen:   newLastRegen,
      },
    }),
  ]);

  return {
    actionId:         action.id,
    level,
    location,
    locationName:     loc.name,
    finishesAt,
    actionsRemaining: newActions - 1,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIUSZ SAMOUCZKOWY
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveTutorialEncounter(
  characterId: number
): Promise<{ summary: string; droppedItem: DroppedItemResult | null }> {
  const enemy    = TUTORIAL_ENEMIES[randomInt(0, TUTORIAL_ENEMIES.length - 1)]!;
  const itemName = TUTORIAL_ITEM_POOL[randomInt(0, TUTORIAL_ITEM_POOL.length - 1)]!;

  const item = await prisma.item.findFirst({ where: { name: itemName } });
  let droppedItem: DroppedItemResult | null = null;
  let dropText = "";

  if (item) {
    const result = await addItemToChaosVaultWithMessage(characterId, item.id, item.name, 1, 1);
    droppedItem = {
      chaosVaultItemId: result.chaosVaultItemId,
      ownedItemId:      result.ownedItemId,
      itemId:           item.id,
      name:             item.name,
      rarity:           item.rarity,
      slot:             item.slot,
      message:          result.message,
      overCapacity:     result.overCapacity,
    };
    dropText = ` Z nieba spada ${item.name}, przygniatając ${enemy} na miejscu! ${result.message}`;
  } else {
    dropText = ` Coś spada z nieba i przygniata ${enemy} na miejscu!`;
  }

  const summary =
    `Napotykasz: ${enemy}! Nie masz nawet czasu się przestraszyć — w odruchu ` +
    `desperacji zaczynasz chaotycznie machać rękoma, mamrocząc pierwsze zaklęcie, ` +
    `jakie przychodzi Ci do głowy.${dropText}`;

  return { summary, droppedItem };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GŁÓWNA LOGIKA PRZETWARZANIA — wywoływana auto lub przez claim
// ═══════════════════════════════════════════════════════════════════════════════

export async function processExplorationCompletion(actionId: number): Promise<void> {
  // Wczytaj akcję razem z postacią i jej budynkami
  const action = await prisma.characterAction.findUnique({
    where: { id: actionId },
    include: {
      character: {
        include: { tower: { include: { buildings: true } } },
      },
    },
  });

  // Jeśli nie istnieje lub już przetworzona — nic nie rób
  if (!action || action.status === "claimed") return;

  const character = action.character;
  const config    = EXPLORATION_CONFIG[action.actionLevel - 1]!;

// ── XP i awans ───────────────────────────────────────────────────────────
  const skillPointsEarned = randomInt(config.minPoints, config.maxPoints);
  const levelResult       = await addExperience(character.id, skillPointsEarned);

  let droppedItem:     DroppedItemResult | null = null;
  let encounterResult: EncounterResult   | null = null;
  let narrative = "";

  const subIdx = (action.actionSubcategory ?? 1) - 1;
  const level  = action.actionLevel;

  const tutorial = await getOrCreateTutorial(character.id);

  // ── SAMOUCZEK ─────────────────────────────────────────────────────────────
  if (tutorial.step === TUTORIAL_STEPS.INTRO) {
    const { summary: tutorialSummary, droppedItem: tutorialDrop } = await resolveTutorialEncounter(character.id);

    narrative = tutorialSummary;
    if (tutorialDrop) droppedItem = tutorialDrop;

    await advanceTutorialStep(character.id, TUTORIAL_STEPS.INTRO, TUTORIAL_STEPS.EXPLORATION_DONE);

    encounterResult = {
      fought:            true,
      entityId:          "tutorial",
      entityName:        "tutorial_encounter",
      entityImageKey:    null,
      entity:            null,
      playerWon:         true,
      runicShardsEarned: 0,
      battleLog:         [],
      metadata:          null,
      summary:           tutorialSummary,
      playerMaxHp:       100,
      entityMaxHp:       100,
    };

  // ── NORMALNY PRZEBIEG ─────────────────────────────────────────────────────
  } else {
    const rawBonuses    = await getUtilityBonuses(character.id);
    const bonuses       = resolveRandomBonus(rawBonuses);
    const schoolBonuses = await getCharacterSchoolBonuses(character.id);
    const trophyBonuses = await getRiftTrophyBonuses(character.id);

    // ── Przedmiot ─────────────────────────────────────────────────────────
    const schoolItemBonus     = schoolBonuses?.item_find ?? 0;
    const effectiveItemChance = config.itemChance
      + bonuses.bonusItemFindChance / 100
      + schoolItemBonus / 100;

    if (randomChance(effectiveItemChance)) {
      const rarity    = pickItemRarity(action.actionLevel);
      const locLetter = (action.explorationLocation ?? "A") as LocationLetter;
      const locConfig = getLocation(action.actionLevel, locLetter);
      const [minTier, maxTier] = locConfig?.tierRange ?? [1, 3];

      let pool = await prisma.item.findMany({ where: { rarity } });
      pool = pool.filter(item => {
        try {
          const types: string[] = JSON.parse(item.locationTypes);
          return types.length === 0 || types.includes(locLetter);
        } catch { return true; }
      });
      if (pool.length === 0) pool = await prisma.item.findMany({ where: { rarity } });
      if (pool.length === 0) pool = await prisma.item.findMany();

      if (pool.length > 0) {
        const chosen = pool[randomInt(0, pool.length - 1)]!;
        const result = await addItemToChaosVaultWithMessage(
          character.id,
          chosen.id,
          chosen.name,
          minTier,
          applyItemTierBonus(Math.min(maxTier + bonuses.bonusItemTier, 10), trophyBonuses)
        );
        droppedItem = {
          chaosVaultItemId: result.chaosVaultItemId,
          ownedItemId:      result.ownedItemId,
          itemId:           chosen.id,
          name:             chosen.name,
          rarity:           chosen.rarity,
          slot:             chosen.slot,
          message:          result.message,
          overCapacity:     result.overCapacity,
        };
      }
    }

    // ── Spotkanie ─────────────────────────────────────────────────────────
    const encounterPool = getExplorationEntitiesForLevel(action.actionLevel);
    const baseChance    = ENCOUNTER_BASE_CHANCE[action.actionLevel] ?? 0.4;
    const baseEncounter = encounterPool.length > 0 && Math.random() < baseChance;

    const shouldEncounter = (() => {
      if (baseEncounter && bonuses.avoidEncounterChance > 0) {
        return !randomChance(bonuses.avoidEncounterChance / 100);
      }
      if (!baseEncounter && bonuses.bonusEncounterChance > 0) {
        return randomChance(bonuses.bonusEncounterChance / 100);
      }
      return baseEncounter;
    })();

    if (shouldEncounter) {
      encounterResult = await resolveEncounter(
        character.id,
        action.actionLevel,
        bonuses.avoidHitChance,
        bonuses.alwaysFirstInPve
      );
    }

    // ── Narracja: spotkanie ma priorytet nad flavor tekstem znalezienia przedmiotu ──
    if (encounterResult?.fought) {
      narrative = buildExplorationEncounterIntro(encounterResult.entityName!);
    } else {
      const pool = droppedItem
        ? EXPLORATION_SUCCESS_MESSAGES[level]?.[subIdx]
        : EXPLORATION_FAIL_MESSAGES[level]?.[subIdx];
      narrative = Array.isArray(pool) && pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]!
        : "Eksploracja dobiegła końca.";
    }
  }

  // ── Okruchy runiczne ──────────────────────────────────────────────────────
  const runicShardsEarned = encounterResult?.runicShardsEarned ?? 0;

  const locationName = getLocation(
    action.actionLevel,
    (action.explorationLocation ?? "A") as LocationLetter
  )?.name ?? `Poziom ${action.actionLevel}`;

  const reportObj = {
    viewerCharacterId: character.id,
    avatarIndex:       character.avatarIndex ?? 0,
    locationName,
    actionLevel:        action.actionLevel,
    narrative,
    encounter: encounterResult
      ? {
          entityName:        encounterResult.entityName,
          entityImageKey:    encounterResult.entityImageKey,
          playerMaxHp:       encounterResult.playerMaxHp,
          entityMaxHp:       encounterResult.entityMaxHp,
          playerWon:         encounterResult.playerWon,
          log:               encounterResult.battleLog,
          metadata:          encounterResult.metadata,
        }
      : null,
    summary: {
      xpEarned: skillPointsEarned,
      item: droppedItem
        ? { name: droppedItem.name, rarity: droppedItem.rarity, message: droppedItem.message }
        : null,
      encounterOutcome: encounterResult?.fought ? (encounterResult.playerWon ? "won" : "lost") : null,
      entityName: encounterResult?.fought ? encounterResult.entityName : null,
      runicShardsEarned,
      levelUp: levelResult.levelsGained > 0
        ? { newLevel: levelResult.level, skillPointsGained: levelResult.skillPointsGained }
        : null,
    },
  };

  await prisma.$transaction([
    prisma.characterAction.update({
      where: { id: action.id },
      data: {
        status:           "claimed",
        skillPointsEarned,
        report:            JSON.stringify(reportObj),
      },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: { runicStoneShards: { increment: runicShardsEarned } },
    }),
  ]);

  await createReport(character.id, "exploration", reportObj, action.finishesAt);

  const riftActionKey = `exploration_${action.actionLevel}` as import("../data/rifts.js").ActionTrigger;
  await tryTriggerUnstableRift(character.id, riftActionKey);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM — cienka warstwa wywołana gdy gracz kliknie "Odbierz" w UI
// (dla zgodności wstecznej, w praktyce processExplorationCompletion
//  jest już wywołane przez auto-process w getActiveActions)
// ═══════════════════════════════════════════════════════════════════════════════

export async function claimExploration(userId: number, actionId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const action = await prisma.characterAction.findFirst({
    where: { id: actionId, characterId: character.id },
  });
  if (!action)                                                      throw new Error("Akcja nie znaleziona");
  if (action.status === "claimed")                                  return { alreadyProcessed: true };
  if (action.status === "in_progress" && new Date() < action.finishesAt)
    throw new Error("Akcja jeszcze nie zakończona");

  await processExplorationCompletion(actionId);
  return { alreadyProcessed: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MECHANIKA SPOTKANIA
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveEncounter(
  characterId: number,
  locationLevel: number,
  avoidHitChance: number = 0,
  alwaysFirst: boolean = false
): Promise<EncounterResult> {
  const pool = getExplorationEntitiesForLevel(locationLevel);
  if (pool.length === 0) return noEncounter();

  const entity = pool[Math.floor(Math.random() * pool.length)] as ExplorationEntityDef;

  const playerFighter      = await buildFighter(characterId);
  const initialPowerShards = playerFighter.powerShards;

  if (avoidHitChance > 0) {
    playerFighter.dodgeChance = Math.min(playerFighter.dodgeChance + avoidHitChance, 20);
  }
  if (alwaysFirst) {
    playerFighter.initiative = 9999;
  }

  const entityFighter = buildEntityFighter(entity);
  const playerMaxHp   = playerFighter.maxHp;
  const entityMaxHp   = (entityFighter as any).hp as number;
  const battleResult  = simulateBattle([playerFighter], [entityFighter as unknown as Fighter]);

  const playerWon         = battleResult.winnerId === playerFighter.id;
  const runicShardsEarned = playerWon ? entity.reward.runicShards : 0;

  const shardsSpent = initialPowerShards - playerFighter.powerShards;
  if (shardsSpent > 0) {
    await prisma.character.update({
      where: { id: characterId },
      data:  { powerShards: { decrement: shardsSpent } },
    });
  }

  await prisma.pveEncounter.create({
    data: {
      characterId,
      locationLevel,
      entityId:          entity.id,
      entityName:        entity.name,
      playerWon,
      runicShardsEarned,
      battleLog:         JSON.stringify(battleResult.log),
      summary:           battleResult.summary,
    },
  });

  return {
    fought:            true,
    entityId:          entity.id,
    entityName:        entity.name,
    entityImageKey:    entity.imageKey ?? null,
    entity,
    playerWon,
    runicShardsEarned,
    battleLog:         battleResult.log,
    metadata:          battleResult.metadata,
    summary:           battleResult.summary,
    playerMaxHp,
    entityMaxHp,
  };
}

function noEncounter(): EncounterResult {
  return {
    fought:            false,
    entityId:          null,
    entityName:        null,
    entityImageKey:    null,
    entity:            null,
    playerWon:         false,
    runicShardsEarned: 0,
    battleLog:         null,
    metadata:          null,
    summary:           null,
    playerMaxHp:       0,
    entityMaxHp:       0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORIA SPOTKAŃ GRACZA
// ═══════════════════════════════════════════════════════════════════════════════

export async function getEncounterHistory(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const encounters = await prisma.pveEncounter.findMany({
    where:   { characterId: character.id },
    orderBy: { foughtAt: "desc" },
    take:    20,
  });

  return encounters.map(e => ({
    id:                e.id,
    locationLevel:     e.locationLevel,
    entityId:          e.entityId,
    entityName:        e.entityName,
    playerWon:         e.playerWon,
    runicShardsEarned: e.runicShardsEarned,
    summary:           e.summary,
    foughtAt:          e.foughtAt,
    log:               JSON.parse(e.battleLog),
  }));
}