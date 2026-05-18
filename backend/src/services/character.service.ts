import prisma from "../lib/prisma.js";

// ── KONFIGURACJA STATYSTYK ───────────────────────────
const UPGRADEABLE_STATS = [
  "knowledge",
  "intelligence",
  "power",
  "endurance",
  "resistance",
  "initiative",

  "fireMagic",
  "waterMagic",
  "earthMagic",
  "airMagic",
  "lifeMagic",
  "deathMagic",
  "chaosMagic",
  "energyMagic",
] as const;

type UpgradeableStat = typeof UPGRADEABLE_STATS[number];

// Koszt następnego poziomu = koszt poprzedniego * 1.30, poziom 1 = 1 pkt
export function calculateUpgradeCost(currentLevel: number): number {
  let cost = 1;
  for (let i = 0; i < currentLevel; i++) {
    cost = cost * 1.3;
  }
  return Math.round(cost);
}

// ── WYDAJ PUNKTY NA STATYSTYKĘ ───────────────────────
export async function upgradeStat(userId: number, stat: string) {
  // Walidacja czy stat istnieje
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
      `Brak punktów umiejętności. Potrzebujesz ${cost} pkt, masz ${character.skillPoints} pkt.`
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
      fireMagic: true,
      waterMagic: true,
      earthMagic: true,
      airMagic: true,
      lifeMagic: true,
      deathMagic: true,
      chaosMagic: true,
      energyMagic: true,

    },
  });

  return {
    stat,
    newLevel: currentLevel + 1,
    costPaid: cost,
    skillPointsRemaining: updated.skillPoints,
    nextUpgradeCost: calculateUpgradeCost(currentLevel + 1),
    stats: updated,
  };
}

// ── PODGLĄD KOSZTÓW ──────────────────────────────────
export async function getUpgradeCosts(userId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    select: {
      skillPoints: true,
      knowledge: true,
      intelligence: true,
      power: true,
      endurance: true,
      resistance: true,
      initiative: true,
      fireMagic: true,
      waterMagic: true,
      earthMagic: true,
      airMagic: true,
      lifeMagic: true,
      deathMagic: true,
      chaosMagic: true,
      energyMagic: true,
    },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  const { skillPoints, ...stats } = character;

  const costs = Object.entries(stats).map(([stat, level]) => ({
    stat,
    currentLevel: level,
    upgradeCost: calculateUpgradeCost(level as number),
    canAfford: skillPoints >= calculateUpgradeCost(level as number),
  }));

  return { skillPoints, costs };
}