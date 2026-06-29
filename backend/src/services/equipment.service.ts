import prisma from "../lib/prisma.js";
import { getSpellSlotCount } from "./tower.service.js";
import { getVisibleChaosVaultItems } from "./chaos_vault.service.js";
import { getOrCreateTutorial, advanceTutorialStep } from "./tutorial/tutorial.service.js";
import { TUTORIAL_STEPS, TUTORIAL_MESSAGES } from "./tutorial/tutorial.constants.js";
import { getCharacterSchoolBonuses } from "./magic-school.service.js";
import { getRiftTrophyBonuses, applyEquipmentReqReduction } from "./rift-trophy-bonus.service.js";
import { getUnlockedUtilitySlots } from "./utility-spell.service.js";

// ── HELPER — efektywne statystyki z bonusami ekwipunku ─────────────────────────
function scaleItem(item: any, tier: number) {
  return {
    ...item,
    tier,
    bonusKnowledge:      scaleValue(item.bonusKnowledge,      tier),
    bonusIntelligence:   scaleValue(item.bonusIntelligence,   tier),
    bonusPower:          scaleValue(item.bonusPower,          tier),
    bonusEndurance:      scaleValue(item.bonusEndurance,      tier),
    bonusResistance:     scaleValue(item.bonusResistance,     tier),
    bonusInitiative:     scaleValue(item.bonusInitiative,     tier),
    bonusElementalMagic: scaleValue(item.bonusElementalMagic, tier),
    bonusAstralMagic:    scaleValue(item.bonusAstralMagic,    tier),
    bonusBloodMagic:     scaleValue(item.bonusBloodMagic,     tier),
    reqKnowledge:        scaleValue(item.reqKnowledge,        tier),
    reqIntelligence:     scaleValue(item.reqIntelligence,     tier),
    reqPower:            scaleValue(item.reqPower,            tier),
    reqEndurance:        scaleValue(item.reqEndurance,        tier),
    reqResistance:       scaleValue(item.reqResistance,       tier),
    reqInitiative:       scaleValue(item.reqInitiative,       tier),
    reqElementalMagic:   scaleValue(item.reqElementalMagic,   tier),
    reqAstralMagic:      scaleValue(item.reqAstralMagic,      tier),
    reqBloodMagic:       scaleValue(item.reqBloodMagic,       tier),
  };
}

