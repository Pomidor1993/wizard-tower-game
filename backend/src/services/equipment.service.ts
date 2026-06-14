import prisma from "../lib/prisma.js";
import { getCharacterArchetypeBonus } from "./archetype/archetype-bonuses.constants.js";
import { getSpellSlotCount } from "./tower.service.js";
import { getVisibleChaosVaultItems } from "./chaos_vault.service.js";

// ── HELPER — efektywne statystyki z bonusami ekwipunku ──
async function getEffectiveCharacter(userId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      equipment: true,
    },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const eq = character.equipment;
  const equippedItemIds = [
    eq?.robeId, eq?.bootsId, eq?.hatId,
    eq?.amuletId, eq?.mainHandId, eq?.offHandId, eq?.offHand2Id,
  ].filter(Boolean) as number[];

  let bonusKnowledge = 0, bonusIntelligence = 0, bonusPower = 0,
      bonusEndurance = 0, bonusResistance = 0, bonusInitiative = 0,
      bonusElementalMagic = 0, bonusAstralMagic = 0, bonusBloodMagic = 0;

  if (equippedItemIds.length > 0) {
    const equippedItems = await prisma.item.findMany({
      where: { id: { in: equippedItemIds } },
    });
    for (const item of equippedItems) {
      bonusKnowledge      += item.bonusKnowledge;
      bonusIntelligence   += item.bonusIntelligence;
      bonusPower          += item.bonusPower;
      bonusEndurance      += item.bonusEndurance;
      bonusResistance     += item.bonusResistance;
      bonusInitiative     += item.bonusInitiative;
      bonusElementalMagic += item.bonusElementalMagic;
      bonusAstralMagic    += item.bonusAstralMagic;
      bonusBloodMagic     += item.bonusBloodMagic;
    }
  }

  return {
    ...character,
    knowledge:      character.knowledge      + bonusKnowledge,
    intelligence:   character.intelligence   + bonusIntelligence,
    power:          character.power          + bonusPower,
    endurance:      character.endurance      + bonusEndurance,
    resistance:     character.resistance     + bonusResistance,
    initiative:     character.initiative     + bonusInitiative,
    elementalMagic: character.elementalMagic + bonusElementalMagic,
    astralMagic:    character.astralMagic    + bonusAstralMagic,
    bloodMagic:     character.bloodMagic     + bonusBloodMagic,
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
      tower: { include: { buildings: true } },
    },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const libraryLevel = character.tower?.buildings.find(b => b.buildingType === "library")?.level ?? 0;
  const archetypeBonus = await getCharacterArchetypeBonus(character.id);
  const maxSlots = getSpellSlotCount(libraryLevel, archetypeBonus?.extraActiveSpellSlots ?? 0);
  const eq = character.equipment;
  const equippedItemIds = [
    eq?.robeId, eq?.bootsId, eq?.hatId,
    eq?.amuletId, eq?.mainHandId, eq?.offHandId, eq?.offHand2Id,
  ].filter(Boolean) as number[];

  const equippedItems = equippedItemIds.length > 0
    ? await prisma.item.findMany({ where: { id: { in: equippedItemIds } } })
    : [];

  const itemById = Object.fromEntries(equippedItems.map(i => [i.id, i]));

  const { capacity, total, visible, hidden } = await getVisibleChaosVaultItems(character.id);

  return {
    equipped: {
      robe:     eq?.robeId     ? itemById[eq.robeId]     : null,
      boots:    eq?.bootsId    ? itemById[eq.bootsId]    : null,
      hat:      eq?.hatId      ? itemById[eq.hatId]      : null,
      amulet:   eq?.amuletId   ? itemById[eq.amuletId]   : null,
      mainHand: eq?.mainHandId ? itemById[eq.mainHandId] : null,
      offHand:  eq?.offHandId  ? itemById[eq.offHandId]  : null,
      offHand2: eq?.offHand2Id ? itemById[eq.offHand2Id] : null,
    },
    spellSlots: character.spellSlots,
    maxSlots,
    chaosVault: {
      capacity,
      total,
      visible: visible.map(cv => ({ chaosVaultItemId: cv.id, item: cv.item, addedAt: cv.addedAt })),
      hiddenCount: hidden.length,
    },
  };
}

// ── ZAŁÓŻ PRZEDMIOT ──────────────────────────────────

