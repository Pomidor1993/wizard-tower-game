import prisma from "../lib/prisma.js";

const RARITY_VALUE_SHARDS: Record<string, number> = {
  common:   10,
  uncommon: 20,
  rare:     50,
  unique:   100,
};

const RARITY_VALUE_PRESTIGE: Record<string, number> = {
  common:   1,
  uncommon: 2,
  rare:     5,
  unique:   10,
};

export type DisintegrateCurrency = "shards" | "prestige";

// Każdy tier ponad 1 dodaje +10% do bazowej wartości nagrody.
// Tier 1 = ×1.0, tier 10 = ×1.9 (zgodnie z: unikalny tier 10 = 30 + 30×0,9)
function tierRewardMultiplier(tier: number): number {
  return 1 + (tier - 1) * 0.1;
}

function rewardForItem(rarity: string, tier: number, currency: DisintegrateCurrency): number {
  const baseTable = currency === "prestige" ? RARITY_VALUE_PRESTIGE : RARITY_VALUE_SHARDS;
  const base = baseTable[rarity] ?? (currency === "prestige" ? 1 : 10);
  return Math.floor(base * tierRewardMultiplier(tier));
}

export async function previewDisintegrate(
  userId: number,
  chaosVaultItemIds: number[],
  currency: DisintegrateCurrency = "shards"
) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const tower = await prisma.tower.findUnique({
    where: { characterId: character.id },
    include: { buildings: true },
  });
  const disintegrator = tower?.buildings.find(b => b.buildingType === "disintegrator");
  if (!disintegrator || disintegrator.level === 0) throw new Error("Wybuduj Dezintegrator najpierw");

  const entries = await prisma.chaosVaultItem.findMany({
    where: { id: { in: chaosVaultItemIds }, ownedItem: { characterId: character.id } },
    include: { ownedItem: { include: { item: true } } },
  });

  const items: {
    chaosVaultItemId: number;
    ownedItemId: number;
    name: string;
    rarity: string;
    tier: number;
    value: number;
  }[] = [];
  let totalReward = 0;

  for (const entry of entries) {
    const item = entry.ownedItem.item;
    const tier = entry.ownedItem.tier;
    const value = rewardForItem(item.rarity, tier, currency);
    items.push({
      chaosVaultItemId: entry.id,
      ownedItemId: entry.ownedItemId,
      name: item.name,
      rarity: item.rarity,
      tier,
      value,
    });
    totalReward += value;
  }

  return { items, totalReward, currency };
}

export async function confirmDisintegrate(
  userId: number,
  chaosVaultItemIds: number[],
  currency: DisintegrateCurrency = "shards"
) {
  const preview = await previewDisintegrate(userId, chaosVaultItemIds, currency);
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const ownedItemIds = preview.items.map(i => i.ownedItemId);

  if (ownedItemIds.length > 0) {
    // Usuń ChaosVaultItem, a następnie OwnedItem (jeśli brak cascade w schemie)
    await prisma.chaosVaultItem.deleteMany({
      where: { ownedItemId: { in: ownedItemIds } },
    });
    await prisma.ownedItem.deleteMany({
      where: { id: { in: ownedItemIds }, characterId: character.id },
    });
  }

  await prisma.character.update({
    where: { id: character.id },
    data:
      currency === "prestige"
        ? { prestige: { increment: preview.totalReward } }
        : { powerShards: { increment: preview.totalReward } },
  });

  const currencyLabel = currency === "prestige" ? "prestiżu" : "okruchów mocy";

  return {
    destroyed: preview.items.length,
    currency,
    rewardGained: preview.totalReward,
    message: `Zniszczono ${preview.items.length} przedmiotów. Zdobyto ${preview.totalReward} ${currencyLabel}.`,
  };
}