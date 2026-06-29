// ═══════════════════════════════════════════════════════════════════════════════
// MAGIC TOURNAMENT SERVICE
// src/services/magic-tournament.service.ts
//
// Turniej magiczny — 5 rund "szpanowania" czarami użytkowymi.
// Gracze nie atakują się — każdy rzuca czar użytkowy i otrzymuje punkty
// za jego skuteczność (1–5). Wygrywa gracz z wyższą sumą po 5 rundach.
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";
import { parseUtilityDescriptions } from "../types/utility-types.js";
import { getRiftTrophyBonuses, hasGuaranteedHit } from "./rift-trophy-bonus.service.js";

// ── Stałe ────────────────────────────────────────────────────────────────────

const ROUNDS = 5;
const DAILY_TOURNAMENT_LIMIT = 10;

// Wagi rzutu skuteczności: wynik 1–5, z rozkładem sprzyjającym środku
const EFFECTIVENESS_WEIGHTS = [15, 30, 30, 20, 5] as const; // suma = 100
const GUARANTEED_EFFECTIVENESS_WEIGHTS = [0, 20, 35, 30, 15] as const; // suma = 100


// ── Typy ─────────────────────────────────────────────────────────────────────

export interface TournamentSpell {
  id: number;
  name: string;
  rarity: string;
  element: string;
  spellPool: string;
  descriptions: Record<string, string>; // "1"–"5"
  reqElementalMagic: number;
  reqAstralMagic:    number;
  reqBloodMagic:     number;
}

export interface TournamentParticipant {
  characterId: number;
  name: string;
  intelligence: number;
  activeSpells: TournamentSpell[];
  spellPool: TournamentSpell[];
  guaranteedHit: boolean;  // C11
}

export interface TournamentRoundCast {
  spellName: string;
  spellId: number;
  effectiveness: number; // 0 (brak/nieudany rzut) lub 1–5
  description: string;
  points: number;        // = effectiveness
  wasImprovised: boolean; // true = poza aktywnymi slotami
  castFailed?: boolean;   // true = czar wybrany, ale rzut się nie powiódł
}

export interface TournamentRoundLog {
  round: number;
  challenger: TournamentRoundCast;
  defender: TournamentRoundCast;
  challengerTotalAfter: number;
  defenderTotalAfter: number;
}

export interface TournamentResult {
  tournamentId: number;
  challengerWon: boolean;
  defenderWon: boolean;
  draw: boolean;
  challengerTotal: number;
  defenderTotal: number;
  summary: string;
  prestigeGain: number;
  rounds: TournamentRoundLog[];
  metadata: TournamentMetadata;
}

interface TournamentMetadata {
  challengerId: number;
  challengerName: string;
  defenderId: number;
  defenderName: string;
  challengerTotal: number;
  defenderTotal: number;
  winnerId: number | null;
}

// ── Helper: losowanie skuteczności ───────────────────────────────────────────

function rollFromWeights(weights: readonly number[]): number {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i]!;
    if (roll < cumulative) return i + 1;
  }
  return weights.length; // fallback, gdyby suma wag nie domykała się do 100 przez zaokrąglenie
}

// Improwizacja — pełny rozkład 1–5
function rollEffectiveness(): number {
  return rollFromWeights(EFFECTIVENESS_WEIGHTS);
}

// Czar wyekwipowany (rzut pewny) — rozkład 2–5, "1" ma wagę 0
function rollGuaranteedEffectiveness(): number {
  return rollFromWeights(GUARANTEED_EFFECTIVENESS_WEIGHTS);
}

// ── Helper: szansa udanego rzucenia czaru (jak w combat.service) ─────────────

const CAST_BASE: Record<string, number> = {
  chaotic:      70,
  controlled:   50,
  incantation:  40,
  professional: 30,
  master:       20,
};
const CAST_SCALE: Record<string, number> = {
  chaotic:      1.0,
  controlled:   1.0,
  incantation:  1.5,
  professional: 1.5,
  master:       1.5,
};

function rollCastSuccess(spell: TournamentSpell, intelligence: number): boolean {
  const base  = CAST_BASE[spell.spellPool]  ?? 50;
  const scale = CAST_SCALE[spell.spellPool] ?? 1.0;
  const chance = Math.min(base + intelligence * scale, 100);
  return Math.random() * 100 < chance;
}

