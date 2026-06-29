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

function attackToSpell(attack: PveAttack): import("../types/spell-types.js").BattleSpell {
  return {
    id: _attackIdCounter--,
    name: attack.name,
    category: "offensive" as const,
    damage: attack.damage,
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

function buildPveSpellPool(attacks: PveAttack[]): ReturnType<typeof attackToSpell>[] {
  if (attacks.length === 0) return [];

  // Normalizujemy wagi do GCD
  function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
  const weights = attacks.map(a => a.weight);
  const g = weights.reduce(gcd);
  const normalized = weights.map(w => Math.round(w / g));

  // Tworzymy 10 pełnych cykli żeby nie wyczerpać puli w 10 turach
  const CYCLES = 10;
  const pool: ReturnType<typeof attackToSpell>[] = [];

  for (let cycle = 0; cycle < CYCLES; cycle++) {
    // Tasujemy kolejność w każdym cyklu dla naturalnej losowości
    const shuffled = [...attacks]
      .map((a, i) => ({ attack: a, count: normalized[i]! }))
      .sort(() => Math.random() - 0.5);

    for (const { attack, count } of shuffled) {
      for (let j = 0; j < count; j++) {
        pool.push(attackToSpell(attack));
      }
    }
  }

  return pool;
}

// ── BUDOWANIE FIGHTER-A Z BYTU ───────────────────────────────────────────────

export function buildEntityFighter(entity: MinorEntityDef): Fighter {
  const spellPool = buildPveSpellPool(entity.attacks);

  return {
    id: -999,
    name: entity.name,
    level: 1,
    hp: entity.hp,
    maxHp: entity.hp,
    powerShards: Infinity,

    // Statystyki walki — tylko te których silnik faktycznie używa dla !isPlayer
    resistance: 0,   // PvE używa własnego systemu odporności per-żywioł
    initiative: entity.initiative,
    intelligence: 0, // brak wpływu na cast chance dla !isPlayer
    power: 0,        // brak wpływu na obrażenia (nowa logika calculatePveDamage)
    elementalMagic: 0,
    astralMagic: 0,
    bloodMagic: 0,

    towerLevel: 1,
    activeSpells: [],
    spellPool,
    minions: [],
    appliedStatuses: [],
    stunTurnsLeft: 0,
    isPlayer: false,
    dodgeChance: 0,
    altairModifiers: {},

    // Pola PvE-specyficzne
    pveResistances: entity.resistances,
    pveStatusImmunities: entity.statusImmunities,
    entityDamageVariance: entity.damageVariance,

    imageKey: entity.imageKey,
  };
}