export async function equipItem(userId: number, itemId: number) {
  const character = await getEffectiveCharacter(userId);

  // Przedmiot musi być w "widocznej" części Komnaty Nieładu
  const { visible } = await getVisibleChaosVaultItems(character.id);
  const owned = visible.some(cv => cv.itemId === itemId);
  if (!owned) throw new Error("Ten przedmiot nie jest dostępny — rozbuduj Komnatę Nieładu lub zwolnij miejsce.");

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Przedmiot nie istnieje");

  const archetypeBonus = await getCharacterArchetypeBonus(character.id);
  checkItemRequirements(item, character, archetypeBonus?.spellReqModifier ?? 0);

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
    updateData.offHandId = null;
    updateData.offHand2Id = null;
  }

  if (item.slot === "weapon_one") {
    const hasThirdHand = archetypeBonus?.thirdWeaponHand ?? false;

    if (character.equipment?.mainHandId) {
      const mainHandItem = await prisma.item.findUnique({
        where: { id: character.equipment.mainHandId },
      });

      if (mainHandItem?.weaponType === "two_handed") {
        updateData.mainHandId = itemId;
        updateData.offHandId = null;
        updateData.offHand2Id = null;
      } else if (!character.equipment.offHandId) {
        updateData.offHandId = itemId;
        delete updateData.mainHandId;
      } else if (hasThirdHand && !character.equipment.offHand2Id) {
        updateData.offHand2Id = itemId;
        delete updateData.mainHandId;
      } else {
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
  const character = await getEffectiveCharacter(userId);

  const charTower = await prisma.character.findUnique({
    where: { userId },
    include: { tower: { include: { buildings: true } } },
  });

  const libraryLevel = charTower?.tower?.buildings
    .find(b => b.buildingType === "library")?.level ?? 0;
  const archetypeBonus = await getCharacterArchetypeBonus(character.id);
  const maxSlots = getSpellSlotCount(libraryLevel, archetypeBonus?.extraActiveSpellSlots ?? 0);
  if (maxSlots === 0) throw new Error("Wybuduj Bibliotekę aby aktywować czary bojowe");
  if (slotIndex >= maxSlots) throw new Error(`Biblioteka poziomu ${libraryLevel} daje tylko ${maxSlots} slot(y) aktywnych czarów`);

  // Czar musi być odkryty w Księdze Magii
  const discovered = await prisma.spellbookEntry.findUnique({
    where: { characterId_spellId: { characterId: character.id, spellId } },
  });
  if (!discovered) throw new Error("Nie poznałeś jeszcze tego czaru — odkryj go poprzez Studia");

  const spell = await prisma.spell.findUnique({ where: { id: spellId } });
  if (!spell) throw new Error("Czar nie istnieje");

  checkSpellRequirements(spell, character, archetypeBonus?.spellReqModifier ?? 0);

  await prisma.characterSpellSlots.upsert({
    where:  { characterId_slotIndex: { characterId: character.id, slotIndex } },
    update: { spellId },
    create: { characterId: character.id, spellId, slotIndex },
  });

  return { message: `Czar ${spell.name} przypisany do slotu ${slotIndex}` };
}

export async function equipSpellAuto(userId: number, spellId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const charTower = await prisma.character.findUnique({
    where: { userId },
    include: { tower: { include: { buildings: true } } },
  });
  const libraryLevel = charTower?.tower?.buildings.find(b => b.buildingType === "library")?.level ?? 0;
  const archetypeBonus = await getCharacterArchetypeBonus(character.id);
  const maxSlots = getSpellSlotCount(libraryLevel, archetypeBonus?.extraActiveSpellSlots ?? 0);
  if (maxSlots === 0) throw new Error("Wybuduj Bibliotekę aby aktywować czary bojowe");

  const used = await prisma.characterSpellSlots.findMany({
    where: { characterId: character.id },
    select: { slotIndex: true },
  });
  const usedSlots = new Set(used.map(s => s.slotIndex));

  let freeSlot = -1;
  for (let i = 0; i < maxSlots; i++) {
    if (!usedSlots.has(i)) { freeSlot = i; break; }
  }
  if (freeSlot === -1) throw new Error("Wszystkie dostępne sloty czarów są zajęte");

  return equipSpell(userId, spellId, freeSlot);
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