import prisma from "../lib/prisma.js";
import {
  StatusEffectDef,
  AppliedStatus,
  BattleStatuses,
  StatusTargetType,
  CastEffectDef,
  CastEffectTargetType,
  parseStatusEffects,
  parseCastEffects,
  getEffectiveStatuses,
  resolveRange,
  isNegativeStatus,
  CleanMode,
} from "../types/status-types.js";
import { recordSpellbookEntries } from "./spellbook.service.js";
import { alignmentTriggerService } from "./alignment/alignment-trigger.service.js";
import { getCharacterAlignmentBonus, MagicElement } from "./alignment/alignment-bonuses.constants.js";


const DAILY_BATTLE_LIMIT = 5;

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 1 — PULE CZARÓW
// ═══════════════════════════════════════════════════════════════════════════════

type SpellPool = "chaotic" | "controlled" | "incantation" | "professional" | "master" | "pve";

function getPoolWeights(towerLevel: number): Record<SpellPool, number> {
  if (towerLevel < 10)  return { chaotic: 100, controlled: 0,  incantation: 0,  professional: 0,  master: 0, pve: 0 };
  if (towerLevel <= 25) return { chaotic: 75,  controlled: 25, incantation: 0,  professional: 0,  master: 0, pve: 0 };
  if (towerLevel <= 50) return { chaotic: 40,  controlled: 40, incantation: 20, professional: 0,  master: 0, pve: 0 };
  if (towerLevel <= 75) return { chaotic: 20,  controlled: 30, incantation: 30, professional: 20, master: 0, pve: 0 };
  if (towerLevel <= 99) return { chaotic: 10,  controlled: 15, incantation: 30, professional: 25, master: 20, pve: 0 };
  return                       { chaotic: 0,   controlled: 5,  incantation: 10, professional: 35, master: 50, pve: 0 };
}

function pickPool(towerLevel: number): SpellPool {
  const weights = getPoolWeights(towerLevel);
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [pool, weight] of Object.entries(weights) as [SpellPool, number][]) {
    roll -= weight;
    if (roll <= 0) return pool;
  }
  return "chaotic";
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOSOWATOR — ±50% od wartości bazowej
// ═══════════════════════════════════════════════════════════════════════════════

