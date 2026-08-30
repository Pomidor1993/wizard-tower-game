// ═══════════════════════════════════════════════════════════════════════════════
// PVE ENGINE — adapter walki z pomniejszymi bytami
// src/services/pve-engine.ts
// ═══════════════════════════════════════════════════════════════════════════════

import type { MinorEntityDef, PveAttack } from "../data/minor-entities.js";
import type { Fighter } from "./combat.service.js";

// ── WAŻONE LOSOWANIE ATAKU ───────────────────────────────────────────────────
//
// Budujemy pulę spellPool przez powielanie ataków wg wagi.
// PvE entity nie ma blokady globalUsedSpellIds — jej spellPool jest traktowany
// jako activeSpells (kolejka), która NIGDY nie jest pusta, bo silnik walki
// w pętli może ją odświeżyć... ale nie. Lepsze podejście: używamy spellPool
// z wieloma kopiami, a entity ma isPlayer=false, więc silnik nie blokuje
// ponownego użycia (globalUsedSpellIds dotyczy tylko player spell pool).
//
// Ale żeby ten mechanizm działał poprawnie bez modyfikacji silnika — zamiast
// "puli do wyczerpania" dajemy bardzo dużą pulę (100 kopii wg wag) tak,
// że w praktyce nigdy się nie wyczerpie w 10 turach.

let _attackIdCounter = -1000;

function rollEntityProfile(variancePercent: number): number {
  if (variancePercent <= 0) return 1;
  const v = variancePercent / 100;
  // Zakres: [1 - v, 1 + v], np. variance=20 -> [0.8, 1.2]
  return 1 - v + Math.random() * 2 * v;
}

function attackToSpell(
  attack: PveAttack,
  profileRoll: number
): import("../types/spell-types.js").BattleSpell {
  const scaledDamage = attack.damage > 0
    ? Math.max(1, Math.round(attack.damage * profileRoll))
    : 0;
 
  return {
    id: _attackIdCounter--,
    name: attack.name,
    category: "offensive" as const,
    damage: scaledDamage,
    element: attack.element,
    spellPool: "pve" as const,
    basicCost: 0,
    special: attack.actionDesc,
    endInfo: null,
    target: attack.target as any,
    targetCount: attack.targetCount,
    statusEffects: attack.statusEffects,
    reqElementalMagic: 0,
    reqAstralMagic: 0,
    reqBloodMagic: 0,
    summonCount: 0,
    summonHp: 0,
    summonDamage: 0,
    summonInitiative: 0,
    summonElement: null,
    summonTargetType: null,
    minionAttacks: [],
  };
}

function buildPveSpellPool(
  attacks: PveAttack[],
  profileRoll: number
): ReturnType<typeof attackToSpell>[] {
  if (attacks.length === 0) return [];
 
  function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
  const weights = attacks.map(a => a.weight);
  const g = weights.reduce(gcd);
  const normalized = weights.map(w => Math.round(w / g));
 
  const CYCLES = 10;
  const pool: ReturnType<typeof attackToSpell>[] = [];
 
  for (let cycle = 0; cycle < CYCLES; cycle++) {
    const shuffled = [...attacks]
      .map((a, i) => ({ attack: a, count: normalized[i]! }))
      .sort(() => Math.random() - 0.5);
 
    for (const { attack, count } of shuffled) {
      for (let j = 0; j < count; j++) {
        pool.push(attackToSpell(attack, profileRoll)); 
      }
    }
  }
 
  return pool;
}

// ── BUDOWANIE FIGHTER-A Z BYTU ───────────────────────────────────────────────

export function buildEntityFighter(entity: MinorEntityDef): Fighter {
  const profileRoll = rollEntityProfile(entity.damageVariance);
 
  const scaledHp = Math.max(1, Math.round(entity.hp * profileRoll));
  const scaledInitiative = Math.max(0, Math.round(entity.initiative * profileRoll));
 
  const scaledResistances: Partial<Record<string, number>> = {};
  for (const [element, value] of Object.entries(entity.resistances)) {
    if (value === undefined) continue;
    scaledResistances[element] = Math.round(value * profileRoll);
  }
 
  const spellPool = buildPveSpellPool(entity.attacks, profileRoll);
 
  return {
    id: -999,
    name: entity.name,
    level: 1,
    hp: scaledHp,
    maxHp: scaledHp,
    powerShards: Infinity,
 
    resistance: 0,
    initiative: scaledInitiative,
    intelligence: 0,
    power: 0,
    elementalMagic: 0,
    astralMagic: 0,
    bloodMagic: 0,
 
    towerLevel: 1,
    activeSpells: [],
    spellPool,
    minions: [],
    appliedStatuses: [],
    isPlayer: false,
    dodgeChance: 0,
    altairModifiers: {},
 
    pveResistances: scaledResistances,
    pveStatusImmunities: entity.statusImmunities,
    entityDamageVariance: entity.damageVariance, 
 
    imageKey: entity.imageKey,
  };
}