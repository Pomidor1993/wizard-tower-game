// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY SPELL SERVICE
// src/services/utility-spell.service.ts
//
// Odpowiada za:
//   - pobieranie aktywnych czarów użytkowych postaci
//   - agregowanie bonusów eksploracyjnych
//   - zarządzanie slotami użytkowymi
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";
import {
  UtilityEffectDef,
  AggregatedUtilityBonuses,
  aggregateUtilityBonuses,
  parseUtilityEffect,
  parseUtilityDescriptions,
  EMPTY_BONUSES,
} from "../types/utility-types.js";

// ── Stałe ────────────────────────────────────────────────────────────────────

/** Maksymalna liczba slotów użytkowych — odblokowanie zależne od poziomu biblioteki */
export const MAX_UTILITY_SLOTS = 3;

/** Poziomy biblioteki wymagane do odblokowania kolejnych slotów (indeks = slot 0,1,2) */
export const UTILITY_SLOT_LIBRARY_LEVELS = [1, 3, 5] as const;

// ── Pobieranie bonusów eksploracyjnych ───────────────────────────────────────

/**
 * Zwraca zagregowane bonusy eksploracyjne dla postaci na podstawie aktywnych
 * czarów użytkowych. Używane przez exploration.service.
 */
export async function getUtilityBonuses(
  characterId: number
): Promise<AggregatedUtilityBonuses> {
  const slots = await prisma.characterUtilitySlots.findMany({
    where: { characterId },
    include: { spell: true },
  });

  if (slots.length === 0) return { ...EMPTY_BONUSES };

  const effects: UtilityEffectDef[] = slots.map(s =>
    parseUtilityEffect(s.spell.utilityEffect)
  );

  return aggregateUtilityBonuses(effects);
}

/**
 * Rozwiązuje losowy bonus (dla czarów Czary-mary / Hokus-pokus).
 * Wywoływać jednorazowo na początku akcji eksploracji, wynik dorzucać do bonusów.
 */
export function resolveRandomBonus(
  bonuses: AggregatedUtilityBonuses
): AggregatedUtilityBonuses {
  if (!bonuses.randomFrom || bonuses.randomFrom.length === 0) return bonuses;

  const pool = bonuses.randomFrom;
  const chosen = pool[Math.floor(Math.random() * pool.length)]!;
  const value = bonuses.randomValue ?? 10;

  const resolved = { ...bonuses };
  delete resolved.randomFrom;
  delete resolved.randomValue;

  if (chosen === "bonusItemFindChance")    resolved.bonusItemFindChance    += value;
  if (chosen === "bonusEncounterChance")   resolved.bonusEncounterChance   += value;
  if (chosen === "avoidEncounterChance")   resolved.avoidEncounterChance   += value;
  if (chosen === "avoidHitChance")         resolved.avoidHitChance         += value;
  if (chosen === "alwaysFirstInPve")       resolved.alwaysFirstInPve        = true;
  if (chosen === "bonusItemTier")          resolved.bonusItemTier          += value;
  if (chosen === "explorationTimeReduction") resolved.explorationTimeReduction += value;

  return resolved;
}

// ── Zarządzanie slotami ───────────────────────────────────────────────────────

/**
 * Zwraca dostępną liczbę slotów użytkowych na podstawie poziomu biblioteki.
 */
export function getUnlockedUtilitySlots(libraryLevel: number): number {
  let unlocked = 0;
  for (const requiredLevel of UTILITY_SLOT_LIBRARY_LEVELS) {
    if (libraryLevel >= requiredLevel) unlocked++;
  }
  return unlocked;
}

/**
 * Zwraca aktywne czary użytkowe postaci z pełnymi danymi czaru.
 */
export async function getUtilitySlots(characterId: number) {
  return prisma.characterUtilitySlots.findMany({
    where: { characterId },
    include: { spell: true },
    orderBy: { slotIndex: "asc" },
  });
}

