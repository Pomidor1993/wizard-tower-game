import prisma from "../lib/prisma.js";

// ── HELPERS ──────────────────────────────────────────
function checkItemRequirements(
  item: { reqKnowledge: number; reqFire: number; reqWater: number; reqEarth: number; reqAir: number; reqChaos: number },
  character: { knowledge: number; fireElement: number; waterElement: number; earthElement: number; airElement: number; chaos: number }
) {
  if (character.knowledge < item.reqKnowledge) throw new Error(`Wymagana Wiedza: ${item.reqKnowledge}`);
  if (character.fireElement < item.reqFire)    throw new Error(`Wymagany Żywioł ognia: ${item.reqFire}`);
  if (character.waterElement < item.reqWater)  throw new Error(`Wymagany Żywioł wody: ${item.reqWater}`);
  if (character.earthElement < item.reqEarth)  throw new Error(`Wymagany Żywioł ziemi: ${item.reqEarth}`);
  if (character.airElement < item.reqAir)      throw new Error(`Wymagany Żywioł powietrza: ${item.reqAir}`);
  if (character.chaos < item.reqChaos)         throw new Error(`Wymagany Chaos: ${item.reqChaos}`);
}

function checkSpellRequirements(
  spell: { reqFire: number; reqWater: number; reqEarth: number; reqAir: number; reqChaos: number },
  character: { fireElement: number; waterElement: number; earthElement: number; airElement: number; chaos: number }
) {
  if (character.fireElement < spell.reqFire)   throw new Error(`Wymagany Żywioł ognia: ${spell.reqFire}`);
  if (character.waterElement < spell.reqWater) throw new Error(`Wymagany Żywioł wody: ${spell.reqWater}`);
  if (character.earthElement < spell.reqEarth) throw new Error(`Wymagany Żywioł ziemi: ${spell.reqEarth}`);
  if (character.airElement < spell.reqAir)     throw new Error(`Wymagany Żywioł powietrza: ${spell.reqAir}`);
  if (character.chaos < spell.reqChaos)        throw new Error(`Wymagany Chaos: ${spell.reqChaos}`);
}

// ── POBIERZ EKWIPUNEK ────────────────────────────────
export async function getEquipment(userId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      equipment: true,
      spellSlots: { include: { spell: true }, orderBy: { slotIndex: "asc" } },
      items: { include: { item: true } },
      spells: { include: { spell: true } },
    },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  // Pobierz szczegóły założonych przedmiotów
  const eq = character.equipment;
  const equippedItemIds = [
    eq?.robeId, eq?.bootsId, eq?.hatId,
    eq?.amuletId, eq?.mainHandId, eq?.offHandId,
  ].filter(Boolean) as number[];

  const equippedItems = equippedItemIds.length > 0
    ? await prisma.item.findMany({ where: { id: { in: equippedItemIds } } })
    : [];

  const itemById = Object.fromEntries(equippedItems.map(i => [i.id, i]));

  return {
    equipped: {
      robe:     eq?.robeId     ? itemById[eq.robeId]     : null,
      boots:    eq?.bootsId    ? itemById[eq.bootsId]    : null,
      hat:      eq?.hatId      ? itemById[eq.hatId]      : null,
      amulet:   eq?.amuletId   ? itemById[eq.amuletId]   : null,
      mainHand: eq?.mainHandId ? itemById[eq.mainHandId] : null,
      offHand:  eq?.offHandId  ? itemById[eq.offHandId]  : null,
    },
    spellSlots: character.spellSlots,
    inventory: character.items.map(ci => ci.item),
    knownSpells: character.spells.map(cs => cs.spell),
  };
}

// ── ZAŁÓŻ PRZEDMIOT ──────────────────────────────────
export async function equipItem(userId: number, itemId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { equipment: true, items: true },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  // Sprawdź czy gracz posiada przedmiot
  const owned = character.items.find(ci => ci.itemId === itemId);
  if (!owned) throw new Error("Nie posiadasz tego przedmiotu");

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Przedmiot nie istnieje");

  // Sprawdź wymagania
  checkItemRequirements(item, character);

  // Ustal slot
  const slotMap: Record<string, string> = {
    robe:       "robeId",
    boots:      "bootsId",
    hat:        "hatId",
    amulet:     "amuletId",
    weapon_one: "mainHandId",
    weapon_two: "mainHandId",
  };

  const slotField = slotMap[item.slot];
  if (!slotField) throw new Error("Nieznany typ przedmiotu");

  // Logika broni — dwuręczna zajmuje obie ręce
  const updateData: Record<string, number | null> = { [slotField]: itemId };

  if (item.weaponType === "two_handed") {
    updateData.offHandId = null; // dwuręczna zeruje lewą rękę
  }
  if (item.slot === "weapon_one") {
    // Sprawdź czy w mainHand nie ma dwuręcznej
    if (character.equipment?.mainHandId) {
      const mainHandItem = await prisma.item.findUnique({
        where: { id: character.equipment.mainHandId },
      });
      if (mainHandItem?.weaponType === "two_handed") {
        updateData.mainHandId = null;
      }
    }
    // Jeśli zakładamy do offHand (druga jednoręczna)
    if (character.equipment?.mainHandId && character.equipment.mainHandId !== itemId) {
      updateData.offHandId = itemId;
      delete updateData.mainHandId;
    }
  }

  await prisma.characterEquipment.upsert({
    where: { characterId: character.id },
    update: updateData,
    create: { characterId: character.id, ...updateData },
  });

  return { message: `Założono: ${item.name}`, slot: item.slot };
}

// ── ZDEJMIJ PRZEDMIOT ────────────────────────────────
export async function unequipItem(userId: number, slot: string) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { equipment: true },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  const slotMap: Record<string, string> = {
    robe: "robeId", boots: "bootsId", hat: "hatId",
    amulet: "amuletId", mainHand: "mainHandId", offHand: "offHandId",
  };

  const slotField = slotMap[slot];
  if (!slotField) throw new Error("Nieznany slot");

  await prisma.characterEquipment.upsert({
    where: { characterId: character.id },
    update: { [slotField]: null },
    create: { characterId: character.id },
  });

  return { message: `Slot ${slot} opróżniony` };
}

// ── DODAJ CZAR DO SLOTU ──────────────────────────────
export async function equipSpell(userId: number, spellId: number, slotIndex: number) {
  if (slotIndex < 0 || slotIndex > 9) throw new Error("Slot musi być między 0 a 9");

  const character = await prisma.character.findUnique({
    where: { userId },
    include: { spells: true },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  // Sprawdź czy gracz zna czar
  const known = character.spells.find(cs => cs.spellId === spellId);
  if (!known) throw new Error("Nie znasz tego czaru");

  const spell = await prisma.spell.findUnique({ where: { id: spellId } });
  if (!spell) throw new Error("Czar nie istnieje");

  // Sprawdź wymagania
  checkSpellRequirements(spell, character);

  await prisma.characterSpellSlots.upsert({
    where: { characterId_slotIndex: { characterId: character.id, slotIndex } },
    update: { spellId },
    create: { characterId: character.id, spellId, slotIndex },
  });

  return { message: `Czar ${spell.name} przypisany do slotu ${slotIndex}` };
}

// ── USUŃ CZAR ZE SLOTU ───────────────────────────────
export async function unequipSpell(userId: number, slotIndex: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  await prisma.characterSpellSlots.deleteMany({
    where: { characterId: character.id, slotIndex },
  });

  return { message: `Slot czaru ${slotIndex} opróżniony` };
}