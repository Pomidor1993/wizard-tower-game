import prisma from "../lib/prisma.js";
import { archetypeTriggerService } from "./archetype/archetype-trigger.service.js";

const RARITY_VALUE: Record<string, number> = {
  common:   10,
  uncommon: 25,
  rare:     50,
  unique:   100,
};

export async function previewDisintegrate(userId: number, chaosVaultItemIds: number[]) {
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

  const items: { chaosVaultItemId: number; ownedItemId: number; name: string; rarity: string; value: number }[] = [];
  let totalShards = 0;

  for (const entry of entries) {
    const item = entry.ownedItem.item;
    const value = RARITY_VALUE[item.rarity] ?? 10;
    items.push({ chaosVaultItemId: entry.id, ownedItemId: entry.ownedItemId, name: item.name, rarity: item.rarity, value });
    totalShards += value;
  }

  return { items, totalShards };
}

export async function confirmDisintegrate(userId: number, chaosVaultItemIds: number[]) {
  const preview = await previewDisintegrate(userId, chaosVaultItemIds);
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
    data: { powerShards: { increment: preview.totalShards } },
  });

  await archetypeTriggerService.checkTrigger(character.id, "FIRST_ITEM_DESTROYED", {
    destroyed: preview.items.length > 0,
  });
  await archetypeTriggerService.checkTrigger(character.id, "SHARDS_10000");

  return {
    destroyed: preview.items.length,
    shardsGained: preview.totalShards,
    message: `Zniszczono ${preview.items.length} przedmiotów. Zdobyto ${preview.totalShards} okruchów mocy.`,
  };
}