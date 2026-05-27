import prisma from "../lib/prisma.js";

// ── KONFIGURACJA STATYSTYK ───────────────────────────
const UPGRADEABLE_STATS = [
  "knowledge",
  "intelligence",
  "power",
  "endurance",
  "resistance",
  "initiative",
  "elementPower",
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
      elementPower: true,
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

export async function upgradeElement(
  userId: number,
  element: string
) {

  const character = await prisma.character.findUnique({
    where: { userId },
  });

  if (!character) {
    throw new Error("Postać nie istnieje");
  }

  const PAIRS: Record<string, [keyof typeof character, keyof typeof character]> = {
    fireMagic:   ["fireMagic", "waterMagic"],
    waterMagic:  ["fireMagic", "waterMagic"],

    earthMagic: ["earthMagic", "airMagic"],
    airMagic:   ["earthMagic", "airMagic"],

    energyMagic: ["energyMagic", "chaosMagic"],
    chaosMagic:  ["energyMagic", "chaosMagic"],

    lifeMagic:  ["lifeMagic", "deathMagic"],
    deathMagic: ["lifeMagic", "deathMagic"],
  };

  const pair = PAIRS[element];

  if (!pair) {
    throw new Error("Nieprawidłowy żywioł");
  }

  const [left, right] = pair;

  const currentTotal =
    Number(character[left]) +
    Number(character[right]);

  if (currentTotal >= character.elementPower) {
    throw new Error(
      "W tej parze rozdano już wszystkie punkty."
    );
  }

  await prisma.character.update({
    where: { userId },
    data: {
      [element]: {
        increment: 1,
      },
    },
  });

  return { success: true };
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
      elementPower: true,
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
// Pary żywiołów — suma każdej pary musi być <= elementPower
const ELEMENT_PAIRS: [string, string][] = [
  ["fireMagic",  "waterMagic"],
  ["earthMagic", "airMagic"],
  ["chaosMagic", "energyMagic"],
  ["lifeMagic",  "deathMagic"],
];

export async function distributeElements(
  userId: number,
  distribution: Partial<Record<string, number>>
): Promise<void> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const fields = [
    "fireMagic","waterMagic","earthMagic","airMagic",
    "lifeMagic","deathMagic","chaosMagic","energyMagic",
  ];

  // Walidacja — tylko znane pola
  for (const key of Object.keys(distribution)) {
    if (!fields.includes(key)) throw new Error(`Nieznany żywioł: ${key}`);
  }

  // Walidacja — każda wartość >= 0
  for (const [key, val] of Object.entries(distribution)) {
    if ((val ?? 0) < 0) throw new Error(`Wartość ${key} nie może być ujemna`);
  }

  // Walidacja — suma każdej pary <= elementPower
  for (const [a, b] of ELEMENT_PAIRS) {
    const valA = distribution[a] ?? (character[a as keyof typeof character] as number);
    const valB = distribution[b] ?? (character[b as keyof typeof character] as number);
    if (valA + valB > character.elementPower) {
      throw new Error(
        `Suma ${a} + ${b} (${valA + valB}) przekracza Moc Żywiołów (${character.elementPower})`
      );
    }
  }

  await prisma.character.update({
    where: { id: character.id },
    data: distribution as any,
  });
}