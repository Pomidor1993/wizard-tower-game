import prisma from "../lib/prisma.js";
import { alignmentTriggerService } from "./alignment/alignment-trigger.service.js";

// ── KONFIGURACJA BUDYNKÓW ────────────────────────────

const TOWER_BASE_REQ = { knowledge: 5, intelligence: 5 };
const TOWER_BASE_DURATION_SECONDS = 180;

interface BuildingConfig {
  requiredTowerLevel: number;
  maxLevel: number | null;
  baseCostShards: number;
  baseCostGold?: number;
  baseReqKnowledge: number;
  baseReqIntelligence: number;
  baseReqPower?: number;
  baseReqElementalMagic?: number;
  baseReqAstralMagic?: number;
  baseReqBloodMagic?: number;
  baseDurationSeconds: number;
  scaleMultiplier: number;
  costScaleMultiplier?: number;
  towerLevelPerUpgrade?: number[];
}

const BUILDING_CONFIG: Record<string, BuildingConfig> = {
  power_collector: {
    requiredTowerLevel: 1,
    maxLevel: null,
    baseCostShards: 1,
    baseReqKnowledge: 2,
    baseReqIntelligence: 2,
    baseDurationSeconds: 120,
    scaleMultiplier: 1.2,
  },
  storage: {
    requiredTowerLevel: 1,
    maxLevel: 30,
    baseCostShards: 5,
    baseReqKnowledge: 3,
    baseReqIntelligence: 3,
    baseReqPower: 1,
    baseDurationSeconds: 120,
    scaleMultiplier: 1.3,
  },
  library: {
    requiredTowerLevel: 1,
    maxLevel: 5,
    towerLevelPerUpgrade: [1, 10, 25, 50, 100], // indeks = docelowy poziom biblioteki (1-5)
    baseCostShards: 7,
    baseReqKnowledge: 3,
    baseReqIntelligence: 3,
    baseReqPower: 3,
    baseDurationSeconds: 120,
    scaleMultiplier: 5.0,
  },
  magic_hands: {
    requiredTowerLevel: 5,
    maxLevel: null,
    baseCostShards: 15,
    baseReqKnowledge: 10,
    baseReqIntelligence: 10,
    baseReqPower: 5,
    baseDurationSeconds: 300,
    scaleMultiplier: 1.3,
  },
  spy_orb: {
    requiredTowerLevel: 10,
    maxLevel: 1,
    baseCostShards: 200,
    baseCostGold: 200,
    baseReqKnowledge: 20,
    baseReqIntelligence: 15,
    baseReqPower: 25,
    baseDurationSeconds: 600,
    scaleMultiplier: 1.3,
  },
  candles: {
    requiredTowerLevel: 5,
    maxLevel: 20,
    baseCostShards: 0,
    baseCostGold: 100,
    baseReqKnowledge: 20,
    baseReqIntelligence: 0,
    baseReqElementalMagic: 10,
    baseReqAstralMagic: 0,
    baseReqBloodMagic: 0,
    baseDurationSeconds: 300,
    scaleMultiplier: 1.3,
    costScaleMultiplier: 2.0,
  },
  chaos_vault: {
  requiredTowerLevel: 1,
  maxLevel: 10,
  baseCostShards: 10,
  baseCostGold: 10,
  baseReqKnowledge: 5,
  baseReqIntelligence: 5,
  baseReqPower: 5,
  baseDurationSeconds: 150, // 2.5 minuty
  scaleMultiplier: 1.3,
},
disintegrator: {
  requiredTowerLevel: 10,
  maxLevel: 1,
  baseCostShards: 30,
  baseCostGold: 10,
  baseReqKnowledge: 5,
  baseReqIntelligence: 5,
  baseReqPower: 15,
  baseDurationSeconds: 300,
  scaleMultiplier: 1,
},
};

function scaleValue(base: number, level: number, multiplier = 1.3): number {
  if (base === 0) return 0;
  return Math.round(base * Math.pow(multiplier, level - 1));
}

