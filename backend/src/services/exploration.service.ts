import prisma from "../lib/prisma.js";
import { calculateRegenActions } from "./action.service.js";
import {
  rollEncounter,
  rollElementForLocation,
  getRandomEntityForElement,
} from "../data/minor-entities.js";
import { buildEntityFighter } from "./pve-engine.js";
import { simulateBattle, buildFighter, Fighter } from "./combat.service.js";
import { addExperience } from "./character.service.js";
import { addItemToChaosVaultWithMessage } from "./chaos_vault.service.js";
import { getOrCreateTutorial, advanceTutorialStep } from "./tutorial/tutorial.service.js";
import { TUTORIAL_STEPS, TUTORIAL_ENEMIES, TUTORIAL_ITEM_POOL, TUTORIAL_MESSAGES } from "./tutorial/tutorial.constants.js";
import { getLocation, LocationLetter } from "../data/exploration-locations.js";
import { getUtilityBonuses, resolveRandomBonus } from "./utility-spell.service.js";

// ── KONFIGURACJA ──────────────────────────────────────────────────────────────

const EXPLORATION_CONFIG = [
  { level: 1, durationSeconds: 5,   minPoints: 40, maxPoints: 60, itemChance: 0.90 },
  { level: 2, durationSeconds: 240, minPoints: 20, maxPoints: 40, itemChance: 0.40 },
  { level: 3, durationSeconds: 360, minPoints: 40, maxPoints: 60, itemChance: 0.50 },
  { level: 4, durationSeconds: 480, minPoints: 60, maxPoints: 80, itemChance: 0.60 },
  { level: 5, durationSeconds: 600, minPoints: 70, maxPoints: 90, itemChance: 0.70 },
];

const RARITY_WEIGHTS_BY_LOCATION: Record<number, Record<string, number>> = {
  1: { common: 95, uncommon: 4,  rare: 1,  unique: 0 },
  2: { common: 86, uncommon: 9,  rare: 4,  unique: 1 },
  3: { common: 78, uncommon: 14, rare: 6,  unique: 2 },
  4: { common: 69, uncommon: 20, rare: 8,  unique: 3 },
  5: { common: 60, uncommon: 25, rare: 10, unique: 5 },
};

const EXPLORATION_ACTION_MAX = 15;
const EXPLORATION_REGEN_SECONDS = 60 * 60;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChance(chance: number): boolean {
  return Math.random() < chance;
}