// ── Helper: opis skuteczności fallback ───────────────────────────────────────

const FALLBACK_DESCRIPTIONS: Record<number, (spellName: string) => string> = {
  1: (s) => `Próbujesz rzucić ${s}... wynik ledwo zauważalny.`,
  2: (s) => `${s} działa, ale bez błysku.`,
  3: (s) => `${s} — solidne wykonanie, publiczność kiwa głowami z uznaniem.`,
  4: (s) => `${s} z prawdziwym wdziękiem! Kilka osób klaszcze.`,
  5: (s) => `MISTRZOWSKIE ${s}! Arena milknie z wrażenia.`,
};

// ── Helper: wybór czaru w rundzie ─────────────────────────────────────────────

interface SpellPick {
  spell: TournamentSpell;
  wasImprovised: boolean;
  castSucceeded: boolean;
}

/**
 * Zwraca czar do użycia w danej rundzie:
 * 1. Najpierw ze slotów aktywnych (w kolejności, zawsze pewne rzucenie — jak czary aktywne w walce).
 * 2. Gdy aktywne wyczerpane — improwizacja: losowanie z CAŁEJ puli czarów utility,
 *    których wymagania statystyk gracz spełnia (niezależnie od tego, czy je zna/posiada).
 *    Rzut powodzenia liczony tak samo jak przy czarach bojowych (inteligencja + spellPool).
 * Zwraca null tylko gdy NIE MA już żadnego nieużytego czaru w całej dostępnej puli.
 */
function pickTournamentSpell(
  participant: TournamentParticipant,
  usedIds: Set<number>
): SpellPick | null {
  // 1. Aktywne sloty — pewne rzucenie, bez rzutu powodzenia
  for (const spell of participant.activeSpells) {
    if (!usedIds.has(spell.id)) {
      return { spell, wasImprovised: false, castSucceeded: true };
    }
  }

  // 2. Improwizacja — cała pula spełniająca wymagania, pomijając już użyte
  const available = participant.spellPool.filter(s => !usedIds.has(s.id));
  if (available.length === 0) return null;

  const spell = available[Math.floor(Math.random() * available.length)]!;
  const castSucceeded = participant.guaranteedHit || rollCastSuccess(spell, participant.intelligence);

  return { spell, wasImprovised: true, castSucceeded };
}

// ── Budowanie uczestnika turnieju ──────────────────────────────────────────────

async function buildParticipant(characterId: number): Promise<TournamentParticipant> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      utilitySlots: { include: { spell: true }, orderBy: { slotIndex: "asc" } },
    },
  });
  if (!character) throw new Error(`Postać ${characterId} nie znaleziona`);

  const mapSpell = (s: any): TournamentSpell => ({
    id: s.id,
    name: s.name,
    rarity: s.rarity,
    element: s.element,
    spellPool: s.spellPool,
    descriptions: parseUtilityDescriptions(s.utilityDescriptions ?? "{}"),
    reqElementalMagic: s.reqElementalMagic ?? 0,
    reqAstralMagic:    s.reqAstralMagic    ?? 0,
    reqBloodMagic:     s.reqBloodMagic     ?? 0,
  });

  const activeSpells = character.utilitySlots.map(slot => mapSpell(slot.spell));
  const activeIds = new Set(activeSpells.map(s => s.id));

  // Cała pula czarów utility w grze — posiadanie nieistotne, liczą się tylko wymagania
  const allUtilitySpells = await prisma.spell.findMany({
    where: { category: "utility" },
  });

  const meetsRequirements = (s: any): boolean =>
    character.elementalMagic >= (s.reqElementalMagic ?? 0) &&
    character.astralMagic    >= (s.reqAstralMagic    ?? 0) &&
    character.bloodMagic     >= (s.reqBloodMagic     ?? 0);

  const spellPool = allUtilitySpells
    .filter(s => !activeIds.has(s.id) && meetsRequirements(s))
    .map(mapSpell);

const trophyBonuses = await getRiftTrophyBonuses(character.id);

  return {
    characterId: character.id,
    name: character.name,
    intelligence: character.intelligence,
    activeSpells,
    spellPool,
    guaranteedHit: hasGuaranteedHit(trophyBonuses, "tournament"),  // C11
  };
}

