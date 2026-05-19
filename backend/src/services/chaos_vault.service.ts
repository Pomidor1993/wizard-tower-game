import prisma from "../lib/prisma.js";

// Ile przedmiotów widzi gracz zależnie od poziomu budynku
export function getVisibleSlots(buildingLevel: number): number {
  return Math.min(buildingLevel * 5, 50);
}

// Sprawdź czy gracz ma wybudowaną komnatę
async function getChaosVaultLevel(characterId: number): Promise<number> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { tower: { include: { buildings: true } } },
  });
  const building = character?.tower?.buildings.find(b => b.buildingType === "chaos_vault");
  return building?.level ?? 0;
}

// Dodaj przedmiot do komnaty nieładu
export async function addItemToChaosVault(characterId: number, itemId: number) {
  await prisma.chaosVaultItem.create({
    data: { characterId, itemId },
  });
}

// Dodaj czar do komnaty nieładu
export async function addSpellToChaosVault(characterId: number, spellId: number) {
  await prisma.chaosVaultItem.create({
    data: { characterId, spellId },
  });
}

// Pobierz widoczne przedmioty z komnaty
export async function getChaosVault(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const vaultLevel = await getChaosVaultLevel(character.id);
  const visibleSlots = getVisibleSlots(vaultLevel);
  const totalCount = await prisma.chaosVaultItem.count({
    where: { characterId: character.id },
  });

  const items = await prisma.chaosVaultItem.findMany({
    where: { characterId: character.id },
    orderBy: { addedAt: "desc" },
    take: visibleSlots,
    include: {
      item: true,
      spell: true,
    },
  });

  return {
    vaultLevel,
    visibleSlots,
    totalCount,
    hiddenCount: Math.max(0, totalCount - visibleSlots),
    items,
  };
}

// Przenieś czar z komnaty do biblioteki
export async function moveSpellFromVault(userId: number, vaultItemId: number, replaceSpellId?: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { spells: true },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const vaultItem = await prisma.chaosVaultItem.findFirst({
    where: { id: vaultItemId, characterId: character.id },
    include: { spell: true },
  });
  if (!vaultItem || !vaultItem.spellId) throw new Error("Czar nie znaleziony w komnacie");

  const currentSpellCount = character.spells.length;

  if (currentSpellCount >= character.maxSpells) {
    // Musi wybrać który czar zastąpić
    if (!replaceSpellId) {
      throw new Error("NEEDS_REPLACE");
    }
    // Usuń stary czar z biblioteki i wrzuć do komnaty
    await prisma.characterSpell.deleteMany({
      where: { characterId: character.id, spellId: replaceSpellId },
    });
    await prisma.chaosVaultItem.create({
      data: { characterId: character.id, spellId: replaceSpellId },
    });
  }

  // Przenieś czar z komnaty do biblioteki
  await prisma.characterSpell.create({
    data: { characterId: character.id, spellId: vaultItem.spellId },
  });
  await prisma.chaosVaultItem.delete({ where: { id: vaultItemId } });

  return { message: "Czar przeniesiony do biblioteki" };
}

// Przenieś przedmiot z komnaty do graciarni
export async function moveItemFromVault(userId: number, vaultItemId: number, replaceItemId?: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { items: true },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const vaultItem = await prisma.chaosVaultItem.findFirst({
    where: { id: vaultItemId, characterId: character.id },
    include: { item: true },
  });
  if (!vaultItem || !vaultItem.itemId) throw new Error("Przedmiot nie znaleziony w komnacie");

  const currentItemCount = character.items.length;

  if (currentItemCount >= character.maxItems) {
    if (!replaceItemId) throw new Error("NEEDS_REPLACE");
    await prisma.characterItem.deleteMany({
      where: { characterId: character.id, itemId: replaceItemId },
    });
    await prisma.chaosVaultItem.create({
      data: { characterId: character.id, itemId: replaceItemId },
    });
  }

  await prisma.characterItem.create({
    data: { characterId: character.id, itemId: vaultItem.itemId },
  });
  await prisma.chaosVaultItem.delete({ where: { id: vaultItemId } });

  return { message: "Przedmiot przeniesiony do graciarni" };
}
export async function addToVaultFromInventory(
  userId: number,
  type: "item" | "spell",
  sourceId: number // characterItemId lub characterSpellId
) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { equipment: true },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  if (type === "item") {
    const ci = await prisma.characterItem.findFirst({
      where: { id: sourceId, characterId: character.id },
    });
    if (!ci) throw new Error("Przedmiot nie znaleziony w graciarni");

    const eq = character.equipment;
    const equippedIds = [
      eq?.robeId, eq?.bootsId, eq?.hatId,
      eq?.amuletId, eq?.mainHandId, eq?.offHandId,
    ].filter(Boolean);
    if (equippedIds.includes(ci.itemId)) {
      throw new Error("Najpierw zdejmij przedmiot zanim wrzucisz go do Komnaty");
    }

    await prisma.$transaction([
      prisma.chaosVaultItem.create({ data: { characterId: character.id, itemId: ci.itemId } }),
      prisma.characterItem.delete({ where: { id: sourceId } }),
    ]);

  } else {
    const cs = await prisma.characterSpell.findFirst({
      where: { id: sourceId, characterId: character.id },
    });
    if (!cs) throw new Error("Czar nie znaleziony w bibliotece");

    const inSlot = await prisma.characterSpellSlots.findFirst({
      where: { characterId: character.id, spellId: cs.spellId },
    });
    if (inSlot) {
      throw new Error("Najpierw zdejmij czar ze slotu zanim wrzucisz go do Komnaty");
    }

    await prisma.$transaction([
      prisma.chaosVaultItem.create({ data: { characterId: character.id, spellId: cs.spellId } }),
      prisma.characterSpell.delete({ where: { id: sourceId } }),
    ]);
  }

  return { message: "Przeniesiono do Komnaty Nieładu" };
}