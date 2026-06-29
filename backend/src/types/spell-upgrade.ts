// ═══════════════════════════════════════════════════════════════════════════════
// SPELL UPGRADE SYSTEM
// src/utils/spell-upgrade.ts
//
// Każdy czar może zostać ulepszony do 25 razy (upgradeTier 0–25).
// Wzrost addytywny: każdy tier = +2% wartości bazowej.
// Tier 25 = +50% wartości bazowej.
//
// Ulepszane parametry wg kategorii:
//   offensive  — damage, basicCost(↑), statusEffects[].damage, statusEffects[].duration
//   supportive — basicCost(↑ lub ↓ dla clean), statusEffects[].healAmount,
//                statusEffects[].statusChance, statusEffects[].duration,
//                statusEffects[].statAmount, statusEffects[].value
//   summoner   — basicCost(↑), summonHp, summonInitiative, minionAttacks[].damage
//   utility    — basicCost(↑), wszystkie pola utilityEffect
//
// Wyjątek basicCost:
//   Czary z type:"clean" wśród statusEffects → basicCost maleje z każdym tierem.
//   Pozostałe → basicCost rośnie.
// ═══════════════════════════════════════════════════════════════════════════════

import type { StatusEffectDef } from "../types/status-types.js";
import type { MinionAttack } from "../types/spell-types.js";
import type { UtilityEffectDef } from "../types/utility-types.js";

// ── Stałe ────────────────────────────────────────────────────────────────────

export const MAX_UPGRADE_TIER = 25;
export const UPGRADE_PERCENT_PER_TIER = 0.02; // +2% bazowej per tier

// Caps dla wartości procentowych
const CAP_STATUS_CHANCE = 100;
const CAP_RESIST_VALUE = 90;

// ── Helper: mnożnik dla danego tieru ─────────────────────────────────────────

/**
 * Zwraca multiplikator względem wartości bazowej.
 * Tier 0 → 1.0 (bez zmian), tier 25 → 1.50.
 */
export function upgradeMultiplier(tier: number): number {
  return 1 + tier * UPGRADE_PERCENT_PER_TIER;
}

/**
 * Zwraca multiplikator odwrotny (dla wartości malejących, np. basicCost clean).
 * Tier 0 → 1.0, tier 25 → 0.50.
 */
export function upgradeMultiplierDown(tier: number): number {
  return 1 - tier * UPGRADE_PERCENT_PER_TIER;
}

// ── Helper: skalowanie wartości całkowitej ────────────────────────────────────

function scaleInt(base: number, multiplier: number): number {
  return Math.round(base * multiplier);
}

/**
 * Skaluje wartość procentową z capem.
 * Dla wartości ujemnych (np. statAmount = -25) skaluje "w dół" (bardziej ujemna).
 */
function scalePercent(base: number, multiplier: number, cap: number): number {
  if (base < 0) {
    // Wzmacniamy osłabienie: -25 × 1.5 = -37.5 → Math.round = -38
    return Math.max(-cap, Math.round(base * multiplier));
  }
  return Math.min(cap, Math.round(base * multiplier));
}

// ── Skalowanie statusEffects ──────────────────────────────────────────────────