// ── Symulacja turnieju ─────────────────────────────────────────────────────────

function simulateTournament(
  challenger: TournamentParticipant,
  defender: TournamentParticipant
): {
  rounds: TournamentRoundLog[];
  challengerTotal: number;
  defenderTotal: number;
} {
  const rounds: TournamentRoundLog[] = [];
  let challengerTotal = 0;
  let defenderTotal = 0;

  const challengerUsed = new Set<number>();
  const defenderUsed = new Set<number>();

  for (let round = 1; round <= ROUNDS; round++) {
    // Wybór czarów
    const cPick = pickTournamentSpell(challenger, challengerUsed);
    const dPick = pickTournamentSpell(defender, defenderUsed);

    const makeCast = (pick: SpellPick | null): TournamentRoundCast => {
      if (!pick) {
        return {
          spellId: -1,
          spellName: "brak czaru",
          effectiveness: 0,
          description: "Wyczerpałeś repertuar — nie znasz już żadnego czaru, którym mógłbyś się popisać.",
          points: 0,
          wasImprovised: true,
        };
      }

      if (!pick.castSucceeded) {
        return {
          spellId: pick.spell.id,
          spellName: pick.spell.name,
          effectiveness: 0,
          description: `Próbujesz rzucić ${pick.spell.name}, ale magia wymyka się spod kontroli — nic się nie dzieje.`,
          points: 0,
          wasImprovised: pick.wasImprovised,
          castFailed: true,
        };
      }

      const eff = pick.wasImprovised ? rollEffectiveness() : rollGuaranteedEffectiveness();
      const desc =
        pick.spell.descriptions[String(eff)] ??
        FALLBACK_DESCRIPTIONS[eff]?.(pick.spell.name) ??
        pick.spell.name;

      return {
        spellId: pick.spell.id,
        spellName: pick.spell.name,
        effectiveness: eff,
        description: desc,
        points: eff,
        wasImprovised: pick.wasImprovised,
      };
    };

    const cCast = makeCast(cPick);
    const dCast = makeCast(dPick);

    if (cPick) challengerUsed.add(cPick.spell.id);
    if (dPick) defenderUsed.add(dPick.spell.id);

    challengerTotal += cCast.points;
    defenderTotal   += dCast.points;

    rounds.push({
      round,
      challenger: cCast,
      defender: dCast,
      challengerTotalAfter: challengerTotal,
      defenderTotalAfter: defenderTotal,
    });
  }

  return { rounds, challengerTotal, defenderTotal };
}

// ── Publiczne API ──────────────────────────────────────────────────────────────

