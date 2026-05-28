import prisma from "../lib/prisma.js";
import { alignmentTriggerService } from "./alignment/alignment-trigger.service.js";

const RARITY_VALUE: Record<string, number> = {
  common:   10,
  uncommon: 25,
  rare:     50,
  unique:   100,
};

interface DisintegrateTarget {
  type: "item" | "spell" | "vault_item" | "vault_spell";
  id: number; // characterItemId, characterSpellId lub chaosVaultItemId
}

export async function previewDisintegrate(userId: number, targets: DisintegrateTarget[]) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  // Sprawdź czy ma dezintegrator
  const tower = await prisma.tower.findUnique({
    where: { characterId: character.id },
    include: { buildings: true },
  });
  const disintegrator = tower?.buildings.find(b => b.buildingType === "disintegrator");
  if (!disintegrator || disintegrator.level === 0) throw new Error("Wybuduj Dezintegrator najpierw");

  const items: { name: string; rarity: string; value: number; type: string; id: number }[] = [];
  let totalShards = 0;

  for (const target of targets) {
    if (target.type === "item") {
      const ci = await prisma.characterItem.findFirst({
        where: { id: target.id, characterId: character.id },
        include: { item: true },
      });
      if (ci) {
        const value = RARITY_VALUE[ci.item.rarity] ?? 10;
        items.push({ name: ci.item.name, rarity: ci.item.rarity, value, type: "item", id: target.id });
        totalShards += value;
      }
    } else if (target.type === "spell") {
      const cs = await prisma.characterSpell.findFirst({
        where: { id: target.id, characterId: character.id },
        include: { spell: true },
      });
      if (cs) {
        const value = RARITY_VALUE[cs.spell.rarity] ?? 10;
        items.push({ name: cs.spell.name, rarity: cs.spell.rarity, value, type: "spell", id: target.id });
        totalShards += value;
      }
    } else if (target.type === "vault_item") {
      const vi = await prisma.chaosVaultItem.findFirst({
        where: { id: target.id, characterId: character.id },
        include: { item: true },
      });
      if (vi?.item) {
        const value = RARITY_VALUE[vi.item.rarity] ?? 10;
        items.push({ name: vi.item.name, rarity: vi.item.rarity, value, type: "vault_item", id: target.id });
        totalShards += value;
      }
    } else if (target.type === "vault_spell") {
      const vs = await prisma.chaosVaultItem.findFirst({
        where: { id: target.id, characterId: character.id },
        include: { spell: true },
      });
      if (vs?.spell) {
        const value = RARITY_VALUE[vs.spell.rarity] ?? 10;
        items.push({ name: vs.spell.name, rarity: vs.spell.rarity, value, type: "vault_spell", id: target.id });
        totalShards += value;
      }
    }
  }

  return { items, totalShards };
}

export async function confirmDisintegrate(userId: number, targets: DisintegrateTarget[]) {
  const preview = await previewDisintegrate(userId, targets);
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  // Usuń wszystkie zaznaczone przedmioty
  for (const target of targets) {
    if (target.type === "item") {
      await prisma.characterItem.deleteMany({
        where: { id: target.id, characterId: character.id },
      });
    } else if (target.type === "spell") {
      // Usuń też z slotów czarów jeśli był założony
      const cs = await prisma.characterSpell.findFirst({ where: { id: target.id } });
      if (cs) {
        await prisma.characterSpellSlots.deleteMany({
          where: { characterId: character.id, spellId: cs.spellId },
        });
        await prisma.characterSpell.deleteMany({
          where: { id: target.id, characterId: character.id },
        });
      }
    } else if (target.type === "vault_item" || target.type === "vault_spell") {
      await prisma.chaosVaultItem.deleteMany({
        where: { id: target.id, characterId: character.id },
      });
    }
  }

  // Dodaj okruchy mocy
  await prisma.character.update({
    where: { id: character.id },
    data: { powerShards: { increment: preview.totalShards } },
  });

  await alignmentTriggerService.checkTrigger(character.id, "FIRST_ITEM_DESTROYED", {
    destroyed: preview.items.length > 0
  });
  await alignmentTriggerService.checkTrigger(character.id, "SHARDS_10000");

  return {
    destroyed: preview.items.length,
    shardsGained: preview.totalShards,
    message: `Zniszczono ${preview.items.length} przedmiotów. Zdobyto ${preview.totalShards} okruchów mocy.`,
  };
}