function upgradeStatusEffects(
  effects: StatusEffectDef[],
  multiplier: number
): StatusEffectDef[] {
  return effects.map(effect => {
    const e = { ...effect } as StatusEffectDef;

    switch (e.type) {
      case "dot":
      case "damage_on_move":
        return {
          ...e,
          damage: scaleInt(e.damage, multiplier),
          ...(e.duration !== null && e.duration !== undefined
            ? { duration: scaleInt(e.duration, multiplier) }
            : {}),
          ...(e.statusChance !== undefined
            ? { statusChance: scalePercent(e.statusChance, multiplier, CAP_STATUS_CHANCE) }
            : {}),
        };

      case "stun":
        return {
          ...e,
          duration: scaleInt(e.duration as number, multiplier),
          statusChance: scalePercent(e.statusChance, multiplier, CAP_STATUS_CHANCE),
        };

      case "heal_chance":
        return {
          ...e,
          healAmount: scaleInt(e.healAmount, multiplier),
          ...(e.statusChance !== undefined
            ? { statusChance: scalePercent(e.statusChance, multiplier, CAP_STATUS_CHANCE) }
            : {}),
          ...(e.duration !== null && e.duration !== undefined
            ? { duration: scaleInt(e.duration, multiplier) }
            : {}),
        };

      case "stat_boost":
        return {
          ...e,
          statAmount: e.statMode === "percent"
            ? scalePercent(e.statAmount, multiplier, 100)
            : scaleInt(e.statAmount, multiplier),
          ...(e.duration !== null && e.duration !== undefined
            ? { duration: scaleInt(e.duration, multiplier) }
            : {}),
        };

      case "resist":
        return {
          ...e,
          value: scalePercent(e.value, multiplier, CAP_RESIST_VALUE),
        };

      case "vulnerable":
        return {
          ...e,
          value: scalePercent(e.value, multiplier, CAP_STATUS_CHANCE),
          ...(e.duration !== null && e.duration !== undefined
            ? { duration: scaleInt(e.duration, multiplier) }
            : {}),
        };

      case "invisibility":
        return {
          ...e,
          statusChance: scalePercent(e.statusChance, multiplier, CAP_STATUS_CHANCE),
          ...(e.duration !== null && e.duration !== undefined
            ? { duration: scaleInt(e.duration, multiplier) }
            : {}),
        };

      case "clean":
        // Clean nie ma parametrów liczbowych do skalowania
        return e;

      case "taunt":
        return {
          ...e,
          statusChance: scalePercent(e.statusChance, multiplier, CAP_STATUS_CHANCE),
        };

      default:
        return e;
    }
  });
}

// ── Skalowanie minionAttacks ──────────────────────────────────────────────────

function upgradeMinionAttacks(
  attacks: MinionAttack[],
  multiplier: number
): MinionAttack[] {
  return attacks.map(attack => ({
    ...attack,
    damage: scaleInt(attack.damage, multiplier),
  }));
}

// ── Skalowanie utilityEffect ──────────────────────────────────────────────────

function upgradeUtilityEffect(
  effect: UtilityEffectDef,
  multiplier: number
): UtilityEffectDef {
  const result: UtilityEffectDef = { ...effect };

  if (effect.bonusItemFindChance !== undefined)
    result.bonusItemFindChance = scaleInt(effect.bonusItemFindChance, multiplier);
  if (effect.bonusEncounterChance !== undefined)
    result.bonusEncounterChance = scaleInt(effect.bonusEncounterChance, multiplier);
  if (effect.avoidEncounterChance !== undefined)
    result.avoidEncounterChance = scaleInt(effect.avoidEncounterChance, multiplier);
  if (effect.avoidHitChance !== undefined)
    result.avoidHitChance = scaleInt(effect.avoidHitChance, multiplier);
  if (effect.bonusItemTier !== undefined)
    result.bonusItemTier = scaleInt(effect.bonusItemTier, multiplier);
  if (effect.explorationTimeReduction !== undefined)
    result.explorationTimeReduction = scaleInt(effect.explorationTimeReduction, multiplier);
  if (effect.randomValue !== undefined)
    result.randomValue = scaleInt(effect.randomValue, multiplier);
  // alwaysFirstInPve i randomFrom — bez zmian

  return result;
}

// ── Sprawdzenie: czy czar zawiera type:"clean" ────────────────────────────────

function hasCleanEffect(statusEffects: StatusEffectDef[]): boolean {
  return statusEffects.some(e => e.type === "clean");
}

// ── Główna funkcja: applySpellUpgrades ───────────────────────────────────────

export interface SpellUpgradeInput {
  category: string;
  damage: number;
  basicCost: number;
  statusEffects: string;   // JSON string z bazy
  summonHp: number;
  summonInitiative: number;
  minionAttacks: string;   // JSON string z bazy
  utilityEffect: string;   // JSON string z bazy
}

