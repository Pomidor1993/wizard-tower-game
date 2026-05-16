import prisma from "../lib/prisma.js";

const MAX_TURNS = 20; // zabezpieczenie przed nieskończoną pętlą
const DAILY_BATTLE_LIMIT = 5;

// ── TYPY ─────────────────────────────────────────────
interface Fighter {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  castSpeed: number;
  power: number;
  fireElement: number;
  waterElement: number;
  earthElement: number;
  airElement: number;
  chaos: number;
  spells: { name: string; damage: number; element: string }[];
}

interface TurnLog {
  turn: number;
  attacker: string;
  spell: string;
  damage: number;
  targetHpAfter: number;
}

// ── HELPERS ──────────────────────────────────────────
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Oblicz bonus żywiołu do obrażeń
function elementBonus(spell: { element: string }, fighter: Fighter): number {
  const bonuses: Record<string, number> = {
    fire:  fighter.fireElement,
    water: fighter.waterElement,
    earth: fighter.earthElement,
    air:   fighter.airElement,
    chaos: fighter.chaos,
  };
  return bonuses[spell.element] ?? 0;
}

// Oblicz obrażenia czaru z bonusami
function calculateDamage(
  spell: { damage: number; element: string },
  attacker: Fighter
): number {
  const base = spell.damage;
  const elemBonus = Math.floor(elementBonus(spell, attacker) * 0.5);
  const powerBonus = Math.floor(attacker.power * 0.3);
  return base + elemBonus + powerBonus;
}

// Wybierz losowy czar z puli
function pickSpell(fighter: Fighter): { name: string; damage: number; element: string } {
  if (fighter.spells.length === 0) {
    return { name: "Uderzenie pięścią", damage: 1, element: "none" };
  }
  return fighter.spells[randomInt(0, fighter.spells.length - 1)]!;
}

// Zbuduj obiekt Fighter z danych bazy
async function buildFighter(characterId: number): Promise<Fighter> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      spellSlots: { include: { spell: true } },
      equipment: true,
    },
  });

  if (!character) throw new Error(`Postać ${characterId} nie znaleziona`);

  // Zbierz bonusy z ekwipunku
  let bonusEndurance = 0;
  let bonusCastSpeed = 0;
  let bonusPower = 0;

  if (character.equipment) {
    const eq = character.equipment;
    const itemIds = [
      eq.robeId, eq.bootsId, eq.hatId,
      eq.amuletId, eq.mainHandId, eq.offHandId,
    ].filter(Boolean) as number[];

    if (itemIds.length > 0) {
      const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
      for (const item of items) {
        bonusEndurance += item.bonusEndurance;
        bonusCastSpeed += item.bonusCastSpeed;
        bonusPower     += item.bonusPower;
      }
    }
  }

  const maxHp = character.endurance + bonusEndurance;

  return {
    id: character.id,
    name: character.name,
    hp: maxHp,
    maxHp,
    castSpeed:    character.castSpeed + bonusCastSpeed,
    power:        character.power + bonusPower,
    fireElement:  character.fireElement,
    waterElement: character.waterElement,
    earthElement: character.earthElement,
    airElement:   character.airElement,
    chaos:        character.chaos,
    spells: character.spellSlots.map(ss => ({
      name:    ss.spell.name,
      damage:  ss.spell.damage,
      element: ss.spell.element,
    })),
  };
}