function getBuildingReqs(type: string, currentLevel: number) {
  const cfg = BUILDING_CONFIG[type];
  if (!cfg) throw new Error(`Nieznany budynek: ${type}`);
  const scale = cfg.scaleMultiplier;
  const costScale = cfg.costScaleMultiplier ?? scale;
  const lvl = Math.max(currentLevel, 1);

  return {
    costShards:      currentLevel === 0 ? cfg.baseCostShards : scaleValue(cfg.baseCostShards, lvl, costScale),
    costGold:        currentLevel === 0 ? (cfg.baseCostGold ?? 0) : scaleValue(cfg.baseCostGold ?? 0, lvl, costScale),
    reqKnowledge:    currentLevel === 0 ? cfg.baseReqKnowledge : scaleValue(cfg.baseReqKnowledge, lvl, scale),
    reqIntelligence: currentLevel === 0 ? cfg.baseReqIntelligence : scaleValue(cfg.baseReqIntelligence, lvl, scale),
    reqPower:        currentLevel === 0 ? (cfg.baseReqPower ?? 0) : scaleValue(cfg.baseReqPower ?? 0, lvl, scale),
    reqElementalMagic:      currentLevel === 0 ? (cfg.baseReqElementalMagic ?? 0) : scaleValue(cfg.baseReqElementalMagic ?? 0, lvl, scale),
    reqAstralMagic:         currentLevel === 0 ? (cfg.baseReqAstralMagic ?? 0) : scaleValue(cfg.baseReqAstralMagic ?? 0, lvl, scale),
    reqBloodMagic:          currentLevel === 0 ? (cfg.baseReqBloodMagic ?? 0) : scaleValue(cfg.baseReqBloodMagic ?? 0, lvl, scale),
    durationSeconds: currentLevel === 0 ? cfg.baseDurationSeconds : scaleValue(cfg.baseDurationSeconds, lvl, scale),
  };
}

const BASE_PRODUCTION_PER_HOUR = 1;

// ── PRODUKCJA ZASOBÓW ────────────────────────────────

export async function collectResources(characterId: number) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { tower: { include: { buildings: true } } },
  });
  if (!character || !character.tower) return { collected: 0 };

  const now = new Date();
  const hoursElapsed = (now.getTime() - character.lastResourceCollect.getTime()) / 3600000;
  if (hoursElapsed < 0.001) return { collected: 0 };

  const buildings = character.tower.buildings;

  const pcLevel = buildings.find(b => b.buildingType === "power_collector")?.level ?? 0;
  const pcProduction = pcLevel > 0 ? scaleValue(2, pcLevel, 1.2) : 0;

  const magicHandsLevel = buildings.find(b => b.buildingType === "magic_hands")?.level ?? 0;
  const goldProduction = magicHandsLevel > 0 ? scaleValue(1, magicHandsLevel, 1.3) : 0;

  const shardsCollected = Math.floor((BASE_PRODUCTION_PER_HOUR + pcProduction) * hoursElapsed);
  const goldCollected   = Math.floor(goldProduction * hoursElapsed);

  if (shardsCollected <= 0 && goldCollected <= 0) return { collected: 0 };

  await prisma.character.update({
    where: { id: characterId },
    data: {
      powerShards: { increment: shardsCollected },
      gold:        { increment: goldCollected },
      lastResourceCollect: now,
    },
  });

  await alignmentTriggerService.checkTrigger(characterId, "GOLD_20000");
  await alignmentTriggerService.checkTrigger(characterId, "SHARDS_10000");

  return { shardsCollected, goldCollected };
}

// ── HELPER — sprawdź wymagania ───────────────────────

function checkUnmet(reqs: ReturnType<typeof getBuildingReqs>, character: any, towerLevel: number, requiredTowerLevel: number): string[] {
  const unmet: string[] = [];
  if (towerLevel < requiredTowerLevel)             unmet.push(`Poziom wieży ${requiredTowerLevel} (masz ${towerLevel})`);
  if (character.knowledge < reqs.reqKnowledge)     unmet.push(`Wiedza ${reqs.reqKnowledge} (masz ${character.knowledge})`);
  if (reqs.reqIntelligence > 0 && character.intelligence < reqs.reqIntelligence) unmet.push(`Inteligencja ${reqs.reqIntelligence} (masz ${character.intelligence})`);
  if (reqs.reqPower > 0 && character.power < reqs.reqPower)                       unmet.push(`Moc ${reqs.reqPower} (masz ${character.power})`);
  if (reqs.reqElementalMagic > 0 && character.elementalMagic < reqs.reqElementalMagic) unmet.push(`Magia ognia ${reqs.reqElementalMagic} (masz ${character.elementalMagic})`);
  if (reqs.costShards > 0 && character.powerShards < reqs.costShards)             unmet.push(`Okruchy mocy ${reqs.costShards} (masz ${character.powerShards})`);
  if (reqs.costGold > 0 && character.gold < reqs.costGold)                        unmet.push(`Złoto ${reqs.costGold} (masz ${character.gold})`);
  return unmet;
}