/**
 * Przypisuje czar użytkowy do slotu.
 * Rzuca błąd gdy:
 *   - czar nie jest utility
 *   - slot jest poza zakresem odblokowanych slotów
 *   - czar jest już przypisany do innego slotu
 */
export async function equipUtilitySpell(
  characterId: number,
  spellId: number,
  slotIndex: number
): Promise<void> {
  // Walidacja czaru
  const spell = await prisma.spell.findUnique({ where: { id: spellId } });
  if (!spell) throw new Error("Czar nie istnieje");
  if (spell.spellType !== "utility") throw new Error("To nie jest czar użytkowy");

// Walidacja posiadania czaru (= odkrycia, tak jak przy czarach bojowych)
  const discovered = await prisma.spellbookEntry.findUnique({
    where: { characterId_spellId: { characterId, spellId } },
  });
  if (!discovered) throw new Error("Nie poznałeś jeszcze tego czaru — odkryj go poprzez Studia");

  // Walidacja liczby odblokowanych slotów
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { tower: { include: { buildings: true } } },
  });
  if (!character) throw new Error("Postać nie istnieje");

  const library = character.tower?.buildings.find(b => b.buildingType === "library");
  const libraryLevel = library?.level ?? 0;
  const unlockedSlots = getUnlockedUtilitySlots(libraryLevel);

  if (slotIndex < 0 || slotIndex >= unlockedSlots) {
    throw new Error(
      `Slot ${slotIndex} nie jest odblokowany. Poziom biblioteki ${libraryLevel} odblokowuje ${unlockedSlots} slotów.`
    );
  }

  // Upsert — zastępuje istniejący czar w danym slocie
  await prisma.characterUtilitySlots.upsert({
    where: { characterId_slotIndex: { characterId, slotIndex } },
    update: { spellId },
    create: { characterId, spellId, slotIndex },
  });
}

/**
 * Zdejmuje czar użytkowy ze slotu.
 */
export async function unequipUtilitySpell(
  characterId: number,
  slotIndex: number
): Promise<void> {
  await prisma.characterUtilitySlots.deleteMany({
    where: { characterId, slotIndex },
  });
}

// ── Widok do frontendu ────────────────────────────────────────────────────────

export interface UtilitySpellView {
  id: number;
  name: string;
  rarity: string;
  spellPool: string;
  element: string;
  utilityEffect: UtilityEffectDef;
  descriptions: Record<string, string>;
  slotIndex: number | null;
  owned: boolean;
}

/**
 * Zwraca listę wszystkich czarów użytkowych widocznych dla gracza:
 * odkryte z pełnymi danymi, nieodkryte jako zamazane.
 */
export async function getUtilitySpellbook(userId: number): Promise<UtilitySpellView[]> {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      spellbookEntries: { select: { spellId: true } },
      utilitySlots: { select: { spellId: true, slotIndex: true } },
    },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const discoveredIds = new Set(character.spellbookEntries.map(e => e.spellId));
  const slotMap = new Map(character.utilitySlots.map(s => [s.spellId, s.slotIndex]));

  const ownedIds = discoveredIds;

  const allUtility = await prisma.spell.findMany({
    where: { spellType: "utility" },
    orderBy: [{ rarity: "asc" }, { name: "asc" }],
  });

  return allUtility.map(spell => {
    const discovered = discoveredIds.has(spell.id);
    if (!discovered) {
      return {
        id: spell.id,
        name: "???",
        rarity: spell.rarity,
        spellPool: spell.spellPool,
        element: spell.element,
        utilityEffect: {},
        spellbookDescription: spell.spellbookDescription,
        descriptions: {},
        slotIndex: null,
        owned: false,
      };
    }
    return {
      id: spell.id,
      name: spell.name,
      rarity: spell.rarity,
      spellPool: spell.spellPool,
      element: spell.element,
      utilityEffect: parseUtilityEffect(spell.utilityEffect),
      descriptions: parseUtilityDescriptions(spell.utilityDescriptions),
      slotIndex: slotMap.get(spell.id) ?? null,
      owned: ownedIds.has(spell.id),
    };
  });
}