export async function challengeMagicTournament(
  challengerUserId: number,
  defenderCharacterId: number
): Promise<TournamentResult> {
  // Pobierz postaci
  const challengerChar = await prisma.character.findUnique({
    where: { userId: challengerUserId },
  });
  if (!challengerChar) throw new Error("Twoja postać nie istnieje");
  if (challengerChar.id === defenderCharacterId)
    throw new Error("Nie możesz wyzwać samego siebie");

  const defenderChar = await prisma.character.findUnique({
    where: { id: defenderCharacterId },
  });
  if (!defenderChar) throw new Error("Przeciwnik nie istnieje");

  // Dzienny limit
// Dzienny limit (łączny: pojedynki + turnieje) + limit per para graczy
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [battlesToday, tournamentsToday, pairBattleToday, pairTournamentToday] = await Promise.all([
    prisma.battle.count({ where: { attackerId: challengerChar.id, foughtAt: { gte: today } } }),
    prisma.magicTournament.count({ where: { challengerId: challengerChar.id, foughtAt: { gte: today } } }),
    prisma.battle.count({ where: { attackerId: challengerChar.id, defenderId: defenderChar.id, foughtAt: { gte: today } } }),
    prisma.magicTournament.count({ where: { challengerId: challengerChar.id, defenderId: defenderChar.id, foughtAt: { gte: today } } }),
  ]);

  const totalActionsToday = battlesToday + tournamentsToday;
  if (totalActionsToday >= DAILY_TOURNAMENT_LIMIT) {
    throw new Error(`Dzienny limit starć (pojedynki + turnieje) wynosi ${DAILY_TOURNAMENT_LIMIT}. Wróć jutro!`);
  }
  if (pairBattleToday + pairTournamentToday > 0) {
    throw new Error(`Już wyzwałeś dziś tego przeciwnika. Spróbuj innego gracza lub wróć jutro!`);
  }

  // Zbuduj uczestników
  const challenger = await buildParticipant(challengerChar.id);
  const defender   = await buildParticipant(defenderChar.id);

  // Symulacja
  const { rounds, challengerTotal, defenderTotal } = simulateTournament(
    challenger,
    defender
  );

  // Wynik
  const challengerWon = challengerTotal > defenderTotal;
  const defenderWon   = defenderTotal   > challengerTotal;
  const draw          = challengerTotal === defenderTotal;
  const winnerId      = challengerWon
    ? challengerChar.id
    : defenderWon ? defenderChar.id : null;

  let summary: string;
  let challengerPrestige = 0;
  let defenderPrestige   = 0;

  if (draw) {
    summary = `Remis ${challengerTotal}:${defenderTotal} — oboje zasługujecie na oklaski!`;
    challengerPrestige = 2;
    defenderPrestige   = 2;
  } else if (challengerWon) {
    summary = `${challengerChar.name} wygrywa turniej ${challengerTotal}:${defenderTotal}!`;
    challengerPrestige = 4;
  } else {
    summary = `${defenderChar.name} wygrywa turniej ${defenderTotal}:${challengerTotal}!`;
    defenderPrestige = 4;
  }

  const metadata: TournamentMetadata = {
    challengerId:   challengerChar.id,
    challengerName: challengerChar.name,
    defenderId:     defenderChar.id,
    defenderName:   defenderChar.name,
    challengerTotal,
    defenderTotal,
    winnerId,
  };

  // Zapis do bazy
  const tournament = await prisma.magicTournament.create({
    data: {
      challengerId: challengerChar.id,
      defenderId:   defenderChar.id,
      winnerId,
      log:          JSON.stringify(rounds),
      summary,
      metadata:     JSON.stringify(metadata),
      prestigeGain: Math.max(challengerPrestige, defenderPrestige),
    },
  });

  // Prestiż
// Prestiż + liczniki turniejowe
  await prisma.character.update({
    where: { id: challengerChar.id },
    data: {
      ...(challengerPrestige > 0 ? { prestige: { increment: challengerPrestige } } : {}),
      ...(draw
        ? { tournamentDraws: { increment: 1 } }
        : challengerWon
          ? { tournamentWins: { increment: 1 } }
          : { tournamentLosses: { increment: 1 } }),
    },
  });

  await prisma.character.update({
    where: { id: defenderChar.id },
    data: {
      ...(defenderPrestige > 0 ? { prestige: { increment: defenderPrestige } } : {}),
      ...(draw
        ? { tournamentDraws: { increment: 1 } }
        : defenderWon
          ? { tournamentWins: { increment: 1 } }
          : { tournamentLosses: { increment: 1 } }),
    },
  });

  return {
    tournamentId: tournament.id,
    challengerWon,
    defenderWon,
    draw,
    challengerTotal,
    defenderTotal,
    summary,
    prestigeGain: challengerPrestige,
    rounds,
    metadata,
  };
}

export async function getTournamentHistory(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const tournaments = await prisma.magicTournament.findMany({
    where: {
      OR: [
        { challengerId: character.id },
        { defenderId: character.id },
      ],
    },
    orderBy: { foughtAt: "desc" },
    take: 20,
    include: {
      challenger: { select: { name: true } },
      defender:   { select: { name: true } },
      winner:     { select: { name: true } },
    },
  });

  return tournaments.map(t => {
    let metadata: any = {};
    try { metadata = JSON.parse(t.metadata ?? "{}"); } catch { /**/ }
    return {
      id:           t.id,
      challenger:   t.challenger.name,
      defender:     t.defender.name,
      winner:       t.winner?.name ?? null,
      summary:      t.summary,
      prestigeGain: t.prestigeGain,
      foughtAt:     t.foughtAt,
      youWon:       t.winnerId === character.id,
      draw:         t.winnerId === null,
      myCharacterId: character.id,
      rounds:       JSON.parse(t.log),
      metadata,
    };
  });
}