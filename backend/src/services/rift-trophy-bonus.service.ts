// ═══════════════════════════════════════════════════════════════════
// RIFT TROPHY BONUS SERVICE
// src/services/rift-trophy-bonus.service.ts
//
// Jeden punkt wejścia dla wszystkich serwisów potrzebujących bonusów
// z trofeów szczelin. Analogiczny do getCharacterSchoolBonuses().
//
// Użycie:
//   import { getRiftTrophyBonuses } from "./rift-trophy-bonus.service.js";
//   const trophyBonuses = await getRiftTrophyBonuses(characterId);
// ═══════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";
import {
  RiftTrophyBonuses,
  AggregatedRiftTrophyBonuses,
  EMPTY_RIFT_TROPHY_BONUSES,
  CharacterStat,
  SpellElement,
  EquipmentSlot,
} from "../types/rift-trophy-types.js";
import { getActiveTrophySlots } from "./tower.service.js";

// ── GŁÓWNA FUNKCJA ────────────────────────────────────────────────
// Pobiera wszystkie trofea gracza i sumuje ich bonusy.
// Wynik jest cachowany per request — nie ma sensu pobierać kilka razy
// w tym samym flow (np. podczas jednej walki). Cache po stronie callera.

export async function getRiftTrophyBonuses(
  characterId: number
): Promise<AggregatedRiftTrophyBonuses> {
  // Sprawdź ile slotów gabloty gracz ma odblokowanych
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { tower: { include: { buildings: true } } },
  });

  const cabinetLevel = character?.tower?.buildings
    .find(b => b.buildingType === "trophy_cabinet")?.level ?? 0;
  const activeSlots = getActiveTrophySlots(cabinetLevel);

  if (activeSlots === 0) {
    return { ...EMPTY_RIFT_TROPHY_BONUSES };
  }

  // Pobierz trofea posortowane od najnowszego — gracz "aktywuje" ostatnio zdobyte
  const trophies = await prisma.characterRiftTrophy.findMany({
    where: { characterId },
    include: { trophy: true },
    orderBy: { earnedAt: "desc" },
    take: activeSlots,  // bierzemy tylko tyle ile gablota pozwala
  });

  if (trophies.length === 0) {
    return { ...EMPTY_RIFT_TROPHY_BONUSES };
  }

  const result: AggregatedRiftTrophyBonuses = {
    stats: {},
    elementResist: {},
    allResist: 0,
    spellCostModifier: 0,
    reqReduction: { equipment: 0, tower: 0 },
    itemTierBonus: 0,
    dodge: 0,
    guaranteedHitTournament: false,
    guaranteedHitCombat: false,
    elementDamage: {},
    minionStatMultiplier: 1.0,
    chaoticSpellBonus: 0,
    equipmentBonusMultiplier: {},
  };

  for (const entry of trophies) {
    let bonuses: RiftTrophyBonuses;
    try {
      bonuses = JSON.parse(entry.trophy.bonuses) as RiftTrophyBonuses;
    } catch {
      continue; // uszkodzony JSON — pomijamy
    }

    // C1-C5: statystyki
    if (bonuses.stats) {
      for (const [stat, value] of Object.entries(bonuses.stats)) {
        const s = stat as CharacterStat;
        result.stats[s] = (result.stats[s] ?? 0) + (value ?? 0);
      }
    }

    // C6: odporność na żywioły
    if (bonuses.elementResist) {
      for (const [element, value] of Object.entries(bonuses.elementResist)) {
        const e = element as SpellElement;
        result.elementResist[e] = (result.elementResist[e] ?? 0) + (value ?? 0);
      }
    }

    // C7: odporność na wszystkie obrażenia
    if (bonuses.allResist !== undefined) {
      result.allResist += bonuses.allResist;
    }

    // C8: koszt czaru
    if (bonuses.spellCostModifier !== undefined) {
      result.spellCostModifier += bonuses.spellCostModifier;
    }

    // C9: redukcja wymagań
    if (bonuses.reqReduction) {
      result.reqReduction.equipment += bonuses.reqReduction.equipment ?? 0;
      result.reqReduction.tower += bonuses.reqReduction.tower ?? 0;
    }

    // C10: tier przedmiotów
    if (bonuses.itemTierBonus !== undefined) {
      result.itemTierBonus += bonuses.itemTierBonus;
    }

    // C11: gwarancja trafienia na turnieju
    if (bonuses.guaranteedHitTournament) {
      result.guaranteedHitTournament = true;
    }

    // C12: gwarancja trafienia w walce
    if (bonuses.guaranteedHitCombat) {
      result.guaranteedHitCombat = true;
    }

    // C13: obrażenia z żywiołu
    if (bonuses.elementDamage) {
      for (const [element, value] of Object.entries(bonuses.elementDamage)) {
        const e = element as SpellElement;
        result.elementDamage[e] = (result.elementDamage[e] ?? 0) + (value ?? 0);
      }
    }

    // C14: mnożnik minionów — addytywne delty względem 1.0
    // Dwa trofea dające po +25% = razem +50% = mnożnik 1.5
    if (bonuses.minionStatMultiplier !== undefined) {
      result.minionStatMultiplier += bonuses.minionStatMultiplier - 1.0;
    }

    // C15: bonus do czarów chaotic
    if (bonuses.chaoticSpellBonus !== undefined) {
      result.chaoticSpellBonus += bonuses.chaoticSpellBonus;
    }

    // C16: mnożnik bonusów z ekwipunku — addytywne delty względem 1.0
    if (bonuses.equipmentBonusMultiplier) {
      for (const [slot, value] of Object.entries(bonuses.equipmentBonusMultiplier)) {
        const s = slot as EquipmentSlot;
        const current = result.equipmentBonusMultiplier[s] ?? 1.0;
        result.equipmentBonusMultiplier[s] = current + ((value ?? 1.0) - 1.0);
      }
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERY DLA KONKRETNYCH SERWISÓW
// Każdy helper odpowiada jednemu punktowi integracji w kodzie gry.
// Przyjmują gotowy AggregatedRiftTrophyBonuses żeby nie robić
// osobnych zapytań do bazy w każdym miejscu.
// ═══════════════════════════════════════════════════════════════════

// ── C8: Modyfikacja kosztu czaru ──────────────────────────────────
// Użycie: w combat.service przed odjęciem powerShards za rzucenie czaru
// spellBaseCost = Spell.basicCost
// Zwraca finalny koszt (minimum 0)
export function applySpellCostModifier(
  spellBaseCost: number,
  bonuses: AggregatedRiftTrophyBonuses
): number {
  return Math.max(0, spellBaseCost + bonuses.spellCostModifier);
}

// ── C9: Redukcja wymagań ekwipunku ────────────────────────────────
// Użycie: w equipment.service przy sprawdzaniu czy gracz może założyć przedmiot
// statValue = wartość wymagania z Item (np. reqPower: 20)
// Zwraca zredukowane wymaganie (zaokrąglone w dół, minimum 0)
export function applyEquipmentReqReduction(
  statValue: number,
  bonuses: AggregatedRiftTrophyBonuses
): number {
  const reductionFactor = 1 - bonuses.reqReduction.equipment / 100;
  return Math.max(0, Math.floor(statValue * reductionFactor));
}

// ── C9: Redukcja wymagań budynków wieży ──────────────────────────
// Użycie: w tower.service przy sprawdzaniu wymagań rozbudowy
// towerLevelReq = wymagany poziom wieży dla budynku
// Zwraca zredukowane wymaganie (zaokrąglone w dół, minimum 1)
export function applyTowerReqReduction(
  towerLevelReq: number,
  bonuses: AggregatedRiftTrophyBonuses
): number {
  const reductionFactor = 1 - bonuses.reqReduction.tower / 100;
  return Math.max(1, Math.floor(towerLevelReq * reductionFactor));
}

// ── C10: Bonus do tieru przedmiotu ───────────────────────────────
// Użycie: w exploration.service przy addItemToChaosVaultWithMessage
// maxTier = górna granica tieru przed bonusem
// Zwraca nowy maxTier (ograniczony do 10)
export function applyItemTierBonus(
  maxTier: number,
  bonuses: AggregatedRiftTrophyBonuses
): number {
  return Math.min(10, maxTier + bonuses.itemTierBonus);
}

// ── C11/C12: Sprawdzenie gwarancji trafienia ─────────────────────
// Użycie: w combat.service / magic-tournament.service
// przy mechanizmie chybienia wynikającym z intelligence
// Jeśli zwraca true — pomijamy obliczanie szansy na miss
export function hasGuaranteedHit(
  bonuses: AggregatedRiftTrophyBonuses,
  context: "combat" | "tournament"
): boolean {
  if (context === "tournament") return bonuses.guaranteedHitTournament;
  return bonuses.guaranteedHitCombat;
}

// ── C13: Bonus do obrażeń z żywiołu ─────────────────────────────
// Użycie: w combat.service po obliczeniu bazowych obrażeń czaru
// element = żywioł czaru, baseDamage = obliczone obrażenia przed bonusem
// Zwraca obrażenia po modyfikacji (zaokrąglone, minimum 0)
export function applyElementDamageBonus(
  baseDamage: number,
  element: SpellElement,
  bonuses: AggregatedRiftTrophyBonuses
): number {
  const bonus = bonuses.elementDamage[element] ?? 0;
  if (bonus === 0) return baseDamage;
  return Math.max(0, Math.round(baseDamage * (1 + bonus / 100)));
}

// ── C14: Modyfikacja statystyk minionów ──────────────────────────
// Użycie: w combat.service przy tworzeniu minionów ze Spell
// Zwraca zmodyfikowane wartości (zaokrąglone w górę, minimum 1)
export function applyMinionStatMultiplier(
  stats: { hp: number; damage: number; initiative: number },
  bonuses: AggregatedRiftTrophyBonuses
): { hp: number; damage: number; initiative: number } {
  const m = bonuses.minionStatMultiplier;
  if (m === 1.0) return stats;
  return {
    hp:         Math.max(1, Math.ceil(stats.hp * m)),
    damage:     Math.max(1, Math.ceil(stats.damage * m)),
    initiative: Math.max(1, Math.ceil(stats.initiative * m)),
  };
}

// ── C15: Bonus do czarów chaotic ─────────────────────────────────
// Użycie: w combat.service po wylosowaniu / wybraniu czaru aktywnego
// spellPool = Spell.spellPool — sprawdzamy czy to "chaotic"
// baseDamage = obliczone obrażenia przed bonusem
// Zwraca obrażenia po modyfikacji (zaokrąglone, minimum 0)
export function applyChaoticSpellBonus(
  baseDamage: number,
  spellPool: string,
  bonuses: AggregatedRiftTrophyBonuses
): number {
  if (spellPool !== "chaotic") return baseDamage;
  if (bonuses.chaoticSpellBonus === 0) return baseDamage;
  return Math.max(0, Math.round(baseDamage * (1 + bonuses.chaoticSpellBonus / 100)));
}

// ── C16: Bonus do statystyk z ekwipunku per slot ─────────────────
// Użycie: w character.service przy getEffectiveStats()
// slot = slot ekwipunku ("mainHand" | "robe" itp.)
// bonusValue = wartość bonusu z przedmiotu (np. item.bonusPower)
// Zwraca bonusValue po modyfikacji mnożnikiem (zaokrąglone, może być ujemne)
export function applyEquipmentBonusMultiplier(
  bonusValue: number,
  slot: EquipmentSlot,
  bonuses: AggregatedRiftTrophyBonuses
): number {
  const multiplier = bonuses.equipmentBonusMultiplier[slot] ?? 1.0;
  if (multiplier === 1.0) return bonusValue;
  return Math.round(bonusValue * multiplier);
}

// ── C6/C7: Redukcja otrzymywanych obrażeń ────────────────────────
// Użycie: w combat.service po obliczeniu obrażeń zadanych przez przeciwnika
// incomingDamage = obrażenia przed redukcją
// damageElement = żywioł ataku
// Najpierw allResist, potem elementResist — oba addytywne w %
// Zwraca obrażenia po redukcji (zaokrąglone, minimum 0)
export function applyDamageResist(
  incomingDamage: number,
  damageElement: SpellElement,
  bonuses: AggregatedRiftTrophyBonuses
): number {
  const totalResist =
    bonuses.allResist + (bonuses.elementResist[damageElement] ?? 0);
  if (totalResist === 0) return incomingDamage;
  return Math.max(0, Math.round(incomingDamage * (1 - totalResist / 100)));
}

// ── C1-C5: Bonusy do statystyk postaci ──────────────────────────
// Użycie: w character.service przy getEffectiveStats()
// stat = nazwa statystyki
// baseValue = bazowa wartość statystyki postaci
// Zwraca wartość po dodaniu bonusu trofeum
export function applyStatBonus(
  baseValue: number,
  stat: CharacterStat,
  bonuses: AggregatedRiftTrophyBonuses
): number {
  return baseValue + (bonuses.stats[stat] ?? 0);
}