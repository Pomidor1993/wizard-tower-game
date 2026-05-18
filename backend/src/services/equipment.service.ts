import prisma from "../lib/prisma.js";

// ── HELPER — efektywne statystyki z bonusami ekwipunku ──
async function getEffectiveCharacter(userId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      equipment: true,
      items: true,
      spells: true,
    },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const eq = character.equipment;
  const equippedItemIds = [
    eq?.robeId, eq?.bootsId, eq?.hatId,
    eq?.amuletId, eq?.mainHandId, eq?.offHandId,
  ].filter(Boolean) as number[];

  let bonusFire = 0, bonusWater = 0, bonusEarth = 0,
      bonusAir = 0, bonusChaos = 0, bonusPower = 0,
      bonusCastSpeed = 0, bonusEndurance = 0;

  if (equippedItemIds.length > 0) {
    const equippedItems = await prisma.item.findMany({
      where: { id: { in: equippedItemIds } },
    });
    for (const item of equippedItems) {
      bonusFire      += item.bonusFire;
      bonusWater     += item.bonusWater;
      bonusEarth     += item.bonusEarth;
      bonusAir       += item.bonusAir;
      bonusChaos     += item.bonusChaos;
      bonusPower     += item.bonusPower;
      bonusCastSpeed += item.bonusCastSpeed;
      bonusEndurance += item.bonusEndurance;
    }
  }

  return {
    // oryginalne dane postaci (id, items, spells, equipment itd.)
    ...character,
    // efektywne statystyki (bazowe + bonusy)
    knowledge:    character.knowledge,
    intelligence: character.intelligence,
    power:        character.power        + bonusPower,
    fireElement:  character.fireElement  + bonusFire,
    waterElement: character.waterElement + bonusWater,
    earthElement: character.earthElement + bonusEarth,
    airElement:   character.airElement   + bonusAir,
    chaos:        character.chaos        + bonusChaos,
    castSpeed:    character.castSpeed    + bonusCastSpeed,
    endurance:    character.endurance    + bonusEndurance,
  };
}

// ── WALIDACJA WYMAGAŃ ────────────────────────────────

function checkItemRequirements(item: any, character: any) {
  const errors: string[] = [];
  if (item.reqKnowledge > 0 && character.knowledge    < item.reqKnowledge)
    errors.push(`Wiedza ${item.reqKnowledge} (masz ${character.knowledge})`);
  if (item.reqFire      > 0 && character.fireElement  < item.reqFire)
    errors.push(`Żywioł ognia ${item.reqFire} (masz ${character.fireElement})`);
  if (item.reqWater     > 0 && character.waterElement < item.reqWater)
    errors.push(`Żywioł wody ${item.reqWater} (masz ${character.waterElement})`);
  if (item.reqEarth     > 0 && character.earthElement < item.reqEarth)
    errors.push(`Żywioł ziemi ${item.reqEarth} (masz ${character.earthElement})`);
  if (item.reqAir       > 0 && character.airElement   < item.reqAir)
    errors.push(`Żywioł powietrza ${item.reqAir} (masz ${character.airElement})`);
  if (item.reqChaos     > 0 && character.chaos        < item.reqChaos)
    errors.push(`Chaos ${item.reqChaos} (masz ${character.chaos})`);
  if (errors.length > 0)
    throw new Error(`Nie spełniasz wymagań: ${errors.join(", ")}`);
}

function checkSpellRequirements(spell: any, character: any) {
  const errors: string[] = [];
  if (spell.reqFire  > 0 && character.fireElement  < spell.reqFire)
    errors.push(`Żywioł ognia ${spell.reqFire} (masz ${character.fireElement})`);
  if (spell.reqWater > 0 && character.waterElement < spell.reqWater)
    errors.push(`Żywioł wody ${spell.reqWater} (masz ${character.waterElement})`);
  if (spell.reqEarth > 0 && character.earthElement < spell.reqEarth)
    errors.push(`Żywioł ziemi ${spell.reqEarth} (masz ${character.earthElement})`);
  if (spell.reqAir   > 0 && character.airElement   < spell.reqAir)
    errors.push(`Żywioł powietrza ${spell.reqAir} (masz ${character.airElement})`);
  if (spell.reqChaos > 0 && character.chaos        < spell.reqChaos)
    errors.push(`Chaos ${spell.reqChaos} (masz ${character.chaos})`);
  if (errors.length > 0)
    throw new Error(`Nie spełniasz wymagań: ${errors.join(", ")}`);
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
    spellSlots:  character.spellSlots,
    inventory:   character.items.map(ci => ci.item),
    knownSpells: character.spells.map(cs => cs.spell),
  };
}

// ── ZAŁÓŻ PRZEDMIOT ──────────────────────────────────

export async function equipItem(userId: number, itemId: number) {
  // Pobierz postać z efektywnymi statystykami (bazowe + bonusy z ekwipunku)
  const character = await getEffectiveCharacter(userId);

  // Sprawdź czy gracz posiada przedmiot
  const owned = character.items.find((ci: any) => ci.itemId === itemId);
  if (!owned) throw new Error("Nie posiadasz tego przedmiotu");

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Przedmiot nie istnieje");

  // Walidacja wymagań z efektywnymi statystykami
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

  const updateData: Record<string, number | null> = { [slotField]: itemId };

  if (item.weaponType === "two_handed") {
    // Dwuręczna zeruje lewą rękę
    updateData.offHandId = null;
  }

  if (item.slot === "weapon_one") {
    // Sprawdź czy w mainHand jest dwuręczna — jeśli tak, wyczyść ją
    if (character.equipment?.mainHandId) {
      const mainHandItem = await prisma.item.findUnique({
        where: { id: character.equipment.mainHandId },
      });
      if (mainHandItem?.weaponType === "two_handed") {
        updateData.mainHandId = itemId;
        updateData.offHandId = null;
      } else {
        // mainHand zajęty jednoręczną — wstaw do offHand
        updateData.offHandId = itemId;
        delete updateData.mainHandId;
      }
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
    robe:     "robeId",
    boots:    "bootsId",
    hat:      "hatId",
    amulet:   "amuletId",
    mainHand: "mainHandId",
    offHand:  "offHandId",
  };

  const slotField = slotMap[slot];
  if (!slotField) throw new Error("Nieznany slot");

  await prisma.characterEquipment.upsert({
    where:  { characterId: character.id },
    update: { [slotField]: null },
    create: { characterId: character.id },
  });

  return { message: `Slot ${slot} opróżniony` };
}

// ── DODAJ CZAR DO SLOTU ──────────────────────────────

export async function equipSpell(userId: number, spellId: number, slotIndex: number) {
  if (slotIndex < 0 || slotIndex > 9) throw new Error("Slot musi być między 0 a 9");

  // Pobierz postać z efektywnymi statystykami
  const character = await getEffectiveCharacter(userId);

  // Sprawdź czy gracz zna czar
  const known = character.spells.find((cs: any) => cs.spellId === spellId);
  if (!known) throw new Error("Nie znasz tego czaru");

  const spell = await prisma.spell.findUnique({ where: { id: spellId } });
  if (!spell) throw new Error("Czar nie istnieje");

  // Walidacja wymagań z efektywnymi statystykami
  checkSpellRequirements(spell, character);

  await prisma.characterSpellSlots.upsert({
    where:  { characterId_slotIndex: { characterId: character.id, slotIndex } },
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