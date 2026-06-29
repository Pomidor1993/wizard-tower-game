import prisma from "../lib/prisma.js";
import {
  StatusEffectDef,
  AppliedStatus,
  StatusTargetType,
  parseStatusEffects,
  getEffectiveStatuses,
  isNegativeStatus,
  CleanMode,
  applyMinionStatus,
} from "../types/status-types.js";
import { calculateDuelExperience, addExperience } from "./character.service.js";
import { getCharacterSchoolBonuses } from "./magic-school.service.js";
import { getRiftTrophyBonuses } from "./rift-trophy-bonus.service.js";
import { getAltairDamageModifiers } from "./tower.service.js";
import {
  applySpellCostModifier,
  applyMinionStatMultiplier,
  hasGuaranteedHit,
} from "./rift-trophy-bonus.service.js";
import type { AggregatedRiftTrophyBonuses } from "../types/rift-trophy-types.js";
import { getEffectiveCharacterById } from "./equipment.service.js";

const DAILY_ACTION_LIMIT = 10;
const DAILY_BATTLE_LIMIT = DAILY_ACTION_LIMIT;

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
// SEKCJA 2 — TYPY WALKI
// ═══════════════════════════════════════════════════════════════════════════════

export type MinionTargetType =
  | "self" | "randomEnemy" | "randomAlly"
  | "allEnemies" | "allAllies" | "all" | "randomAny";

interface MinionAttackDef {
  name: string;
  damage: number;
  element: string;
  target: MinionTargetType;
  actionDesc: string;
  statusEffects: StatusEffectDef[];
  weight: number;
}

interface BattleSpell {
  id: number;
  name: string;
  category: string;
  damage: number;
  element: string;
  spellPool: SpellPool;
  basicCost: number;
  special: string | null;
  endInfo: string | null;
  target: string | null;
  targetCount?: number;
  statusEffects: StatusEffectDef[];
  reqElementalMagic: number;
  reqAstralMagic: number;
  reqBloodMagic: number;
  summonCount: number;
  summonHp: number;
  summonDamage: number;
  summonInitiative: number;
  summonElement: string | null;
  summonTargetType: MinionTargetType | null;
  minionAttacks: MinionAttackDef[];
}

interface Minion {
  id: string;
  name: string;
  owner: "sideA" | "sideB";
  hp: number;
  maxHp: number;
  element: string;
  initiative: number;
  targetType: MinionTargetType;
  appliedStatuses: AppliedStatus[];
  attacks: MinionAttackDef[];
  /** Losowość obrażeń ±X% (0–100). Dla minionów graczy zawsze 10. */
  damageVariance: number;
}

export interface Fighter {
  id: number;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  powerShards: number;
  resistance: number;
  initiative: number;
  intelligence: number;
  power: number;
  elementalMagic: number;
  astralMagic: number;
  bloodMagic: number;
  towerLevel: number;
  activeSpells: BattleSpell[];
  spellPool: BattleSpell[];
  minions: Minion[];
  appliedStatuses: AppliedStatus[];
  isPlayer: boolean;
  dodgeChance: number;
  altairModifiers: Record<string, number>;
  spellReqModifier?: number;
  bannedSpellElements?: string[];
  minionCountModifier?: number;
  pveResistances?: Partial<Record<string, number>>;
  pveStatusImmunities?: Partial<Record<string, number>>;
  entityDamageVariance?: number;
  trophyBonuses?: AggregatedRiftTrophyBonuses;
  imageKey?: string;
}

interface BattleSide {
  fighters: Fighter[];
  deadFighters: Fighter[];
  minions: Minion[];
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
    ? state.sideA : state.sideB;
}

function getEnemySide(fighter: Fighter, state: BattleState): BattleSide {
  return state.sideA.fighters.includes(fighter) || state.sideA.deadFighters.includes(fighter)
    ? state.sideB : state.sideA;
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
    | "spell" | "dot_tick" | "heal_tick"
    | "status_applied" | "status_expired" | "status_cleaned"
    | "minion_summoned" | "minion_attack" | "minion_death"
    | "stun" | "miss" | "on_move" | "dodge";
  attacker: string;
  target: string;
  spellName?: string;
  spellPool?: string;
  source?: "active" | "random";
  statusName?: string;
  minionName?: string;
  damage: number;
  healAmount?: number;
  targetHpAfter: number;
  description: string;
}

interface TurnLog {
  turn: number;
  events: TurnEvent[];
  sideAFighterHps: { name: string; hp: number }[];
  sideBFighterHps: { name: string; hp: number }[];
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
  pve:          "",
};