// ── INFORMACJE O WIEŻY ───────────────────────────────

export async function getTowerInfo(userId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { tower: { include: { buildings: true } } },
  });
  if (!character || !character.tower) throw new Error("Wieża nie znaleziona");

  await collectResources(character.id);

  // Odśwież dane po kolekcji
  const fresh = await prisma.character.findUnique({
    where: { id: character.id },
    include: { tower: { include: { buildings: true } } },
  });
  const char = fresh!;
  const tower = char.tower!;

  const towerUpgradeReqs = {
    knowledge:    scaleValue(TOWER_BASE_REQ.knowledge, tower.level, 1.2),
    intelligence: scaleValue(TOWER_BASE_REQ.intelligence, tower.level, 1.2),
    durationSeconds: scaleValue(TOWER_BASE_DURATION_SECONDS, tower.level, 1.2),
  };

  function buildingInfo(type: string) {
    const b = tower.buildings.find(b => b.buildingType === type);
    const cfg = BUILDING_CONFIG[type];
    const level = b?.level ?? 0;
    const reqs = getBuildingReqs(type, level);
    const atMaxLevel = cfg.maxLevel !== null && level >= cfg.maxLevel;
    const unmet = atMaxLevel ? [] : checkUnmet(reqs, char, tower.level, cfg.requiredTowerLevel);

    return {
      level,
      isUpgrading: b?.isUpgrading ?? false,
      upgradeFinishesAt: b?.upgradeFinishesAt ?? null,
      atMaxLevel,
      maxLevel: cfg.maxLevel,
      requiredTowerLevel: cfg.requiredTowerLevel,
      towerLevelMet: tower.level >= cfg.requiredTowerLevel,
      canUpgrade: !atMaxLevel && !(b?.isUpgrading) && unmet.length === 0,
      unmetReqs: unmet,
      upgradeReqs: reqs,
    };
  }

  const pcInfo = buildingInfo("power_collector");
  const pcLevel = pcInfo.level;
  const mhLevel = buildingInfo("magic_hands").level;
  const candlesLevel = buildingInfo("candles").level;
  const cvLevel = buildingInfo("chaos_vault").level;

  return {
    tower: {
      level: tower.level,
      isUpgrading: tower.isUpgrading,
      upgradeFinishesAt: tower.upgradeFinishesAt,
      nextLevel: tower.level + 1,
      upgradeReqs: towerUpgradeReqs,
      canUpgrade: !tower.isUpgrading &&
        char.knowledge >= towerUpgradeReqs.knowledge &&
        char.intelligence >= towerUpgradeReqs.intelligence,
      unmetReqs: (() => {
        const u: string[] = [];
        if (char.knowledge < towerUpgradeReqs.knowledge) u.push(`Wiedza ${towerUpgradeReqs.knowledge} (masz ${char.knowledge})`);
        if (char.intelligence < towerUpgradeReqs.intelligence) u.push(`Inteligencja ${towerUpgradeReqs.intelligence} (masz ${char.intelligence})`);
        return u;
      })(),
    },
    buildings: {
      power_collector: { ...pcInfo, currentProduction: pcLevel > 0 ? scaleValue(2, pcLevel, 1.2) : 0 },
      storage:         buildingInfo("storage"),
      library:         buildingInfo("library"),
      magic_hands:     { ...buildingInfo("magic_hands"), currentGoldProduction: mhLevel > 0 ? scaleValue(1, mhLevel, 1.3) : 0 },
      spy_orb:         buildingInfo("spy_orb"),
      candles:         { ...buildingInfo("candles"), currentBonus: candlesLevel },
      chaos_vault: { ...buildingInfo("chaos_vault"), visibleSlots: cvLevel * 5 },
      disintegrator: buildingInfo("disintegrator"),
    },
    resources: {
      powerShards: char.powerShards,
      gold: char.gold,
      productionPerHour: BASE_PRODUCTION_PER_HOUR + (pcLevel > 0 ? scaleValue(2, pcLevel, 1.2) : 0),
      goldPerHour: mhLevel > 0 ? scaleValue(1, mhLevel, 1.3) : 0,
    },
  };
}

