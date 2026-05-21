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
} from "../types/status-types.js";

const DAILY_BATTLE_LIMIT = 5;

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 1 — PULE CZARÓW
// ═══════════════════════════════════════════════════════════════════════════════

type SpellPool = "chaotic" | "controlled" | "incantation" | "professional" | "master";

function getPoolWeights(towerLevel: number): Record<SpellPool, number> {
  if (towerLevel < 10)  return { chaotic: 100, controlled: 0,  incantation: 0,  professional: 0,  master: 0  };
  if (towerLevel <= 25) return { chaotic: 75,  controlled: 25, incantation: 0,  professional: 0,  master: 0  };
  if (towerLevel <= 50) return { chaotic: 40,  controlled: 40, incantation: 20, professional: 0,  master: 0  };
  if (towerLevel <= 75) return { chaotic: 20,  controlled: 30, incantation: 30, professional: 20, master: 0  };
  if (towerLevel <= 99) return { chaotic: 10,  controlled: 15, incantation: 30, professional: 25, master: 20 };
  return                       { chaotic: 0,   controlled: 5,  incantation: 10, professional: 35, master: 50 };
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

type MinionTargetType = "randomEnemy" | "randomAlly" | "allEnemies" | "allAllies" | "all" | "randomAny";

interface BattleSpell {
  id: number;
  name: string;
  damage: number;
  element: string;
  spellPool: SpellPool;
  isDirectional: boolean;
  statusEffectDefs: StatusEffectDef[];
  castEffectDefs: CastEffectDef[];       // ← NOWE: jednorazowe przy rzuceniu
  special: string | null;
  reqFireMagic:   number;
  reqWaterMagic:  number;
  reqEarthMagic:  number;
  reqAirMagic:    number;
  reqChaosMagic:  number;
  reqLifeMagic:   number;
  reqDeathMagic:  number;
  reqEnergyMagic: number;
  summonCount:      number;
  summonHp:         number;
  summonDamage:     number;
  summonElement:    string | null;
  summonInitiative: number;
  summonTargetType: MinionTargetType | null;
}

interface Minion {
  id: string;
  name: string;
  owner: "sideA" | "sideB";             // ← zmienione z attacker/defender na sideA/sideB
  hp: number;
  maxHp: number;
  damage: number;
  element: string;
  initiative: number;
  targetType: MinionTargetType;
  appliedStatuses: AppliedStatus[];
}

interface Fighter {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  resistance: number;
  initiative: number;
  power: number;
  fireMagic:   number;
  waterMagic:  number;
  earthMagic:  number;
  airMagic:    number;
  chaosMagic:  number;
  energyMagic: number;
  lifeMagic:   number;
  deathMagic:  number;
  towerLevel:  number;
  activeSpells: BattleSpell[];
  spellPool:    BattleSpell[];
  minions:      Minion[];
  appliedStatuses: AppliedStatus[];
  stunTurnsLeft:   number;
}

// ── MULTI-READY: BattleSide ──────────────────────────────────────────────────
interface BattleSide {
  fighters:     Fighter[];   // żywi gracze/postacie po tej stronie
  deadFighters: Fighter[];   // martwi — dostępni do wskrzeszenia
  minions:      Minion[];    // wszystkie żywe miniony tej strony
}

interface BattleState {
  sideA: BattleSide;
  sideB: BattleSide;
  globalStatuses: AppliedStatus[];
}

function makeSide(fighters: Fighter[]): BattleSide {
  return { fighters, deadFighters: [], minions: [] };
}

// ── Pomocniki do stron ───────────────────────────────────────────────────────

// Zwraca stronę do której należy fighter
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

// Czy walka skończona
function isBattleOver(state: BattleState): boolean {
  return state.sideA.fighters.length === 0 || state.sideB.fighters.length === 0;
}

// Wszyscy żywi uczestnicy (fighterzy + miniony) po obu stronach
function allLivingFighters(state: BattleState): Fighter[] {
  return [...state.sideA.fighters, ...state.sideB.fighters];
}

// ── TurnLog ──────────────────────────────────────────────────────────────────
interface TurnEvent {
  type:
    | "spell" | "dot_tick" | "heal_tick" | "fists"
    | "status_applied" | "status_expired"
    | "minion_summoned" | "minion_attack" | "minion_death"
    | "stun" | "miss" | "ice_slip"
    | "sacrifice" | "dominate" | "resurrect"; // ← NOWE typy eventów
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
};

function canUseSpell(spell: BattleSpell, fighter: Fighter): boolean {
  return (
    fighter.fireMagic   >= spell.reqFireMagic   &&
    fighter.waterMagic  >= spell.reqWaterMagic  &&
    fighter.earthMagic  >= spell.reqEarthMagic  &&
    fighter.airMagic    >= spell.reqAirMagic    &&
    fighter.chaosMagic  >= spell.reqChaosMagic  &&
    fighter.lifeMagic   >= spell.reqLifeMagic   &&
    fighter.deathMagic  >= spell.reqDeathMagic  &&
    fighter.energyMagic >= spell.reqEnergyMagic
  );
}

// Czy czar ma castEffect wymagający martwych sojuszników
function requiresDeadAlly(spell: BattleSpell): boolean {
  return spell.castEffectDefs.some(e => e.target === "randomDeadAlly");
}

// Czy czar ma castEffect typu dominate i wymaga przejęcia miniona przeciwnika
function requiresEnemyMinion(spell: BattleSpell): boolean {
  return spell.castEffectDefs.some(e => e.type === "dominate");
}

function elementBonus(element: string, fighter: Fighter): number {
  const map: Record<string, number> = {
    fire:   fighter.fireMagic,
    water:  fighter.waterMagic,
    earth:  fighter.earthMagic,
    air:    fighter.airMagic,
    chaos:  fighter.chaosMagic,
    energy: fighter.energyMagic,
    life:   fighter.lifeMagic,
    death:  fighter.deathMagic,
  };
  return map[element] ?? 0;
}

function pickRandomSpell(
  fighter: Fighter,
  usedSpellIds: Set<number>,
  ownSide: BattleSide,
  enemySide: BattleSide
): BattleSpell | null {
  const pool = pickPool(fighter.towerLevel);

  const isAvailable = (s: BattleSpell): boolean => {
    if (usedSpellIds.has(s.id)) return false;
    if (!canUseSpell(s, fighter)) return false;
    // Czar wskrzeszenia dostępny tylko gdy ktoś po naszej stronie jest martwy
    if (requiresDeadAlly(s) && ownSide.deadFighters.length === 0) return false;
    // Czar dominacji dostępny tylko gdy przeciwnik ma miniony
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

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 4 — ZARZĄDZANIE STATUSAMI (bez zmian logiki, zmienione sygnatury)
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
      // W multi: losowy żywy przeciwnik (fighter)
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

function applyStatusToTarget(
  target: Fighter | Minion,
  def: StatusEffectDef,
  sourceName: string
): TurnEvent[] {
  const events: TurnEvent[] = [];
  target.appliedStatuses.push({
    effectDef: def,
    sourceName,
    turnsLeft: def.duration,
    stunTurnsLeft: def.type === "stun" ? 0 : undefined,
  });
  events.push({
    type: "status_applied",
    attacker: sourceName,
    target: target.name,
    statusName: def.type,
    damage: 0,
    targetHpAfter: target.hp,
    description: describeStatusApplied(def, target.name, sourceName),
  });
  return events;
}

function describeStatusApplied(def: StatusEffectDef, targetName: string, sourceName: string): string {
  switch (def.type) {
    case "dot":           return `${targetName} otrzymuje DOT: ${def.damage} pkt ${def.element}/turę (${sourceName}).`;
    case "resist":        return `${targetName} zyskuje ${def.value}% odporności na ${def.element} — ${descDuration(def.duration)}.`;
    case "vulnerable":    return `${targetName} jest ${def.value}% podatny na ${def.element} — ${descDuration(def.duration)}.`;
    case "miss_chance":   return `${targetName} traci celność — ${def.missChance}% szansy na chybienie (${sourceName}).`;
    case "damage_on_move":return `Pole walki: każde działanie ma ${def.moveChance}% szansy na ${def.moveDamage} pkt obrażeń (${sourceName}).`;
    case "stun":          return `${targetName} może zostać ogłuszony przez ${sourceName} (${def.stunChance}% / ${def.stunDuration} tur).`;
    case "invisibility":  return `${targetName} zyskuje ${def.invisChance}% niewidzialności (${sourceName}).`;
    case "heal_chance":   return `${targetName} jest otoczony uzdrawiającą energią — ${def.healChance}% szansy na +${def.healAmount} HP/turę.`;
    default:              return `${targetName} otrzymuje status z czaru ${sourceName}.`;
  }
}

function descDuration(duration: number | null): string {
  return duration === null ? "do końca walki" : `${duration} tur`;
}

function applySpellStatuses(
  spell: BattleSpell,
  caster: Fighter,
  ownSide: BattleSide,
  enemySide: BattleSide
): TurnEvent[] {
  const events: TurnEvent[] = [];
  for (const def of spell.statusEffectDefs) {
    const targets = resolveStatusTargets(def.target, def.count, caster, ownSide, enemySide);
    for (const t of targets) {
      events.push(...applyStatusToTarget(t, def, spell.name));
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
    events.push({
      type: "status_expired",
      attacker: "System",
      target: entity.name,
      statusName: status.effectDef.type,
      damage: 0,
      targetHpAfter: entity.hp,
      description: `Status "${status.effectDef.type}" (${status.sourceName}) wygasł na ${entity.name}.`,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 5 — EFEKTY STATUSÓW (ticki)
// ═══════════════════════════════════════════════════════════════════════════════

function applyDotTick(entity: Fighter | Minion, globalStatuses: AppliedStatus[]): TurnEvent[] {
  const events: TurnEvent[] = [];
  for (const status of getEffectiveStatuses(entity.appliedStatuses, globalStatuses)) {
    if (status.effectDef.type !== "dot") continue;
    const dmg = status.effectDef.damage ?? 0;
    if (dmg <= 0) continue;
    entity.hp = Math.max(0, entity.hp - dmg);
    events.push({
      type: "dot_tick",
      attacker: status.sourceName,
      target: entity.name,
      damage: dmg,
      targetHpAfter: entity.hp,
      description: `${entity.name} otrzymuje ${dmg} pkt obrażeń od ${status.effectDef.element} (${status.sourceName}).`,
    });
  }
  return events;
}

function applyHealChanceTick(entity: Fighter | Minion, globalStatuses: AppliedStatus[]): TurnEvent[] {
  const events: TurnEvent[] = [];
  for (const status of getEffectiveStatuses(entity.appliedStatuses, globalStatuses)) {
    if (status.effectDef.type !== "heal_chance") continue;
    const chance  = status.effectDef.healChance  ?? 0;
    const amount  = status.effectDef.healAmount  ?? 0;
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
      description: `${entity.name} zostaje uleczony o ${healed} HP (${status.sourceName}).`,
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
    if (def.type === "resist"     && def.element === element) total *= (1 - (def.value ?? 0) / 100);
    if (def.type === "vulnerable" && def.element === element) total *= (1 + (def.value ?? 0) / 100);
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
    const dmg    = status.effectDef.moveDamage  ?? 0;
    if (dmg <= 0 || Math.random() * 100 >= chance) continue;
    entity.hp = Math.max(0, entity.hp - dmg);
    events.push({
      type: "ice_slip",
      attacker: status.sourceName,
      target: entity.name,
      damage: dmg,
      targetHpAfter: entity.hp,
      description: `${entity.name} poślizgnął się (${status.sourceName}) i otrzymał ${dmg} pkt obrażeń.`,
    });
  }
  return events;
}

// Zwraca true jeśli fighter jest zestunowany i traci akcję
function processStunStatuses(fighter: Fighter, events: TurnEvent[]): boolean {
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
      const duration = status.effectDef.stunDuration ?? 1;
      fighter.stunTurnsLeft = duration - 1;
      events.push({
        type: "stun",
        attacker: status.sourceName,
        target: fighter.name,
        damage: 0,
        targetHpAfter: fighter.hp,
        description: `${fighter.name} zostaje ogłuszony przez ${status.sourceName} na ${duration} tur!`,
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
  return visible.length > 0 ? visible : candidates; // fallback: wszyscy widoczni
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 6 — CAST EFFECTS (jednorazowe przy rzuceniu)
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

      // ── SACRIFICE ────────────────────────────────────────────────────────
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

        // Wybierz cel leczenia — losowy żywy sojusznik
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

        // Jeśli caster zginął od poświęcenia — zostanie obsłużony w pętli
        // przez sprawdzenie hp <= 0 po powrocie z executeAttack
        break;
      }

      // ── RESURRECT ────────────────────────────────────────────────────────
      case "resurrect": {
        if (ownSide.deadFighters.length === 0) break; // guard — nie powinno się zdarzyć

        // Losuj martwego sojusznika z uwzględnieniem niewidzialności (nie dotyczy martwych — brak filtra)
        const deadPool = [...ownSide.deadFighters];
        const target = deadPool[randomInt(0, deadPool.length - 1)]!;

        const reviveHp = Math.max(1, Math.ceil(target.maxHp * (def.healPercent ?? 50) / 100));
        target.hp = reviveHp;
        target.stunTurnsLeft = 0;
        // Przenieś z deadFighters → fighters
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

      // ── DOMINATE ─────────────────────────────────────────────────────────
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
            description: `${caster.name} przejmuje kontrolę nad ${target.name}! Minion zmienia strony.`,
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

function calculateDamage(
  spell: { damage: number; element: string },
  attacker: Fighter,
  targetStatuses: AppliedStatus[],
  globalStatuses: AppliedStatus[]
): number {
  if (spell.damage === 0) return 0;
  const base       = spell.damage;
  const elemBonus  = Math.floor(elementBonus(spell.element, attacker) * 0.5);
  const powerBonus = Math.floor(attacker.power * 0.3);
  return applyElementModifiers(base + elemBonus + powerBonus, spell.element, targetStatuses, globalStatuses);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 8 — MINIONY
// ═══════════════════════════════════════════════════════════════════════════════

function createMinion(spell: BattleSpell, ownerSide: "sideA" | "sideB", index: number): Minion {
  return {
    id:       `minion_${Date.now()}_${ownerSide}_${index}_${Math.random()}`,
    name:     `${spell.name}${spell.summonCount > 1 ? ` (${index + 1})` : ""}`,
    owner:    ownerSide,
    hp:       spell.summonHp,
    maxHp:    spell.summonHp,
    damage:   spell.summonDamage,
    element:  spell.summonElement ?? "chaos",
    initiative:  spell.summonInitiative,
    targetType:  spell.summonTargetType ?? "randomEnemy",
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

    // Poślizg przed akcją minionów
    events.push(...applyDamageOnMove(minion, state.globalStatuses));
    if (minion.hp <= 0) {
      events.push(minionDeathEvent(minion));
      continue;
    }

    const targets = selectMinionTargets(minion, ownSide, enemySide, state.globalStatuses);
    for (const t of targets) {
      t.hp = Math.max(0, t.hp - minion.damage);
      events.push({
        type: "minion_attack",
        attacker: minion.name,
        target: t.name,
        minionName: minion.name,
        damage: minion.damage,
        targetHpAfter: t.hp,
        description: `${minion.name} atakuje ${t.name} — zadaje ${minion.damage} pkt obrażeń! [HP: ${t.hp}/${t.maxHp}]`,
      });
      if (t.hp <= 0 && !("towerLevel" in t)) {
        events.push(minionDeathEvent(t as Minion));
      }
    }
  }

  // Usuń martwe miniony z obu stron
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
    .replace(/\{target\}/g, target);

  // Replace static damage values in spell.special with actual calculated damage
  if (rendered && dmg > 0) {
    rendered = rendered.replace(/zadaje \d+ pkt obrażeń/g, `zadaje ${dmg} pkt obrażeń`);
  }

  if (isActive) {
    if (rendered) return `${actor} przygotował się do walki! ${rendered}`;
    if (dmg > 0)  return `${actor} przygotował się do walki! Rzuca ${spell.name} i zadaje ${dmg} pkt obrażeń ${target}.`;
    return `${actor} przygotował się do walki! ${spell.name}.`;
  }
  if (rendered) return `${actor} ${poolLabel} — ${rendered}`;
  if (dmg > 0)  return `${actor} ${poolLabel} — rzuca ${spell.name} i zadaje ${dmg} pkt obrażeń ${target}.`;
  return `${actor} ${poolLabel} — ${spell.name}.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 10 — BUDOWANIE FIGHTERA
// ═══════════════════════════════════════════════════════════════════════════════

async function buildFighter(characterId: number): Promise<Fighter> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      spellSlots: { include: { spell: true }, orderBy: { slotIndex: "asc" } },
      spells:     { include: { spell: true } },
      equipment:  true,
      tower:      { include: { buildings: true } },
    },
  });
  if (!character) throw new Error(`Postać ${characterId} nie znaleziona`);

  let bonusEndurance = 0, bonusInitiative = 0, bonusPower = 0, bonusResistance = 0;
  let bonusFireMagic = 0, bonusWaterMagic = 0, bonusEarthMagic = 0, bonusAirMagic = 0;
  let bonusChaosMagic = 0, bonusEnergyMagic = 0, bonusLifeMagic = 0, bonusDeathMagic = 0;

  if (character.equipment) {
    const itemIds = [
      character.equipment.robeId, character.equipment.bootsId,
      character.equipment.hatId,  character.equipment.amuletId,
      character.equipment.mainHandId, character.equipment.offHandId,
    ].filter(Boolean) as number[];

    if (itemIds.length > 0) {
      const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
      for (const item of items) {
        bonusEndurance   += item.bonusEndurance;
        bonusInitiative  += item.bonusInitiative;
        bonusPower       += item.bonusPower;
        bonusResistance  += item.bonusResistance;
        bonusFireMagic   += item.bonusFireMagic;
        bonusWaterMagic  += item.bonusWaterMagic;
        bonusEarthMagic  += item.bonusEarthMagic;
        bonusAirMagic    += item.bonusAirMagic;
        bonusChaosMagic  += item.bonusChaosMagic;
        bonusEnergyMagic += item.bonusEnergyMagic;
        bonusLifeMagic   += item.bonusLifeMagic;
        bonusDeathMagic  += item.bonusDeathMagic;
      }
    }
  }

  function mapSpell(s: any): BattleSpell {
    return {
      id:               s.id,
      name:             s.name,
      damage:           s.damage,
      element:          s.element,
      spellPool:        s.spellPool as SpellPool,
      isDirectional:    s.isDirectional ?? true,
      statusEffectDefs: parseStatusEffects(s.statusEffects),
      castEffectDefs:   parseCastEffects(s.castEffects),   // ← NOWE
      special:          s.special,
      reqFireMagic:     s.reqFireMagic,
      reqWaterMagic:    s.reqWaterMagic,
      reqEarthMagic:    s.reqEarthMagic,
      reqAirMagic:      s.reqAirMagic,
      reqChaosMagic:    s.reqChaosMagic,
      reqLifeMagic:     s.reqLifeMagic,
      reqDeathMagic:    s.reqDeathMagic,
      reqEnergyMagic:   s.reqEnergyMagic,
      summonCount:      s.summonCount,
      summonHp:         s.summonHp,
      summonDamage:     s.summonDamage,
      summonElement:    s.summonElement,
      summonInitiative: s.summonInitiative,
      summonTargetType: s.summonTargetType as MinionTargetType | null,
    };
  }

  const allSpells    = await prisma.spell.findMany();
  const activeSpells = character.spellSlots.map(ss => mapSpell(ss.spell));
  const activeIds    = new Set(activeSpells.map(s => s.id));
  const spellPool    = allSpells.map(mapSpell).filter(s => !activeIds.has(s.id));
  const towerLevel   = character.tower?.level ?? 1;
  // Base HP 10, plus +2 HP per 1 point of endurance (including equipment bonuses)
  const effectiveEndurance = character.endurance + bonusEndurance;
  const maxHp        = Math.max(1, 10 + effectiveEndurance * 2);

  return {
    id:           character.id,
    name:         character.name,
    hp:           maxHp,
    maxHp,
    resistance:   character.resistance  + bonusResistance,
    initiative:   character.initiative  + bonusInitiative,
    power:        character.power       + bonusPower,
    fireMagic:    character.fireMagic   + bonusFireMagic,
    waterMagic:   character.waterMagic  + bonusWaterMagic,
    earthMagic:   character.earthMagic  + bonusEarthMagic,
    airMagic:     character.airMagic    + bonusAirMagic,
    chaosMagic:   character.chaosMagic  + bonusChaosMagic,
    energyMagic:  character.energyMagic + bonusEnergyMagic,
    lifeMagic:    character.lifeMagic   + bonusLifeMagic,
    deathMagic:   character.deathMagic  + bonusDeathMagic,
    towerLevel,
    activeSpells,
    spellPool,
    minions:         [],
    appliedStatuses: [],
    stunTurnsLeft:   0,
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
  // Minions: owner -> list of minion names
  sideAMinionNames: string[];
  sideBMinionNames: string[];
  // Dla FE: jak kolorowaćparticipantów
  // Logika: Na FE sprawdź czy participant (po nazwie) należy do:
  // - SideA (green dla atakującego, red dla atakowanego)
  // - SideB (red dla atakującego, green dla atakowanego)
  // - Neutralny jeśli target="randomAny" lub "all" (żółty zawsze)
  
  // All participants with their side assignment (for coloring logic)
  allParticipants?: Array<{
    id: number;
    name: string;
    side: "sideA" | "sideB";
    type: "fighter" | "minion";
  }>;
}

function simulateBattle(
  fightersA: Fighter[],
  fightersB: Fighter[]
): { winnerId: number | null; log: TurnLog[]; summary: string; metadata: BattleMetadata } {

  const state: BattleState = {
    sideA: makeSide(fightersA),
    sideB: makeSide(fightersB),
    globalStatuses: [],
  };

  const log: TurnLog[] = [];

  // Aktywne kolejki i zużyte ID — per fighter
  const activeQueues = new Map<number, BattleSpell[]>();
  const usedIds      = new Map<number, Set<number>>();
  for (const f of [...fightersA, ...fightersB]) {
    activeQueues.set(f.id, [...f.activeSpells]);
    usedIds.set(f.id, new Set(f.activeSpells.map(s => s.id)));
  }

  // ── Wykonanie ataku jednego fightera ──────────────────────────────────────
  function executeAttack(actor: Fighter): TurnEvent[] {
    const events: TurnEvent[] = [];
    const ownSide   = getSideOf(actor, state);
    const enemySide = getEnemySide(actor, state);

    // Stun check
    if (processStunStatuses(actor, events)) return events;

    // Poślizg przed akcją
    events.push(...applyDamageOnMove(actor, state.globalStatuses));
    if (actor.hp <= 0) return events;

    // Wybierz czar
    const queue = activeQueues.get(actor.id)!;
    const used  = usedIds.get(actor.id)!;
    let spell: BattleSpell | null = null;
    let isActive = false;

    if (queue.length > 0) {
      spell    = queue.shift()!;
      isActive = true;
    } else {
      spell = pickRandomSpell(actor, used, ownSide, enemySide);
      if (spell) used.add(spell.id);
    }

    // Pięści
    if (!spell) {
      const target = filterVisible(enemySide.fighters.filter(f => f.hp > 0), state.globalStatuses);
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

    // Miss check
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

    // Wybierz cel obrażeń (losowy żywy wróg z uwzględnieniem niewidzialności)
    const aliveEnemies = filterVisible(enemySide.fighters.filter(f => f.hp > 0), state.globalStatuses);
    const primaryTarget = aliveEnemies.length > 0
      ? aliveEnemies[randomInt(0, aliveEnemies.length - 1)]!
      : null;

    // Zadaj obrażenia
    let dmg = 0;
    if (spell.damage > 0 && spell.summonCount === 0 && primaryTarget) {
      dmg = calculateDamage(spell, actor, primaryTarget.appliedStatuses, state.globalStatuses);
      primaryTarget.hp = Math.max(0, primaryTarget.hp - dmg);
    }

    events.push({
      type: "spell",
      attacker: actor.name,
      target: primaryTarget?.name ?? "—",
      spellName: spell.name,
      spellPool: poolLabel,
      source,
      damage: dmg,
      targetHpAfter: primaryTarget?.hp ?? 0,
      description: formatSpellDescription(spell, actor.name, primaryTarget?.name ?? "—", poolLabel, isActive, dmg),
    });

    // Przywołaj miniony
    if (spell.summonCount > 0) {
      const ownerSide: "sideA" | "sideB" = ownSide === state.sideA ? "sideA" : "sideB";
      for (let i = 0; i < spell.summonCount; i++) {
        const minion = createMinion(spell, ownerSide, i);
        ownSide.minions.push(minion);
        // Internal event for tracking (used for metadata, not displayed)
        events.push({
          type: "minion_summoned",
          attacker: actor.name,
          target: actor.name,
          minionName: minion.name,
          damage: 0,
          targetHpAfter: actor.hp,
          description: `[INTERNAL: ${actor.name} summoned ${minion.name}]`,
        });
      }
    }

    // Statusy z czaru (tickowane)
    for (const def of spell.statusEffectDefs) {
      // Treat "all", "allEnemies", and "allAllies" as group effects (single message, not per-target)
      if (def.target === "all" || def.target === "allEnemies" || def.target === "allAllies") {
        // Apply to targets normally but don't spam individual messages
        const targets = resolveStatusTargets(def.target, def.count, actor, ownSide, enemySide);
        for (const t of targets) {
          t.appliedStatuses.push({
            effectDef: def,
            sourceName: spell.name,
            turnsLeft: def.duration,
            stunTurnsLeft: def.type === "stun" ? 0 : undefined,
          });
        }
        // Add to global statuses if "all"
        if (def.target === "all") {
          state.globalStatuses.push({ effectDef: def, sourceName: spell.name, turnsLeft: def.duration });
        }
        // No event message needed - effect info already shown in spell description
      } else {
        events.push(...applySpellStatuses({ ...spell, statusEffectDefs: [def] }, actor, ownSide, enemySide));
      }
    }

    // Cast effects (jednorazowe)
    events.push(...executeCastEffects(spell, actor, ownSide, enemySide, state));

    return events;
  }

  // ── Przeniesienie martwych fighterów do deadFighters ──────────────────────
  function processDeath(side: BattleSide): TurnEvent[] {
    const events: TurnEvent[] = [];
    const justDied = side.fighters.filter(f => f.hp <= 0);
    for (const f of justDied) {
      side.fighters     = side.fighters.filter(x => x !== f);
      side.deadFighters.push(f);
      // Miniony martwego fightera pozostają na polu (kontynuują walkę)
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

  // ── Główna pętla ──────────────────────────────────────────────────────────
  let turn = 0;

  while (!isBattleOver(state)) {
    turn++;
    const turnEvents: TurnEvent[] = [];

    // Zbierz wszystkich żywych fighterów z obu stron
    const allFighters = allLivingFighters(state);

    // DoT + heal ticki na początku tury (wszyscy fighterzy)
    for (const f of allFighters) {
      turnEvents.push(...applyDotTick(f, state.globalStatuses));
      turnEvents.push(...applyHealChanceTick(f, state.globalStatuses));
    }

    // Przetwórz śmierci od DoT przed atakami
    turnEvents.push(...processDeath(state.sideA));
    turnEvents.push(...processDeath(state.sideB));
    if (isBattleOver(state)) break;

    // Posortuj fighterów wg inicjatywy + losowości
    const sortedFighters = [...allLivingFighters(state)].sort(
      (a, b) => (b.initiative + Math.random() * 2) - (a.initiative + Math.random() * 2)
    );

    for (const actor of sortedFighters) {
      if (actor.hp <= 0) continue;
      if (isBattleOver(state)) break;

      turnEvents.push(...executeAttack(actor));

      // Przetwórz śmierci po każdym ataku
      turnEvents.push(...processDeath(state.sideA));
      turnEvents.push(...processDeath(state.sideB));
    }

    // Ataki minionów (najpierw sideA, potem sideB)
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

    // Dekrementacja statusów na końcu tury
    for (const f of [...state.sideA.fighters, ...state.sideB.fighters,
                      ...state.sideA.minions,  ...state.sideB.minions]) {
      tickDownStatuses(f, turnEvents);
    }

    // Globalne statusy
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
        description: `Globalny efekt "${s.effectDef.type}" (${s.sourceName}) wygasł.`,
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

  // ── Wyłonienie zwycięzcy (1vs1 — jeden fighter per strona) ───────────────
  const aAlive = state.sideA.fighters.length > 0;
  const bAlive = state.sideB.fighters.length > 0;

  // Dla 1vs1 bierzemy pierwszego fightera z każdej strony
  const fighterA = fightersA[0]!;
  const fighterB = fightersB[0]!;

  let winnerId: number | null;
  let summary: string;

  if (aAlive && !bAlive) {
    winnerId = state.sideA.fighters[0]!.id;
    summary  = `${state.sideA.fighters[0]!.name} wygrywa po ${turn} turach!`;
  } else if (bAlive && !aAlive) {
    winnerId = state.sideB.fighters[0]!.id;
    summary  = `${state.sideB.fighters[0]!.name} wygrywa po ${turn} turach!`;
  } else {
    winnerId = null;
    summary  = `Remis po ${turn} turach!`;
  }

  // Filter out [INTERNAL: ...] events from all turns (used only for metadata collection)
  // MUST do this AFTER collecting minion data below
  
  const metadata: BattleMetadata = {
    sideAFighterIds: state.sideA.fighters.map(f => f.id),
    sideBFighterIds: state.sideB.fighters.map(f => f.id),
    sideAFighterNames: state.sideA.fighters.map(f => f.name),
    sideBFighterNames: state.sideB.fighters.map(f => f.name),
    // Zbierz nazwy minionów z logów BEFORE filtering
    sideAMinionNames: [],
    sideBMinionNames: [],
  };

  // Zbierz miniony z eventów "minion_summoned" — przed filtrowaniem [INTERNAL: ...]
  for (const turnLog of log) {
    for (const event of turnLog.events) {
      if (event.type === "minion_summoned" && event.minionName) {
        const attackerName = event.attacker;
        // Sprawdź do której strony należy attacker
        if (state.sideA.fighters.some(f => f.name === attackerName)) {
          if (!metadata.sideAMinionNames.includes(event.minionName)) {
            metadata.sideAMinionNames.push(event.minionName);
          }
        } else if (state.sideB.fighters.some(f => f.name === attackerName)) {
          if (!metadata.sideBMinionNames.includes(event.minionName)) {
            metadata.sideBMinionNames.push(event.minionName);
          }
        }
      }
    }
  }

  // Now filter out [INTERNAL: ...] events from all turns (after metadata collection)
  for (const turnLog of log) {
    turnLog.events = turnLog.events.filter(e => !e.description.includes("[INTERNAL:"));
  }

  return { winnerId, log, summary, metadata };
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

  // 1vs1 — każda strona ma jednego fightera
  const result = simulateBattle([attackerFighter], [defenderFighter]);

  const attackerWon = result.winnerId === attackerChar.id;
  const defenderWon = result.winnerId === defenderChar.id;

  const prestigeDiff = attackerChar.prestige - defenderChar.prestige;
  let prestigeGain = 4;
  if (prestigeDiff >  100) prestigeGain = 2;
  if (prestigeDiff < -100) prestigeGain = 6;

  const winnerId = result.winnerId ?? attackerChar.id;

  const battle = await prisma.battle.create({
    data: {
      attackerId:   attackerChar.id,
      defenderId:   defenderChar.id,
      winnerId,
      log:          JSON.stringify(result.log),
      summary:      result.summary,
      prestigeGain: attackerWon ? prestigeGain : 0,
    },
  });

  if (attackerWon) {
    await prisma.character.update({ where: { id: attackerChar.id },    data: { prestige: { increment: prestigeGain } } });
  } else if (defenderWon) {
    await prisma.character.update({ where: { id: defenderChar.id },    data: { prestige: { increment: prestigeGain } } });
  }

  return {
    battleId:     battle.id,
    attackerWon,
    draw:         result.winnerId === null,
    summary:      result.summary,
    prestigeGain: attackerWon ? prestigeGain : 0,
    log:          result.log,
    turns:        result.log.length,
    metadata: {
      ...result.metadata,
      attackerUserId: attackerUserId,
      attackerId: attackerChar.id,
      attackerName: attackerChar.name,
      defenderId: defenderChar.id,
      defenderName: defenderChar.name,
      // Add all participant IDs for future multi-player support
      allParticipants: [
        ...result.metadata.sideAFighterIds.map((id, i) => ({
          id,
          name: result.metadata.sideAFighterNames[i],
          side: "sideA",
          type: "fighter" as const,
        })),
        ...result.metadata.sideBFighterIds.map((id, i) => ({
          id,
          name: result.metadata.sideBFighterNames[i],
          side: "sideB",
          type: "fighter" as const,
        })),
        ...result.metadata.sideAMinionNames.map((name) => ({
          id: -1,
          name,
          side: "sideA",
          type: "minion" as const,
        })),
        ...result.metadata.sideBMinionNames.map((name) => ({
          id: -1,
          name,
          side: "sideB",
          type: "minion" as const,
        })),
      ],
    },
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

  return battles.map(b => ({
    id:           b.id,
    attacker:     b.attacker.name,
    defender:     b.defender.name,
    winner:       b.winner.name,
    summary:      b.summary,
    prestigeGain: b.prestigeGain,
    foughtAt:     b.foughtAt,
    youWon:       b.winnerId === character.id,
    log:          JSON.parse(b.log),
  }));
}