function canUseSpell(spell: BattleSpell, fighter: Fighter, globalStatuses: AppliedStatus[]): boolean {
  const mod = (req: number) => Math.floor(req * (1 + (fighter.spellReqModifier ?? 0)));
  return (
    getEffectiveStat(fighter, "elementalMagic", globalStatuses) >= mod(spell.reqElementalMagic) &&
    getEffectiveStat(fighter, "astralMagic",    globalStatuses) >= mod(spell.reqAstralMagic)    &&
    getEffectiveStat(fighter, "bloodMagic",     globalStatuses) >= mod(spell.reqBloodMagic)     &&
    fighter.powerShards >= spell.basicCost
  );
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
  let flatBonus = 0;
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

function renderTemplate(template: string, data: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = data[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

function parseMinionAttacks(raw: string): MinionAttackDef[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as MinionAttackDef[] : [];
  } catch { return []; }
}

function pickRandomSpell(
  fighter: Fighter,
  usedSpellIds: Set<number>,
  ownSide: BattleSide,
  enemySide: BattleSide,
  globalStatuses: AppliedStatus[]
): BattleSpell | null {
  const pool = pickPool(fighter.towerLevel);

  const isAvailable = (s: BattleSpell): boolean =>
    !usedSpellIds.has(s.id) && canUseSpell(s, fighter, globalStatuses);

  const fromPool = fighter.spellPool.filter(s => s.spellPool === pool && isAvailable(s));
  if (fromPool.length > 0) return fromPool[randomInt(0, fromPool.length - 1)]!;

  const any = fighter.spellPool.filter(isAvailable);
  return any.length === 0 ? null : any[randomInt(0, any.length - 1)]!;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 4 — OBLICZANIE OBRAŻEŃ
//
// MODEL ADDYTYWNY:
//   finalDmg = baseDamage × (1 + sumModifiers/100) × randomVariance
//
// Modyfikatory gracza (na plus, % od bazowych):
//   • power statystyka: +1% za punkt
//   • elementalMagic / astralMagic / bloodMagic: +1% za punkt każdej
//   • Ołtarz (altairModifiers): ±X% per żywioł
//   • trofea, szkoła, tytuły: przekazane już do Fighter jako bonusy statystyk
//
// Modyfikatory celu (na minus dla atakującego, na plus dla celu):
//   • resist status: -X% (per żywioł)
//   • vulnerable status: +X% (per żywioł)
//   • resistance statystyka: -1% za punkt (cap 80%)
//
// Po zsumowaniu wszystkich modyfikatorów CLAMPUJEMY sumę do [-90%, +∞)
// (atak nie może zostać w 100% zneutralizowany przez modyfikatory, min 10% bazy).
//
// Losowość: ±20% dla graczy, ±damageVariance% dla minionów/PvE.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zbiera wszystkie addytywne modyfikatory % dla ataku gracza.
 * Zwraca sumę w punktach procentowych (np. 90 = +90%).
 */
function collectPlayerModifiers(
  element: string,
  attacker: Fighter,
  target: Fighter,
  globalStatuses: AppliedStatus[]
): number {
  let mod = 0;

  // G — Moc atakującego: +1% za punkt
  mod += getEffectiveStat(attacker, "power", globalStatuses);

  // G — Magia atakującego: +1% za każdy punkt każdej ze statystyk magicznych
  mod += getEffectiveStat(attacker, "elementalMagic", globalStatuses);
  mod += getEffectiveStat(attacker, "astralMagic",    globalStatuses);
  mod += getEffectiveStat(attacker, "bloodMagic",     globalStatuses);

  // A — Ołtarz: ±X% per żywioł
  mod += attacker.altairModifiers[element] ?? 0;

  // E — Statusy celu: vulnerable (+) i resist (-)
  for (const status of getEffectiveStatuses(target.appliedStatuses, globalStatuses)) {
    const def = status.effectDef;
    if (def.type === "vulnerable" && def.element === element) {
      mod += status.resolvedEffect ?? def.value ?? 0;
    }
    if (def.type === "resist" && def.element === element) {
      mod -= status.resolvedEffect ?? def.value ?? 0;
    }
  }

  // H — Odporność celu: -1% za punkt, cap 80%
  const resistance = getEffectiveStat(target, "resistance", globalStatuses);
  mod -= Math.min(resistance, 80);

  return mod;
}

/**
 * Zbiera modyfikatory % dla ataku miniona/PvE (brak bonusów atakującego).
 */
function collectMinionModifiers(
  element: string,
  target: Fighter,
  globalStatuses: AppliedStatus[]
): number {
  let mod = 0;

  // E — Statusy celu
  for (const status of getEffectiveStatuses(target.appliedStatuses, globalStatuses)) {
    const def = status.effectDef;
    if (def.type === "vulnerable" && def.element === element) {
      mod += status.resolvedEffect ?? def.value ?? 0;
    }
    if (def.type === "resist" && def.element === element) {
      mod -= status.resolvedEffect ?? def.value ?? 0;
    }
  }

  // H — Odporność celu
  const resistance = getEffectiveStat(target, "resistance", globalStatuses);
  mod -= Math.min(resistance, 80);

  // TODO: A/B/C/D/F — Ołtarz celu, trofea, tytuły, ekwipunek, stołówka
  // Gdy te systemy powstaną, dorzucić tu ich modyfikatory obrony
  // (np. target.defenseModifiers[element] ?? 0)

  return mod;
}

/**
 * Aplikuje model addytywny i losowość.
 *   result = base × clamp(1 + mod/100, 0.1, ∞) × variance
 */
function applyModifiers(
  baseDamage: number,
  modifierPercent: number,
  variancePercent: number
): number {
  if (baseDamage <= 0) return 0;

  // Clamp: minimum -90% (zawsze zostaje przynajmniej 10% bazy)
  const clampedMod = Math.max(modifierPercent, -90);
  const afterMod = baseDamage * (1 + clampedMod / 100);

  // Losowość symetryczna: ±variancePercent%
  const v = variancePercent / 100;
  const variance = 1 - v + Math.random() * 2 * v;
  const result = afterMod * variance;

  return Math.max(1, Math.ceil(result));
}

/**
 * Oblicza obrażenia czaru gracza.
 */
function calculateSpellDamage(
  baseDamage: number,
  element: string,
  attacker: Fighter,
  target: Fighter,
  globalStatuses: AppliedStatus[]
): number {
  if (baseDamage <= 0) return 0;
  const mod = collectPlayerModifiers(element, attacker, target, globalStatuses);
  return applyModifiers(baseDamage, mod, 20);
}

/**
 * Oblicza obrażenia ataku miniona lub bytu PvE.
 */
function calculateMinionDamage(
  baseDamage: number,
  element: string,
  target: Fighter,
  globalStatuses: AppliedStatus[],
  variancePercent: number
): number {
  if (baseDamage <= 0) return 0;
  const mod = collectMinionModifiers(element, target, globalStatuses);
  return applyModifiers(baseDamage, mod, variancePercent);
}

function calculatePveDamage(
  baseDamage: number,
  element: string,
  attacker: Fighter,
  target: Fighter,
  globalStatuses: AppliedStatus[]
): number {
  if (baseDamage <= 0) return 0;
 
  const mod = collectMinionModifiers(element, target, globalStatuses);
  const variancePercent = attacker.entityDamageVariance ?? 10;
 
  const afterMod = applyModifiers(baseDamage, mod, variancePercent);
 
  const flatResist = target.pveResistances?.[element] ?? 0;
 
  return Math.max(1, afterMod - flatResist);
}


// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 5 — UNIK (DODGE)
//
// Miniony i byty PvE mają bazową szansę na trafienie (85% minion, 90% PvE).
// Fighter.dodgeChance (cap 20%) redukuje tę szansę punkt za punkt.
// Gracz NIE może unikać ataków innych graczy (tylko minionów/PvE).
// ═══════════════════════════════════════════════════════════════════════════════

const MINION_BASE_HIT_CHANCE = 85;
const PVE_BASE_HIT_CHANCE    = 90;

/**
 * Sprawdza czy atak miniona/PvE trafia w cel.
 * Zwraca true = trafienie, false = unik.
 */
function rollMinionHit(target: Fighter, isPve: boolean): boolean {
  const base = isPve ? PVE_BASE_HIT_CHANCE : MINION_BASE_HIT_CHANCE;
  const dodge = Math.min(target.dodgeChance, 20);
  const hitChance = Math.max(base - dodge, 0);
  return Math.random() * 100 < hitChance;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 6 — ZARZĄDZANIE STATUSAMI
// ═══════════════════════════════════════════════════════════════════════════════

function resolveStatusTargets(
  targetType: StatusTargetType | MinionTargetType,
  count: number | undefined,
  caster: Fighter,
  ownSide: BattleSide,
  enemySide: BattleSide
): (Fighter | Minion)[] {
  const ownAll:   (Fighter | Minion)[] = [...ownSide.fighters, ...ownSide.minions.filter(m => m.hp > 0)];
  const enemyAll: (Fighter | Minion)[] = [...enemySide.fighters, ...enemySide.minions.filter(m => m.hp > 0)];
  const all = [...ownAll, ...enemyAll];

  switch (targetType) {
    case "self":        return [caster];
    case "target":
    case "randomEnemy": {
      const alive = enemyAll.filter(t => t.hp > 0);
      if (alive.length === 0) return [];
      return [alive[randomInt(0, alive.length - 1)]!];
    }
    case "allAllies":   return ownAll;
    case "allEnemies":  return enemyAll;
    case "all":         return all;
    case "randomAlly": {
      const alive = ownAll.filter(t => t.hp > 0);
      if (alive.length === 0) return [];
      return [alive[randomInt(0, alive.length - 1)]!];
    }
    case "randomAny": {
      const alive = all.filter(t => t.hp > 0);
      if (alive.length === 0) return [];
      return [alive[randomInt(0, alive.length - 1)]!];
    }
    case "nEnemies": {
      const n = count ?? 1;
      return [...enemyAll.filter(t => t.hp > 0)].sort(() => Math.random() - 0.5).slice(0, n);
    }
    case "nAllies": {
      const n = count ?? 1;
      return [...ownAll.filter(t => t.hp > 0)].sort(() => Math.random() - 0.5).slice(0, n);
    }
    default: return [];
  }
}

function executeClean(
  target: Fighter | Minion,
  def: StatusEffectDef,
  sourceName: string
): TurnEvent[] {
  const events: TurnEvent[] = [];
  if (def.type !== "clean") return events;
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

  const desc = removed.length === 0
    ? `${sourceName} próbuje oczyścić ${target.name} — brak statusów do usunięcia.`
    : `${sourceName} czyści ${target.name} z ${removed.length} efektów (${removed.map(s => s.effectDef.type).join(", ")}).`;

  events.push({ type: "status_cleaned", attacker: sourceName, target: target.name,
    statusName: "clean", damage: 0, targetHpAfter: target.hp, description: desc });
  return events;
}

function applyStatusToTarget(
  target: Fighter | Minion,
  def: StatusEffectDef,
  sourceName: string,
  globalStatuses: AppliedStatus[],
  spellEndInfo?: string | null
): TurnEvent[] {
  const events: TurnEvent[] = [];
 
  if (def.type === "clean") {
    return executeClean(target, def, sourceName);
  }
 
  // Sprawdź odporność na status (tylko dla Fighter z pveStatusImmunities)
  if ("pveStatusImmunities" in target && target.pveStatusImmunities) {
    const immunityChance = (target as Fighter).pveStatusImmunities![def.type] ?? 0;
    if (immunityChance > 0 && Math.random() < immunityChance) {
      events.push({
        type: "miss",
        attacker: sourceName,
        target: target.name,
        statusName: def.type,
        damage: 0,
        targetHpAfter: target.hp,
        description: `${target.name} odpiera efekt "${def.type}" (${sourceName}).`,
      });
      return events;
    }
  }

  // Wartość rozwiązana przy nakładaniu
  let resolvedEffect: number | undefined;
  if (def.type === "dot")            resolvedEffect = def.damage;
  if (def.type === "vulnerable")     resolvedEffect = def.value;
  if (def.type === "resist")         resolvedEffect = def.value;
  if (def.type === "stat_boost")     resolvedEffect = def.statAmount;
  if (def.type === "heal_chance")    resolvedEffect = def.healAmount;
  if (def.type === "damage_on_move") resolvedEffect = def.damage;

  // Dla minionów — użyj applyMinionStatus (stackowanie/nie-stackowanie)
  const isMinionSource = !("towerLevel" in (target as any)) || true; // zawsze używamy logiki stackowania
  applyMinionStatus(target, def, sourceName, resolvedEffect);

  // endInfo: priorytet → def.endInfo → spellEndInfo (czar gracza)
  // Piszemy endInfo do ostatnio dodanego statusu
  const added = target.appliedStatuses[target.appliedStatuses.length - 1];
  if (added && !added.effectDef.endInfo && spellEndInfo) {
    // Pole endInfo jest na def (read-only z JSON), więc przechowujemy w AppliedStatus
    (added as any)._endInfo = spellEndInfo;
  }

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
  for (const def of spell.statusEffects) {
    const targets = resolveStatusTargets(def.target, def.count, caster, ownSide, enemySide);
    for (const t of targets) {
      events.push(...applyStatusToTarget(t, def, spell.name, globalStatuses, spell.endInfo));
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
    const endInfo = (status as any)._endInfo ?? status.effectDef.endInfo ?? null;
    const expiredDesc = endInfo
      ? renderTemplate(endInfo, { target: entity.name, source: status.sourceName })
      : `Status "${status.effectDef.type}" (${status.sourceName}) wygasł.`;
    events.push({ type: "status_expired", attacker: "System", target: entity.name,
      statusName: status.effectDef.type, damage: 0, targetHpAfter: entity.hp, description: expiredDesc });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 7 — TICKI STATUSÓW
// ═══════════════════════════════════════════════════════════════════════════════

function applyDotTick(entity: Fighter | Minion, globalStatuses: AppliedStatus[]): TurnEvent[] {
  const events: TurnEvent[] = [];
  for (const status of getEffectiveStatuses(entity.appliedStatuses, globalStatuses)) {
    if (status.effectDef.type !== "dot") continue;
    const chance = status.effectDef.statusChance ?? 100;
    const dmg = status.resolvedEffect ?? status.effectDef.damage ?? 0;
    if (dmg <= 0) continue;

    const rolled = Math.random() * 100 < chance;
    if (!rolled) {
      if (status.effectDef.failTickInfo) {
        events.push({ type: "dot_tick", attacker: status.sourceName, target: entity.name,
          damage: 0, targetHpAfter: entity.hp,
          description: renderTemplate(status.effectDef.failTickInfo,
            { target: entity.name, source: status.sourceName }) });
      }
      continue;
    }

    entity.hp = Math.max(0, entity.hp - dmg);
    events.push({ type: "dot_tick", attacker: status.sourceName, target: entity.name,
      damage: dmg, targetHpAfter: entity.hp,
      description: status.effectDef.tickInfo
        ? renderTemplate(status.effectDef.tickInfo, { target: entity.name, damage: dmg, source: status.sourceName })
        : `${entity.name} otrzymuje ${dmg} pkt obrażeń (${status.sourceName}).` });
  }
  return events;
}

function applyHealChanceTick(entity: Fighter | Minion, globalStatuses: AppliedStatus[]): TurnEvent[] {
  const events: TurnEvent[] = [];
  for (const status of getEffectiveStatuses(entity.appliedStatuses, globalStatuses)) {
    if (status.effectDef.type !== "heal_chance") continue;
    const chance = status.effectDef.statusChance ?? 100;
    const baseAmount = status.resolvedEffect ?? status.effectDef.healAmount ?? 0;
    const amount = (status.effectDef.healMode) === "percent"
      ? Math.floor(entity.maxHp * baseAmount / 100) : baseAmount;
    if (amount <= 0) continue;

    const rolled = Math.random() * 100 < chance;
    if (!rolled) {
      if (status.effectDef.failTickInfo) {
        events.push({ type: "heal_tick", attacker: status.sourceName, target: entity.name,
          damage: 0, targetHpAfter: entity.hp,
          description: renderTemplate(status.effectDef.failTickInfo,
            { target: entity.name, source: status.sourceName }) });
      }
      continue;
    }

    const healed = Math.min(amount, entity.maxHp - entity.hp);
    if (healed <= 0) continue;
    entity.hp += healed;
    events.push({ type: "heal_tick", attacker: status.sourceName, target: entity.name,
      healAmount: healed, damage: 0, targetHpAfter: entity.hp,
      description: status.effectDef.tickInfo
        ? renderTemplate(status.effectDef.tickInfo, { target: entity.name, damage: healed, source: status.sourceName })
        : `${entity.name} zostaje uleczony o ${healed} HP (${status.sourceName}).` });
  }
  return events;
}

function applyDamageOnMove(entity: Fighter | Minion, globalStatuses: AppliedStatus[]): TurnEvent[] {
  const events: TurnEvent[] = [];
  for (const status of getEffectiveStatuses(entity.appliedStatuses, globalStatuses)) {
    if (status.effectDef.type !== "damage_on_move") continue;
    const chance = status.effectDef.statusChance ?? 100;
    const dmg = status.resolvedEffect ?? status.effectDef.damage ?? 0;
    if (dmg <= 0) continue;

    const rolled = Math.random() * 100 < chance;
    if (!rolled) {
      if (status.effectDef.failTickInfo) {
        events.push({ type: "on_move", attacker: status.sourceName, target: entity.name,
          damage: 0, targetHpAfter: entity.hp,
          description: renderTemplate(status.effectDef.failTickInfo,
            { target: entity.name, source: status.sourceName }) });
      }
      continue;
    }

    entity.hp = Math.max(0, entity.hp - dmg);
    events.push({ type: "on_move", attacker: status.sourceName, target: entity.name,
      damage: dmg, targetHpAfter: entity.hp,
      description: status.effectDef.tickInfo
        ? renderTemplate(status.effectDef.tickInfo, { target: entity.name, damage: dmg, source: status.sourceName })
        : `${entity.name} otrzymuje ${dmg} pkt obrażeń przy ruchu (${status.sourceName}).` });
  }
  return events;
}

function processStunStatuses(fighter: Fighter, events: TurnEvent[]): boolean {
  const activeStuns = getEffectiveStatuses(fighter.appliedStatuses, [])
    .filter(s => s.effectDef.type === "stun" && (s.turnsLeft === null || s.turnsLeft > 0));

  for (const status of activeStuns) {
    const def = status.effectDef as Extract<StatusEffectDef, { type: "stun" }>;
    const chance = def.statusChance ?? 100;
    if (Math.random() * 100 < chance) {
      const desc = def.tickInfo
        ? renderTemplate(def.tickInfo, { target: fighter.name, source: status.sourceName })
        : `${fighter.name} jest ogłuszony — traci akcję!`;
      events.push({ type: "stun", attacker: status.sourceName, target: fighter.name,
        damage: 0, targetHpAfter: fighter.hp, description: desc });
      return true;
    } else if (def.failTickInfo) {
      events.push({ type: "miss", attacker: status.sourceName, target: fighter.name,
        damage: 0, targetHpAfter: fighter.hp,
        description: renderTemplate(def.failTickInfo, { target: fighter.name, source: status.sourceName }) });
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 8 — MINIONY
// ═══════════════════════════════════════════════════════════════════════════════

function rollMinion(base: number, variancePercent: number = 25): number {
  if (base === 0) return 0;
  const v = variancePercent / 100;
  return Math.max(1, Math.round(base * (1 - v + Math.random() * 2 * v)));
}

function createMinion(spell: BattleSpell, ownerSide: "sideA" | "sideB", index: number): Minion {
  const hp         = rollMinion(spell.summonHp);
  const initiative = rollMinion(spell.summonInitiative);

  return {
    id:         `minion_${Date.now()}_${ownerSide}_${index}_${Math.random()}`,
    name:       `${spell.name}${spell.summonCount > 1 ? ` (${index + 1})` : ""}`,
    owner:      ownerSide,
    hp:         Math.max(1, hp),
    maxHp:      Math.max(1, hp),
    element:    spell.summonElement ?? "none",
    initiative: Math.max(0, initiative),
    targetType: spell.summonTargetType ?? "randomEnemy",
    appliedStatuses: [],
    attacks:    spell.minionAttacks,
    damageVariance: 10, // zawsze ±10% dla minionów graczy
  };
}

function pickMinionAttack(minion: Minion): MinionAttackDef | null {
  if (minion.attacks.length === 0) return null;
  const totalWeight = minion.attacks.reduce((s, a) => s + a.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const attack of minion.attacks) {
    roll -= attack.weight;
    if (roll <= 0) return attack;
  }
  return minion.attacks[minion.attacks.length - 1]!;
}

function selectMinionTargets(
  minion: Minion,
  ownSide: BattleSide,
  enemySide: BattleSide
): (Fighter | Minion)[] {
  const ownAll:   (Fighter | Minion)[] = [...ownSide.fighters, ...ownSide.minions.filter(m => m.hp > 0 && m !== minion)];
  const enemyAll: (Fighter | Minion)[] = [...enemySide.fighters, ...enemySide.minions.filter(m => m.hp > 0)];
  const all = [...ownAll, ...enemyAll];

  function pickRandom(pool: (Fighter | Minion)[]): (Fighter | Minion)[] {
    const alive = pool.filter(t => t.hp > 0);
    if (alive.length === 0) return [];
    return [alive[randomInt(0, alive.length - 1)]!];
  }

  switch (minion.targetType) {
    case "self":         return [minion];
    case "randomEnemy":  return pickRandom(enemyAll);
    case "randomAlly":   return pickRandom(ownAll);
    case "allEnemies":   return enemyAll.filter(t => t.hp > 0);
    case "allAllies":    return ownAll.filter(t => t.hp > 0);
    case "all":          return all.filter(t => t.hp > 0);
    case "randomAny":    return pickRandom(all);
    default:             return [];
  }
}

function executeSingleMinionAttack(
  minion: Minion,
  ownSide: BattleSide,
  enemySide: BattleSide,
  state: BattleState,
  isPve: boolean
): TurnEvent[] {
  const events: TurnEvent[] = [];
  if (minion.hp <= 0) return events;
 
  // damage_on_move przy ruchu miniona
  events.push(...applyDamageOnMove(minion, state.globalStatuses));
  if (minion.hp <= 0) {
    events.push(minionDeathEvent(minion));
    return events;
  }
 
  const attack = pickMinionAttack(minion);
  if (!attack) return events;
 
  const tempMinion = { ...minion, targetType: attack.target };
  const targets = selectMinionTargets(tempMinion, ownSide, enemySide);
 
  for (const t of targets) {
    if ("dodgeChance" in t) {
      const hit = rollMinionHit(t as Fighter, isPve);
      if (!hit) {
        events.push({
          type: "dodge",
          attacker: minion.name,
          target: t.name,
          damage: 0,
          targetHpAfter: t.hp,
          description: `${t.name} unika ataku ${minion.name}!`,
        });
        continue;
      }
    }
 
    let dmg = 0;
    if (attack.damage > 0) {
      if ("dodgeChance" in t) {
        // Cel to Fighter — sprawdzamy czy to PvE entity atakuje gracza
        const attackerIsPveEntity = isPve;
        if (attackerIsPveEntity) {
          // Szukamy Fighter atakującego żeby przekazać entityDamageVariance
          // Minion gracza nie ma entityDamageVariance, więc fallback do calculateMinionDamage
          dmg = calculateMinionDamage(
            attack.damage, attack.element, t as Fighter,
            state.globalStatuses, minion.damageVariance
          );
        } else {
          dmg = calculateMinionDamage(
            attack.damage, attack.element, t as Fighter,
            state.globalStatuses, minion.damageVariance
          );
        }
      } else {
        // Cel to inny minion — brak modyfikatorów
        const v = minion.damageVariance / 100;
        dmg = Math.max(1, Math.ceil(attack.damage * (1 - v + Math.random() * 2 * v)));
      }
      t.hp = Math.max(0, t.hp - dmg);
    }
 
    const desc = attack.actionDesc
      ? renderTemplate(attack.actionDesc, { attacker: minion.name, target: t.name, damage: dmg })
      : `${minion.name} atakuje ${t.name} zadając ${dmg} pkt obrażeń.`;
 
    events.push({
      type: "minion_attack",
      attacker: minion.name,
      target: t.name,
      minionName: minion.name,
      damage: dmg,
      targetHpAfter: t.hp,
      description: desc,
    });
 
    for (const def of attack.statusEffects) {
      events.push(...applyStatusToTarget(t, def, minion.name, state.globalStatuses));
    }
 
    if (t.hp <= 0 && !("towerLevel" in t)) {
      events.push(minionDeathEvent(t as Minion));
    }
  }
 
  return events;
}

function minionDeathEvent(minion: Minion): TurnEvent {
  return { type: "minion_death", attacker: minion.name, target: minion.name,
    minionName: minion.name, damage: 0, targetHpAfter: 0,
    description: `${minion.name} zostaje unieszkodliwiony!` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 9 — OPIS CZARU W LOGU
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
  // Pobieramy postać z już obliczonymi statystykami (w tym bonusy z ekwipunku)
  const character = await getEffectiveCharacterById(characterId);
  if (!character) throw new Error(`Postać ${characterId} nie znaleziona`);

  const [schoolBonuses, trophyBonuses, altairModifiers] = await Promise.all([
    getCharacterSchoolBonuses(character.id),
    getRiftTrophyBonuses(character.id),
    getAltairDamageModifiers(character.id),
  ]);
  const tb = trophyBonuses;
  const schoolStats = schoolBonuses?.stats ?? 0;

  // Funkcja mapująca czary (bez zmian)
  function mapSpell(s: any): BattleSpell {
    return {
      id:               s.id,
      name:             s.name,
      category:         s.category ?? "offensive",
      damage:           s.damage ?? 0,
      element:          s.element,
      spellPool:        s.spellPool as SpellPool,
      basicCost:        s.basicCost ?? 0,
      special:          s.special,
      endInfo:          s.endInfo ?? null,
      target:           s.spellTarget ?? null,
      targetCount:      s.spellTargetCount ?? undefined,
      statusEffects:    parseStatusEffects(s.statusEffects),
      reqElementalMagic: s.reqElementalMagic ?? 0,
      reqAstralMagic:    s.reqAstralMagic    ?? 0,
      reqBloodMagic:     s.reqBloodMagic     ?? 0,
      summonCount:      Math.floor(s.summonCount ?? 0),
      summonHp:         s.summonHp         ?? 0,
      summonDamage:     s.summonDamage     ?? 0,
      summonInitiative: s.summonInitiative ?? 0,
      summonElement:    s.summonElement,
      summonTargetType: s.summonTargetType as MinionTargetType | null,
      minionAttacks:    parseMinionAttacks(s.minionAttacks ?? "[]"),
    };
  }

  // Pobieramy wszystkie czary (bez utility) – to samo co wcześniej
  const allSpells = await prisma.spell.findMany({ where: { category: { not: "utility" } } });
  const activeSpells = character.spellSlots.map(ss => mapSpell(ss.spell));
  const activeIds = new Set(activeSpells.map(s => s.id));
  const spellPool = allSpells.map(mapSpell).filter(s => !activeIds.has(s.id));

  const towerLevel = character.tower?.level ?? 1;

  // Teraz character.endurance zawiera już bonusy z ekwipunku i trofeów (jeśli były)
  // Dodajemy jeszcze bonus ze szkoły (hp) i ewentualnie inne
  const maxHp = Math.max(1, 20 + character.endurance * 5);
  const schoolHp = schoolBonuses?.hp ?? 0;
  const schoolDodge = schoolBonuses?.dodge ?? 0;
  const finalMaxHp = maxHp + schoolHp;

  const trophyDodge = tb?.dodge ?? 0;
  const rawDodge = schoolDodge + trophyDodge;
  const dodgeChance = Math.min(rawDodge, 20);

  return {
    id:             character.id,
    name:           character.name,
    level:          character.level,
    hp:             finalMaxHp,
    maxHp:          finalMaxHp,
    powerShards:    character.powerShards,
    // Używamy gotowych statystyk z character, a do nich dodajemy bonusy ze szkoły i trofeów (jeśli nie są już uwzględnione)
    // UWAGA: jeśli getEffectiveCharacterById już dodał bonusy ze szkoły/trofeów, to nie dodawaj ich ponownie.
    // Zakładam, że getEffectiveCharacterById liczy tylko ekwipunek, więc dodajemy resztę.
    resistance:     character.resistance     + schoolStats + (tb.stats.resistance     ?? 0),
    initiative:     character.initiative     + schoolStats + (tb.stats.initiative     ?? 0),
    intelligence:   character.intelligence   + schoolStats + (tb.stats.intelligence   ?? 0),
    power:          character.power          + schoolStats + (tb.stats.power          ?? 0),
    elementalMagic: character.elementalMagic + schoolStats + (tb.stats.elementalMagic ?? 0),
    astralMagic:    character.astralMagic    + schoolStats + (tb.stats.astralMagic    ?? 0),
    bloodMagic:     character.bloodMagic     + schoolStats + (tb.stats.bloodMagic     ?? 0),
    towerLevel,
    activeSpells,
    spellPool,
    minions:         [],
    appliedStatuses: [],
    isPlayer:        true,
    dodgeChance,
    altairModifiers,
    trophyBonuses:   tb,
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
    id: number; name: string;
    side: "sideA" | "sideB";
    type: "fighter" | "minion";
    targetType?: string;
  }>;
}

export function simulateBattle(fightersA: Fighter[], fightersB: Fighter[]): {
  winnerId: number | null;
  log: TurnLog[];
  summary: string;
  metadata: BattleMetadata;
  minionTargetTypeMap: Map<string, string>;
} {
  const state: BattleState = {
    sideA: makeSide(fightersA),
    sideB: makeSide(fightersB),
    globalStatuses: [],
  };

  const log: TurnLog[] = [];
  const activeQueues      = new Map<number, BattleSpell[]>();
  const globalUsedSpellIds = new Set<number>();

  for (const f of [...fightersA, ...fightersB]) {
    activeQueues.set(f.id, [...f.activeSpells]);
  }

  // ── Szansa na rzucenie czaru (inteligencja + pula) ────────────────────────
  function rollCastSuccess(spell: BattleSpell, fighter: Fighter): boolean {
    if (!fighter.isPlayer) return true;
    if (fighter.trophyBonuses && hasGuaranteedHit(fighter.trophyBonuses, "combat")) return true;

    const BASE: Record<SpellPool, number> = {
      chaotic: 70, controlled: 50, incantation: 40, professional: 30, master: 20, pve: 100,
    };
    const SCALE: Record<SpellPool, number> = {
      chaotic: 1.0, controlled: 1.0, incantation: 1.5, professional: 1.5, master: 1.5, pve: 0,
    };
    const chance = Math.min(BASE[spell.spellPool] + fighter.intelligence * SCALE[spell.spellPool], 100);
    return Math.random() * 100 < chance;
  }

  // ── Główna akcja fightera ─────────────────────────────────────────────────
  function executeAttack(actor: Fighter): TurnEvent[] {
    const events: TurnEvent[] = [];
    const ownSide   = getSideOf(actor, state);
    const enemySide = getEnemySide(actor, state);

    if (processStunStatuses(actor, events)) return events;
    events.push(...applyDamageOnMove(actor, state.globalStatuses));
    if (actor.hp <= 0) return events;

    const queue = activeQueues.get(actor.id)!;
    let spell: BattleSpell | null = null;
    let isActive = false;

    if (queue.length > 0 && actor.powerShards >= queue[0]!.basicCost) {
      spell    = queue.shift()!;
      isActive = true;
    } else {
      spell = pickRandomSpell(actor, globalUsedSpellIds, ownSide, enemySide, state.globalStatuses);
      if (spell && actor.isPlayer) globalUsedSpellIds.add(spell.id);
    }

    if (spell) {
      const finalCost = actor.trophyBonuses
        ? applySpellCostModifier(spell.basicCost, actor.trophyBonuses)
        : spell.basicCost;
      actor.powerShards -= finalCost;
    }

// Brak dostępnych czarów — nie powinno wystąpić przy obecnym modelu gry
if (!spell) {
  console.warn(`[COMBAT] ${actor.name} has no available spell this turn.`);
  return events;
}

    const poolLabel = isActive ? "czar aktywny" : POOL_LABELS[spell.spellPool];
    const source: "active" | "random" = isActive ? "active" : "random";

    // Roll rzucenia
    if (!rollCastSuccess(spell, actor)) {
      events.push({ type: "miss", attacker: actor.name, target: "?", spellName: spell.name,
        spellPool: poolLabel, source, damage: 0, targetHpAfter: 0,
        description: `${actor.name} ${poolLabel} — próbuje rzucić ${spell.name}, ale nic się nie dzieje.` });
      return events;
    }

    // ── Wyznaczenie celów czaru ───────────────────────────────────────────

    const spellTarget = spell.target ?? "randomEnemy";
    const aliveEnemies = enemySide.fighters.filter(f => f.hp > 0);
    const aliveAllies  = ownSide.fighters.filter(f => f.hp > 0 && f !== actor);

    // Dla czarów z obrażeniami — lista celów do zadania dmg
    let dmgTargets: Fighter[] = [];

    if (spell.damage > 0 && spell.summonCount === 0) {
      switch (spellTarget) {
        case "randomEnemy":
          if (aliveEnemies.length > 0)
            dmgTargets = [aliveEnemies[randomInt(0, aliveEnemies.length - 1)]!];
          break;
        case "allEnemies":
          dmgTargets = [...aliveEnemies];
          break;
        case "nEnemies": {
          const n = spell.targetCount ?? 1;
          dmgTargets = [...aliveEnemies].sort(() => Math.random() - 0.5).slice(0, n);
          break;
        }
        case "all":
          dmgTargets = [...aliveEnemies, ...aliveAllies, actor];
          break;
        default:
          if (aliveEnemies.length > 0)
            dmgTargets = [aliveEnemies[randomInt(0, aliveEnemies.length - 1)]!];
      }
    }

    // Opis główny czaru (używamy pierwszego celu lub "wszystkich")
    const primaryTargetName = dmgTargets.length === 1
      ? dmgTargets[0]!.name
      : dmgTargets.length > 1 ? "wszystkich" : "—";

    let totalDmg = 0;

    // Obrażenia per cel
    for (const t of dmgTargets) {
      const dmg = actor.isPlayer
        ? calculateSpellDamage(spell.damage, spell.element, actor, t, state.globalStatuses)
        : calculatePveDamage(spell.damage, spell.element, actor, t, state.globalStatuses);
              totalDmg += dmg;
      t.hp = Math.max(0, t.hp - dmg);

      // Per-target event gdy jest wiele celów
      if (dmgTargets.length > 1) {
        events.push({ type: "spell", attacker: actor.name, target: t.name,
          spellName: spell.name, spellPool: poolLabel, source, damage: dmg, targetHpAfter: t.hp,
          description: `${t.name} otrzymuje ${dmg} obrażeń.` });
      }
    }

    // Główny event czaru
    const spellDescription = formatSpellDescription(
      spell, actor.name, primaryTargetName, poolLabel, isActive,
      dmgTargets.length === 1 ? totalDmg : 0
    );
    events.push({ type: "spell", attacker: actor.name, target: primaryTargetName,
      spellName: spell.name, spellPool: poolLabel, source,
      damage: dmgTargets.length === 1 ? totalDmg : 0,
      targetHpAfter: dmgTargets.length === 1 ? (dmgTargets[0]?.hp ?? 0) : 0,
      description: spellDescription });

    // Przywołaj miniony
    if (spell.summonCount > 0) {
      const ownerSide: "sideA" | "sideB" = ownSide === state.sideA ? "sideA" : "sideB";
      for (let i = 0; i < spell.summonCount; i++) {
        let minion = createMinion(spell, ownerSide, i);
        if (actor.trophyBonuses) {
          const scaled = applyMinionStatMultiplier(
            { hp: minion.hp, damage: 0, initiative: minion.initiative }, actor.trophyBonuses
          );
          minion = { ...minion, hp: scaled.hp, maxHp: scaled.hp, initiative: scaled.initiative };
        }
        ownSide.minions.push(minion);
        events.push({ type: "minion_summoned", attacker: actor.name, target: actor.name,
          minionName: minion.name, damage: 0, targetHpAfter: actor.hp,
          description: `[INTERNAL: ${actor.name} summoned ${minion.name} targetType=${minion.targetType}]` });
      }
    }

    // Statusy z czaru
    events.push(...applySpellStatuses(spell, actor, ownSide, enemySide, state.globalStatuses));

    return events;
  }

  function processDeath(side: BattleSide): TurnEvent[] {
    const events: TurnEvent[] = [];
    const justDied = side.fighters.filter(f => f.hp <= 0);
    for (const f of justDied) {
      side.fighters = side.fighters.filter(x => x !== f);
      side.deadFighters.push(f);
      events.push({ type: "status_applied", attacker: "System", target: f.name,
        damage: 0, targetHpAfter: 0, description: `${f.name} pada!` });
    }
    return events;
  }

  // ── Główna pętla ──────────────────────────────────────────────────────────
  let turn = 0;
  const MAX_TURNS = 10;

  while (!isBattleOver(state) && turn < MAX_TURNS) {
    turn++;
    const turnEvents: TurnEvent[] = [];

    // DOT i leczenie na początku tury
    for (const f of allLivingFighters(state)) {
      turnEvents.push(...applyDotTick(f, state.globalStatuses));
      turnEvents.push(...applyHealChanceTick(f, state.globalStatuses));
    }
    turnEvents.push(...processDeath(state.sideA));
    turnEvents.push(...processDeath(state.sideB));
    if (isBattleOver(state)) break;

    // Kolejność wg inicjatywy + mały losowy szum
    type TurnActor =
      | { kind: "fighter"; actor: Fighter }
      | { kind: "minion";  actor: Minion; ownSide: BattleSide; enemySide: BattleSide; isPve: boolean };
 
    const turnActors: TurnActor[] = [];
 
    for (const f of allLivingFighters(state)) {
      turnActors.push({ kind: "fighter", actor: f });
    }
    for (const m of state.sideA.minions.filter(m => m.hp > 0)) {
      turnActors.push({ kind: "minion", actor: m, ownSide: state.sideA, enemySide: state.sideB, isPve: false });
    }
    for (const m of state.sideB.minions.filter(m => m.hp > 0)) {
      turnActors.push({ kind: "minion", actor: m, ownSide: state.sideB, enemySide: state.sideA, isPve: false });
    }
 
    // Sortuj wg inicjatywy + mały losowy szum (te same zasady co dotąd)
    turnActors.sort((a, b) => {
      const initA = a.kind === "fighter"
        ? getEffectiveStat(a.actor, "initiative", state.globalStatuses)
        : a.actor.initiative;
      const initB = b.kind === "fighter"
        ? getEffectiveStat(b.actor, "initiative", state.globalStatuses)
        : b.actor.initiative;
      return (initB + Math.random() * 2) - (initA + Math.random() * 2);
    });
 
    for (const entry of turnActors) {
      if (isBattleOver(state)) break;
 
      if (entry.kind === "fighter") {
        if (entry.actor.hp <= 0) continue;
        turnEvents.push(...executeAttack(entry.actor));
        turnEvents.push(...processDeath(state.sideA));
        turnEvents.push(...processDeath(state.sideB));
      } else {
        // Minion wykonuje jeden atak w swojej kolejce inicjatywy
        if (entry.actor.hp <= 0) continue;
        turnEvents.push(...executeSingleMinionAttack(
          entry.actor, entry.ownSide, entry.enemySide, state, entry.isPve
        ));
        turnEvents.push(...processDeath(state.sideA));
        turnEvents.push(...processDeath(state.sideB));
      }
    }
 
    // Usuń martwe miniony po wszystkich akcjach tury
    state.sideA.minions = state.sideA.minions.filter(m => m.hp > 0);
    state.sideB.minions = state.sideB.minions.filter(m => m.hp > 0);

    // Tick statusów
    for (const entity of [
      ...state.sideA.fighters, ...state.sideB.fighters,
      ...state.sideA.minions,  ...state.sideB.minions,
    ]) {
      tickDownStatuses(entity, turnEvents);
    }

    // Globalne statusy
    const expiredGlobal = state.globalStatuses.filter(
      s => s.turnsLeft !== null && (s.turnsLeft -= 1, s.turnsLeft <= 0)
    );
    for (const s of expiredGlobal) {
      state.globalStatuses = state.globalStatuses.filter(g => g !== s);
      const endInfo = (s as any)._endInfo ?? s.effectDef.endInfo ?? null;
      turnEvents.push({ type: "status_expired", attacker: "System", target: "Wszyscy",
        statusName: s.effectDef.type, damage: 0, targetHpAfter: 0,
        description: endInfo
          ? renderTemplate(endInfo, { source: s.sourceName })
          : `Efekt "${s.sourceName}" wygasł.` });
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

  const aAlive = state.sideA.fighters.length > 0;
  const bAlive = state.sideB.fighters.length > 0;

  let winnerId: number | null;
  let summary: string;

if (endedByLimit) {
  winnerId = null;
  const isPveBattle = !fightersB.some(f => f.isPlayer);
  summary = isPveBattle
    ? `Dziwna ta magia.. Niby taka potężna, a jednak nie mogłeś z jej pomocą pokonać swojego przeciwnika. Ale nie kłopocz się, na pewno następnym razem wrócisz silniejszy!`
    : `Wyczerpani bojem, postanowiliście zgodnie zaprzestać walki — dokończycie ją kiedy indziej.`;
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
        const inA = [...state.sideA.fighters, ...state.sideA.deadFighters].some(f => f.name === attackerName);
        if (inA && !metadata.sideAMinionNames.includes(event.minionName))
          metadata.sideAMinionNames.push(event.minionName);
        else if (!metadata.sideBMinionNames.includes(event.minionName))
          metadata.sideBMinionNames.push(event.minionName);
      }
    }
  }

  for (const turnLog of log) {
    turnLog.events = turnLog.events.filter(e => !e.description.includes("[INTERNAL:"));
  }

  return { winnerId, log, summary, metadata, minionTargetTypeMap };
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

  const [battlesToday, tournamentsToday, pairBattleToday, pairTournamentToday] = await Promise.all([
    prisma.battle.count({ where: { attackerId: attackerChar.id, foughtAt: { gte: today } } }),
    prisma.magicTournament.count({ where: { challengerId: attackerChar.id, foughtAt: { gte: today } } }),
    prisma.battle.count({ where: { attackerId: attackerChar.id, defenderId: defenderChar.id, foughtAt: { gte: today } } }),
    prisma.magicTournament.count({ where: { challengerId: attackerChar.id, defenderId: defenderChar.id, foughtAt: { gte: today } } }),
  ]);

  if (battlesToday + tournamentsToday >= DAILY_BATTLE_LIMIT)
    throw new Error(`Dzienny limit starć (pojedynki + turnieje) wynosi ${DAILY_BATTLE_LIMIT}. Wróć jutro!`);
  if (pairBattleToday + pairTournamentToday > 0)
    throw new Error(`Już wyzwałeś dziś tego przeciwnika. Spróbuj innego gracza lub wróć jutro!`);

  const [attackerFighter, defenderFighter] = await Promise.all([
    buildFighter(attackerChar.id),
    buildFighter(defenderChar.id),
  ]);

  const attackerInitialShards = attackerFighter.powerShards;
  const defenderInitialShards = defenderFighter.powerShards;

  const result = simulateBattle([attackerFighter], [defenderFighter]);

  const attackerShardsSpent = attackerInitialShards - attackerFighter.powerShards;
  const defenderShardsSpent = defenderInitialShards - defenderFighter.powerShards;
  const attackerWon = result.winnerId === attackerChar.id;
  const defenderWon = result.winnerId === defenderChar.id;

  const prestigeDiff = attackerChar.prestige - defenderChar.prestige;
  let prestigeGain = 4;
  if (prestigeDiff >  100) prestigeGain = 2;
  if (prestigeDiff < -100) prestigeGain = 6;

  const winnerId = result.winnerId ?? attackerChar.id;

  let duelExperience: {
    winnerId: number; xpEarned: number; level: number;
    levelsGained: number; skillPointsGained: number;
  } | null = null;

  if (result.winnerId !== null) {
    const winnerFighter = result.winnerId === attackerFighter.id ? attackerFighter : defenderFighter;
    const loserFighter  = result.winnerId === attackerFighter.id ? defenderFighter : attackerFighter;
    const duelXp = calculateDuelExperience(winnerFighter.level, loserFighter.level);
    const levelResult = await addExperience(result.winnerId, duelXp);
    duelExperience = { winnerId: result.winnerId, xpEarned: duelXp, ...levelResult };
  }

  function buildParticipants() {
    return [
      ...result.metadata.sideAFighterIds.map((id, i) => ({
        id, name: result.metadata.sideAFighterNames[i], side: "sideA" as const, type: "fighter" as const,
      })),
      ...result.metadata.sideBFighterIds.map((id, i) => ({
        id, name: result.metadata.sideBFighterNames[i], side: "sideB" as const, type: "fighter" as const,
      })),
      ...result.metadata.sideAMinionNames.map(name => ({
        id: -1, name, side: "sideA" as const, type: "minion" as const,
        targetType: result.minionTargetTypeMap?.get(name) ?? "randomEnemy",
      })),
      ...result.metadata.sideBMinionNames.map(name => ({
        id: -1, name, side: "sideB" as const, type: "minion" as const,
        targetType: result.minionTargetTypeMap?.get(name) ?? "randomEnemy",
      })),
    ];
  }

  const fullMetadata = {
    ...result.metadata,
    attackerUserId,
    attackerId:    attackerChar.id,
    attackerName:  attackerChar.name,
    defenderId:    defenderChar.id,
    defenderName:  defenderChar.name,
    duelExperience,
    draw:          result.winnerId === null,
    allParticipants: buildParticipants(),
    shardsSpent: { attacker: attackerShardsSpent, defender: defenderShardsSpent },
  };

  const isDraw = result.winnerId === null;

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

  await Promise.all([
    prisma.character.update({
      where: { id: attackerChar.id },
      data: {
        ...(attackerShardsSpent > 0 ? { powerShards: { decrement: attackerShardsSpent } } : {}),
        ...(isDraw ? { battleDraws: { increment: 1 } }
          : attackerWon ? { battleWins: { increment: 1 } }
          : { battleLosses: { increment: 1 } }),
      },
    }),
    prisma.character.update({
      where: { id: defenderChar.id },
      data: {
        ...(defenderShardsSpent > 0 ? { powerShards: { decrement: defenderShardsSpent } } : {}),
        ...(isDraw ? { battleDraws: { increment: 1 } }
          : defenderWon ? { battleWins: { increment: 1 } }
          : { battleLosses: { increment: 1 } }),
      },
    }),
  ]);

  return {
    battleId:     battle.id,
    attackerWon,
    draw:         isDraw,
    summary:      result.summary,
    prestigeGain: attackerWon ? prestigeGain : 0,
    duelExperience,
    log:          result.log,
    turns:        result.log.length,
    metadata:     { ...fullMetadata, allParticipants: buildParticipants(),
                    shardsSpent: { attacker: attackerShardsSpent, defender: defenderShardsSpent } },
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
    try { metadata = JSON.parse(b.metadata ?? "{}"); } catch { metadata = {}; }
    const isDraw = metadata.draw === true;
    return {
      id:            b.id,
      attacker:      b.attacker.name,
      defender:      b.defender.name,
      winner:        isDraw ? null : b.winner?.name,
      summary:       b.summary,
      prestigeGain:  b.prestigeGain,
      foughtAt:      b.foughtAt,
      youWon:        !isDraw && b.winnerId === character.id,
      isDraw,
      myCharacterId: character.id,
      log:           JSON.parse(b.log),
      metadata,
    };
  });
}