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

  let bonusKnowledge = 0, bonusIntelligence = 0, bonusPower = 0,
  bonusEndurance = 0, bonusResistance = 0, bonusInitiative = 0, 
  bonusFireMagic = 0, bonusWaterMagic = 0, bonusEarthMagic = 0, bonusAirMagic = 0,
  bonusChaosMagic = 0, bonusEnergyMagic = 0, bonusLifeMagic = 0, bonusDeathMagic = 0; 


  if (equippedItemIds.length > 0) {
    const equippedItems = await prisma.item.findMany({
      where: { id: { in: equippedItemIds } },
    });
    for (const item of equippedItems) {
      bonusKnowledge += item.bonusKnowledge;
      bonusIntelligence += item.bonusIntelligence;
      bonusPower += item.bonusPower;
      bonusEndurance += item.bonusEndurance;
      bonusResistance += item.bonusResistance;
      bonusInitiative += item.bonusInitiative;
      bonusFireMagic += item.bonusFireMagic;
      bonusWaterMagic += item.bonusWaterMagic;
      bonusEarthMagic += item.bonusEarthMagic;
      bonusAirMagic += item.bonusAirMagic;
      bonusChaosMagic += item.bonusChaosMagic;
      bonusEnergyMagic += item.bonusEnergyMagic;
      bonusLifeMagic += item.bonusLifeMagic;
      bonusDeathMagic += item.bonusDeathMagic;

    }
  }

  return {
    // oryginalne dane postaci (id, items, spells, equipment itd.)
    ...character,
    // efektywne statystyki (bazowe + bonusy)
    knowledge:    character.knowledge      + bonusKnowledge,
    intelligence: character.intelligence   + bonusIntelligence,
    power:        character.power          + bonusPower,
    endurance:    character.endurance      + bonusEndurance,
    resistance:   character.resistance     + bonusResistance,
    initiative:   character.initiative     + bonusInitiative,
    fireMagic:    character.fireMagic      + bonusFireMagic,
    waterMagic:   character.waterMagic     + bonusWaterMagic,
    earthMagic:   character.earthMagic     + bonusEarthMagic,
    airMagic:     character.airMagic       + bonusAirMagic,
    chaosMagic:   character.chaosMagic     + bonusChaosMagic,
    energyMagic:  character.energyMagic    + bonusEnergyMagic,
    lifeMagic:    character.lifeMagic      + bonusLifeMagic,
    deathMagic:   character.deathMagic     + bonusDeathMagic,
  };
}

// ── WALIDACJA WYMAGAŃ ────────────────────────────────

function checkItemRequirements(item: any, character: any) {
  const errors: string[] = [];
  if (item.reqKnowledge > 0 && character.knowledge    < item.reqKnowledge)
    errors.push(`Wiedza ${item.reqKnowledge} (masz ${character.knowledge})`);
  if (item.reqIntelligence > 0 && character.intelligence < item.reqIntelligence)
    errors.push(`Inteligencja ${item.reqIntelligence} (masz ${character.intelligence})`);
  if (item.reqPower     > 0 && character.power        < item.reqPower)
    errors.push(`Moc ${item.reqPower} (masz ${character.power})`);
  if (item.reqEndurance > 0 && character.endurance    < item.reqEndurance)
    errors.push(`Wytrzymałość ${item.reqEndurance} (masz ${character.endurance})`);
  if (item.reqResistance > 0 && character.resistance   < item.reqResistance)
    errors.push(`Odporność ${item.reqResistance} (masz ${character.resistance})`);
  if (item.reqInitiative > 0 && character.initiative   < item.reqInitiative)
    errors.push(`Inicjatywa ${item.reqInitiative} (masz ${character.initiative})`);
  if (item.reqFireMagic       > 0 && character.fireMagic  < item.reqFireMagic)
    errors.push(`Żywioł ognia ${item.reqFireMagic} (masz ${character.fireMagic})`);
  if (item.reqWaterMagic      > 0 && character.waterMagic < item.reqWaterMagic)
    errors.push(`Żywioł wody ${item.reqWaterMagic} (masz ${character.waterMagic})`);
  if (item.reqEarthMagic      > 0 && character.earthMagic < item.reqEarthMagic)
    errors.push(`Żywioł ziemi ${item.reqEarthMagic} (masz ${character.earthMagic})`);
  if (item.reqAirMagic        > 0 && character.airMagic   < item.reqAirMagic)
    errors.push(`Żywioł powietrza ${item.reqAirMagic} (masz ${character.airMagic})`);
  if (item.reqChaosMagic      > 0 && character.chaosMagic        < item.reqChaosMagic)
    errors.push(`Chaos ${item.reqChaosMagic} (masz ${character.chaosMagic})`);
  if (item.reqLifeMagic       > 0 && character.lifeMagic      < item.reqLifeMagic )
    errors.push(`Życie ${item.reqLifeMagic} (masz ${character.lifeMagic})`);
  if (item.reqDeathMagic      > 0 && character.deathMagic     < item.reqDeathMagic)
    errors.push(`Śmierć ${item.reqDeathMagic} (masz ${character.deathMagic})`);
  if (item.reqEnergyMagic    > 0 && character.energyMagic    < item.reqEnergyMagic)
    errors.push(`Energia ${item.reqEnergyMagic} (masz ${character.energyMagic})`);
  if (errors.length > 0)
    throw new Error(`Nie spełniasz wymagań: ${errors.join(", ")}`);
}

