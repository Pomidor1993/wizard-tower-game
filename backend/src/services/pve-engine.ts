// ═══════════════════════════════════════════════════════════════════════════════
// PVE ENGINE — adapter walki z pomniejszymi bytami
//
// Reużywa silnika PvP (simulateBattle) zamiast pisać go od nowa.
// Tworzy Fighter-a z MinorEntityDef, podłącza go jako sideB.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  MinorEntityDef,
  EntityAttack,
  EntityStatusAttack,
} from "../data/minor-entities.js";
import { AppliedStatus, StatusEffectDef } from "../types/status-types.js";
import { MinionTargetType } from "./combat.service.js";

// ── TYPY WEWNĘTRZNE ──────────────────────────────────────────────────────────
// Kopiujemy minimalne typy z battle.service żeby nie tworzyć cyklicznych zależności

type SpellPool = "chaotic" | "controlled" | "incantation" | "professional" | "master" | "pve";

interface BattleSpell {
  id: number;
  name: string;
  damage: number;
  element: string;
  spellPool: SpellPool;
  isDirectional: boolean;
  statusEffectDefs: StatusEffectDef[];
  castEffectDefs: never[];
  special: string | null;
  reqElementalMagic: number;
  reqAstralMagic: number;
  reqBloodMagic: number;
  summonCount: number;
  summonHp: number;
  summonDamage: number;
  summonElement: string | null;
  summonInitiative: number;
  summonTargetType: MinionTargetType | null;
}

export interface PvEFighter {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  resistance: number;
  initiative: number;
  power: number;
  intelligence: number;
  elementalMagic: number;
  astralMagic: number;
  bloodMagic: number;
  towerLevel: number;
  activeSpells: BattleSpell[];
  spellPool: BattleSpell[];
  minions: never[];
  appliedStatuses: AppliedStatus[];
  stunTurnsLeft: number;
  isPlayer: boolean;
}

// ── KONWERSJA ATAKU BYTU → BattleSpell ──────────────────────────────────────

let _attackIdCounter = -1; // Ujemne ID żeby nie kolidować z prawdziwymi czarami

function attackToSpell(attack: EntityAttack | EntityStatusAttack): BattleSpell {
  const id = _attackIdCounter--;

  // Ustal targetType — kierunkowe (target) lub obszarowe (allEnemies)
  const isDirectional = attack.targetType === "target";

  // Buduj statusEffectDefs jeśli to EntityStatusAttack
  const statusEffectDefs: StatusEffectDef[] = [];
  if ("statusEffect" in attack && attack.statusEffect) {
    const se = attack.statusEffect;
    statusEffectDefs.push({
      type: se.type,
      element: se.element,
      damage: se.damage,
      duration: se.duration,
      stunChance: se.stunChance,
      stunDuration: se.stunDuration,
      missChance: se.missChance,
      value: se.value,
      healChance: se.healChance,
      healAmount: se.healAmount,
      stat: se.stat,
      statMode: se.statMode,
      statAmount: se.statAmount,
      target: se.target as StatusEffectDef["target"],
      count: undefined,
    } as StatusEffectDef);
  }

  return {
    id,
    name: attack.name,
    damage: attack.damage,
    element: attack.element,
    spellPool: "pve" as SpellPool,
    isDirectional,
    statusEffectDefs,
    castEffectDefs: [],
    special: attack.description,
    reqElementalMagic: 0,
    reqAstralMagic: 0,
    reqBloodMagic: 0,
    summonCount: 0,
    summonHp: 0,
    summonDamage: 0,
    summonElement: null,
    summonInitiative: 0,
    summonTargetType: null as MinionTargetType | null,
  };
}

// ── WAŻONE LOSOWANIE ATAKU ───────────────────────────────────────────────────

function pickWeightedAttack(
  attacks: (EntityAttack | EntityStatusAttack)[]
): EntityAttack | EntityStatusAttack {
  const totalWeight = attacks.reduce((sum, a) => sum + a.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const attack of attacks) {
    roll -= attack.weight;
    if (roll <= 0) return attack;
  }
  return attacks[attacks.length - 1]!;
}

// ── BUDOWANIE FIGHTER-A Z BYTU ───────────────────────────────────────────────
//
// UWAGA: Byt ma pulę ataków zamiast "zestawu aktywnych czarów".
// Każdą turę silnik PvP pobiera pierwszy czar z activeSpells,
// a gdy ich brak — losuje z spellPool.
//
// Strategia: activeSpells = puste (byt zawsze losuje z puli ważonej)
// spellPool = wszystkie ataki przeliczone na BattleSpell
//
// Żeby zachować wagi ataków, przedwypełniamy spellPool
// proporcjonalnie do wag: atak o wadze 60 będzie 3x częstszy niż o wadze 20.
// W tym celu duplikujemy wpisy w proporcji do wagi / GCD(wag).

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function buildWeightedSpellPool(attacks: (EntityAttack | EntityStatusAttack)[]): BattleSpell[] {
  if (attacks.length === 0) return [];

  const weights = attacks.map(a => a.weight);
  const g = weights.reduce(gcd);
  const normalizedWeights = weights.map(w => Math.round(w / g));

  const pool: BattleSpell[] = [];
  for (let i = 0; i < attacks.length; i++) {
    const spell = attackToSpell(attacks[i]!);
    for (let j = 0; j < normalizedWeights[i]!; j++) {
      // Każda kopia musi mieć unikalny ID (silnik sprawdza usedSpellIds)
      pool.push({ ...spell, id: _attackIdCounter-- });
    }
  }
  return pool;
}

// ── GŁÓWNA FUNKCJA: buduje PvEFighter z MinorEntityDef ──────────────────────

export function buildEntityFighter(entity: MinorEntityDef): PvEFighter {
  _attackIdCounter = -1; // reset dla każdej walki żeby ID nie rosły w nieskończoność

  const spellPool = buildWeightedSpellPool(entity.attacks);

  return {
    id: -999,          // Ujemne ID — byt nie jest Character w bazie
    name: entity.name,
    hp: entity.hp,
    maxHp: entity.hp,
    resistance: entity.resistance,
    initiative: entity.initiative,
    power: entity.power,
    intelligence: entity.intelligence, 
    elementalMagic: entity.elementalMagic,
    astralMagic: entity.astralMagic,
    bloodMagic: entity.bloodMagic,
    towerLevel: 1,    // Byt nie ma wieży — zawsze pula "chaotic"
    activeSpells: [], // Byt nie ma przygotowanych czarów — losuje co turę
    spellPool,
    minions: [],
    appliedStatuses: [],
    stunTurnsLeft: 0,
    isPlayer: false,
  };
}