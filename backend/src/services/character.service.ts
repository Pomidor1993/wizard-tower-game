import prisma from "../lib/prisma.js";
import { archetypeTriggerService } from "./archetype/archetype-trigger.service.js";

// ── KONFIGURACJA STATYSTYK ───────────────────────────
const UPGRADEABLE_STATS = [
  "knowledge",
  "intelligence",
  "power",
  "endurance",
  "resistance",
  "initiative",
  "elementalMagic",
  "astralMagic",
  "bloodMagic",
] as const;

type UpgradeableStat = typeof UPGRADEABLE_STATS[number];

// ── DOŚWIADCZENIE I POZIOMY ───────────────────────────
export function calculateXpForNextLevel(currentLevel: number): number {
  return Math.round(300 * Math.pow(1.4, currentLevel - 1));
}

const SKILL_POINTS_PER_LEVEL = 5;

export async function addExperience(characterId: number, amount: number) {
  if (amount <= 0) throw new Error("Ilość doświadczenia musi być dodatnia");

  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  let level = character.level;
  let experience = character.experience + amount;
  let levelsGained = 0;

  let xpNeeded = calculateXpForNextLevel(level);
  while (experience >= xpNeeded) {
    experience -= xpNeeded;
    level += 1;
    levelsGained += 1;
    xpNeeded = calculateXpForNextLevel(level);
  }

  const skillPointsGained = levelsGained * SKILL_POINTS_PER_LEVEL;

  const updated = await prisma.character.update({
    where: { id: characterId },
    data: {
      level,
      experience,
      skillPoints: { increment: skillPointsGained },
    },
    select: {
      level: true,
      experience: true,
      skillPoints: true,
    },
  });

  if (levelsGained > 0) {
    await archetypeTriggerService.checkTrigger(characterId, "CHARACTER_LEVEL_UP");
  }

  return {
    level: updated.level,
    experience: updated.experience,
    xpToNextLevel: xpNeeded,
    levelsGained,
    skillPointsGained,
    skillPoints: updated.skillPoints,
  };
}

// ── KOSZT ULEPSZENIA STATYSTYKI ───────────────────────
// 1-19 -> 1pkt, 20-39 -> 2pkt, 40-59 -> 3pkt, itd. (co 20 poziomów +1 koszt)
export function calculateUpgradeCost(currentLevel: number): number {
  return Math.floor(currentLevel / 20) + 1;
}

// ── DOŚWIADCZENIE ZA POJEDYNKI PVP ───────────────────
const DUEL_XP_MIN = 20;
const DUEL_XP_MAX = 30;
const DUEL_XP_PERCENT_PER_LEVEL_DIFF = 0.08; // 8% za każdy poziom różnicy
const DUEL_XP_MODIFIER_MIN = 0.5;
const DUEL_XP_MODIFIER_MAX = 1.5;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Zwraca ilość XP, jaką zdobywa zwycięzca pojedynku.
// Przegrany nie otrzymuje doświadczenia.
export function calculateDuelExperience(winnerLevel: number, loserLevel: number): number {
  const baseXp = randomInt(DUEL_XP_MIN, DUEL_XP_MAX);

  // dodatnia różnica = zwycięzca był silniejszy -> mniej XP
  // ujemna różnica = zwycięzca był słabszy -> więcej XP
  const levelDiff = winnerLevel - loserLevel;
  let modifier = 1 - levelDiff * DUEL_XP_PERCENT_PER_LEVEL_DIFF;
  modifier = Math.min(DUEL_XP_MODIFIER_MAX, Math.max(DUEL_XP_MODIFIER_MIN, modifier));

  return Math.round(baseXp * modifier);
}

// ── WYDAJ PUNKTY NA STATYSTYKĘ ────────────────────────
export async function upgradeStat(userId: number, stat: string) {
  if (!UPGRADEABLE_STATS.includes(stat as UpgradeableStat)) {
    throw new Error(`Nieznana statystyka: ${stat}`);
  }

  const character = await prisma.character.findUnique({
    where: { userId },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  const currentLevel = character[stat as UpgradeableStat] as number;
  const cost = calculateUpgradeCost(currentLevel);

  if (character.skillPoints < cost) {
    throw new Error(
      `Brak punktów rozwoju. Potrzebujesz ${cost} pkt, masz ${character.skillPoints} pkt.`
    );
  }

  const updated = await prisma.character.update({
    where: { id: character.id },
    data: {
      [stat]: { increment: 1 },
      skillPoints: { decrement: cost },
    },
    select: {
      skillPoints: true,
      knowledge: true,
      intelligence: true,
      power: true,
      endurance: true,
      resistance: true,
      initiative: true,
      elementalMagic: true,
      astralMagic: true,
      bloodMagic: true,
    },
  });

  const statTriggers = [
    "ANY_MAGIC_LEVEL_20",
    "KNOWLEDGE_INTEL_30",
  ];

  for (const code of statTriggers) {
    await archetypeTriggerService.checkTrigger(character.id, code);
  }

  return {
    stat,
    newLevel: currentLevel + 1,
    costPaid: cost,
    skillPointsRemaining: updated.skillPoints,
    nextUpgradeCost: calculateUpgradeCost(currentLevel + 1),
    stats: updated,
  };
}

// ── PODGLĄD KOSZTÓW ────────────────────────────────────
export async function getUpgradeCosts(userId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    select: {
      skillPoints: true,
      level: true,
      experience: true,
      knowledge: true,
      intelligence: true,
      power: true,
      endurance: true,
      resistance: true,
      initiative: true,
      elementalMagic: true,
      astralMagic: true,
      bloodMagic: true,
    },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  const { skillPoints, level, experience, ...stats } = character;

  const costs = Object.entries(stats).map(([stat, value]) => ({
    stat,
    currentLevel: value,
    upgradeCost: calculateUpgradeCost(value as number),
    canAfford: skillPoints >= calculateUpgradeCost(value as number),
  }));

  return {
    skillPoints,
    level,
    experience,
    xpToNextLevel: calculateXpForNextLevel(level),
    costs,
  };
}