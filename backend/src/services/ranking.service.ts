// ═══════════════════════════════════════════════════════════════════════════════
// RANKING SERVICE
// src/services/ranking.service.ts
//
// Obsługuje 6 kategorii rankingowych:
// 1. level       — poziom postaci (remis: kto pierwszy osiągnął poziom — levelUpAt rosnąco)
// 2. prestige    — prestiż postaci
// 3. builders    — poziom wieży + suma poziomów budynków (remis)
// 4. warriors    — walki PvP: Wygrane/Przegrane/Remisy, punktacja 3/0/1
// 5. showoffs    — turnieje magiczne: Wygrane/Przegrane/Remisy, punktacja 3/0/1
// 6. collectors  — liczba zdobytych trofeów
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export type RankingCategory =
  | "level"
  | "prestige"
  | "builders"
  | "warriors"
  | "showoffs"
  | "collectors";

export interface RankingEntry {
  rank: number;
  characterId: number;
  name: string;
  level: number;
  value: number;        // główna wartość rankingowa (np. poziom, prestiż, punkty, liczba trofeów)
  secondaryValue?: number; // wartość pomocnicza pokazywana w UI (np. suma poziomów budynków, W/P/R)
  extra?: Record<string, number>; // dodatkowe dane do wyświetlenia (np. wins/losses/draws)
}

export interface RankingPage {
  category: RankingCategory;
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
  entries: RankingEntry[];
  myRank: RankingEntry | null; // pozycja postaci pytającego gracza, niezależnie od strony
}