// ── GENERYCZNA FUNKCJA ROZBUDOWY ─────────────────────

async function startBuildingUpgrade(userId: number, buildingType: string) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { tower: { include: { buildings: true } } },
  });
  if (!character || !character.tower) throw new Error("Wieża nie znaleziona");

  const cfg = BUILDING_CONFIG[buildingType];
  if (!cfg) throw new Error("Nieznany budynek");

  if (character.tower.level < cfg.requiredTowerLevel)
    throw new Error(`Wymagany poziom wieży: ${cfg.requiredTowerLevel}`);

  const existing = character.tower.buildings.find(b => b.buildingType === buildingType);
  if (existing?.isUpgrading) throw new Error("Budynek jest już w trakcie rozbudowy");

  const currentLevel = existing?.level ?? 0;
  if (cfg.maxLevel !== null && currentLevel >= cfg.maxLevel)
    throw new Error(`Budynek osiągnął maksymalny poziom (${cfg.maxLevel})`);

  const reqs = getBuildingReqs(buildingType, currentLevel);
  const unmet = checkUnmet(reqs, character, character.tower.level, cfg.requiredTowerLevel);
  if (unmet.length > 0) throw new Error(`Nie spełniasz wymagań: ${unmet.join(", ")}`);

  const finishesAt = new Date(Date.now() + reqs.durationSeconds * 1000);

if (buildingType === "library") {
  const nextLevel = currentLevel + 1; // 1..5
  const requiredTowerLevels = [1, 10, 25, 50, 100];
  const requiredTower = requiredTowerLevels[nextLevel - 1];
  if (character.tower.level < requiredTower) {
    throw new Error(
      `LIBRARY_TOWER_LOCKED:${requiredTower}`
    );
  }
}

  // Pobierz koszt
  await prisma.character.update({
    where: { id: character.id },
    data: {
      powerShards: { decrement: reqs.costShards },
      gold:        { decrement: reqs.costGold },
    },
  });

  if (existing) {
    await prisma.towerBuilding.update({
      where: { id: existing.id },
      data: { isUpgrading: true, upgradeFinishesAt: finishesAt },
    });
  } else {
    await prisma.towerBuilding.create({
      data: {
        towerId: character.tower.id,
        buildingType,
        level: 0,
        isUpgrading: true,
        upgradeFinishesAt: finishesAt,
      },
    });
  }

  return { finishesAt, durationSeconds: reqs.durationSeconds };
}

async function claimBuildingUpgrade(userId: number, buildingType: string) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { tower: { include: { buildings: true } } },
  });
  if (!character || !character.tower) throw new Error("Wieża nie znaleziona");

  const existing = character.tower.buildings.find(b => b.buildingType === buildingType);
  if (!existing?.isUpgrading) throw new Error("Budynek nie jest w trakcie rozbudowy");
  if (existing.upgradeFinishesAt && new Date() < existing.upgradeFinishesAt)
    throw new Error("Rozbudowa jeszcze trwa");

  const newLevel = existing.level + 1;

  await prisma.towerBuilding.update({
    where: { id: existing.id },
    data: { level: newLevel, isUpgrading: false, upgradeFinishesAt: null },
  });

  // Efekty ukończenia budynku
  const updates: Record<string, any> = {};
  if (buildingType === "storage") updates.maxItems = { increment: 10 };
  if (Object.keys(updates).length > 0) {
    await prisma.character.update({ where: { id: character.id }, data: updates });
  }

  return { newLevel };
}