// ── SILNIK WALKI ─────────────────────────────────────
function simulateBattle(attackerFighter: Fighter, defenderFighter: Fighter): {
  winnerId: number;
  log: TurnLog[];
  summary: string;
} {
  const log: TurnLog[] = [];
  let turn = 0;

  // Kopia HP żeby nie mutować oryginału
  let hpA = attackerFighter.hp;
  let hpD = defenderFighter.hp;

  // Zabezpieczenie — jeśli obaj mają 0 HP (brak ekwipunku), wygrywa losowy
  if (hpA <= 0 && hpD <= 0) {
    return {
      winnerId: Math.random() < 0.5 ? attackerFighter.id : defenderFighter.id,
      log: [{ turn: 0, attacker: "Los", spell: "—", damage: 0, targetHpAfter: 0 }],
      summary: "Obaj magowie byli zbyt słabi — los wyłonił zwycięzcę.",
    };
  }
  if (hpA <= 0) return { winnerId: defenderFighter.id, log, summary: "Atakujący nie miał dość wytrzymałości." };
  if (hpD <= 0) return { winnerId: attackerFighter.id, log, summary: "Obrońca nie miał dość wytrzymałości." };

  while (hpA > 0 && hpD > 0 && turn < MAX_TURNS) {
    turn++;

    // Ustal kolejność w turze na podstawie Cast Speed
    let firstFighter: Fighter;
    let secondFighter: Fighter;
    let firstHp: number;
    let secondHp: number;

    const aSpeed = attackerFighter.castSpeed + Math.random() * 2;
    const dSpeed = defenderFighter.castSpeed + Math.random() * 2;

    if (aSpeed >= dSpeed) {
      firstFighter = attackerFighter;  firstHp = hpA;
      secondFighter = defenderFighter; secondHp = hpD;
    } else {
      firstFighter = defenderFighter;  firstHp = hpD;
      secondFighter = attackerFighter; secondHp = hpA;
    }

    // Pierwszy atak
    const spell1 = pickSpell(firstFighter);
    const dmg1 = calculateDamage(spell1, firstFighter);

    if (firstFighter.id === attackerFighter.id) {
      hpD = Math.max(0, hpD - dmg1);
      log.push({ turn, attacker: firstFighter.name, spell: spell1.name, damage: dmg1, targetHpAfter: hpD });
    } else {
      hpA = Math.max(0, hpA - dmg1);
      log.push({ turn, attacker: firstFighter.name, spell: spell1.name, damage: dmg1, targetHpAfter: hpA });
    }

    // Sprawdź czy ktoś już poległ po pierwszym ataku
    if (hpA <= 0 || hpD <= 0) break;

    // Drugi atak
    const spell2 = pickSpell(secondFighter);
    const dmg2 = calculateDamage(spell2, secondFighter);

    if (secondFighter.id === attackerFighter.id) {
      hpD = Math.max(0, hpD - dmg2);
      log.push({ turn, attacker: secondFighter.name, spell: spell2.name, damage: dmg2, targetHpAfter: hpD });
    } else {
      hpA = Math.max(0, hpA - dmg2);
      log.push({ turn, attacker: secondFighter.name, spell: spell2.name, damage: dmg2, targetHpAfter: hpA });
    }
  }

  // Wyłonienie zwycięzcy
  let winnerId: number;
  let summary: string;

  if (hpA > hpD) {
    winnerId = attackerFighter.id;
    summary = `${attackerFighter.name} wygrywa z ${hpA} HP pozostałego!`;
  } else if (hpD > hpA) {
    winnerId = defenderFighter.id;
    summary = `${defenderFighter.name} wygrywa z ${hpD} HP pozostałego!`;
  } else {
    // Remis — wygrywa atakujący (inicjatywa)
    winnerId = attackerFighter.id;
    summary = `Remis! ${attackerFighter.name} wygrywa z tytułu inicjatywy.`;
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

  // Sprawdź dzienny limit walk
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayBattles = await prisma.battle.count({
    where: {
      attackerId: attackerCharacter.id,
      foughtAt: { gte: today },
    },
  });

  if (todayBattles >= DAILY_BATTLE_LIMIT) {
    throw new Error(`Dzienny limit walk wynosi ${DAILY_BATTLE_LIMIT}. Wróć jutro!`);
  }

  // Zbuduj fighterów i symuluj walkę
  const attackerFighter = await buildFighter(attackerCharacter.id);
  const defenderFighter = await buildFighter(defenderCharacter.id);
  const result = simulateBattle(attackerFighter, defenderFighter);

  const attackerWon = result.winnerId === attackerCharacter.id;

  // Oblicz prestiż
  const prestigeDiff = attackerCharacter.prestige - defenderCharacter.prestige;
  let prestigeGain = 4; // równy przeciwnik
  if (prestigeDiff > 100) prestigeGain = 2;  // słabszy
  if (prestigeDiff < -100) prestigeGain = 6; // silniejszy

  // Zapisz wynik w bazie
  const battle = await prisma.battle.create({
    data: {
      attackerId:   attackerCharacter.id,
      defenderId:   defenderCharacter.id,
      winnerId:     result.winnerId,
      log:          JSON.stringify(result.log),
      summary:      result.summary,
      prestigeGain: attackerWon ? prestigeGain : 0,
    },
  });

  // Zaktualizuj prestiż zwycięzcy
  if (attackerWon) {
    await prisma.character.update({
      where: { id: attackerCharacter.id },
      data: { prestige: { increment: prestigeGain } },
    });
  } else {
    await prisma.character.update({
      where: { id: defenderCharacter.id },
      data: { prestige: { increment: prestigeGain } },
    });
  }

  return {
    battleId: battle.id,
    attackerWon,
    summary: result.summary,
    prestigeGain: attackerWon ? prestigeGain : 0,
    log: result.log,
  };
}

// ── HISTORIA WALK ────────────────────────────────────
export async function getBattleHistory(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const battles = await prisma.battle.findMany({
    where: {
      OR: [
        { attackerId: character.id },
        { defenderId: character.id },
      ],
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
    id:          b.id,
    attacker:    b.attacker.name,
    defender:    b.defender.name,
    winner:      b.winner.name,
    summary:     b.summary,
    prestigeGain: b.prestigeGain,
    foughtAt:    b.foughtAt,
    youWon:      b.winnerId === character.id,
  }));
}