function clampPageSize(pageSize?: number): number {
  if (!pageSize || pageSize <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

function clampPage(page?: number): number {
  if (!page || page < 1) return 1;
  return Math.floor(page);
}

// ── Wspólny helper: zamiana punktacji W/P/R na punkty (klasyka piłkarska) ─────
function footballPoints(wins: number, losses: number, draws: number): number {
  return wins * 3 + draws * 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1 — RANKING POZIOMU
// Sortowanie: level DESC, levelUpAt ASC (kto pierwszy zdobył ten poziom jest wyżej)
// ═══════════════════════════════════════════════════════════════════════════════

async function getLevelRanking(
  userCharacterId: number,
  page: number,
  pageSize: number
): Promise<RankingPage> {
  const totalEntries = await prisma.character.count();

  const rows = await prisma.character.findMany({
    orderBy: [{ level: "desc" }, { levelUpAt: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: { id: true, name: true, level: true, levelUpAt: true },
  });

  const entries: RankingEntry[] = rows.map((c, i) => ({
    rank: (page - 1) * pageSize + i + 1,
    characterId: c.id,
    name: c.name,
    level: c.level,
    value: c.level,
  }));

  const myRank = await computeMyRankGeneric(
    userCharacterId,
    () =>
      prisma.character.findUnique({
        where: { id: userCharacterId },
        select: { id: true, name: true, level: true, levelUpAt: true },
      }),
    async (me) =>
      prisma.character.count({
        where: {
          OR: [
            { level: { gt: me.level } },
            { level: me.level, levelUpAt: { lt: me.levelUpAt } },
          ],
        },
      }),
    (me) => ({ characterId: me.id, name: me.name, level: me.level, value: me.level })
  );

  return buildPage("level", page, pageSize, totalEntries, entries, myRank);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2 — RANKING PRESTIŻU
// ═══════════════════════════════════════════════════════════════════════════════

async function getPrestigeRanking(
  userCharacterId: number,
  page: number,
  pageSize: number
): Promise<RankingPage> {
  const totalEntries = await prisma.character.count();

  const rows = await prisma.character.findMany({
    orderBy: [{ prestige: "desc" }, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: { id: true, name: true, level: true, prestige: true },
  });

  const entries: RankingEntry[] = rows.map((c, i) => ({
    rank: (page - 1) * pageSize + i + 1,
    characterId: c.id,
    name: c.name,
    level: c.level,
    value: c.prestige,
  }));

  const myRank = await computeMyRankGeneric(
    userCharacterId,
    () =>
      prisma.character.findUnique({
        where: { id: userCharacterId },
        select: { id: true, name: true, level: true, prestige: true },
      }),
    async (me) =>
      prisma.character.count({
        where: {
          OR: [
            { prestige: { gt: me.prestige } },
            { prestige: me.prestige, id: { lt: me.id } },
          ],
        },
      }),
    (me) => ({ characterId: me.id, name: me.name, level: me.level, value: me.prestige })
  );

  return buildPage("prestige", page, pageSize, totalEntries, entries, myRank);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 — RANKING BUDOWNICZYCH
// poziom wieży DESC, suma poziomów budynków DESC (tie-breaker)
// Liczone w pamięci — Prisma nie umie posortować po SUM() powiązanej tabeli wprost.
// ═══════════════════════════════════════════════════════════════════════════════

interface BuilderRow {
  characterId: number;
  name: string;
  level: number;
  towerLevel: number;
  buildingLevelSum: number;
}

async function loadAllBuilders(): Promise<BuilderRow[]> {
  const towers = await prisma.tower.findMany({
    include: {
      character: { select: { id: true, name: true, level: true } },
      buildings: { select: { level: true } },
    },
  });

  const rows: BuilderRow[] = towers.map(t => ({
    characterId: t.character.id,
    name: t.character.name,
    level: t.character.level,
    towerLevel: t.level,
    buildingLevelSum: t.buildings.reduce((sum, b) => sum + b.level, 0),
  }));

  rows.sort((a, b) => {
    if (b.towerLevel !== a.towerLevel) return b.towerLevel - a.towerLevel;
    if (b.buildingLevelSum !== a.buildingLevelSum) return b.buildingLevelSum - a.buildingLevelSum;
    return a.characterId - b.characterId;
  });

  return rows;
}

async function getBuildersRanking(
  userCharacterId: number,
  page: number,
  pageSize: number
): Promise<RankingPage> {
  const allRows = await loadAllBuilders();
  const totalEntries = allRows.length;

  const start = (page - 1) * pageSize;
  const pageRows = allRows.slice(start, start + pageSize);

  const entries: RankingEntry[] = pageRows.map((r, i) => ({
    rank: start + i + 1,
    characterId: r.characterId,
    name: r.name,
    level: r.level,
    value: r.towerLevel,
    secondaryValue: r.buildingLevelSum,
  }));

  const myIndex = allRows.findIndex(r => r.characterId === userCharacterId);
  let myRank: RankingEntry | null = null;
  if (myIndex !== -1) {
    const r = allRows[myIndex]!;
    myRank = {
      rank: myIndex + 1,
      characterId: r.characterId,
      name: r.name,
      level: r.level,
      value: r.towerLevel,
      secondaryValue: r.buildingLevelSum,
    };
  }

  return buildPage("builders", page, pageSize, totalEntries, entries, myRank);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4 — RANKING WOJOWNIKÓW (PvP) — punkty piłkarskie 3/0/1
// 5 — RANKING SZPANERZY (turnieje) — punkty piłkarskie 3/0/1
// Współdzielą tę samą logikę, różnią się tylko polami na Character.
// ═══════════════════════════════════════════════════════════════════════════════

interface CompetitiveFields {
  wins: "battleWins" | "tournamentWins";
  losses: "battleLosses" | "tournamentLosses";
  draws: "battleDraws" | "tournamentDraws";
}

async function getCompetitiveRanking(
  category: "warriors" | "showoffs",
  fields: CompetitiveFields,
  userCharacterId: number,
  page: number,
  pageSize: number
): Promise<RankingPage> {
  // Punktacja piłkarska nie jest natywnym polem w bazie, więc liczymy ją w pamięci.
  // Pobieramy wszystkich graczy z niezerową aktywnością, by nie sortować tysięcy zer.
  const allRows = await prisma.character.findMany({
    select: {
      id: true,
      name: true,
      level: true,
      [fields.wins]: true,
      [fields.losses]: true,
      [fields.draws]: true,
    } as any,
  });

  const computed = allRows.map((c: any) => {
    const wins = c[fields.wins] as number;
    const losses = c[fields.losses] as number;
    const draws = c[fields.draws] as number;
    return {
      characterId: c.id as number,
      name: c.name as string,
      level: c.level as number,
      wins,
      losses,
      draws,
      points: footballPoints(wins, losses, draws),
    };
  });

  computed.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.characterId - b.characterId;
  });

  const totalEntries = computed.length;
  const start = (page - 1) * pageSize;
  const pageRows = computed.slice(start, start + pageSize);

  const entries: RankingEntry[] = pageRows.map((r, i) => ({
    rank: start + i + 1,
    characterId: r.characterId,
    name: r.name,
    level: r.level,
    value: r.points,
    extra: { wins: r.wins, losses: r.losses, draws: r.draws },
  }));

  const myIndex = computed.findIndex(r => r.characterId === userCharacterId);
  let myRank: RankingEntry | null = null;
  if (myIndex !== -1) {
    const r = computed[myIndex]!;
    myRank = {
      rank: myIndex + 1,
      characterId: r.characterId,
      name: r.name,
      level: r.level,
      value: r.points,
      extra: { wins: r.wins, losses: r.losses, draws: r.draws },
    };
  }

  return buildPage(category, page, pageSize, totalEntries, entries, myRank);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6 — RANKING ZBIERACZY (trofea) — liczba posiadanych trofeów, DESC
// ═══════════════════════════════════════════════════════════════════════════════

async function getCollectorsRanking(
  userCharacterId: number,
  page: number,
  pageSize: number
): Promise<RankingPage> {
  // Grupowanie po characterId z liczeniem trofeów — robimy to przez groupBy.
  const grouped = await prisma.characterTrophy.groupBy({
    by: ["characterId"],
    _count: { characterId: true },
  });

  const trophyCountMap = new Map<number, number>();
  for (const g of grouped) {
    trophyCountMap.set(g.characterId, g._count.characterId);
  }

  // Pobierz dane postaci tylko dla tych, którzy mają choć jedno trofeum.
  const characterIds = [...trophyCountMap.keys()];
  const characters = characterIds.length > 0
    ? await prisma.character.findMany({
        where: { id: { in: characterIds } },
        select: { id: true, name: true, level: true },
      })
    : [];

  const computed = characters.map(c => ({
    characterId: c.id,
    name: c.name,
    level: c.level,
    trophyCount: trophyCountMap.get(c.id) ?? 0,
  }));

  computed.sort((a, b) => {
    if (b.trophyCount !== a.trophyCount) return b.trophyCount - a.trophyCount;
    return a.characterId - b.characterId;
  });

  const totalEntries = computed.length;
  const start = (page - 1) * pageSize;
  const pageRows = computed.slice(start, start + pageSize);

  const entries: RankingEntry[] = pageRows.map((r, i) => ({
    rank: start + i + 1,
    characterId: r.characterId,
    name: r.name,
    level: r.level,
    value: r.trophyCount,
  }));

  const myIndex = computed.findIndex(r => r.characterId === userCharacterId);
  let myRank: RankingEntry | null = null;
  if (myIndex !== -1) {
    const r = computed[myIndex]!;
    myRank = {
      rank: myIndex + 1,
      characterId: r.characterId,
      name: r.name,
      level: r.level,
      value: r.trophyCount,
    };
  } else {
    // Gracz bez trofeów — pokaż go z wartością 0, ale bez sensownej pozycji
    // (jest "na końcu" razem ze wszystkimi innymi zerowymi, więc rangi nie podajemy precyzyjnie)
    const me = await prisma.character.findUnique({
      where: { id: userCharacterId },
      select: { id: true, name: true, level: true },
    });
    if (me) {
      myRank = {
        rank: totalEntries + 1, // przybliżenie: za wszystkimi posiadającymi trofea
        characterId: me.id,
        name: me.name,
        level: me.level,
        value: 0,
      };
    }
  }

  return buildPage("collectors", page, pageSize, totalEntries, entries, myRank);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERY WSPÓLNE
// ═══════════════════════════════════════════════════════════════════════════════

function buildPage(
  category: RankingCategory,
  page: number,
  pageSize: number,
  totalEntries: number,
  entries: RankingEntry[],
  myRank: RankingEntry | null
): RankingPage {
  return {
    category,
    page,
    pageSize,
    totalEntries,
    totalPages: Math.max(1, Math.ceil(totalEntries / pageSize)),
    entries,
    myRank,
  };
}

// Generyczny helper dla rankingów liczonych bezpośrednio w SQL (level, prestige).
// Liczy rangę gracza przez COUNT ile postaci go "wyprzedza", bez ściągania całej tabeli.
async function computeMyRankGeneric<T>(
  userCharacterId: number,
  fetchMe: () => Promise<T | null>,
  countAhead: (me: T) => Promise<number>,
  toEntry: (me: T) => Omit<RankingEntry, "rank">
): Promise<RankingEntry | null> {
  const me = await fetchMe();
  if (!me) return null;
  const ahead = await countAhead(me);
  return { rank: ahead + 1, ...toEntry(me) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLICZNE API
// ═══════════════════════════════════════════════════════════════════════════════

export async function getRanking(
  userId: number,
  category: RankingCategory,
  page?: number,
  pageSize?: number
): Promise<RankingPage> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const p = clampPage(page);
  const ps = clampPageSize(pageSize);

  switch (category) {
    case "level":
      return getLevelRanking(character.id, p, ps);
    case "prestige":
      return getPrestigeRanking(character.id, p, ps);
    case "builders":
      return getBuildersRanking(character.id, p, ps);
    case "warriors":
      return getCompetitiveRanking(
        "warriors",
        { wins: "battleWins", losses: "battleLosses", draws: "battleDraws" },
        character.id,
        p,
        ps
      );
    case "showoffs":
      return getCompetitiveRanking(
        "showoffs",
        { wins: "tournamentWins", losses: "tournamentLosses", draws: "tournamentDraws" },
        character.id,
        p,
        ps
      );
    case "collectors":
      return getCollectorsRanking(character.id, p, ps);
    default:
      throw new Error(`Nieznana kategoria rankingu: ${category}`);
  }
}