function rollValue(base: number): number {
  if (base === 0) return 0;
  const variance = Math.random() - 0.5;
  return Math.max(1, Math.round(base * (1 + variance)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 2 — TYPY WALKI
// ═══════════════════════════════════════════════════════════════════════════════

export type MinionTargetType = "randomEnemy" | "randomAlly" | "allEnemies" | "allAllies" | "all" | "randomAny";

interface BattleSpell {
  id: number;
  name: string;
  damage: number;
  element: string;
  spellPool: SpellPool;
  isDirectional: boolean;
  statusEffectDefs: StatusEffectDef[];
  castEffectDefs: CastEffectDef[];
  special: string | null;
  descAlt:  string | null;
  endInfo:  string | null;
  reqElementalMagic: number;
  reqAstralMagic:    number;
  reqBloodMagic:     number;
  summonCount:      number;
  summonHp:         number;
  summonDamage:     number;
  summonInitiative: number;
  summonElement:    string | null;
  summonTargetType: MinionTargetType | null;
}

interface Minion {
  id: string;
  name: string;
  owner: "sideA" | "sideB";
  hp: number;
  maxHp: number;
  damage: number;
  element: string;
  initiative: number;
  targetType: MinionTargetType;
  appliedStatuses: AppliedStatus[];
}

export interface Fighter {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  resistance: number;
  initiative: number;
  intelligence: number;
  power: number;
  elementalMagic: number;
  astralMagic:    number;
  bloodMagic:     number;
  towerLevel:  number;
  activeSpells: BattleSpell[];
  spellPool:    BattleSpell[];
  minions:      Minion[];
  appliedStatuses: AppliedStatus[];
  stunTurnsLeft:   number;
  isPlayer: boolean;
  spellReqModifier?: number;
  bannedSpellElements?: string[];
}

interface BattleSide {
  fighters:     Fighter[];
  deadFighters: Fighter[];
  minions:      Minion[];
}

interface BattleState {
  sideA: BattleSide;
  sideB: BattleSide;
  globalStatuses: AppliedStatus[];
}

function makeSide(fighters: Fighter[]): BattleSide {
  return { fighters, deadFighters: [], minions: [] };
}

function getSideOf(fighter: Fighter, state: BattleState): BattleSide {
  return state.sideA.fighters.includes(fighter) || state.sideA.deadFighters.includes(fighter)
    ? state.sideA
    : state.sideB;
}

function getEnemySide(fighter: Fighter, state: BattleState): BattleSide {
  return state.sideA.fighters.includes(fighter) || state.sideA.deadFighters.includes(fighter)
    ? state.sideB
    : state.sideA;
}

function isBattleOver(state: BattleState): boolean {
  return state.sideA.fighters.length === 0 || state.sideB.fighters.length === 0;
}

function allLivingFighters(state: BattleState): Fighter[] {
  return [...state.sideA.fighters, ...state.sideB.fighters];
}

// ── TurnLog ──────────────────────────────────────────────────────────────────
interface TurnEvent {
  type:
    | "spell" | "dot_tick" | "heal_tick" | "fists"
    | "status_applied" | "status_expired" | "status_cleaned"
    | "minion_summoned" | "minion_attack" | "minion_death"
    | "stun" | "miss" | "on_move"
    | "sacrifice" | "dominate" | "resurrect";
  attacker:      string;
  target:        string;
  spellName?:    string;
  spellPool?:    string;
  source?:       "active" | "random" | "fists";
  statusName?:   string;
  minionName?:   string;
  damage:        number;
  healAmount?:   number;
  targetHpAfter: number;
  description:   string;
}

interface TurnLog {
  turn:              number;
  events:            TurnEvent[];
  sideAFighterHps:   { name: string; hp: number }[];
  sideBFighterHps:   { name: string; hp: number }[];
  sideADeadFighters: string[];
  sideBDeadFighters: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 3 — HELPERY OGÓLNE
// ═══════════════════════════════════════════════════════════════════════════════

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const POOL_LABELS: Record<SpellPool, string> = {
  chaotic:      "chaotycznie macha rękoma",
  controlled:   "wykonuje opanowane ruchy dłońmi",
  incantation:  "wykonuje przemyślaną inkantację",
  professional: "wykonuje profesjonalną inkantację",
  master:       "rzuca mistrzowski czar",
  pve:          ""
};

function canUseSpell(spell: BattleSpell, fighter: Fighter, globalStatuses: AppliedStatus[]): boolean {
  const mod = (req: number) => Math.floor(req * (1 + (fighter.spellReqModifier ?? 0)));
  return (
    getEffectiveStat(fighter, "elementalMagic", globalStatuses) >= mod(spell.reqElementalMagic) &&
    getEffectiveStat(fighter, "astralMagic",    globalStatuses) >= mod(spell.reqAstralMagic)    &&
    getEffectiveStat(fighter, "bloodMagic",     globalStatuses) >= mod(spell.reqBloodMagic)
  );
}

function requiresDeadAlly(spell: BattleSpell): boolean {
  return spell.castEffectDefs.some(e => e.target === "randomDeadAlly");
}

function requiresEnemyMinion(spell: BattleSpell): boolean {
  return spell.castEffectDefs.some(e => e.type === "dominate");
}

// Każda magia dodaje płaski bonus do obrażeń — po prostu suma wszystkich trzech
// (możesz to później różnicować per element czaru jeśli zechcesz)
function elementBonus(
  element: string,
  fighter: Fighter,
  globalStatuses: AppliedStatus[]
): number {
  const elemental = getEffectiveStat(fighter, "elementalMagic", globalStatuses);
  const astral    = getEffectiveStat(fighter, "astralMagic",    globalStatuses);
  const blood     = getEffectiveStat(fighter, "bloodMagic",     globalStatuses);
  return elemental + astral + blood;
}

function pickRandomSpell(
  fighter: Fighter,
  usedSpellIds: Set<number>,
  ownSide: BattleSide,
  enemySide: BattleSide,
  globalStatuses: AppliedStatus[]
): BattleSpell | null {
  const pool = pickPool(fighter.towerLevel);

  const isAvailable = (s: BattleSpell): boolean => {
    if (usedSpellIds.has(s.id)) return false;
    if (!canUseSpell(s, fighter, globalStatuses)) return false;
    if (requiresDeadAlly(s) && ownSide.deadFighters.length === 0) return false;
    if (requiresEnemyMinion(s) && enemySide.minions.filter(m => m.hp > 0).length === 0) return false;
    return true;
  };

  const fromPool = fighter.spellPool.filter(s => s.spellPool === pool && isAvailable(s));
  if (fromPool.length > 0) {
    return fromPool[randomInt(0, fromPool.length - 1)]!;
  }

  const any = fighter.spellPool.filter(isAvailable);
  if (any.length === 0) return null;
  return any[randomInt(0, any.length - 1)]!;
}

// ── STAT BOOST ───────────────────────────────────────────────────────────────
type FighterStatKey =
  | "power" | "initiative" | "resistance" | "intelligence"
  | "elementalMagic" | "astralMagic" | "bloodMagic";

function getEffectiveStat(
  fighter: Fighter,
  stat: FighterStatKey,
  globalStatuses: AppliedStatus[]
): number {
  const base = fighter[stat] as number;
  let flatBonus    = 0;
  let percentBonus = 0;

  for (const status of getEffectiveStatuses(fighter.appliedStatuses, globalStatuses)) {
    const def = status.effectDef;
    if (def.type !== "stat_boost" || def.stat !== stat) continue;
    const amount = status.resolvedEffect ?? def.statAmount ?? 0;
    if (def.statMode === "flat")    flatBonus    += amount;
    if (def.statMode === "percent") percentBonus += amount;
  }

  const modified = (base + flatBonus) * (1 + percentBonus / 100);
  return Math.max(0, Math.round(modified));
}

function applyResistance(
  damage: number,
  element: string,
  target: Fighter,
  globalStatuses: AppliedStatus[]
): number {
  if (damage <= 0) return 0;
  const resistance = getEffectiveStat(target, "resistance", globalStatuses);
  const reductionPercent = Math.min(resistance * 0.5, 75);
  return Math.max(1, Math.floor(damage * (1 - reductionPercent / 100)));
}

function renderTemplate(
  template: string,
  data: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = data[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

function scaleEffectValue(
  baseValue: number,
  caster: Fighter | null,
  element: string,
  globalStatuses: AppliedStatus[]
): number {
  if (!caster || baseValue === 0) return baseValue;
  const power     = getEffectiveStat(caster, "power", globalStatuses);
  const elemMagic = elementBonus(element, caster, globalStatuses);
  const bonus = Math.floor(baseValue * (power + elemMagic) / 100);
  return baseValue + bonus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 4 — ZARZĄDZANIE STATUSAMI
// (bez zmian — logika statusów nie zależy od systemu żywiołów)
// ═══════════════════════════════════════════════════════════════════════════════

function resolveStatusTargets(
  targetType: StatusTargetType,
  count: number | undefined,
  caster: Fighter,
  ownSide: BattleSide,
  enemySide: BattleSide
): (Fighter | Minion)[] {
  const casterSideAll: (Fighter | Minion)[] = [...ownSide.fighters, ...ownSide.minions.filter(m => m.hp > 0)];
  const enemySideAll:  (Fighter | Minion)[] = [...enemySide.fighters, ...enemySide.minions.filter(m => m.hp > 0)];
  const all = [...casterSideAll, ...enemySideAll];

  switch (targetType) {
    case "self":        return [caster];
    case "target": {
      const alive = enemySide.fighters.filter(f => f.hp > 0);
      if (alive.length === 0) return [];
      return [alive[randomInt(0, alive.length - 1)]!];
    }
    case "allAllies":   return casterSideAll;
    case "allEnemies":  return enemySideAll;
    case "all":         return all;
    case "randomEnemy": {
      const alive = enemySideAll.filter(t => t.hp > 0);
      if (alive.length === 0) return [];
      return [alive[randomInt(0, alive.length - 1)]!];
    }
    case "randomAlly": {
      const alive = casterSideAll.filter(t => t.hp > 0);
      if (alive.length === 0) return [];
      return [alive[randomInt(0, alive.length - 1)]!];
    }
    case "nEnemies": {
      const n = count ?? 1;
      return [...enemySideAll.filter(t => t.hp > 0)].sort(() => Math.random() - 0.5).slice(0, n);
    }
    case "nAllies": {
      const n = count ?? 1;
      return [...casterSideAll.filter(t => t.hp > 0)].sort(() => Math.random() - 0.5).slice(0, n);
    }
    default: return [];
  }
}

function resolveStatusEffect(def: StatusEffectDef): number | undefined {
  switch (def.type) {
    case "dot":
      return resolveRange(def.minDamage, def.maxDamage, def.damage ?? 0);
    case "stat_boost":
      return resolveRange(def.minStatAmount, def.maxStatAmount, def.statAmount ?? 0);
    case "resist":
    case "vulnerable":
      return resolveRange(def.minValue, def.maxValue, def.value ?? 0);
    case "heal_chance":
      return resolveRange(def.minHealAmount, def.maxHealAmount, def.healAmount ?? 0);
    case "stun":
      return resolveRange(def.minStunDuration, def.maxStunDuration, def.stunDuration ?? 1);
    case "damage_on_move":
      return resolveRange(def.minMoveDamage, def.maxMoveDamage, def.moveDamage ?? 0);
    default:
      return undefined;
  }
}

function applyStatusToTarget(
  target: Fighter | Minion,
  def: StatusEffectDef,
  sourceName: string,
  caster: Fighter | null,
  element: string,
  globalStatuses: AppliedStatus[],
  endInfo?: string | null
): TurnEvent[] {
  const events: TurnEvent[] = [];

  if (def.type === "clean") {
    events.push(...executeClean(target, def, sourceName));
    return events;
  }

  let resolvedEffect = resolveStatusEffect(def);

  if (
    resolvedEffect !== undefined &&
    caster !== null &&
    ["dot", "resist", "heal_chance", "stat_boost", "damage_on_move"].includes(def.type)
  ) {
    resolvedEffect = scaleEffectValue(resolvedEffect, caster, element, globalStatuses);
  }

  const appliedStatus: AppliedStatus = {
    effectDef: def,
    sourceName,
    turnsLeft: def.duration,
    stunTurnsLeft: def.type === "stun" ? 0 : undefined,
    applyInfo: def.applyInfo ?? null,
    tickInfo:  def.tickInfo ?? null,
    endInfo:   def.endInfo ?? endInfo ?? null,
    resolvedEffect,
    healMode: def.healMode ?? null,
  };
  target.appliedStatuses.push(appliedStatus);

  if (appliedStatus.applyInfo) {
    events.push({
      type: "status_applied",
      attacker: sourceName,
      target: target.name,
      statusName: def.type,
      damage: 0,
      targetHpAfter: target.hp,
      description: renderTemplate(appliedStatus.applyInfo, { target: target.name, source: sourceName }),
    });
  }
  return events;
}

function executeClean(
  target: Fighter | Minion,
  def: StatusEffectDef,
  sourceName: string
): TurnEvent[] {
  const events: TurnEvent[] = [];
  const mode: CleanMode = def.cleanMode ?? "all";

  let removed: AppliedStatus[] = [];

  switch (mode) {
    case "all":
      removed = [...target.appliedStatuses];
      target.appliedStatuses = [];
      break;
    case "negative":
      removed = target.appliedStatuses.filter(s => isNegativeStatus(s));
      target.appliedStatuses = target.appliedStatuses.filter(s => !isNegativeStatus(s));
      break;
    case "types": {
      const typesToClean = new Set(def.cleanTypes ?? []);
      removed = target.appliedStatuses.filter(s => typesToClean.has(s.effectDef.type));
      target.appliedStatuses = target.appliedStatuses.filter(s => !typesToClean.has(s.effectDef.type));
      break;
    }
  }

  if (removed.length === 0) {
    events.push({
      type: "status_cleaned",
      attacker: sourceName,
      target: target.name,
      statusName: "clean",
      damage: 0,
      targetHpAfter: target.hp,
      description: `${sourceName} próbuje oczyścić ${target.name} — brak statusów do usunięcia.`,
    });
    return events;
  }

  const removedNames = removed.map(s => s.effectDef.type).join(", ");
  events.push({
    type: "status_cleaned",
    attacker: sourceName,
    target: target.name,
    statusName: "clean",
    damage: 0,
    targetHpAfter: target.hp,
    description: `${sourceName} czyści ${target.name} z ${removed.length} efektów (${removedNames}).`,
  });

  return events;
}

function applySpellStatuses(
  spell: BattleSpell,
  caster: Fighter,
  ownSide: BattleSide,
  enemySide: BattleSide,
  globalStatuses: AppliedStatus[]
): TurnEvent[] {
  const events: TurnEvent[] = [];

  for (const def of spell.statusEffectDefs) {
    const targets = resolveStatusTargets(
      def.target,
      def.count,
      caster,
      ownSide,
      enemySide
    );

    for (const t of targets) {
      events.push(
        ...applyStatusToTarget(t, def, spell.name, caster, spell.element, globalStatuses, spell.endInfo)
      );
    }
  }

  return events;
}

function tickDownStatuses(entity: Fighter | Minion, events: TurnEvent[]): void {
  const expired: AppliedStatus[] = [];
  for (const status of entity.appliedStatuses) {
    if (status.turnsLeft === null) continue;
    status.turnsLeft -= 1;
    if (status.turnsLeft <= 0) expired.push(status);
  }
  for (const status of expired) {
    entity.appliedStatuses = entity.appliedStatuses.filter(s => s !== status);
    const expiredDesc = status.endInfo
      ? renderTemplate(status.endInfo, { target: entity.name, source: status.sourceName })
      : `Status "${status.effectDef.type}" (${status.sourceName}) wygasł.`;
    events.push({
      type: "status_expired",
      attacker: "System",
      target: entity.name,
      statusName: status.effectDef.type,
      damage: 0,
      targetHpAfter: entity.hp,
      description: expiredDesc,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 5 — EFEKTY STATUSÓW (ticki)
// (bez zmian)
// ═══════════════════════════════════════════════════════════════════════════════

function applyDotTick(entity: Fighter | Minion, globalStatuses: AppliedStatus[]): TurnEvent[] {
  const events: TurnEvent[] = [];
  for (const status of getEffectiveStatuses(entity.appliedStatuses, globalStatuses)) {
    if (status.effectDef.type !== "dot") continue;
    const dmg =
      status.resolvedEffect ??
      resolveRange(status.effectDef.minDamage, status.effectDef.maxDamage, status.effectDef.damage ?? 0);
    if (dmg <= 0) continue;
    entity.hp = Math.max(0, entity.hp - dmg);
    events.push({
      type: "dot_tick",
      attacker: status.sourceName,
      target: entity.name,
      damage: dmg,
      targetHpAfter: entity.hp,
      description: status.tickInfo
        ? renderTemplate(status.tickInfo, { target: entity.name, damage: dmg, source: status.sourceName })
        : `${entity.name} otrzymuje ${dmg} pkt obrażeń (${status.sourceName}).`,
    });
  }
  return events;
}

function applyHealChanceTick(entity: Fighter | Minion, globalStatuses: AppliedStatus[]): TurnEvent[] {
  const events: TurnEvent[] = [];
  for (const status of getEffectiveStatuses(entity.appliedStatuses, globalStatuses)) {
    if (status.effectDef.type !== "heal_chance") continue;
    const chance = status.effectDef.healChance ?? 0;
    const baseAmount = status.resolvedEffect ?? resolveRange(
      status.effectDef.minHealAmount,
      status.effectDef.maxHealAmount,
      status.effectDef.healAmount ?? 0
    );
    const amount = (status.healMode ?? status.effectDef.healMode) === "percent"
      ? Math.floor(entity.maxHp * baseAmount / 100)
      : baseAmount;
    if (amount <= 0 || Math.random() * 100 >= chance) continue;
    const healed = Math.min(amount, entity.maxHp - entity.hp);
    if (healed <= 0) continue;
    entity.hp += healed;
    events.push({
      type: "heal_tick",
      attacker: status.sourceName,
      target: entity.name,
      healAmount: healed,
      damage: 0,
      targetHpAfter: entity.hp,
      description: status.tickInfo
        ? renderTemplate(status.tickInfo, { target: entity.name, damage: healed, source: status.sourceName })
        : `${entity.name} zostaje uleczony o ${healed} HP (${status.sourceName}).`,
    });
  }
  return events;
}

function applyElementModifiers(
  baseDamage: number,
  element: string,
  targetStatuses: AppliedStatus[],
  globalStatuses: AppliedStatus[]
): number {
  if (baseDamage <= 0) return 0;
  let total = baseDamage;
  for (const status of getEffectiveStatuses(targetStatuses, globalStatuses)) {
    const def = status.effectDef;
    if (def.type === "resist" && def.element === element) {
      const val = status.resolvedEffect ?? def.value ?? 0;
      total *= (1 - val / 100);
    }
    if (def.type === "vulnerable" && def.element === element) {
      const val = status.resolvedEffect ?? def.value ?? 0;
      total *= (1 + val / 100);
    }
  }
  return Math.ceil(Math.max(0, total));
}

function calculateMissChance(
  spell: BattleSpell,
  casterStatuses: AppliedStatus[],
  globalStatuses: AppliedStatus[]
): boolean {
  if (!spell.isDirectional) return false;
  let totalMissChance = 0;
  for (const status of getEffectiveStatuses(casterStatuses, globalStatuses)) {
    if (status.effectDef.type === "miss_chance") totalMissChance += status.effectDef.missChance ?? 0;
  }
  if (totalMissChance <= 0) return false;
  return Math.random() * 100 < Math.min(totalMissChance, 95);
}

function applyDamageOnMove(
  entity: Fighter | Minion,
  globalStatuses: AppliedStatus[]
): TurnEvent[] {
  const events: TurnEvent[] = [];
  for (const status of getEffectiveStatuses(entity.appliedStatuses, globalStatuses)) {
    if (status.effectDef.type !== "damage_on_move") continue;
    const chance = status.effectDef.moveChance ?? 0;
    const dmg = resolveRange(
      status.effectDef.minMoveDamage,
      status.effectDef.maxMoveDamage,
      status.effectDef.moveDamage ?? status.resolvedEffect ?? 0
    );
    if (dmg <= 0 || Math.random() * 100 >= chance) continue;
    entity.hp = Math.max(0, entity.hp - dmg);
    events.push({
      type: "on_move",
      attacker: status.sourceName,
      target: entity.name,
      damage: dmg,
      targetHpAfter: entity.hp,
      description: status.tickInfo
        ? renderTemplate(status.tickInfo, { target: entity.name, damage: dmg, source: status.sourceName })
        : `${entity.name} otrzymuje ${dmg} pkt obrażeń (${status.sourceName}).`,
    });
  }
  return events;
}

function processStunStatuses(
  fighter: Fighter,
  events: TurnEvent[],
  spellDescAltMap: Map<string, { descAlt: string | null; endInfo: string | null }>
): boolean {
  if (fighter.stunTurnsLeft > 0) {
    fighter.stunTurnsLeft -= 1;
    events.push({
      type: "stun",
      attacker: "System",
      target: fighter.name,
      damage: 0,
      targetHpAfter: fighter.hp,
      description: `${fighter.name} jest ogłuszony — traci akcję! (zostało: ${fighter.stunTurnsLeft} tur)`,
    });
    return true;
  }
  for (const status of getEffectiveStatuses(fighter.appliedStatuses, [])) {
    if (status.effectDef.type !== "stun") continue;
    const chance = status.effectDef.stunChance ?? 0;
    if (Math.random() * 100 < chance) {
      const duration = status.resolvedEffect ?? resolveRange(
        status.effectDef.minStunDuration,
        status.effectDef.maxStunDuration,
        status.effectDef.stunDuration ?? 1
      );
      fighter.stunTurnsLeft = duration - 1;

      const statusDescAlt = status.effectDef.descAlt;
      const spellMeta = spellDescAltMap.get(status.sourceName);
      const rawDescAlt = statusDescAlt ?? spellMeta?.descAlt ?? null;
      const stunDescAlt = rawDescAlt
        ? renderTemplate(rawDescAlt, { attacker: "?", target: fighter.name, damage: 0, duration: String(duration) })
        : null;
      const stunDescription = stunDescAlt
        ?? `${fighter.name} zostaje ogłuszony przez ${status.sourceName} na ${duration} tur!`;

      events.push({
        type: "stun",
        attacker: status.sourceName,
        target: fighter.name,
        damage: 0,
        targetHpAfter: fighter.hp,
        description: stunDescription,
      });
      return true;
    }
  }
  return false;
}

function isTargetInvisible(target: Fighter | Minion, globalStatuses: AppliedStatus[]): boolean {
  for (const status of getEffectiveStatuses(target.appliedStatuses, globalStatuses)) {
    if (status.effectDef.type !== "invisibility") continue;
    if (Math.random() * 100 < (status.effectDef.invisChance ?? 0)) return true;
  }
  return false;
}

function filterVisible<T extends Fighter | Minion>(
  candidates: T[],
  globalStatuses: AppliedStatus[]
): T[] {
  const visible = candidates.filter(c => !isTargetInvisible(c, globalStatuses));
  return visible.length > 0 ? visible : candidates;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 6 — CAST EFFECTS
// (bez zmian)
// ═══════════════════════════════════════════════════════════════════════════════

function executeCastEffects(
  spell: BattleSpell,
  caster: Fighter,
  ownSide: BattleSide,
  enemySide: BattleSide,
  state: BattleState
): TurnEvent[] {
  const events: TurnEvent[] = [];

  for (const def of spell.castEffectDefs) {
    switch (def.type) {

      case "sacrifice": {
        const selfCost = Math.floor(caster.hp * (def.selfHpPercent ?? 50) / 100);
        caster.hp = Math.max(0, caster.hp - selfCost);
        events.push({
          type: "sacrifice",
          attacker: caster.name,
          target: caster.name,
          spellName: spell.name,
          damage: selfCost,
          targetHpAfter: caster.hp,
          description: `${caster.name} poświęca ${selfCost} HP (${def.selfHpPercent}% obecnego) rzucając ${spell.name}.`,
        });
        const healTargets = resolveStatusTargets(
          def.target as StatusTargetType,
          def.count,
          caster,
          ownSide,
          enemySide
        ).filter(t => t.hp > 0 && t !== caster);
        for (const healTarget of healTargets) {
          const healAmount = Math.ceil(healTarget.maxHp * (def.healTargetPercent ?? 100) / 100);
          const actualHeal = Math.min(healAmount, healTarget.maxHp - healTarget.hp);
          healTarget.hp += actualHeal;
          events.push({
            type: "sacrifice",
            attacker: caster.name,
            target: healTarget.name,
            spellName: spell.name,
            healAmount: actualHeal,
            damage: 0,
            targetHpAfter: healTarget.hp,
            description: `${healTarget.name} zostaje uleczony o ${actualHeal} HP kosztem poświęcenia ${caster.name}.`,
          });
        }
        break;
      }

      case "resurrect": {
        if (ownSide.deadFighters.length === 0) break;
        const deadPool = [...ownSide.deadFighters];
        const target = deadPool[randomInt(0, deadPool.length - 1)]!;
        const reviveHp = Math.max(1, Math.ceil(target.maxHp * (def.healPercent ?? 50) / 100));
        target.hp = reviveHp;
        target.stunTurnsLeft = 0;
        ownSide.deadFighters = ownSide.deadFighters.filter(f => f !== target);
        ownSide.fighters.push(target);
        events.push({
          type: "resurrect",
          attacker: caster.name,
          target: target.name,
          spellName: spell.name,
          healAmount: reviveHp,
          damage: 0,
          targetHpAfter: reviveHp,
          description: `${caster.name} wskrzesza ${target.name}! Powraca z ${reviveHp} HP (${def.healPercent ?? 50}% maxHP).`,
        });
        break;
      }

      case "dominate": {
        const availableMinions = enemySide.minions.filter(m => m.hp > 0);
        if (availableMinions.length === 0) break;
        const visible = filterVisible(availableMinions, state.globalStatuses);
        const eligible = visible.length > 0 ? visible : availableMinions;
        const count = Math.max(1, def.count ?? 1);
        const selected: Minion[] = [];
        const pool = [...eligible];
        while (selected.length < count && pool.length > 0) {
          const index = randomInt(0, pool.length - 1);
          selected.push(pool.splice(index, 1)[0]);
        }
        for (const target of selected) {
          target.owner = ownSide === state.sideA ? "sideA" : "sideB";
          enemySide.minions = enemySide.minions.filter(m => m !== target);
          ownSide.minions.push(target);
          events.push({
            type: "dominate",
            attacker: caster.name,
            target: target.name,
            spellName: spell.name,
            minionName: target.name,
            damage: 0,
            targetHpAfter: target.hp,
            description: `${caster.name} przejmuje kontrolę nad ${target.name}!`,
          });
        }
        break;
      }
    }
  }

  return events;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 7 — OBRAŻENIA
// ═══════════════════════════════════════════════════════════════════════════════

function rollSpellDamage(spell: BattleSpell): number {
  return rollValue(spell.damage);
}

function calculateDamage(
  spell: BattleSpell,
  attacker: Fighter,
  target: Fighter,
  globalStatuses: AppliedStatus[]
): number {
  const baseDmg = rollSpellDamage(spell);
  if (baseDmg === 0) return 0;

  const power     = getEffectiveStat(attacker, "power", globalStatuses);
  const elemMagic = elementBonus(spell.element, attacker, globalStatuses);

  const powerBonus = Math.floor(baseDmg * power / 100);
  const elemBonus  = Math.floor(baseDmg * elemMagic / 100);

  const rawDamage = baseDmg + powerBonus + elemBonus;

  const withElements = applyElementModifiers(
    rawDamage,
    spell.element,
    target.appliedStatuses,
    globalStatuses
  );

  return applyResistance(withElements, spell.element, target, globalStatuses);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 8 — MINIONY
// (bez zmian)
// ═══════════════════════════════════════════════════════════════════════════════

function createMinion(spell: BattleSpell, ownerSide: "sideA" | "sideB", index: number): Minion {
  const hp         = rollValue(spell.summonHp);
  const damage     = rollValue(spell.summonDamage);
  const initiative = rollValue(spell.summonInitiative);

  return {
    id:         `minion_${Date.now()}_${ownerSide}_${index}_${Math.random()}`,
    name:       `${spell.name}${spell.summonCount > 1 ? ` (${index + 1})` : ""}`,
    owner:      ownerSide,
    hp:         Math.max(1, hp),
    maxHp:      Math.max(1, hp),
    damage:     Math.max(0, damage),
    element:    spell.summonElement ?? "chaos",
    initiative: Math.max(0, initiative),
    targetType: spell.summonTargetType ?? "randomEnemy",
    appliedStatuses: [],
  };
}

function selectMinionTargets(
  minion: Minion,
  ownSide: BattleSide,
  enemySide: BattleSide,
  globalStatuses: AppliedStatus[]
): (Fighter | Minion)[] {
  const ownAll:   (Fighter | Minion)[] = [...ownSide.fighters,  ...ownSide.minions.filter(m => m.hp > 0 && m !== minion)];
  const enemyAll: (Fighter | Minion)[] = [...enemySide.fighters,...enemySide.minions.filter(m => m.hp > 0)];
  const all = [...ownAll, ...enemyAll];

  function pickRandom(pool: (Fighter | Minion)[]): (Fighter | Minion)[] {
    const alive   = pool.filter(t => t.hp > 0);
    const visible = filterVisible(alive, globalStatuses);
    const eligible = visible.length > 0 ? visible : alive;
    if (eligible.length === 0) return [];
    return [eligible[randomInt(0, eligible.length - 1)]!];
  }

  switch (minion.targetType) {
    case "randomEnemy":  return pickRandom(enemyAll);
    case "randomAlly":   return pickRandom(ownAll);
    case "allEnemies":   return enemyAll.filter(t => t.hp > 0);
    case "allAllies":    return ownAll.filter(t => t.hp > 0);
    case "all":          return all.filter(t => t.hp > 0);
    case "randomAny":    return pickRandom(all);
    default:             return [];
  }
}

function executeMinionAttacks(
  ownSide: BattleSide,
  enemySide: BattleSide,
  state: BattleState
): TurnEvent[] {
  const events: TurnEvent[] = [];

  for (const minion of [...ownSide.minions]) {
    if (minion.hp <= 0) continue;

    events.push(...applyDamageOnMove(minion, state.globalStatuses));
    if (minion.hp <= 0) {
      events.push(minionDeathEvent(minion));
      continue;
    }

    const targets = selectMinionTargets(minion, ownSide, enemySide, state.globalStatuses);
    for (const t of targets) {
      let minionDmg = minion.damage;
      if ("resistance" in t) {
        minionDmg = applyResistance(minionDmg, minion.element, t as Fighter, state.globalStatuses);
      }
      t.hp = Math.max(0, t.hp - minionDmg);
      events.push({
        type: "minion_attack",
        attacker: minion.name,
        target: t.name,
        minionName: minion.name,
        damage: minionDmg,
        targetHpAfter: t.hp,
        description: `${minion.name} atakuje ${t.name} — zadaje ${minionDmg} pkt obrażeń! [HP: ${t.hp}/${t.maxHp}]`,
      });
      if (t.hp <= 0 && !("towerLevel" in t)) {
        events.push(minionDeathEvent(t as Minion));
      }
    }
  }

  ownSide.minions   = ownSide.minions.filter(m => m.hp > 0);
  enemySide.minions = enemySide.minions.filter(m => m.hp > 0);

  return events;
}

function minionDeathEvent(minion: Minion): TurnEvent {
  return {
    type: "minion_death",
    attacker: minion.name,
    target: minion.name,
    minionName: minion.name,
    damage: 0,
    targetHpAfter: 0,
    description: `${minion.name} zostaje unieszkodliwiony!`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 9 — OPIS CZARU W LOGU
// (bez zmian)
// ═══════════════════════════════════════════════════════════════════════════════

function formatSpellDescription(
  spell: BattleSpell,
  actor: string,
  target: string,
  poolLabel: string,
  isActive: boolean,
  dmg: number
): string {
  let rendered = spell.special?.trim()
    .replace(/\{attacker\}/g, actor)
    .replace(/\{target\}/g, target)
    .replace(/\{damage\}/g, dmg.toString());

  if (rendered && dmg > 0) {
    rendered = rendered.replace(/zadaje \d+ pkt obrażeń/g, `zadaje ${dmg} pkt obrażeń`);
  }

  if (isActive) {
    if (rendered) return `${actor} przygotował się do walki! ${rendered}`;
    if (dmg > 0)  return `${actor} przygotował się do walki! Rzuca ${spell.name} i zadaje ${dmg} pkt obrażeń ${target}.`;
    return `${actor} przygotował się do walki! ${spell.name}.`;
  }
  if (rendered) return poolLabel ? `${actor} ${poolLabel} — ${rendered}` : rendered;
  if (dmg > 0)  return `${actor}${poolLabel ? ` ${poolLabel} — rzuca` : ""} ${spell.name} i zadaje ${dmg} pkt obrażeń ${target}.`;
  return `${actor}${poolLabel ? ` ${poolLabel} — ` : " "}${spell.name}.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 10 — BUDOWANIE FIGHTERA
// ═══════════════════════════════════════════════════════════════════════════════

export async function buildFighter(characterId: number): Promise<Fighter> {
  const character = await prisma.character.findUnique({  // ← najpierw character
    where: { id: characterId },
    include: {
      spellSlots: { include: { spell: true }, orderBy: { slotIndex: "asc" } },
      spells:     { include: { spell: true } },
      equipment:  true,
      tower:      { include: { buildings: true } },
    },
  });
  if (!character) throw new Error(`Postać ${characterId} nie znaleziona`);

  const alignmentBonus = await getCharacterAlignmentBonus(character.id);  // ← potem bonus
  const banned = alignmentBonus?.bannedSpellElements ?? [];
  let bonusEndurance    = 0;
  let bonusInitiative   = 0;
  let bonusPower        = 0;
  let bonusResistance   = 0;
  let bonusIntelligence = 0;
  let bonusElementalMagic = 0;
  let bonusAstralMagic    = 0;
  let bonusBloodMagic     = 0;

  if (character.equipment) {
    const itemIds = [
      character.equipment.robeId, character.equipment.bootsId,
      character.equipment.hatId,  character.equipment.amuletId,
      character.equipment.mainHandId, character.equipment.offHandId,
    ].filter(Boolean) as number[];

    if (itemIds.length > 0) {
      const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
      for (const item of items) {
        bonusEndurance      += item.bonusEndurance;
        bonusInitiative     += item.bonusInitiative;
        bonusPower          += item.bonusPower;
        bonusResistance     += item.bonusResistance;
        bonusIntelligence   += item.bonusIntelligence ?? 0;
        bonusElementalMagic += item.bonusElementalMagic ?? 0;
        bonusAstralMagic    += item.bonusAstralMagic    ?? 0;
        bonusBloodMagic     += item.bonusBloodMagic    ?? 0; // uwaga: literówka w schema ("bonusBloodlMagic")
      }
    }
  }

function mapSpell(s: any): BattleSpell {  // ← mapSpell bez filtrowania
    return {
      id:                s.id,
      name:              s.name,
      damage:            s.damage ?? 0,
      element:           s.element,
      spellPool:         s.spellPool as SpellPool,
      isDirectional:     s.isDirectional ?? true,
      statusEffectDefs:  parseStatusEffects(s.statusEffects),
      castEffectDefs:    parseCastEffects(s.castEffects),
      special:           s.special,
      descAlt:           s.descAlt ?? null,
      endInfo:           s.endInfo ?? null,
      reqElementalMagic: s.reqElementalMagic ?? 0,
      reqAstralMagic:    s.reqAstralMagic    ?? 0,
      reqBloodMagic:     s.reqBloodMagic     ?? 0,
      summonCount:       s.summonCount,
      summonHp:          s.summonHp          ?? 0,
      summonDamage:      s.summonDamage      ?? 0,
      summonInitiative:  s.summonInitiative  ?? 0,
      summonElement:     s.summonElement,
      summonTargetType:  s.summonTargetType as MinionTargetType | null,
    };
  }

  const allSpells    = await prisma.spell.findMany();
  const activeSpells = character.spellSlots
    .map(ss => mapSpell(ss.spell))
    .filter(s => !banned.includes(s.element as MagicElement))
  const activeIds    = new Set(activeSpells.map(s => s.id));
  const spellPool    = allSpells
    .map(mapSpell)
    .filter(s => !activeIds.has(s.id))
    .filter(s => !banned.includes(s.element as MagicElement))
  const towerLevel   = character.tower?.level ?? 1;
  const effectiveEndurance = character.endurance + bonusEndurance;
  const maxHp        = Math.max(1, 20 + effectiveEndurance * 5);

  return {
    id:             character.id,
    name:           character.name,
    hp:             maxHp,
    maxHp,
    resistance:     character.resistance   + bonusResistance,
    initiative:     character.initiative   + bonusInitiative,
    intelligence:   character.intelligence + bonusIntelligence,
    power:          character.power        + bonusPower,
    elementalMagic: character.elementalMagic + bonusElementalMagic,
    astralMagic:    character.astralMagic    + bonusAstralMagic,
    bloodMagic:     character.bloodMagic     + bonusBloodMagic,
    towerLevel,
    activeSpells,
    spellPool,
    minions:         [],
    appliedStatuses: [],
    stunTurnsLeft:   0,
    bannedSpellElements: banned,
    spellReqModifier: alignmentBonus?.spellReqModifier ?? 0,
    isPlayer:        true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 11 — SILNIK WALKI
// ═══════════════════════════════════════════════════════════════════════════════

interface BattleMetadata {
  sideAFighterIds: number[];
  sideBFighterIds: number[];
  sideAFighterNames: string[];
  sideBFighterNames: string[];
  sideAMinionNames: string[];
  sideBMinionNames: string[];
  allParticipants?: Array<{
    id: number;
    name: string;
    side: "sideA" | "sideB";
    type: "fighter" | "minion";
    targetType?: string;
  }>;
}

export function simulateBattle(
  fightersA: Fighter[],
  fightersB: Fighter[]
): {
  winnerId: number | null;
  log: TurnLog[];
  summary: string;
  metadata: BattleMetadata;
  minionTargetTypeMap: Map<string, string>;
  castSpellsByFighter: Map<string, number[]>;
} {
  const state: BattleState = {
    sideA: makeSide(fightersA),
    sideB: makeSide(fightersB),
    globalStatuses: [],
  };

  const log: TurnLog[] = [];

  const activeQueues = new Map<number, BattleSpell[]>();
  const usedIds      = new Map<number, Set<number>>();
  const globalUsedSpellIds = new Set<number>();
  for (const f of [...fightersA, ...fightersB]) {
    activeQueues.set(f.id, [...f.activeSpells]);
    usedIds.set(f.id, new Set(f.activeSpells.map(s => s.id)));
  }

  const spellDescAltMap = new Map<string, { descAlt: string | null; endInfo: string | null }>();
  for (const f of [...fightersA, ...fightersB]) {
    for (const s of [...f.activeSpells, ...f.spellPool]) {
      if (!spellDescAltMap.has(s.name)) {
        spellDescAltMap.set(s.name, { descAlt: s.descAlt, endInfo: s.endInfo });
      }
    }
  }

  const castSpellsByFighter = new Map<string, number[]>();

  function rollCastSuccess(spell: BattleSpell, fighter: Fighter): boolean {
    if (!fighter.isPlayer) return true;

    const intelligence = fighter.intelligence;
    const BASE: Record<SpellPool, number> = {
      chaotic:      70,
      controlled:   50,
      incantation:  40,
      professional: 30,
      master:       20,
      pve:          100,
    };
    const SCALE: Record<SpellPool, number> = {
      chaotic:      1.0,
      controlled:   1.0,
      incantation:  1.5,
      professional: 1.5,
      master:       1.5,
      pve:          0,
    };
    const chance = Math.min(
      BASE[spell.spellPool] + intelligence * SCALE[spell.spellPool],
      100
    );
    return Math.random() * 100 < chance;
  }

  function executeAttack(actor: Fighter): TurnEvent[] {
    const events: TurnEvent[] = [];
    const ownSide   = getSideOf(actor, state);
    const enemySide = getEnemySide(actor, state);

    if (processStunStatuses(actor, events, spellDescAltMap)) return events;

    events.push(...applyDamageOnMove(actor, state.globalStatuses));
    if (actor.hp <= 0) return events;

    const queue = activeQueues.get(actor.id)!;
    const used  = usedIds.get(actor.id)!;
    let spell: BattleSpell | null = null;
    let isActive = false;

    if (queue.length > 0) {
      spell    = queue.shift()!;
      isActive = true;
    } else {
      spell = pickRandomSpell(actor, globalUsedSpellIds, ownSide, enemySide, state.globalStatuses);
      if (spell) {
        if (spell.id > 0) {
          const existing = castSpellsByFighter.get(actor.name) ?? [];
          if (!existing.includes(spell.id)) {
            existing.push(spell.id);
            castSpellsByFighter.set(actor.name, existing);
          }
        }
        globalUsedSpellIds.add(spell.id);
        used.add(spell.id);
      }
    }

    // Pięści
    if (!spell) {
      const target = filterVisible(
        enemySide.fighters.filter(f => f.hp > 0),
        state.globalStatuses
      );
      if (target.length === 0) return events;
      const t = target[randomInt(0, target.length - 1)]!;
      t.hp = Math.max(0, t.hp - 2);
      events.push({
        type: "fists",
        attacker: actor.name,
        target: t.name,
        source: "fists",
        damage: 2,
        targetHpAfter: t.hp,
        description: `Brak czarów! ${actor.name} atakuje pięściami — zadaje 2 pkt obrażeń ${t.name}.`,
      });
      return events;
    }

    const poolLabel = isActive ? "czar aktywny" : POOL_LABELS[spell.spellPool];
    const source: "active" | "random" = isActive ? "active" : "random";

    if (!rollCastSuccess(spell, actor)) {
      events.push({
        type: "miss",
        attacker: actor.name,
        target: "?",
        spellName: spell.name,
        spellPool: poolLabel,
        source,
        damage: 0,
        targetHpAfter: 0,
        description: `${actor.name} ${poolLabel} — , ale nic się nie dzieje.`,
      });
      return events;
    }

    if (calculateMissChance(spell, actor.appliedStatuses, state.globalStatuses)) {
      events.push({
        type: "miss",
        attacker: actor.name,
        target: "?",
        spellName: spell.name,
        spellPool: poolLabel,
        source,
        damage: 0,
        targetHpAfter: 0,
        description: `${actor.name} rzuca ${spell.name} — ale chybia!`,
      });
      return events;
    }

    const aliveEnemies = filterVisible(enemySide.fighters.filter(f => f.hp > 0), state.globalStatuses);
    const primaryTarget = aliveEnemies.length > 0
      ? aliveEnemies[randomInt(0, aliveEnemies.length - 1)]!
      : null;

    // Obrażenia bezpośrednie
    let dmg = 0;
    if (spell.damage > 0 && spell.summonCount === 0 && primaryTarget) {
      dmg = calculateDamage(spell, actor, primaryTarget, state.globalStatuses);
      primaryTarget.hp = Math.max(0, primaryTarget.hp - dmg);
    }

    const hasNonStunStatus = spell.statusEffectDefs.some(d => d.type !== "stun");
    const spellDescription = (spell.descAlt && hasNonStunStatus)
      ? renderTemplate(spell.descAlt, { attacker: actor.name, target: primaryTarget?.name ?? "—", damage: dmg })
      : formatSpellDescription(spell, actor.name, primaryTarget?.name ?? "—", poolLabel, isActive, dmg);

    events.push({
      type: "spell",
      attacker: actor.name,
      target: primaryTarget?.name ?? "—",
      spellName: spell.name,
      spellPool: poolLabel,
      source,
      damage: dmg,
      targetHpAfter: primaryTarget?.hp ?? 0,
      description: spellDescription,
    });

    // Przywołaj miniony
    if (spell.summonCount > 0) {
      const ownerSide: "sideA" | "sideB" = ownSide === state.sideA ? "sideA" : "sideB";
      for (let i = 0; i < spell.summonCount; i++) {
        const minion = createMinion(spell, ownerSide, i);
        ownSide.minions.push(minion);
        events.push({
          type: "minion_summoned",
          attacker: actor.name,
          target: actor.name,
          minionName: minion.name,
          damage: 0,
          targetHpAfter: actor.hp,
          description: `[INTERNAL: ${actor.name} summoned ${minion.name} targetType=${minion.targetType}]`,
        });
      }
    }

    // Statusy z czaru
    for (const def of spell.statusEffectDefs) {
      if (def.target === "all" || def.target === "allEnemies" || def.target === "allAllies") {
        const targets = resolveStatusTargets(def.target, def.count, actor, ownSide, enemySide);
        for (const t of targets) {
          const resolvedEffect = resolveStatusEffect(def);
          if (def.type === "clean") {
            applySpellStatuses(spell, actor, ownSide, enemySide, state.globalStatuses);
          } else {
            t.appliedStatuses.push({
              effectDef:    def,
              sourceName:   spell.name,
              turnsLeft:    def.duration,
              stunTurnsLeft: def.type === "stun" ? 0 : undefined,
              applyInfo:    def.applyInfo ?? null,
              tickInfo:     def.tickInfo ?? null,
              endInfo:      def.endInfo ?? spell.endInfo ?? null,
              resolvedEffect,
            });
          }
        }
        if (def.target === "all" && def.type !== "clean") {
          state.globalStatuses.push({
            effectDef: def,
            sourceName: spell.name,
            turnsLeft: def.duration,
            resolvedEffect: resolveStatusEffect(def),
          });
        }
      } else {
        events.push(
          ...applySpellStatuses(
            { ...spell, statusEffectDefs: [def] },
            actor,
            ownSide,
            enemySide,
            state.globalStatuses
          )
        );
      }
    }

    // Cast effects
    events.push(...executeCastEffects(spell, actor, ownSide, enemySide, state));

    return events;
  }

  function processDeath(side: BattleSide): TurnEvent[] {
    const events: TurnEvent[] = [];
    const justDied = side.fighters.filter(f => f.hp <= 0);
    for (const f of justDied) {
      side.fighters     = side.fighters.filter(x => x !== f);
      side.deadFighters.push(f);
      events.push({
        type: "status_applied",
        attacker: "System",
        target: f.name,
        damage: 0,
        targetHpAfter: 0,
        description: `${f.name} pada!.`,
      });
    }
    return events;
  }

  // ── Główna pętla ───────────────────────────────────────────────────────────
  let turn = 0;

  if (turn % 10 === 0) {
    console.log("turn", turn);
  }

  const MAX_TURNS = 10;

  while (!isBattleOver(state) && turn < MAX_TURNS) {
    turn++;
    const turnEvents: TurnEvent[] = [];

    const allFighters = allLivingFighters(state);

    for (const f of allFighters) {
      turnEvents.push(...applyDotTick(f, state.globalStatuses));
      turnEvents.push(...applyHealChanceTick(f, state.globalStatuses));
    }

    turnEvents.push(...processDeath(state.sideA));
    turnEvents.push(...processDeath(state.sideB));
    if (isBattleOver(state)) break;

    const sortedFighters = [...allLivingFighters(state)].sort(
      (a, b) =>
        (getEffectiveStat(b, "initiative", state.globalStatuses) + Math.random() * 2) -
        (getEffectiveStat(a, "initiative", state.globalStatuses) + Math.random() * 2)
    );

    for (const actor of sortedFighters) {
      if (actor.hp <= 0) continue;
      if (isBattleOver(state)) break;

      turnEvents.push(...executeAttack(actor));
      turnEvents.push(...processDeath(state.sideA));
      turnEvents.push(...processDeath(state.sideB));
    }

    if (!isBattleOver(state)) {
      turnEvents.push(...executeMinionAttacks(state.sideA, state.sideB, state));
      turnEvents.push(...processDeath(state.sideA));
      turnEvents.push(...processDeath(state.sideB));
    }
    if (!isBattleOver(state)) {
      turnEvents.push(...executeMinionAttacks(state.sideB, state.sideA, state));
      turnEvents.push(...processDeath(state.sideA));
      turnEvents.push(...processDeath(state.sideB));
    }

    for (const f of [
      ...state.sideA.fighters, ...state.sideB.fighters,
      ...state.sideA.minions,  ...state.sideB.minions,
    ]) {
      tickDownStatuses(f, turnEvents);
    }

    const expiredGlobal = state.globalStatuses.filter(
      s => s.turnsLeft !== null && (s.turnsLeft -= 1, s.turnsLeft <= 0)
    );
    for (const s of expiredGlobal) {
      state.globalStatuses = state.globalStatuses.filter(g => g !== s);
      turnEvents.push({
        type: "status_expired",
        attacker: "System",
        target: "Wszyscy",
        statusName: s.effectDef.type,
        damage: 0,
        targetHpAfter: 0,
        description: s.endInfo
          ? renderTemplate(s.endInfo, { source: s.sourceName })
          : `Efekt "${s.sourceName}" wygasł.`,
      });
    }

    log.push({
      turn,
      events: turnEvents,
      sideAFighterHps: state.sideA.fighters.map(f => ({ name: f.name, hp: f.hp })),
      sideBFighterHps: state.sideB.fighters.map(f => ({ name: f.name, hp: f.hp })),
      sideADeadFighters: state.sideA.deadFighters.map(f => f.name),
      sideBDeadFighters: state.sideB.deadFighters.map(f => f.name),
    });
  }

  const endedByLimit = turn >= MAX_TURNS && !isBattleOver(state);

  if (log.length % 10 === 0) {
    console.log("turn:", turn);
    console.log("log length:", log.length);
    console.log("heap MB:", Math.round(process.memoryUsage().heapUsed / 1024 / 1024));
  }

  // ── Wyłonienie zwycięzcy ───────────────────────────────────────────────────
  const aAlive = state.sideA.fighters.length > 0;
  const bAlive = state.sideB.fighters.length > 0;

  let winnerId: number | null;
  let summary: string;

  if (endedByLimit) {
    winnerId = null;
    summary  = `Wyczerpani bojem, postanowiliście zgodnie zaprzestać walki - dokończycie ją kiedy indziej.`;
  } else if (aAlive && !bAlive) {
    winnerId = state.sideA.fighters[0]!.id;
    summary  = `${state.sideA.fighters[0]!.name} wygrywa po ${turn} turach!`;
  } else if (bAlive && !aAlive) {
    winnerId = state.sideB.fighters[0]!.id;
    summary  = `${state.sideB.fighters[0]!.name} wygrywa po ${turn} turach!`;
  } else {
    winnerId = null;
    summary  = `Remis po ${turn} turach!`;
  }

  const metadata: BattleMetadata = {
    sideAFighterIds:   [...state.sideA.fighters, ...state.sideA.deadFighters].map(f => f.id),
    sideBFighterIds:   [...state.sideB.fighters, ...state.sideB.deadFighters].map(f => f.id),
    sideAFighterNames: [...state.sideA.fighters, ...state.sideA.deadFighters].map(f => f.name),
    sideBFighterNames: [...state.sideB.fighters, ...state.sideB.deadFighters].map(f => f.name),
    sideAMinionNames:  [],
    sideBMinionNames:  [],
  };

  const minionTargetTypeMap = new Map<string, string>();
  for (const turnLog of log) {
    for (const event of turnLog.events) {
      if (event.type === "minion_summoned" && event.minionName) {
        const match = event.description.match(/targetType=(\w+)/);
        if (match?.[1]) minionTargetTypeMap.set(event.minionName, match[1]);

        const attackerName = event.attacker;
        if ([...state.sideA.fighters, ...state.sideA.deadFighters].some(f => f.name === attackerName)) {
          if (!metadata.sideAMinionNames.includes(event.minionName)) {
            metadata.sideAMinionNames.push(event.minionName);
          }
        } else if ([...state.sideB.fighters, ...state.sideB.deadFighters].some(f => f.name === attackerName)) {
          if (!metadata.sideBMinionNames.includes(event.minionName)) {
            metadata.sideBMinionNames.push(event.minionName);
          }
        }
      }
    }
  }

  for (const turnLog of log) {
    turnLog.events = turnLog.events.filter(e => !e.description.includes("[INTERNAL:"));
  }

  return { winnerId, log, summary, metadata, minionTargetTypeMap, castSpellsByFighter };
}


// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 12 — PUBLICZNE API SERWISU
// ═══════════════════════════════════════════════════════════════════════════════

export async function challengePlayer(attackerUserId: number, defenderCharacterId: number) {
  const attackerChar = await prisma.character.findUnique({ where: { userId: attackerUserId } });
  if (!attackerChar) throw new Error("Twoja postać nie istnieje");
  if (attackerChar.id === defenderCharacterId) throw new Error("Nie możesz walczyć sam ze sobą");

  const defenderChar = await prisma.character.findUnique({ where: { id: defenderCharacterId } });
  if (!defenderChar) throw new Error("Przeciwnik nie istnieje");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayBattles = await prisma.battle.count({
    where: { attackerId: attackerChar.id, foughtAt: { gte: today } },
  });
  if (todayBattles >= DAILY_BATTLE_LIMIT) {
    throw new Error(`Dzienny limit walk wynosi ${DAILY_BATTLE_LIMIT}. Wróć jutro!`);
  }

  const attackerFighter = await buildFighter(attackerChar.id);
  const defenderFighter = await buildFighter(defenderChar.id);

  console.log("fightersA spells:", attackerFighter?.spellPool?.length);
  console.log("fightersB spells:", defenderFighter?.spellPool?.length);

  const result = simulateBattle([attackerFighter], [defenderFighter]);

  const attackerSpellIds = result.castSpellsByFighter.get(attackerFighter.name) ?? [];
  await recordSpellbookEntries(attackerChar.id, attackerSpellIds, "battle_cast");
  const defenderSpellIds = result.castSpellsByFighter.get(defenderFighter.name) ?? [];
  await recordSpellbookEntries(defenderChar.id, defenderSpellIds, "battle_cast");

  const attackerWon = result.winnerId === attackerChar.id;
  const defenderWon = result.winnerId === defenderChar.id;

  const prestigeDiff = attackerChar.prestige - defenderChar.prestige;
  let prestigeGain = 4;
  if (prestigeDiff >  100) prestigeGain = 2;
  if (prestigeDiff < -100) prestigeGain = 6;

  const winnerId = result.winnerId ?? attackerChar.id;

  function buildParticipants() {
    return [
      ...result.metadata.sideAFighterIds.map((id, i) => ({
        id, name: result.metadata.sideAFighterNames[i], side: "sideA", type: "fighter" as const,
      })),
      ...result.metadata.sideBFighterIds.map((id, i) => ({
        id, name: result.metadata.sideBFighterNames[i], side: "sideB", type: "fighter" as const,
      })),
      ...result.metadata.sideAMinionNames.map(name => {
        const targetType = result.minionTargetTypeMap?.get(name) ?? "randomEnemy";
        return {
          id: -1, name,
          side: (targetType === "randomAny" || targetType === "all") ? "neutral" : "sideA",
          type: "minion" as const,
          targetType,
        };
      }),
      ...result.metadata.sideBMinionNames.map(name => {
        const targetType = result.minionTargetTypeMap?.get(name) ?? "randomEnemy";
        return {
          id: -1, name,
          side: (targetType === "randomAny" || targetType === "all") ? "neutral" : "sideB",
          type: "minion" as const,
          targetType,
        };
      }),
    ];
  }

  const fullMetadata = {
    ...result.metadata,
    attackerUserId,
    attackerId:    attackerChar.id,
    attackerName:  attackerChar.name,
    defenderId:    defenderChar.id,
    defenderName:  defenderChar.name,
    allParticipants: buildParticipants(),
  };

  const battle = await prisma.battle.create({
    data: {
      attackerId:   attackerChar.id,
      defenderId:   defenderChar.id,
      winnerId,
      log:          JSON.stringify(result.log),
      summary:      result.summary,
      metadata:     JSON.stringify(fullMetadata),
      prestigeGain: attackerWon ? prestigeGain : 0,
    },
  });

// ── ALIGNMENT TRIGGERS ─────────────────────────────
const duelCountAttacker = await prisma.battle.count({
  where: {
    OR: [
      { attackerId: attackerChar.id },
      { defenderId: attackerChar.id }
    ]
  }
});

await alignmentTriggerService.checkTrigger(
  attackerChar.id,
  "PVP_50_DUELS",
  { duelCount: duelCountAttacker }
);

const duelCountDefender = await prisma.battle.count({
  where: {
    OR: [
      { attackerId: defenderChar.id },
      { defenderId: defenderChar.id }
    ]
  }
});

await alignmentTriggerService.checkTrigger(
  defenderChar.id,
  "PVP_50_DUELS",
  { duelCount: duelCountDefender }
);
// ──────────────────────────────────────────────────

  return {
    battleId:     battle.id,
    attackerWon,
    draw:         result.winnerId === null,
    summary:      result.summary,
    prestigeGain: attackerWon ? prestigeGain : 0,
    log:          result.log,
    turns:        result.log.length,
    metadata:     { ...fullMetadata, allParticipants: buildParticipants() },
  };

}

export async function getBattleHistory(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const battles = await prisma.battle.findMany({
    where:   { OR: [{ attackerId: character.id }, { defenderId: character.id }] },
    orderBy: { foughtAt: "desc" },
    take:    20,
    include: {
      attacker: { select: { name: true } },
      defender: { select: { name: true } },
      winner:   { select: { name: true } },
    },
  });

  return battles.map(b => {
    let metadata: any = {};
    try {
      metadata = JSON.parse(b.metadata ?? "{}");
    } catch {
      metadata = {};
    }
    return {
      id:            b.id,
      attacker:      b.attacker.name,
      defender:      b.defender.name,
      winner:        b.winner.name,
      summary:       b.summary,
      prestigeGain:  b.prestigeGain,
      foughtAt:      b.foughtAt,
      youWon:        b.winnerId === character.id,
      myCharacterId: character.id,
      log:           JSON.parse(b.log),
      metadata,
    };
  });
}