async function getEffectiveCharacter(userId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { equipment: true },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const eq = character.equipment;
  const equippedOwnedIds = [
    eq?.robeId, eq?.bootsId, eq?.hatId,
    eq?.talismanId, eq?.mainHandId, eq?.offHandId, eq?.offHand2Id,
  ].filter(Boolean) as number[];

  let bonusKnowledge = 0, bonusIntelligence = 0, bonusPower = 0,
      bonusEndurance = 0, bonusResistance = 0, bonusInitiative = 0,
      bonusElementalMagic = 0, bonusAstralMagic = 0, bonusBloodMagic = 0;

  if (equippedOwnedIds.length > 0) {
    const ownedEntries = await prisma.ownedItem.findMany({
      where: { id: { in: equippedOwnedIds } },
      include: { item: true },
    });
    for (const entry of ownedEntries) {
      const item = scaleItem(entry.item, entry.tier);
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


export async function getEffectiveCharacterById(characterId: number) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      equipment: true,
      spellSlots: { include: { spell: true }, orderBy: { slotIndex: "asc" } },
      spells: { include: { spell: true } },
      tower: { include: { buildings: true } },
    },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const eq = character.equipment;
  const equippedOwnedIds = [
    eq?.robeId, eq?.bootsId, eq?.hatId,
    eq?.talismanId, eq?.mainHandId, eq?.offHandId, eq?.offHand2Id,
  ].filter(Boolean) as number[];

  let bonusKnowledge = 0, bonusIntelligence = 0, bonusPower = 0,
      bonusEndurance = 0, bonusResistance = 0, bonusInitiative = 0,
      bonusElementalMagic = 0, bonusAstralMagic = 0, bonusBloodMagic = 0;

  if (equippedOwnedIds.length > 0) {
    const ownedEntries = await prisma.ownedItem.findMany({
      where: { id: { in: equippedOwnedIds } },
      include: { item: true },
    });
    for (const entry of ownedEntries) {
      const mul = tierMultiplier(entry.tier ?? 1);
      const scale = (base: number) => Math.round(base * mul);
      bonusKnowledge      += scale(entry.item.bonusKnowledge);
      bonusIntelligence   += scale(entry.item.bonusIntelligence);
      bonusPower          += scale(entry.item.bonusPower);
      bonusEndurance      += scale(entry.item.bonusEndurance);
      bonusResistance     += scale(entry.item.bonusResistance);
      bonusInitiative     += scale(entry.item.bonusInitiative);
      bonusElementalMagic += scale(entry.item.bonusElementalMagic ?? 0);
      bonusAstralMagic    += scale(entry.item.bonusAstralMagic ?? 0);
      bonusBloodMagic     += scale(entry.item.bonusBloodMagic ?? 0);
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

// Każdy kolejny tier to +20% od bazowych statystyk (mnożnik: 1 + (tier-1) * 0.2)
export function tierMultiplier(tier: number): number {
  return 1 + (tier - 1) * 0.2;
}

export function scaleValue(base: number, tier: number): number {
  return Math.round(base * tierMultiplier(tier));
}
// ── WALIDACJA WYMAGAŃ ────────────────────────────────────────────────────────

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

// ── POBIERZ EKWIPUNEK ───────────────────────────────────────────────────────

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

  const eq = character.equipment;
  const equippedOwnedIds = [
    eq?.robeId, eq?.bootsId, eq?.hatId,
    eq?.talismanId, eq?.mainHandId, eq?.offHandId, eq?.offHand2Id,
  ].filter(Boolean) as number[];

  const equippedEntries = equippedOwnedIds.length > 0
    ? await prisma.ownedItem.findMany({
        where: { id: { in: equippedOwnedIds } },
        include: { item: true },
      })
    : [];

  // mapa: OwnedItem.id -> { ...Item, ownedItemId }
const entryById = Object.fromEntries(
  equippedEntries.map(e => [
    e.id,
    { ...scaleItem(e.item, e.tier), ownedItemId: e.id } 
  ])
);

  const libraryLevel = character.tower?.buildings.find(b => b.buildingType === "library")?.level ?? 0;
  const schoolBonuses = await getCharacterSchoolBonuses(character.id);
  const extraCombatSlots = schoolBonuses?.spell_slot ?? 0;
  const extraUtilitySlots = schoolBonuses?.utility_slot ?? 0;
  const maxSlots = getSpellSlotCount(libraryLevel, extraCombatSlots);

  const { capacity, total, visible, hidden } = await getVisibleChaosVaultItems(character.id);

  return {
    equipped: {
      robe:     eq?.robeId     ? entryById[eq.robeId]     ?? null : null,
      boots:    eq?.bootsId    ? entryById[eq.bootsId]    ?? null : null,
      hat:      eq?.hatId      ? entryById[eq.hatId]      ?? null : null,
      talisman: eq?.talismanId ? entryById[eq.talismanId]   ?? null : null,
      mainHand: eq?.mainHandId ? entryById[eq.mainHandId] ?? null : null,
      offHand:  eq?.offHandId  ? entryById[eq.offHandId]  ?? null : null,
      offHand2: eq?.offHand2Id ? entryById[eq.offHand2Id] ?? null : null,
    },
    spellSlots: character.spellSlots,
    maxSlots,
    maxUtilitySlots: getUnlockedUtilitySlots(libraryLevel, extraUtilitySlots),
    chaosVault: {
      capacity,
      total,
      visible: visible.map(entry => ({
        chaosVaultItemId: entry.id,
        ownedItemId: entry.ownedItemId,
        item: scaleItem(entry.ownedItem.item, entry.ownedItem.tier),
        addedAt: entry.addedAt,
      })),
      hiddenCount: hidden.length,
    },
  };
}

// ── ZAŁÓŻ PRZEDMIOT ──────────────────────────────────────────────────────────

export async function equipItem(userId: number, ownedItemId: number) {
  const character = await getEffectiveCharacter(userId);

  const { visible } = await getVisibleChaosVaultItems(character.id);
  const vaultEntry = visible.find(v => v.ownedItemId === ownedItemId);
  if (!vaultEntry) throw new Error("...");

  const item = scaleItem(vaultEntry.ownedItem.item, vaultEntry.ownedItem.tier);

const trophyBonuses = await getRiftTrophyBonuses(character.id);
  const reqReductionPct = trophyBonuses.reqReduction.equipment;

  // C9: jeśli gracz ma bonus redukcji wymagań, tworzymy zmodyfikowaną kopię przedmiotu
  const itemForCheck = reqReductionPct > 0
    ? {
        ...item,
        reqKnowledge:      applyEquipmentReqReduction(item.reqKnowledge,      trophyBonuses),
        reqIntelligence:   applyEquipmentReqReduction(item.reqIntelligence,   trophyBonuses),
        reqPower:          applyEquipmentReqReduction(item.reqPower,           trophyBonuses),
        reqEndurance:      applyEquipmentReqReduction(item.reqEndurance,       trophyBonuses),
        reqResistance:     applyEquipmentReqReduction(item.reqResistance,      trophyBonuses),
        reqInitiative:     applyEquipmentReqReduction(item.reqInitiative,      trophyBonuses),
        reqElementalMagic: applyEquipmentReqReduction(item.reqElementalMagic,  trophyBonuses),
        reqAstralMagic:    applyEquipmentReqReduction(item.reqAstralMagic,     trophyBonuses),
        reqBloodMagic:     applyEquipmentReqReduction(item.reqBloodMagic,      trophyBonuses),
      }
    : item;

  checkItemRequirements(itemForCheck, character);
  const slotMap: Record<string, string> = {
    robe:       "robeId",
    boots:      "bootsId",
    hat:        "hatId",
    talisman:     "talismanId",
    weapon_one: "mainHandId",
    weapon_two: "mainHandId",
  };

  const slotField = slotMap[item.slot];
  if (!slotField) throw new Error("Nieznany typ przedmiotu");

  const updateData: Record<string, number | null> = { [slotField]: ownedItemId };
  const ownedIdsToReturn: number[] = []; // OwnedItem.id zdejmowanych przedmiotów -> wracają do komnaty

  if (item.weaponType === "two_handed") {
    if (character.equipment?.offHandId)  ownedIdsToReturn.push(character.equipment.offHandId);
    if (character.equipment?.offHand2Id) ownedIdsToReturn.push(character.equipment.offHand2Id);
    updateData.offHandId = null;
    updateData.offHand2Id = null;
  }

  if (item.slot === "weapon_one") {

    if (character.equipment?.mainHandId) {
      const currentMainHand = await prisma.ownedItem.findUnique({
        where: { id: character.equipment.mainHandId },
        include: { item: true },
      });

      if (currentMainHand?.item?.weaponType === "two_handed") {
        // Zdejmujemy dwuręczną broń, wkładamy nową jednoręczną do mainHand
        ownedIdsToReturn.push(character.equipment.mainHandId);
        updateData.mainHandId = ownedItemId;
        updateData.offHandId = null;
        updateData.offHand2Id = null;
      } else if (!character.equipment.offHandId) {
        updateData.offHandId = ownedItemId;
        delete updateData.mainHandId;
      } else {
        // Wszystkie ręce zajęte — nowy przedmiot zajmuje offHand, stary offHand wraca do komnaty
        ownedIdsToReturn.push(character.equipment.offHandId);
        updateData.offHandId = ownedItemId;
        delete updateData.mainHandId;
      }
    }
  } else {
    // Standardowy slot (robe/boots/hat/talisman) — jeśli coś tam już jest, wraca do komnaty
    const currentInSlot = (character.equipment as any)?.[slotField] as number | null | undefined;
    if (currentInSlot) ownedIdsToReturn.push(currentInSlot);
  }

  // Usuń założony przedmiot z Komnaty Nieładu (jest teraz "na sobie")
  await prisma.chaosVaultItem.delete({ where: { id: vaultEntry.id } });

  // Przedmioty zdjęte w procesie wracają do Komnaty Nieładu
  for (const returnedOwnedId of ownedIdsToReturn) {
    await prisma.chaosVaultItem.create({ data: { ownedItemId: returnedOwnedId } });
  }

  await prisma.characterEquipment.upsert({
    where: { characterId: character.id },
    update: updateData,
    create: { characterId: character.id, ...updateData },
  });

  return { message: `Założono: ${item.name}`, slot: item.slot };
}

// ── ZDEJMIJ PRZEDMIOT ────────────────────────────────────────────────────────

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
    talisman:   "talismanId",
    mainHand: "mainHandId",
    offHand:  "offHandId",
    offHand2: "offHand2Id",
  };

  const slotField = slotMap[slot];
  if (!slotField) throw new Error("Nieznany slot");

  const ownedItemId = (character.equipment as any)?.[slotField] as number | null | undefined;
  if (!ownedItemId) throw new Error("Ten slot jest już pusty");

  // Przedmiot wraca do Komnaty Nieładu
  await prisma.chaosVaultItem.create({ data: { ownedItemId } });

  await prisma.characterEquipment.update({
    where: { characterId: character.id },
    data: { [slotField]: null },
  });

  return { message: `Slot ${slot} opróżniony` };
}

// ── DODAJ CZAR DO SLOTU ──────────────────────────────────────────────────────

export async function equipSpell(userId: number, spellId: number, slotIndex: number) {
  const character = await getEffectiveCharacter(userId);

  const charTower = await prisma.character.findUnique({
    where: { userId },
    include: { tower: { include: { buildings: true } } },
  });

  const libraryLevel = charTower?.tower?.buildings
    .find(b => b.buildingType === "library")?.level ?? 0;
  const schoolBonusesForEquip = await getCharacterSchoolBonuses(character.id);
  const extraSlotsForEquip = schoolBonusesForEquip?.spell_slot ?? 0;
  const maxSlots = getSpellSlotCount(libraryLevel, extraSlotsForEquip);
  if (maxSlots === 0) throw new Error("Wybuduj Bibliotekę aby aktywować czary bojowe");
  if (slotIndex >= maxSlots) throw new Error(`Biblioteka poziomu ${libraryLevel} daje tylko ${maxSlots} slot(y) aktywnych czarów`);

  const discovered = await prisma.spellbookEntry.findUnique({
    where: { characterId_spellId: { characterId: character.id, spellId } },
  });
  if (!discovered) throw new Error("Nie poznałeś jeszcze tego czaru — odkryj go poprzez Studia");

  const spell = await prisma.spell.findUnique({ where: { id: spellId } });
  if (!spell) throw new Error("Czar nie istnieje");

  checkSpellRequirements(spell, character);

  await prisma.characterSpellSlots.upsert({
    where:  { characterId_slotIndex: { characterId: character.id, slotIndex } },
    update: { spellId },
    create: { characterId: character.id, spellId, slotIndex },
  });

// ── TUTORIAL: pierwszy wyekwipowany czar ──────────────
  const tutorial = await getOrCreateTutorial(character.id);
  let tutorialMessage: string | null = null;

  if (tutorial.step === TUTORIAL_STEPS.STUDY_DONE) {
    const advanced = await advanceTutorialStep(
      character.id,
      TUTORIAL_STEPS.STUDY_DONE,
      TUTORIAL_STEPS.SPELL_EQUIPPED
    );
    if (advanced) {
      // Odblokuj pierwsze zadanie budowy wieży
      await prisma.homeRepairTask.update({
        where: { characterId_taskCode: { characterId: character.id, taskCode: "FOUNDATIONS" } },
        data: { status: "available" },
      });
      tutorialMessage = TUTORIAL_MESSAGES.WIZARD_REALIZATION;
    }
  }

  return {
    message: `Czar ${spell.name} przypisany do slotu ${slotIndex}`,
    tutorialMessage,  // <-- rozszerz istniejący return
  };
}

// ── EKWIPUJ CZAR AUTOMATYCZNIE (pierwszy wolny slot) ──────────────────────────

export async function equipSpellAuto(userId: number, spellId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const charTower = await prisma.character.findUnique({
    where: { userId },
    include: { tower: { include: { buildings: true } } },
  });
  const libraryLevel = charTower?.tower?.buildings.find(b => b.buildingType === "library")?.level ?? 0;
  const schoolBonusesForAuto = await getCharacterSchoolBonuses(character.id);
  const extraSlotsForAuto = schoolBonusesForAuto?.spell_slot ?? 0;
  const maxSlots = getSpellSlotCount(libraryLevel, extraSlotsForAuto);
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

// ── USUŃ CZAR ZE SLOTU ─────────────────────────────────────────────────────────

export async function unequipSpell(userId: number, slotIndex: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  await prisma.characterSpellSlots.deleteMany({
    where: { characterId: character.id, slotIndex },
  });

  return { message: `Slot czaru ${slotIndex} opróżniony` };
}


// ── ZESTAWY EKWIPUNKU ────────────────────────────────────────────────────────

export async function saveEquipmentPreset(userId: number, slotIndex: number, name: string) {
  if (slotIndex < 0 || slotIndex > 9) throw new Error("Nieprawidłowy indeks zestawu");
  if (!name.trim()) throw new Error("Podaj nazwę zestawu");

  const character = await prisma.character.findUnique({
    where: { userId },
    include: { equipment: true },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const eq = character.equipment;

  // Zapisujemy itemId (typ przedmiotu), nie ownedItemId (konkretna instancja)
  async function getItemId(ownedId: number | null | undefined): Promise<number | null> {
    if (!ownedId) return null;
    const owned = await prisma.ownedItem.findUnique({ where: { id: ownedId } });
    return owned?.itemId ?? null;
  }

  const [hatItemId, robeItemId, bootsItemId, talismanItemId, mainHandItemId, offHandItemId] =
    await Promise.all([
      getItemId(eq?.hatId),
      getItemId(eq?.robeId),
      getItemId(eq?.bootsId),
      getItemId(eq?.talismanId),
      getItemId(eq?.mainHandId),
      getItemId(eq?.offHandId),
    ]);

  await prisma.equipmentPreset.upsert({
    where: { characterId_slotIndex: { characterId: character.id, slotIndex } },
    update: { name: name.trim().slice(0, 8), hatItemId, robeItemId, bootsItemId, talismanItemId, mainHandItemId, offHandItemId, updatedAt: new Date() },
    create: { characterId: character.id, slotIndex, name: name.trim().slice(0, 8), hatItemId, robeItemId, bootsItemId, talismanItemId, mainHandItemId, offHandItemId },
  });

  return { slotIndex, name };
}

export async function getEquipmentPresets(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const presets = await prisma.equipmentPreset.findMany({
    where: { characterId: character.id },
    orderBy: { slotIndex: "asc" },
  });

  return presets;
}

export async function applyEquipmentPreset(userId: number, slotIndex: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { equipment: true },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const preset = await prisma.equipmentPreset.findUnique({
    where: { characterId_slotIndex: { characterId: character.id, slotIndex } },
  });
  if (!preset) throw new Error("Zestaw nie istnieje");

  // Zdejmij wszystko co jest założone
  const eq = character.equipment;
  const currentlyEquipped = [
    eq?.hatId, eq?.robeId, eq?.bootsId,
    eq?.talismanId, eq?.mainHandId, eq?.offHandId,
  ].filter(Boolean) as number[];

  for (const ownedId of currentlyEquipped) {
    await prisma.chaosVaultItem.upsert({
      where: { ownedItemId: ownedId },
      update: {},
      create: { ownedItemId: ownedId },
    });
  }

  await prisma.characterEquipment.upsert({
    where: { characterId: character.id },
    update: { hatId: null, robeId: null, bootsId: null, talismanId: null, mainHandId: null, offHandId: null },
    create: { characterId: character.id },
  });

  // Dla każdego slotu w zestawie znajdź pierwszy pasujący OwnedItem w komnacie
  const slotDefs: { itemId: number | null; field: string }[] = [
    { itemId: preset.hatItemId,      field: "hatId"      },
    { itemId: preset.robeItemId,     field: "robeId"     },
    { itemId: preset.bootsItemId,    field: "bootsId"    },
    { itemId: preset.talismanItemId,   field: "talismanId"   },
    { itemId: preset.mainHandItemId, field: "mainHandId" },
    { itemId: preset.offHandItemId,  field: "offHandId"  },
  ];

  const missing: string[] = [];
  const updateData: Record<string, number> = {};

  for (const { itemId, field } of slotDefs) {
    if (!itemId) continue;

    // Szukaj w komnacie
    const vaultEntry = await prisma.chaosVaultItem.findFirst({
      where: { ownedItem: { characterId: character.id, itemId } },
      include: { ownedItem: { include: { item: true } } },
    });

    if (!vaultEntry) {
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      missing.push(item?.name ?? `ID ${itemId}`);
      continue;
    }

    // Wyjmij z komnaty i załóż
    await prisma.chaosVaultItem.delete({ where: { id: vaultEntry.id } });
    updateData[field] = vaultEntry.ownedItemId;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.characterEquipment.update({
      where: { characterId: character.id },
      data: updateData,
    });
  }

  return {
    applied: Object.keys(updateData).length,
    missing,
    outdated: missing.length > 0,
    message: missing.length > 0
      ? `Twój zestaw jest nieaktualny! Brakuje: ${missing.join(", ")}`
      : `Założono zestaw "${preset.name}"`,
  };
}