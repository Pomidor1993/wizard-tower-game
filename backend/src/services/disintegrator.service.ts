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
    where: { id: { in: chaosVaultItemIds }, characterId: character.id, itemId: { not: null } },
    include: { item: true },
  });

  const items: { chaosVaultItemId: number; name: string; rarity: string; value: number }[] = [];
  let totalShards = 0;

  for (const entry of entries) {
    if (!entry.item) continue;
    const value = RARITY_VALUE[entry.item.rarity] ?? 10;
    items.push({ chaosVaultItemId: entry.id, name: entry.item.name, rarity: entry.item.rarity, value });
    totalShards += value;
  }

  return { items, totalShards };
}

export async function confirmDisintegrate(userId: number, chaosVaultItemIds: number[]) {
  const preview = await previewDisintegrate(userId, chaosVaultItemIds);
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const idsToDelete = preview.items.map(i => i.chaosVaultItemId);
  if (idsToDelete.length > 0) {
    await prisma.chaosVaultItem.deleteMany({
      where: { id: { in: idsToDelete }, characterId: character.id },
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