export interface SpellUpgradeOutput {
  damage: number;
  basicCost: number;
  statusEffects: StatusEffectDef[];
  summonHp: number;
  summonInitiative: number;
  minionAttacks: MinionAttack[];
  utilityEffect: UtilityEffectDef;
}

/**
 * Przelicza parametry czaru dla danego upgradeTier.
 * Tier 0 → oryginalne wartości bez zmian.
 * Tier 1–25 → wartości skalowane addytywnie względem bazy.
 *
 * @param spell    - dane czaru z bazy (pola JSON jako string)
 * @param tier     - aktualny tier gracza (0–25)
 */
export function applySpellUpgrades(
  spell: SpellUpgradeInput,
  tier: number
): SpellUpgradeOutput {
  // Parsowanie JSON
  let statusEffects: StatusEffectDef[] = [];
  let minionAttacks: MinionAttack[] = [];
  let utilityEffect: UtilityEffectDef = {};

  try { statusEffects = JSON.parse(spell.statusEffects) as StatusEffectDef[]; } catch { /* noop */ }
  try { minionAttacks = JSON.parse(spell.minionAttacks) as MinionAttack[]; } catch { /* noop */ }
  try { utilityEffect = JSON.parse(spell.utilityEffect) as UtilityEffectDef; } catch { /* noop */ }

  // Tier 0 — bez zmian
  if (tier === 0) {
    return {
      damage: spell.damage,
      basicCost: spell.basicCost,
      statusEffects,
      summonHp: spell.summonHp,
      summonInitiative: spell.summonInitiative,
      minionAttacks,
      utilityEffect,
    };
  }

  const mul = upgradeMultiplier(tier);

  // ── basicCost ─────────────────────────────────────────────────────────────
  // Wyjątek: czar z clean → tanieje; pozostałe → drożeją
  let basicCost = spell.basicCost;
  if (spell.basicCost > 0) {
    if (hasCleanEffect(statusEffects)) {
      basicCost = Math.max(0, scaleInt(spell.basicCost, upgradeMultiplierDown(tier)));
    } else {
      basicCost = scaleInt(spell.basicCost, mul);
    }
  }
  // basicCost === 0 → nie zmieniamy (żadna z tych formuł i tak nic nie da, ale dla jasności)

  // ── Skalowanie wg kategorii ───────────────────────────────────────────────
  switch (spell.category) {
    case "offensive":
      return {
        damage: spell.damage > 0 ? scaleInt(spell.damage, mul) : 0,
        basicCost,
        statusEffects: upgradeStatusEffects(statusEffects, mul),
        summonHp: spell.summonHp,
        summonInitiative: spell.summonInitiative,
        minionAttacks,
        utilityEffect,
      };

    case "supportive":
      return {
        damage: 0,
        basicCost,
        statusEffects: upgradeStatusEffects(statusEffects, mul),
        summonHp: spell.summonHp,
        summonInitiative: spell.summonInitiative,
        minionAttacks,
        utilityEffect,
      };

    case "summoner":
      return {
        damage: 0,
        basicCost,
        statusEffects,
        summonHp: scaleInt(spell.summonHp, mul),
        summonInitiative: scaleInt(spell.summonInitiative, mul),
        minionAttacks: upgradeMinionAttacks(minionAttacks, mul),
        utilityEffect,
      };

    case "utility":
      return {
        damage: 0,
        basicCost,
        statusEffects,
        summonHp: spell.summonHp,
        summonInitiative: spell.summonInitiative,
        minionAttacks,
        utilityEffect: upgradeUtilityEffect(utilityEffect, mul),
      };

    default:
      return {
        damage: spell.damage,
        basicCost,
        statusEffects,
        summonHp: spell.summonHp,
        summonInitiative: spell.summonInitiative,
        minionAttacks,
        utilityEffect,
      };
  }
}