// ── EKSPORTOWANE FUNKCJE ─────────────────────────────

export const startTowerUpgrade = async (userId: number) => {
  const character = await prisma.character.findUnique({ where: { userId }, include: { tower: true } });
  if (!character || !character.tower) throw new Error("Wieża nie znaleziona");
  if (character.tower.isUpgrading) throw new Error("Wieża jest już w trakcie rozbudowy");

  const reqs = {
    knowledge:    scaleValue(TOWER_BASE_REQ.knowledge, character.tower.level, 1.2),
    intelligence: scaleValue(TOWER_BASE_REQ.intelligence, character.tower.level, 1.2),
    durationSeconds: scaleValue(TOWER_BASE_DURATION_SECONDS, character.tower.level, 1.2),
  };
  if (character.knowledge < reqs.knowledge) throw new Error(`Wymagana Wiedza: ${reqs.knowledge}`);
  if (character.intelligence < reqs.intelligence) throw new Error(`Wymagana Inteligencja: ${reqs.intelligence}`);

  const finishesAt = new Date(Date.now() + reqs.durationSeconds * 1000);
  await prisma.tower.update({ where: { id: character.tower.id }, data: { isUpgrading: true, upgradeFinishesAt: finishesAt } });
  return { finishesAt };
};

export const claimTowerUpgrade = async (userId: number) => {
  const character = await prisma.character.findUnique({ where: { userId }, include: { tower: true } });
  if (!character || !character.tower) throw new Error("Wieża nie znaleziona");
  if (!character.tower.isUpgrading) throw new Error("Wieża nie jest w trakcie rozbudowy");
  if (character.tower.upgradeFinishesAt && new Date() < character.tower.upgradeFinishesAt) throw new Error("Rozbudowa jeszcze trwa");
  const newLevel = character.tower.level + 1;
  await prisma.tower.update({ where: { id: character.tower.id }, data: { level: { increment: 1 }, isUpgrading: false, upgradeFinishesAt: null } });
  await alignmentTriggerService.checkTrigger(character.id, "TOWER_LEVEL_50", { towerLevel: newLevel });
  
  return { newLevel: character.tower.level + 1 };
};

export function getSpellSlotCount(libraryLevel: number, extraSlots: number = 0): number {
  // poziom 0 = 0 slotów, 1=1, 2=2, 3=3, 4=4, 5=5 (max 5)
  return Math.min(libraryLevel, 5) + extraSlots;

}

export const startPowerCollectorUpgrade   = (userId: number) => startBuildingUpgrade(userId, "power_collector");
export const claimPowerCollectorUpgrade   = (userId: number) => claimBuildingUpgrade(userId, "power_collector");
export const startStorageUpgrade          = (userId: number) => startBuildingUpgrade(userId, "storage");
export const claimStorageUpgrade          = (userId: number) => claimBuildingUpgrade(userId, "storage");
export const startLibraryUpgrade          = (userId: number) => startBuildingUpgrade(userId, "library");
export const claimLibraryUpgrade          = (userId: number) => claimBuildingUpgrade(userId, "library");
export const startMagicHandsUpgrade       = (userId: number) => startBuildingUpgrade(userId, "magic_hands");
export const claimMagicHandsUpgrade       = (userId: number) => claimBuildingUpgrade(userId, "magic_hands");
export const startSpyOrbUpgrade           = (userId: number) => startBuildingUpgrade(userId, "spy_orb");
export const claimSpyOrbUpgrade           = (userId: number) => claimBuildingUpgrade(userId, "spy_orb");
export const startCandlesUpgrade          = (userId: number) => startBuildingUpgrade(userId, "candles");
export const claimCandlesUpgrade          = (userId: number) => claimBuildingUpgrade(userId, "candles");
export const startChaosVaultUpgrade = (userId: number) => startBuildingUpgrade(userId, "chaos_vault");
export const claimChaosVaultUpgrade = (userId: number) => claimBuildingUpgrade(userId, "chaos_vault");
export const startDisintegratorUpgrade = (userId: number) => startBuildingUpgrade(userId, "disintegrator");
export const claimDisintegratorUpgrade = (userId: number) => claimBuildingUpgrade(userId, "disintegrator");