function pickItemRarity(locationLevel: number): string {
  const weights = RARITY_WEIGHTS_BY_LOCATION[locationLevel] ?? RARITY_WEIGHTS_BY_LOCATION[1];
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
  entity: ReturnType<typeof getRandomEntityForElement> | null;
  playerWon: boolean;
  runicShardsEarned: number;
  battleLog: object[] | null;
  summary: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROZPOCZĘCIE EKSPLORACJI
// ═══════════════════════════════════════════════════════════════════════════════

export async function startExploration(userId: number, level: number, location: LocationLetter) {
  const config = EXPLORATION_CONFIG[level - 1];
  if (!config) throw new Error("Nieprawidłowy poziom eksploracji");

  const loc = getLocation(level, location);
  if (!loc) throw new Error("Nieprawidłowa lokacja");

  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  // Pobierz bonusy z aktywnych czarów użytkowych
// Skrócenie czasu eksploracji przez czary użytkowe
  const rawBonuses = await getUtilityBonuses(character.id);
  const bonuses    = resolveRandomBonus(rawBonuses);

  const baseDuration = config.durationSeconds * 1000;
  const reduction    = bonuses.explorationTimeReduction / 100;
  const finalDuration = Math.floor(baseDuration * (1 - reduction));

  const finishesAt = new Date(Date.now() + finalDuration);

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
        characterId: character.id,
        actionType: "exploration",
        actionLevel: level,
        actionSubcategory: ["A","B","C"].indexOf(location) + 1, // 1,2,3 dla kompatybilności
        explorationLocation: location,   // ← "A" | "B" | "C"
        status: "in_progress",
        finishesAt,
      },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        explorationActions: newActions - 1,
        lastExploreRegen: newLastRegen,
      },
    }),
  ]);

  return {
    actionId: action.id,
    level,
    location,
    locationName: loc.name,
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
  const enemy = TUTORIAL_ENEMIES[randomInt(0, TUTORIAL_ENEMIES.length - 1)];
  const itemName = TUTORIAL_ITEM_POOL[randomInt(0, TUTORIAL_ITEM_POOL.length - 1)];

  const item = await prisma.item.findFirst({ where: { name: itemName } });
  let droppedItem: DroppedItemResult | null = null;
  let dropText = "";

  if (item) {
    const result = await addItemToChaosVaultWithMessage(characterId, item.id, item.name, 1, 1);
    droppedItem = {
      chaosVaultItemId: result.chaosVaultItemId,
      ownedItemId: result.ownedItemId,
      itemId: item.id,
      name: item.name,
      rarity: item.rarity,
      slot: item.slot,
      message: result.message,
      overCapacity: result.overCapacity,
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
// ODEBRANIE WYNIKU EKSPLORACJI
// ═══════════════════════════════════════════════════════════════════════════════

function rollTier(minTier: number, maxTier: number): number {
  // Rozkład ważony - niższe tiery częstsze
  // np. dla zakresu 1-3: tier1=50%, tier2=35%, tier3=15%
  const range = maxTier - minTier;
  const weights = Array.from({ length: range + 1 }, (_, i) => 
    Math.pow(0.6, i)  // każdy kolejny tier ~60% szansy poprzedniego
  );
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i <= range; i++) {
    roll -= weights[i];
    if (roll <= 0) return minTier + i;
  }
  return minTier;
}

export async function claimExploration(userId: number, actionId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
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

  const config = EXPLORATION_CONFIG[action.actionLevel - 1]!;
  const skillPointsEarned = randomInt(config.minPoints, config.maxPoints);
  const levelResult = await addExperience(character.id, skillPointsEarned);

  const messages: string[] = [];
  messages.push(`Eksploracja zakończona! Zdobyłeś ${skillPointsEarned} punktów doświadczenia.`);
  if (levelResult.levelsGained > 0) {
    messages.push(`Awans! Twoja postać osiągnęła poziom ${levelResult.level} i zdobyła ${levelResult.skillPointsGained} pkt rozwoju.`);
  }

  let droppedItem: DroppedItemResult | null = null;
  let encounterResult: EncounterResult | null = null;
  let tutorialMessage: string | null = null;

  const tutorial = await getOrCreateTutorial(character.id);

  // ── SAMOUCZEK: pierwsza eksploracja ──────────────────────────────────────
  if (tutorial.step === TUTORIAL_STEPS.INTRO) {
    const { summary, droppedItem: tutorialDrop } = await resolveTutorialEncounter(character.id);

    messages.push(summary);

    if (tutorialDrop) droppedItem = tutorialDrop;

    tutorialMessage = TUTORIAL_MESSAGES.STUDY_UNLOCKED;

    await advanceTutorialStep(character.id, TUTORIAL_STEPS.INTRO, TUTORIAL_STEPS.EXPLORATION_DONE);

    encounterResult = {
      fought: true,
      entityId: "tutorial",
      entityName: "tutorial_encounter",
      entity: null,
      playerWon: true,
      runicShardsEarned: 0,
      battleLog: [],
      summary,
    };


    // NORMALNY PRZEBIEG //
} else {
    // Pobierz bonusy utility dla normalnego przebiegu
    const rawBonuses = await getUtilityBonuses(character.id);
    const bonuses    = resolveRandomBonus(rawBonuses);

    // Przedmiot
    const effectiveItemChance = config.itemChance + bonuses.bonusItemFindChance / 100;
    if (randomChance(effectiveItemChance)) {
  const rarity = pickItemRarity(action.actionLevel);
  
  // Pobierz literę lokacji z zapisanego pola (z fallbackiem)
  const locLetter = (action.explorationLocation ?? "A") as LocationLetter;
  const locConfig = getLocation(action.actionLevel, locLetter);
  const [minTier, maxTier] = locConfig?.tierRange ?? [1, 3];
  
  // Pula: odpowiedni rarity + tier w zakresie + pasująca lokacja
  let pool = await prisma.item.findMany({
    where: {rarity },
  });

  // Filtr lokacji — przedmiot musi mieć tę literę w swoim locationTypes
  pool = pool.filter(item => {
    try {
      const types: string[] = JSON.parse(item.locationTypes);
      return types.length === 0 || types.includes(locLetter);
    } catch { return true; }
  });

  // Fallback 1: pomiń filtr lokacji, zostaw tylko tier
  if (pool.length === 0) {
    pool = await prisma.item.findMany({
      where: { rarity },
    });
  }

  // Fallback 2: pomiń wszystkie filtry
  if (pool.length === 0) {
    pool = await prisma.item.findMany();
  }

  if (pool.length > 0) {
        const chosen = pool[randomInt(0, pool.length - 1)];
const result = await addItemToChaosVaultWithMessage(
          character.id, chosen.id, chosen.name,
          minTier,
          Math.min(maxTier + bonuses.bonusItemTier, 10)
        );
        droppedItem = {
          chaosVaultItemId: result.chaosVaultItemId,
          ownedItemId: result.ownedItemId,
          itemId: chosen.id,
          name: chosen.name,
          rarity: chosen.rarity,
          slot: chosen.slot,
          message: result.message,
          overCapacity: result.overCapacity,
        };
        messages.push(result.message);
      }
    }

    // Spotkanie
// Spotkanie — modyfikowane przez czary użytkowe
    const baseEncounter = rollEncounter(action.actionLevel);
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

      if (encounterResult.fought) {
        if (encounterResult.playerWon) {
          messages.push(
            `Podczas eksploracji napotkałeś: ${encounterResult.entityName}! ` +
            `Po krótkiej, ale zaciekłej walce — pokonałeś go! ` +
            `${encounterResult.entity?.reward.description ?? ""} ` +
            `(+${encounterResult.runicShardsEarned} okruchów kamienia runicznego)`
          );
        } else {
          messages.push(
            `Podczas eksploracji napotkałeś: ${encounterResult.entityName}! ` +
            `Walczyłeś dzielnie, ale tym razem wróg wziął górę. ` +
            `${encounterResult.entity?.victoryFlavorText ?? ""}`
          );
        }
      }
    }
  }

  // ── ZAPIS ─────────────────────────────────────────────────────────────────
  const runicShardsEarned = encounterResult?.runicShardsEarned ?? 0;

  await prisma.$transaction([
    prisma.characterAction.update({
      where: { id: action.id },
      data: {
        status: "claimed",
        skillPointsEarned,
        report: JSON.stringify({
          skillPointsEarned,
          messages,
          droppedItem,
          tutorialMessage,
          encounter: encounterResult
            ? {
                fought: encounterResult.fought,
                entityId: encounterResult.entityId,
                entityName: encounterResult.entityName,
                playerWon: encounterResult.playerWon,
                runicShardsEarned: encounterResult.runicShardsEarned,
                battleLog: encounterResult.battleLog,
                summary: encounterResult.summary,
              }
            : null,
        }),
      },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        runicStoneShards: { increment: runicShardsEarned },
      },
    }),
  ]);

  return {
    messages,
    experienceEarned: skillPointsEarned,
    level: levelResult.level,
    experience: levelResult.experience,
    xpToNextLevel: levelResult.xpToNextLevel,
    levelsGained: levelResult.levelsGained,
    skillPointsGained: levelResult.skillPointsGained,
    droppedItem,
    tutorialMessage,
    encounter: encounterResult
      ? {
          fought: encounterResult.fought,
          entityName: encounterResult.entityName,
          entityDescription: encounterResult.entity?.description,
          playerWon: encounterResult.playerWon,
          runicShardsEarned: encounterResult.runicShardsEarned,
          battleLog: encounterResult.battleLog,
          summary: encounterResult.summary,
          flavorText: encounterResult.playerWon
            ? encounterResult.entity?.defeatFlavorText
            : encounterResult.entity?.victoryFlavorText,
        }
      : null,
  };
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
  const element = rollElementForLocation(locationLevel);
  if (!element) return noEncounter();

  const entity = getRandomEntityForElement(element);
  if (!entity) return noEncounter();

  const playerFighter = await buildFighter(characterId);
  const initialPowerShards = playerFighter.powerShards;

  if (avoidHitChance > 0) {
    playerFighter.appliedStatuses.push({
      effectDef: {
        type: "invisibility",
        target: "self",
        duration: 99,
        invisChance: avoidHitChance,
      },
      sourceName: "Czar użytkowy",
      turnsLeft: 99,
      applyInfo: null,
      tickInfo: null,
      endInfo: null,
    });
  }

  if (alwaysFirst) {
    playerFighter.initiative = 9999;
  }

  const entityFighter = buildEntityFighter(entity);
  const battleResult = simulateBattle([playerFighter], [entityFighter as unknown as Fighter]);

  const playerWon = battleResult.winnerId === playerFighter.id;
  const runicShardsEarned = playerWon ? entity.reward.runicShards : 0;

  const shardsSpent = initialPowerShards - playerFighter.powerShards;
  if (shardsSpent > 0) {
    await prisma.character.update({
      where: { id: characterId },
      data: { powerShards: { decrement: shardsSpent } },
    });
  }

  await prisma.pveEncounter.create({
    data: {
      characterId,
      locationLevel,
      entityId: entity.id,
      entityName: entity.name,
      playerWon,
      runicShardsEarned,
      battleLog: JSON.stringify(battleResult.log),
      summary: battleResult.summary,
    },
  });

  return {
    fought: true,
    entityId: entity.id,
    entityName: entity.name,
    entity,
    playerWon,
    runicShardsEarned,
    battleLog: battleResult.log,
    summary: battleResult.summary,
  };
}

function noEncounter(): EncounterResult {
  return {
    fought: false,
    entityId: null,
    entityName: null,
    entity: null,
    playerWon: false,
    runicShardsEarned: 0,
    battleLog: null,
    summary: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORIA SPOTKAŃ GRACZA
// ═══════════════════════════════════════════════════════════════════════════════

export async function getEncounterHistory(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const encounters = await prisma.pveEncounter.findMany({
    where: { characterId: character.id },
    orderBy: { foughtAt: "desc" },
    take: 20,
  });

  return encounters.map(e => ({
    id: e.id,
    locationLevel: e.locationLevel,
    entityId: e.entityId,
    entityName: e.entityName,
    playerWon: e.playerWon,
    runicShardsEarned: e.runicShardsEarned,
    summary: e.summary,
    foughtAt: e.foughtAt,
    log: JSON.parse(e.battleLog),
  }));
}