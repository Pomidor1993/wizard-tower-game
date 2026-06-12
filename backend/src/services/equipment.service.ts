import prisma from "../lib/prisma.js";
import { getCharacterArchetypeBonus } from "./archetype/archetype-bonuses.constants.js";
import { getSpellSlotCount } from "./tower.service.js";


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
  bonusElementalMagic = 0, bonusAstralMagic = 0, bonusBloodMagic = 0; 



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
      bonusElementalMagic += item.bonusElementalMagic;
      bonusAstralMagic += item.bonusAstralMagic;
      bonusBloodMagic += item.bonusBloodMagic;


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
    elementalMagic:    character.elementalMagic      + bonusElementalMagic,
    astralMagic:   character.astralMagic     + bonusAstralMagic,
    bloodMagic:   character.bloodMagic     + bonusBloodMagic,
  };
}

// ── WALIDACJA WYMAGAŃ ────────────────────────────────

function checkItemRequirements(item: any, character: any, reqModifier: number = 0) {
  const mod = (req: number) => Math.floor(req * (1 + reqModifier));
  const errors: string[] = [];
  if (item.reqKnowledge > 0 && character.knowledge < mod(item.reqKnowledge))
    errors.push(`Wiedza ${mod(item.reqKnowledge)} (masz ${character.knowledge})`);
  if (item.reqIntelligence > 0 && character.intelligence < mod(item.reqIntelligence))
    errors.push(`Inteligencja ${mod(item.reqIntelligence)} (masz ${character.intelligence})`);
  if (item.reqPower > 0 && character.power < mod(item.reqPower))
    errors.push(`Moc ${mod(item.reqPower)} (masz ${character.power})`);
  if (item.reqEndurance > 0 && character.endurance < mod(item.reqEndurance))
    errors.push(`Wytrzymałość ${mod(item.reqEndurance)} (masz ${character.endurance})`);
  if (item.reqResistance > 0 && character.resistance < mod(item.reqResistance))
    errors.push(`Odporność ${mod(item.reqResistance)} (masz ${character.resistance})`);
  if (item.reqInitiative > 0 && character.initiative < mod(item.reqInitiative))
    errors.push(`Inicjatywa ${mod(item.reqInitiative)} (masz ${character.initiative})`);
  if (item.reqElementalMagic > 0 && character.elementalMagic < mod(item.reqElementalMagic))
    errors.push(`Magia żywiołów ${mod(item.reqElementalMagic)} (masz ${character.elementalMagic})`);
  if (item.reqAstralMagic > 0 && character.astralMagic < mod(item.reqAstralMagic))
    errors.push(`Magia astralna ${mod(item.reqAstralMagic)} (masz ${character.astralMagic})`);
  if (item.reqBloodMagic > 0 && character.bloodMagic < mod(item.reqBloodMagic))
    errors.push(`Magia krwi ${mod(item.reqBloodMagic)} (masz ${character.bloodMagic})`);
  if (errors.length > 0)
    throw new Error(`Nie spełniasz wymagań: ${errors.join(", ")}`);
}

function checkSpellRequirements(spell: any, character: any, reqModifier: number = 0) {
  const mod = (req: number) => Math.floor(req * (1 + reqModifier));
  const errors: string[] = [];
  if (spell.reqKnowledge > 0 && character.knowledge < mod(spell.reqKnowledge))
    errors.push(`Wiedza ${mod(spell.reqKnowledge)} (masz ${character.knowledge})`);
  if (spell.reqIntelligence > 0 && character.intelligence < mod(spell.reqIntelligence))
    errors.push(`Inteligencja ${mod(spell.reqIntelligence)} (masz ${character.intelligence})`);
  if (spell.reqPower > 0 && character.power < mod(spell.reqPower))
    errors.push(`Moc ${mod(spell.reqPower)} (masz ${character.power})`);
  if (spell.reqEndurance > 0 && character.endurance < mod(spell.reqEndurance))
    errors.push(`Wytrzymałość ${mod(spell.reqEndurance)} (masz ${character.endurance})`);
  if (spell.reqResistance > 0 && character.resistance < mod(spell.reqResistance))
    errors.push(`Odporność ${mod(spell.reqResistance)} (masz ${character.resistance})`);
  if (spell.reqInitiative > 0 && character.initiative < mod(spell.reqInitiative))
    errors.push(`Inicjatywa ${mod(spell.reqInitiative)} (masz ${character.initiative})`);
  if (spell.reqElementalMagic > 0 && character.elementalMagic < mod(spell.reqElementalMagic))
    errors.push(`Magia żywiołów ${mod(spell.reqElementalMagic)} (masz ${character.elementalMagic})`);
  if (spell.reqAstralMagic > 0 && character.astralMagic < mod(spell.reqAstralMagic))
    errors.push(`Magia astralna ${mod(spell.reqAstralMagic)} (masz ${character.astralMagic})`);
  if (spell.reqBloodMagic > 0 && character.bloodMagic < mod(spell.reqBloodMagic))
    errors.push(`Magia krwi ${mod(spell.reqBloodMagic)} (masz ${character.bloodMagic})`);
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
const archetypeBonus = await getCharacterArchetypeBonus(character.id);
checkItemRequirements(item, character, archetypeBonus?.spellReqModifier ?? 0);

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
  const archetypeBonus = await getCharacterArchetypeBonus(character.id);
  const hasThirdHand = archetypeBonus?.thirdWeaponHand ?? false;

  if (character.equipment?.mainHandId) {
    const mainHandItem = await prisma.item.findUnique({
      where: { id: character.equipment.mainHandId },
    });

    if (mainHandItem?.weaponType === "two_handed") {
      updateData.mainHandId = itemId;
      updateData.offHandId = null;
    } else if (!character.equipment.offHandId) {
      // offHand wolny — wstaw tam
      updateData.offHandId = itemId;
      delete updateData.mainHandId;
    } else if (hasThirdHand && !character.equipment.offHand2Id) {
      // offHand zajęty, ale klasa ma trzecią rękę i offHand2 wolny
      updateData.offHand2Id = itemId;
      delete updateData.mainHandId;
    } else {
      // wszystkie sloty zajęte — zastąp offHand
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
    offHand2: "offHand2Id",
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

  // Pobierz postać z efektami ekwipunku (statystyki) oraz osobno wieżę (bibliotekę)
  const character = await getEffectiveCharacter(userId);
  const charTower = await prisma.character.findUnique({
    where: { userId },
    include: { tower: { include: { buildings: true } } },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const libraryLevel = charTower?.tower?.buildings
    .find(b => b.buildingType === "library")?.level ?? 0;
  const archetypeBonus = await getCharacterArchetypeBonus(character.id);
  const maxSlots = getSpellSlotCount(libraryLevel, archetypeBonus?.extraActiveSpellSlots ?? 0);
  if (maxSlots === 0) throw new Error("Wybuduj Bibliotekę aby aktywować czary bojowe");
  if (slotIndex >= maxSlots) throw new Error(`Biblioteka poziomu ${libraryLevel} daje tylko ${maxSlots} slot(y) aktywnych czarów`);

  // Sprawdź czy gracz zna czar
  const known = character.spells.find((cs: any) => cs.spellId === spellId);
  if (!known) throw new Error("Nie znasz tego czaru");

  const spell = await prisma.spell.findUnique({ where: { id: spellId } });
  if (!spell) throw new Error("Czar nie istnieje");

  // Walidacja wymagań z efektwnymi statystykami
checkSpellRequirements(spell, character, archetypeBonus?.spellReqModifier ?? 0);

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