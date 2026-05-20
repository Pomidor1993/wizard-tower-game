import prisma from "../lib/prisma.js";

const DAILY_BATTLE_LIMIT = 5;

// ── PULE CZARÓW ──────────────────────────────────────
type SpellPool = "chaotic" | "controlled" | "incantation" | "professional" | "master";

// Prawdopodobieństwa pul zależnie od poziomu wieży
function getPoolWeights(towerLevel: number): Record<SpellPool, number> {
  if (towerLevel < 10)  return { chaotic: 100, controlled: 0,  incantation: 0,  professional: 0,  master: 0  };
  if (towerLevel <= 25) return { chaotic: 75,  controlled: 25, incantation: 0,  professional: 0,  master: 0  };
  if (towerLevel <= 50) return { chaotic: 40,  controlled: 40, incantation: 20, professional: 0,  master: 0  };
  if (towerLevel <= 75) return { chaotic: 20,  controlled: 30, incantation: 30, professional: 20, master: 0  };
  if (towerLevel <= 99) return { chaotic: 10,  controlled: 15, incantation: 30, professional: 25, master: 20 };
  return               { chaotic: 0,   controlled: 5,  incantation: 10, professional: 35, master: 50 };
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

// ── STATUSY ──────────────────────────────────────────
type StatusKey = "burn" | "ignite" | "soak" | "electrify" | "poison" | "chill";

interface ActiveStatus {
  key: StatusKey;
  turnsLeft: number | null; // null = do końca walki
}

interface StatusEffects {
  burn:       boolean; // poparzenie
  ignite:     boolean; // podpalenie
  soak:       boolean; // przemoczenie
  electrify:  boolean; // naelektryzowanie
  poison:     boolean; // zatrucie
  chill:      boolean; // chłód
}

function emptyStatuses(): ActiveStatus[] {
  return [];
}

function hasStatus(statuses: ActiveStatus[], key: StatusKey): boolean {
  return statuses.some(s => s.key === key);
}

function addStatus(statuses: ActiveStatus[], key: StatusKey): ActiveStatus[] {
  // Specjalna logika dla interakcji statusów
  if (key === "soak") {
    // Przemoczenie usuwa poparzenie i podpalenie
    return [
      ...statuses.filter(s => s.key !== "burn" && s.key !== "ignite"),
      { key: "soak", turnsLeft: null },
    ];
  }
  if ((key === "burn" || key === "ignite") && hasStatus(statuses, "soak")) {
    // Przemoczony jest odporny na najbliższe poparzenie/podpalenie — usuwa soaking
    return statuses.filter(s => s.key !== "soak");
  }
  // Nie dodawaj duplikatów — podpalenie zastępuje poparzenie
  if (key === "ignite") {
    return [
      ...statuses.filter(s => s.key !== "burn" && s.key !== "ignite"),
      { key: "ignite", turnsLeft: null },
    ];
  }
  if (key === "burn" && hasStatus(statuses, "ignite")) {
    return statuses; // ignoruj słabszy status jeśli jest silniejszy
  }
  if (!hasStatus(statuses, key)) {
    return [...statuses, { key, turnsLeft: null }];
  }
  return statuses;
}

// ── TYPY WALKI ────────────────────────────────────────
type MinionTargetType = "randomEnemy" | "randomAlly" | "allEnemies" | "allAllies" | "all" | "randomAny";

interface BattleSpell {
  id: number;
  name: string;
  damage: number;
  element: string;
  spellPool: SpellPool;
  statusEffect: StatusKey | null;
  reqFireMagic:   number;
  reqWaterMagic:  number;
  reqEarthMagic:  number;
  reqAirMagic:    number;
  reqChaosMagic:  number;
  reqLifeMagic:   number;
  reqDeathMagic:  number;
  reqEnergyMagic: number;
  // Summon mechanics
  specialType: string | null;
  summonCount: number;
  summonHp: number;
  summonDamage: number;
  summonElement: string | null;
  summonInitiative: number;
  summonTargetType: MinionTargetType | null;
}

interface Minion {
  id: string;
  name: string;
  owner: "attacker" | "defender";
  hp: number;
  maxHp: number;
  damage: number;
  element: string;
  initiative: number;
  targetType: MinionTargetType;
  statusEffects: ActiveStatus[];
  description: string;
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
  // Czary aktywne (w kolejności slotIndex) — zużywane raz na początku walki
  activeSpells: BattleSpell[];
  // Cała pula znanych czarów (do losowania po wyczerpaniu aktywnych)
  spellPool: BattleSpell[];
  // Przywołane miniony
  minions: Minion[];
}

interface TurnEvent {
  type: "spell" | "status_tick" | "fists" | "status_applied" | "minion_summoned" | "minion_attack" | "minion_death";
  attacker: string;
  target: string;
  spellName?: string;
  spellPool?: string;
  statusApplied?: string;
  minionName?: string;
  damage: number;
  targetHpAfter: number;
  description: string;
}

interface TurnLog {
  turn: number;
  events: TurnEvent[];
  attackerHp: number;
  defenderHp: number;
  attackerStatuses: string[];
  defenderStatuses: string[];
}

// ── HELPERS ──────────────────────────────────────────
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const POOL_LABELS: Record<SpellPool, string> = {
  chaotic:      "chaotyczne machanie rękoma",
  controlled:   "opanowane ruchy dłońmi",
  incantation:  "przemyślana inkantacja",
  professional: "profesjonalna inkantacja",
  master:       "mistrzowski czar",
};

const STATUS_LABELS: Record<StatusKey, string> = {
  burn:      "Poparzenie",
  ignite:    "Podpalenie",
  soak:      "Przemoczenie",
  electrify: "Naelektryzowanie",
  poison:    "Zatrucie",
  chill:     "Chłód",
};

// Sprawdź czy czar jest dostępny dla danego fightera (wymagania statystyk)
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

// Oblicz bonus żywiołu
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

// Oblicz finalne obrażenia z uwzględnieniem statusów
function calculateDamage(
  spell: { damage: number; element: string },
  attacker: Fighter,
  targetStatuses: ActiveStatus[]
): number {
  const base = spell.damage;
  const elemBonus = Math.floor(elementBonus(spell.element, attacker) * 0.5);
  const powerBonus = Math.floor(attacker.power * 0.3);
  let total = base + elemBonus + powerBonus;

  // Modyfikatory statusów celu
  if (spell.element === "energy" && hasStatus(targetStatuses, "soak")) {
    total = Math.floor(total * 1.5); // +50% od energii na przemoczonym
  }
  if (spell.element === "water" && hasStatus(targetStatuses, "electrify")) {
    total = Math.floor(total * 1.5); // +50% od wody na naelektryzowanym
  }
  if (spell.element === "fire" && hasStatus(targetStatuses, "chill")) {
    total = Math.floor(total * 0.5); // -50% od ognia na oziębłym
  }

  return Math.max(1, total);
}

// Losuj czar z odpowiedniej puli (bez powtórzeń)
function pickRandomSpell(
  fighter: Fighter,
  usedSpellIds: Set<number>
): BattleSpell | null {
  const pool = pickPool(fighter.towerLevel);
  const available = fighter.spellPool.filter(
    s => s.spellPool === pool && !usedSpellIds.has(s.id) && canUseSpell(s, fighter)
  );

  if (available.length === 0) {
    // Fallback: dowolny nieużyty czar z jakiejkolwiek puli
    const anyAvailable = fighter.spellPool.filter(
      s => !usedSpellIds.has(s.id) && canUseSpell(s, fighter)
    );
    if (anyAvailable.length === 0) return null;
    return anyAvailable[randomInt(0, anyAvailable.length - 1)]!;
  }

  return available[randomInt(0, available.length - 1)]!;
}

// Aplikuj tick statusów na początku tury fightera
function applyStatusTicks(
  fighterName: string,
  targetName: string,
  statuses: ActiveStatus[],
  targetHp: number
): { newHp: number; events: TurnEvent[] } {
  const events: TurnEvent[] = [];
  let hp = targetHp;

  for (const status of statuses) {
    let dmg = 0;
    let desc = "";

    if (status.key === "burn") {
      dmg = 1;
      desc = `${fighterName} otrzymuje 1 pkt obrażeń od Poparzenia.`;
    } else if (status.key === "ignite") {
      dmg = 3;
      desc = `${fighterName} otrzymuje 3 pkt obrażeń od Podpalenia!`;
    } else if (status.key === "poison") {
      dmg = 1;
      desc = `${fighterName} otrzymuje 1 pkt obrażeń od Zatrucia.`;
    }

    if (dmg > 0) {
      hp = Math.max(0, hp - dmg);
      events.push({
        type: "status_tick",
        attacker: "Status",
        target: fighterName,
        damage: dmg,
        targetHpAfter: hp,
        description: desc,
      });
    }
  }

  return { newHp: hp, events };
}

// ── BUDOWANIE FIGHTERA ────────────────────────────────
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

  // Bonusy z ekwipunku
  let bonusEndurance = 0, bonusInitiative = 0, bonusPower = 0;
  let bonusFireMagic = 0, bonusWaterMagic = 0, bonusEarthMagic = 0, bonusAirMagic = 0;
  let bonusChaosMagic = 0, bonusEnergyMagic = 0, bonusLifeMagic = 0, bonusDeathMagic = 0;
  let bonusResistance = 0;

  if (character.equipment) {
    const eq = character.equipment;
    const itemIds = [
      eq.robeId, eq.bootsId, eq.hatId,
      eq.amuletId, eq.mainHandId, eq.offHandId,
    ].filter(Boolean) as number[];

    if (itemIds.length > 0) {
      const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
      for (const item of items) {
        bonusEndurance  += item.bonusEndurance;
        bonusInitiative += item.bonusInitiative;
        bonusPower      += item.bonusPower;
        bonusResistance += item.bonusResistance;
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

  const towerLevel = character.tower?.level ?? 1;
  const maxHp = Math.max(1, character.endurance + bonusEndurance);

  // Mapa czaru z bazy na BattleSpell
  function mapSpell(s: any): BattleSpell {
    return {
      id:             s.id,
      name:           s.name,
      damage:         s.damage,
      element:        s.element,
      spellPool:      s.spellPool as SpellPool,
      statusEffect:   s.statusEffect as StatusKey | null,
      reqFireMagic:   s.reqFireMagic,
      reqWaterMagic:  s.reqWaterMagic,
      reqEarthMagic:  s.reqEarthMagic,
      reqAirMagic:    s.reqAirMagic,
      reqChaosMagic:  s.reqChaosMagic,
      reqLifeMagic:   s.reqLifeMagic,
      reqDeathMagic:  s.reqDeathMagic,
      reqEnergyMagic: s.reqEnergyMagic,
      specialType:    s.specialType,
      summonCount:    s.summonCount,
      summonHp:       s.summonHp,
      summonDamage:   s.summonDamage,
      summonElement:  s.summonElement,
      summonInitiative: s.summonInitiative,
      summonTargetType: s.summonTargetType as MinionTargetType | null,
    };
  }

  // Aktywne czary (z slotów, w kolejności)
  const activeSpells = character.spellSlots.map(ss => mapSpell(ss.spell));

  // Pełna pula znanych czarów (do losowania) — bez aktywnych
  const activeSpellIds = new Set(activeSpells.map(s => s.id));
  const spellPool = character.spells
    .map(cs => mapSpell(cs.spell))
    .filter(s => !activeSpellIds.has(s.id));

  return {
    id:           character.id,
    name:         character.name,
    hp:           maxHp,
    maxHp,
    resistance:   character.resistance + bonusResistance,
    initiative:   character.initiative + bonusInitiative,
    power:        character.power      + bonusPower,
    fireMagic:    character.fireMagic  + bonusFireMagic,
    waterMagic:   character.waterMagic + bonusWaterMagic,
    earthMagic:   character.earthMagic + bonusEarthMagic,
    airMagic:     character.airMagic   + bonusAirMagic,
    chaosMagic:   character.chaosMagic + bonusChaosMagic,
    energyMagic:  character.energyMagic + bonusEnergyMagic,
    lifeMagic:    character.lifeMagic  + bonusLifeMagic,
    deathMagic:   character.deathMagic + bonusDeathMagic,
    towerLevel,
    activeSpells,
    spellPool,
    minions: [],
  };
}

// ── TWORZENIE MINIONÓW ───────────────────────────────
function createMinion(
  spell: BattleSpell,
  casterOwner: "attacker" | "defender",
  index: number
): Minion {
  return {
    id: `minion_${Date.now()}_${casterOwner}_${index}_${Math.random()}`,
    name: `${spell.name}${spell.summonCount > 1 ? ` (${index + 1})` : ""}`,
    owner: casterOwner,
    hp: spell.summonHp,
    maxHp: spell.summonHp,
    damage: spell.summonDamage,
    element: spell.summonElement || "chaos",
    initiative: spell.summonInitiative,
    targetType: spell.summonTargetType || "randomEnemy",
    statusEffects: [],
    description: spell.specialType || `Przywołanie z ${spell.name}`,
  };
}

// Wybierz cel dla minionów na podstawie targetType
function selectMinionTargets(
  minion: Minion,
  casterFighter: Fighter,
  targetFighter: Fighter,
  casterMinions: Minion[],
  targetMinions: Minion[]
): (Fighter | Minion)[] {
  const targets: (Fighter | Minion)[] = [];

  switch (minion.targetType) {
    case "randomEnemy":
      // Losowy wróg (głównie target, ale może też jego miniony)
      const allEnemies = [targetFighter, ...targetMinions].filter(t => t.hp > 0);
      if (allEnemies.length > 0) {
        targets.push(allEnemies[randomInt(0, allEnemies.length - 1)]!);
      }
      break;

    case "randomAlly":
      // Losowy sojusznik (sam czarownik lub jego miniony)
      const allAllies = [casterFighter, ...casterMinions].filter(t => t.hp > 0);
      if (allAllies.length > 0) {
        targets.push(allAllies[randomInt(0, allAllies.length - 1)]!);
      }
      break;

    case "allEnemies":
      // Wszyscy wrogowie
      targets.push(...[targetFighter, ...targetMinions].filter(t => t.hp > 0));
      break;

    case "allAllies":
      // Wszyscy sojusznicy
      targets.push(...[casterFighter, ...casterMinions].filter(t => t.hp > 0));
      break;

    case "all":
      // Wszyscy (czarownik, jego miniony, wróg, jego miniony) — aktualnie zarezerwowane
      targets.push(...[casterFighter, targetFighter, ...casterMinions, ...targetMinions].filter(t => t.hp > 0));
      break;

    case "randomAny":
      // Losowy cel z kogokolwiek
      const anyTarget = [casterFighter, targetFighter, ...casterMinions, ...targetMinions].filter(t => t.hp > 0);
      if (anyTarget.length > 0) {
        targets.push(anyTarget[randomInt(0, anyTarget.length - 1)]!);
      }
      break;
  }

  return targets;
}

// Atak minionów w trakcie tury
function executeMinionsAttacks(
  caster: Fighter,
  casterMinions: Minion[],
  target: Fighter,
  targetMinions: Minion[],
  targetHp: number
): { newTargetHp: number; deadMinions: string[]; events: TurnEvent[] } {
  const events: TurnEvent[] = [];
  const deadMinions: string[] = [];
  let newHp = targetHp;

  for (const minion of casterMinions) {
    if (minion.hp <= 0) continue;

    const targets = selectMinionTargets(minion, caster, target, casterMinions, targetMinions);
    if (targets.length === 0) continue;

    const selectedTarget = targets[0]!;
    const dmg = minion.damage;

    // Cel może być Fighter lub Minion
    const isTargetFighter = "towerLevel" in selectedTarget;
    const targetName = isTargetFighter ? (selectedTarget as Fighter).name : (selectedTarget as Minion).name;
    const oldHp = selectedTarget.hp;
    selectedTarget.hp = Math.max(0, selectedTarget.hp - dmg);

    events.push({
      type: "minion_attack",
      attacker: minion.name,
      target: targetName,
      minionName: minion.name,
      damage: dmg,
      targetHpAfter: selectedTarget.hp,
      description: `${minion.name} atakuje ${targetName} — zadaje ${dmg} pkt obrażeń! [HP: ${selectedTarget.hp}/${selectedTarget.maxHp}]`,
    });

    // Jeśli cel był Fighter, zaktualizuj HP
    if (isTargetFighter) {
      newHp = selectedTarget.hp;
    }

    // Sprawdź czy minion spadł
    if (selectedTarget.hp <= 0) {
      deadMinions.push(minion.name);
      events.push({
        type: "minion_death",
        attacker: minion.name,
        target: targetName,
        minionName: minion.name,
        damage: 0,
        targetHpAfter: 0,
        description: `${minion.name} został unieszkodliwiony!`,
      });
    }
  }

  return { newTargetHp: newHp, deadMinions, events };
}

// ── SILNIK WALKI ─────────────────────────────────────
function simulateBattle(
  attacker: Fighter,
  defender: Fighter
): {
  winnerId: number | null; // null = remis
  log: TurnLog[];
  summary: string;
} {
  const log: TurnLog[] = [];

  // Zabezpieczenie — brak HP
  if (attacker.hp <= 0 && defender.hp <= 0) {
    return { winnerId: null, log, summary: "Obaj magowie byli zbyt słabi by walczyć. Remis!" };
  }
  if (attacker.hp <= 0) return { winnerId: defender.id, log, summary: `${attacker.name} nie miał dość wytrzymałości by walczyć.` };
  if (defender.hp <= 0) return { winnerId: attacker.id, log, summary: `${defender.name} nie miał dość wytrzymałości by walczyć.` };

  let hpA = attacker.hp;
  let hpD = defender.hp;
  let statusesA: ActiveStatus[] = emptyStatuses();
  let statusesD: ActiveStatus[] = emptyStatuses();

  // Kolejki aktywnych czarów (zużywane po 1 sztuce)
  const activeQueueA = [...attacker.activeSpells];
  const activeQueueD = [...defender.activeSpells];

  // Zbiory użytych ID czarów losowych (osobno dla każdego)
  const usedA = new Set<number>(attacker.activeSpells.map(s => s.id));
  const usedD = new Set<number>(defender.activeSpells.map(s => s.id));

  let turn = 0;

  while (hpA > 0 && hpD > 0) {
    turn++;
    const turnEvents: TurnEvent[] = [];

    // ── Ticki statusów na początku tury ─────────────
    const tickA = applyStatusTicks(attacker.name, defender.name, statusesA, hpA);
    hpA = tickA.newHp;
    turnEvents.push(...tickA.events);

    if (hpA <= 0) break;

    const tickD = applyStatusTicks(defender.name, attacker.name, statusesD, hpD);
    hpD = tickD.newHp;
    turnEvents.push(...tickD.events);

    if (hpD <= 0) break;

    // ── Ustal kolejność ataku ────────────────────────
    const aSpeed = attacker.initiative + Math.random() * 2;
    const dSpeed = defender.initiative + Math.random() * 2;
    const attackerFirst = aSpeed >= dSpeed;

    // ── Funkcja wykonania ataku ──────────────────────
    function executeAttack(
      actor: Fighter,
      actorHp: number,
      target: Fighter,
      targetHp: number,
      targetStatuses: ActiveStatus[],
      activeQueue: BattleSpell[],
      usedIds: Set<number>,
      isAttacker: boolean
    ): {
      newTargetHp: number;
      newTargetStatuses: ActiveStatus[];
      events: TurnEvent[];
      createdMinions: Minion[];
    } {
      const events: TurnEvent[] = [];
      const createdMinions: Minion[] = [];
      let spell: BattleSpell | null = null;
      let isActive = false;
      let isFists = false;

      // 1. Aktywne czary z kolejki
      if (activeQueue.length > 0) {
        spell = activeQueue.shift()!;
        isActive = true;
      } else {
        // 2. Losowy czar z puli
        spell = pickRandomSpell(actor, usedIds);
        if (spell) {
          usedIds.add(spell.id);
        }
      }

      if (!spell) {
        // 3. Brak czarów — pięści
        isFists = true;
        const dmg = 2;
        const newHp = Math.max(0, targetHp - dmg);
        events.push({
          type: "fists",
          attacker: actor.name,
          target: target.name,
          damage: dmg,
          targetHpAfter: newHp,
          description: `Zrezygnowany swoją nieskutecznością, ${actor.name} postanawia bić się na pięści — zadaje 2 pkt obrażeń ${target.name}!`,
        });
        return { newTargetHp: newHp, newTargetStatuses: targetStatuses, events, createdMinions };
      }

      const dmg = calculateDamage(spell, actor, targetStatuses);
      const newHp = Math.max(0, targetHp - dmg);

      const poolLabel = isActive ? "czar aktywny" : POOL_LABELS[spell.spellPool];
      events.push({
        type: "spell",
        attacker: actor.name,
        target: target.name,
        spellName: spell.name,
        spellPool: poolLabel,
        damage: dmg,
        targetHpAfter: newHp,
        description: `${actor.name} rzuca "${spell.name}" (${poolLabel}) — ${dmg} pkt obrażeń na ${target.name}! [HP: ${newHp}/${target.maxHp}]`,
      });

      // Aplikuj status jeśli czar go nakłada
      let newStatuses = targetStatuses;
      if (spell.statusEffect) {
        newStatuses = addStatus(targetStatuses, spell.statusEffect);
        if (newStatuses !== targetStatuses) {
          events.push({
            type: "status_applied",
            attacker: actor.name,
            target: target.name,
            statusApplied: spell.statusEffect,
            damage: 0,
            targetHpAfter: newHp,
            description: `${target.name} otrzymuje status: ${STATUS_LABELS[spell.statusEffect]}!`,
          });
        }
      }

      // Przywołaj minionu jeśli czar to ma
      if (spell.summonCount && spell.summonCount > 0) {
        const ownerType = isAttacker ? "attacker" : "defender";
        for (let i = 0; i < spell.summonCount; i++) {
          const minion = createMinion(spell, ownerType, i);
          createdMinions.push(minion);
          events.push({
            type: "minion_summoned",
            attacker: actor.name,
            target: target.name,
            minionName: minion.name,
            damage: 0,
            targetHpAfter: newHp,
            description: `${actor.name} przywołuje ${minion.name}!`,
          });
        }
      }

      return { newTargetHp: newHp, newTargetStatuses: newStatuses, events, createdMinions };
    }

    // ── Wykonaj ataki w ustalonej kolejności ─────────
    if (attackerFirst) {
      // Atakujący uderza pierwszy
      const r1 = executeAttack(attacker, hpA, defender, hpD, statusesD, activeQueueA, usedA, true);
      hpD = r1.newTargetHp;
      statusesD = r1.newTargetStatuses;
      turnEvents.push(...r1.events);
      attacker.minions.push(...r1.createdMinions);

      if (hpD > 0) {
        const r2 = executeAttack(defender, hpD, attacker, hpA, statusesA, activeQueueD, usedD, false);
        hpA = r2.newTargetHp;
        statusesA = r2.newTargetStatuses;
        turnEvents.push(...r2.events);
        defender.minions.push(...r2.createdMinions);
      }

      // Ataki minionu atakującego
      if (attacker.minions.length > 0 && hpD > 0) {
        const minionAttack = executeMinionsAttacks(attacker, attacker.minions, defender, defender.minions, hpD);
        hpD = minionAttack.newTargetHp;
        turnEvents.push(...minionAttack.events);
        attacker.minions = attacker.minions.filter(m => !minionAttack.deadMinions.includes(m.name) && m.hp > 0);
      }

      // Ataki minionu obrońcy (jeśli wciąż żyje)
      if (hpD > 0 && defender.minions.length > 0) {
        const minionAttack = executeMinionsAttacks(defender, defender.minions, attacker, attacker.minions, hpA);
        hpA = minionAttack.newTargetHp;
        turnEvents.push(...minionAttack.events);
        defender.minions = defender.minions.filter(m => !minionAttack.deadMinions.includes(m.name) && m.hp > 0);
      }
    } else {
      // Obrońca uderza pierwszy
      const r1 = executeAttack(defender, hpD, attacker, hpA, statusesA, activeQueueD, usedD, false);
      hpA = r1.newTargetHp;
      statusesA = r1.newTargetStatuses;
      turnEvents.push(...r1.events);
      defender.minions.push(...r1.createdMinions);

      if (hpA > 0) {
        const r2 = executeAttack(attacker, hpA, defender, hpD, statusesD, activeQueueA, usedA, true);
        hpD = r2.newTargetHp;
        statusesD = r2.newTargetStatuses;
        turnEvents.push(...r2.events);
        attacker.minions.push(...r2.createdMinions);
      }

      // Ataki minionu obrońcy
      if (defender.minions.length > 0 && hpA > 0) {
        const minionAttack = executeMinionsAttacks(defender, defender.minions, attacker, attacker.minions, hpA);
        hpA = minionAttack.newTargetHp;
        turnEvents.push(...minionAttack.events);
        defender.minions = defender.minions.filter(m => !minionAttack.deadMinions.includes(m.name) && m.hp > 0);
      }

      // Ataki minionu atakującego (jeśli wciąż żyje)
      if (hpA > 0 && attacker.minions.length > 0) {
        const minionAttack = executeMinionsAttacks(attacker, attacker.minions, defender, defender.minions, hpD);
        hpD = minionAttack.newTargetHp;
        turnEvents.push(...minionAttack.events);
        attacker.minions = attacker.minions.filter(m => !minionAttack.deadMinions.includes(m.name) && m.hp > 0);
      }
    }

    log.push({
      turn,
      events: turnEvents,
      attackerHp: hpA,
      defenderHp: hpD,
      attackerStatuses: statusesA.map(s => STATUS_LABELS[s.key]),
      defenderStatuses: statusesD.map(s => STATUS_LABELS[s.key]),
    });
  }

  // ── Wyłonienie zwycięzcy ─────────────────────────
  let winnerId: number | null;
  let summary: string;

  if (hpA > 0 && hpD <= 0) {
    winnerId = attacker.id;
    summary = `${attacker.name} wygrywa z ${hpA} HP! ${defender.name} poległ po ${turn} turach.`;
  } else if (hpD > 0 && hpA <= 0) {
    winnerId = defender.id;
    summary = `${defender.name} wygrywa z ${hpD} HP! ${attacker.name} poległ po ${turn} turach.`;
  } else {
    // Obaj mają 0 HP jednocześnie — remis
    winnerId = null;
    summary = `Remis! Obaj magowie padli jednocześnie po ${turn} turach.`;
  }

  return { winnerId, log, summary };
}

// ── WYZWANIE NA POJEDYNEK ────────────────────────────
export async function challengePlayer(attackerUserId: number, defenderCharacterId: number) {
  const attackerCharacter = await prisma.character.findUnique({
    where: { userId: attackerUserId },
  });

  if (!attackerCharacter) throw new Error("Twoja postać nie istnieje");
  if (attackerCharacter.id === defenderCharacterId) throw new Error("Nie możesz walczyć sam ze sobą");

  const defenderCharacter = await prisma.character.findUnique({
    where: { id: defenderCharacterId },
  });
  if (!defenderCharacter) throw new Error("Przeciwnik nie istnieje");

  // Dzienny limit walk
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayBattles = await prisma.battle.count({
    where: { attackerId: attackerCharacter.id, foughtAt: { gte: today } },
  });
  if (todayBattles >= DAILY_BATTLE_LIMIT) {
    throw new Error(`Dzienny limit walk wynosi ${DAILY_BATTLE_LIMIT}. Wróć jutro!`);
  }

  const attackerFighter = await buildFighter(attackerCharacter.id);
  const defenderFighter = await buildFighter(defenderCharacter.id);
  const result = simulateBattle(attackerFighter, defenderFighter);

  // Remis — traktujemy jako porażkę atakującego (bez prestiżu dla nikogo)
  const attackerWon = result.winnerId === attackerCharacter.id;
  const defenderWon = result.winnerId === defenderCharacter.id;

  // Prestiż
  const prestigeDiff = attackerCharacter.prestige - defenderCharacter.prestige;
  let prestigeGain = 4;
  if (prestigeDiff > 100)  prestigeGain = 2;
  if (prestigeDiff < -100) prestigeGain = 6;

  // Zapisz bitwę — w przypadku remisu winnerId = atakujący (neutralna decyzja)
  const winnerId = result.winnerId ?? attackerCharacter.id;

  const battle = await prisma.battle.create({
    data: {
      attackerId:   attackerCharacter.id,
      defenderId:   defenderCharacter.id,
      winnerId,
      log:          JSON.stringify(result.log),
      summary:      result.summary,
      prestigeGain: attackerWon ? prestigeGain : 0,
    },
  });

  // Zaktualizuj prestiż
  if (attackerWon) {
    await prisma.character.update({
      where: { id: attackerCharacter.id },
      data:  { prestige: { increment: prestigeGain } },
    });
  } else if (defenderWon) {
    await prisma.character.update({
      where: { id: defenderCharacter.id },
      data:  { prestige: { increment: prestigeGain } },
    });
  }
  // Remis — nikt nie dostaje prestiżu

  return {
    battleId:     battle.id,
    attackerWon,
    draw:         result.winnerId === null,
    summary:      result.summary,
    prestigeGain: attackerWon ? prestigeGain : 0,
    log:          result.log,
    turns:        result.log.length,
  };
}

// ── HISTORIA WALK ────────────────────────────────────
export async function getBattleHistory(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const battles = await prisma.battle.findMany({
    where: {
      OR: [{ attackerId: character.id }, { defenderId: character.id }],
    },
    orderBy: { foughtAt: "desc" },
    take: 20,
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