function checkSpellRequirements(spell: any, character: any) {
  const errors: string[] = [];
  if (spell.reqKnowledge > 0 && character.knowledge    < spell.reqKnowledge)
    errors.push(`Wiedza ${spell.reqKnowledge} (masz ${character.knowledge})`);
  if (spell.reqIntelligence > 0 && character.intelligence < spell.reqIntelligence)
    errors.push(`Inteligencja ${spell.reqIntelligence} (masz ${character.intelligence})`);
  if (spell.reqPower     > 0 && character.power        < spell.reqPower)
    errors.push(`Moc ${spell.reqPower} (masz ${character.power})`);
  if (spell.reqEndurance > 0 && character.endurance    < spell.reqEndurance)
    errors.push(`Wytrzymałość ${spell.reqEndurance} (masz ${character.endurance})`);
  if (spell.reqResistance > 0 && character.resistance   < spell.reqResistance)
    errors.push(`Odporność ${spell.reqResistance} (masz ${character.resistance})`);
  if (spell.reqInitiative > 0 && character.initiative   < spell.reqInitiative)
    errors.push(`Inicjatywa ${spell.reqInitiative} (masz ${character.initiative})`);
  if (spell.reqLifeMagic      > 0 && character.lifeMagic      < spell.reqLifeMagic)
    errors.push(`Życie ${spell.reqLifeMagic} (masz ${character.lifeMagic})`);
  if (spell.reqDeathMagic     > 0 && character.deathMagic     < spell.reqDeathMagic)
    errors.push(`Śmierć ${spell.reqDeathMagic} (masz ${character.deathMagic})`);
  if (spell.reqEnergyMagic    > 0 && character.energyMagic    < spell.reqEnergyMagic)
    errors.push(`Energia ${spell.reqEnergyMagic} (masz ${character.energyMagic})`);
  if (spell.reqFireMagic  > 0 && character.fireMagic  < spell.reqFireMagic)
    errors.push(`Żywioł ognia ${spell.reqFireMagic} (masz ${character.fireMagic})`);
  if (spell.reqWaterMagic > 0 && character.waterMagic < spell.reqWaterMagic)
    errors.push(`Żywioł wody ${spell.reqWaterMagic} (masz ${character.waterMagic})`);
  if (spell.reqEarthMagic > 0 && character.earthMagic < spell.reqEarthMagic)
    errors.push(`Żywioł ziemi ${spell.reqEarthMagic} (masz ${character.earthMagic})`);
  if (spell.reqAirMagic   > 0 && character.airMagic   < spell.reqAirMagic)
    errors.push(`Żywioł powietrza ${spell.reqAirMagic} (masz ${character.airMagic})`);
  if (spell.reqChaosMagic > 0 && character.chaosMagic        < spell.reqChaosMagic)
    errors.push(`Chaos ${spell.reqChaosMagic} (masz ${character.chaosMagic})`);
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