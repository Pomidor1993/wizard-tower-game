// ═══════════════════════════════════════════════════════════════════
// MAGICZNY NOTES — SERWIS
// src/services/notebook.service.ts
//
// Agreguje dane z istniejących tabel/plików, NIE duplikuje stanu.
// Każda strona notesu odblokowuje się na konkretnym poziomie budynku
// magic_notebook (TowerBuilding):
//   poziom 1 — strona główna (ogólne statystyki)
//   poziom 2 — przeciwnicy
//   poziom 3 — przedmioty
//   poziom 4 — krainy + szczeliny
//   poziom 5 — rankingi
// ═══════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";
import { ALL_ENTITIES, ENTITY_MAP, type MinorEntityDef } from "../data/minor-entities.js";
import { RIFTS } from "../data/rifts.js";
import { RIFT_WORLDS, getRiftWorldByKey } from "../data/rift-worlds.js";
import { getRanking, RankingCategory } from "./ranking.service.js";
import { tierMultiplier, scaleValue } from "./equipment.service.js"; // ← prawdziwy helper skalowania tierów (+20%/tier)

// ── HELPER — POBIERZ POZIOM MAGICZNEGO NOTESU ─────────────────────

async function getNotebookLevel(characterId: number): Promise<number> {
  const tower = await prisma.tower.findUnique({
    where: { characterId },
    include: { buildings: { where: { buildingType: "magic_notebook" } } },
  });
  return tower?.buildings[0]?.level ?? 0;
}

function requireLevel(currentLevel: number, required: number, pageLabel: string): void {
  if (currentLevel < required) {
    throw new Error(`Strona "${pageLabel}" wymaga poziomu ${required} Magicznego Notesu (masz ${currentLevel})`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// STRONA 1 — INFO OGÓLNE (poziom notesu >= 1)
// ═══════════════════════════════════════════════════════════════════

export interface NotebookOverview {
  spellsByCategory: { category: string; discovered: number; total: number }[];
  entities:     { discovered: number; total: number };
  items:        { discovered: number; total: number };
  rifts:        { discovered: number; total: number };
  worlds:       { discovered: number; total: number };
  trophies:     { discovered: number; total: number };
  battles:      { total: number; wins: number; losses: number; draws: number };
  tournaments:  { total: number; wins: number; losses: number; draws: number };
  studies:      { total: number };
  explorations: { total: number; fights: number; wins: number; losses: number; draws: number };
}

const SPELL_CATEGORIES = ["offensive", "supportive", "summoner", "utility"] as const;
const SPELL_CATEGORY_LABELS: Record<typeof SPELL_CATEGORIES[number], string> = {
  offensive:  "Ofensywne",
  supportive: "Wspierające",
  summoner:   "Summonerskie",
  utility:    "Użytkowe",
};

export async function getNotebookOverview(userId: number): Promise<NotebookOverview> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const level = await getNotebookLevel(character.id);
  requireLevel(level, 1, "Informacje ogólne");

  const characterId = character.id;

  // ── Czary — rozbite na kategorie (offensive/supportive/summoner/utility) ──
  const spellsByCategory: { category: string; discovered: number; total: number }[] = [];
  for (const cat of SPELL_CATEGORIES) {
    const [discovered, total] = await Promise.all([
      prisma.spellbookEntry.count({ where: { characterId, spell: { category: cat } } }),
      prisma.spell.count({ where: { category: cat } }),
    ]);
    spellsByCategory.push({ category: SPELL_CATEGORY_LABELS[cat], discovered, total });
  }

  // ── Przeciwnicy ────────────────────────────────────────────────
  const entityRows = await prisma.pveEncounter.findMany({
    where: { characterId },
    distinct: ["entityId"],
    select: { entityId: true },
  });
  const entitiesDiscovered = entityRows.length;
  const entitiesTotal = ALL_ENTITIES.length;

  // ── Przedmioty ─────────────────────────────────────────────────
  const itemRows = await prisma.characterItem.findMany({
    where: { characterId },
    distinct: ["itemId"],
    select: { itemId: true },
  });
  const itemsDiscovered = itemRows.length;
  const itemsTotal = await prisma.item.count();

  // ── Szczeliny ──────────────────────────────────────────────────
  const riftRows = await prisma.riftWorldHistory.findMany({
    where: { characterId },
    distinct: ["riftKey"],
    select: { riftKey: true },
  });
  const riftsDiscovered = riftRows.length;
  const riftsTotal = RIFTS.length;

  // ── Krainy ─────────────────────────────────────────────────────
  const worldRows = await prisma.riftWorldHistory.findMany({
    where: { characterId },
    distinct: ["worldKey"],
    select: { worldKey: true },
  });
  const worldsDiscovered = worldRows.length;
  const worldsTotal = RIFT_WORLDS.length;

  // ── Trofea (zwykłe + szczelinowe razem) ──────────────────────────
  const [normalTrophies, riftTrophies, normalTrophiesTotal, riftTrophiesTotal] = await Promise.all([
    prisma.characterTrophy.count({ where: { characterId } }),
    prisma.characterRiftTrophy.count({ where: { characterId } }),
    prisma.trophy.count(),
    prisma.riftTrophy.count(),
  ]);

  // ── Walki / turnieje / studia / eksploracje ──────────────────────
  const [battlesAsAttacker, battlesAsDefender] = await Promise.all([
    prisma.battle.count({ where: { attackerId: characterId } }),
    prisma.battle.count({ where: { defenderId: characterId } }),
  ]);
  const totalBattles = battlesAsAttacker + battlesAsDefender;

  const [tournamentsAsChallenger, tournamentsAsDefender] = await Promise.all([
    prisma.magicTournament.count({ where: { challengerId: characterId } }),
    prisma.magicTournament.count({ where: { defenderId: characterId } }),
  ]);
  const totalTournaments = tournamentsAsChallenger + tournamentsAsDefender;

  const studyCount = await prisma.characterAction.count({
    where: { characterId, actionType: "study" },
  });
  const explorationCount = await prisma.characterAction.count({
    where: { characterId, actionType: "exploration" },
  });

  // Walki eksploracyjne i ze studiów (nie liczymy "rift" tutaj — to osobna kategoria)
  const explorationFights = await prisma.pveEncounter.count({
    where: { characterId, source: { in: ["exploration", "study"] } },
  });
  const explorationWins = await prisma.pveEncounter.count({
    where: { characterId, source: { in: ["exploration", "study"] }, playerWon: true },
  });
  const explorationLosses = explorationFights - explorationWins;

  return {
    spellsByCategory,
    entities: { discovered: entitiesDiscovered, total: entitiesTotal },
    items:    { discovered: itemsDiscovered, total: itemsTotal },
    rifts:    { discovered: riftsDiscovered, total: riftsTotal },
    worlds:   { discovered: worldsDiscovered, total: worldsTotal },
    trophies: { discovered: normalTrophies + riftTrophies, total: normalTrophiesTotal + riftTrophiesTotal },
    battles: {
      total: totalBattles,
      wins: character.battleWins,
      losses: character.battleLosses,
      draws: character.battleDraws,
    },
    tournaments: {
      total: totalTournaments,
      wins: character.tournamentWins,
      losses: character.tournamentLosses,
      draws: character.tournamentDraws,
    },
    studies: { total: studyCount },
    explorations: {
      total: explorationCount,
      fights: explorationFights,
      wins: explorationWins,
      losses: explorationLosses,
      draws: 0, // PvE nie ma remisów w obecnym silniku
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// STRONA 2 — PRZECIWNICY (poziom notesu >= 2)
// ═══════════════════════════════════════════════════════════════════

export type EncounterSource = "exploration" | "study" | "rift";

export interface StatRange { min: number; max: number; base: number }

export interface NotebookEntityEntry {
  id: string;
  name: string;
  imageKey: string;
  description: string | null;
  hpRange: StatRange;
  initiativeRange: StatRange;
  resistanceRanges: Record<string, StatRange>; // per żywioł
  damageRange: StatRange; // obrażenia głównego (pierwszego) ataku w puli
  variancePercent: number;
  encounteredSources: EncounterSource[];
  discovered: true;
}

export interface NotebookEntitiesPage {
  discovered: NotebookEntityEntry[];
  totalDiscovered: number;
  totalAvailable: number;
}

// Buduje widełki [base*(1-v), base*(1+v)] — ten sam wzorzec losowania
// co rollEntityProfile() w pve-engine.ts, więc widełki w Notesie wiernie
// odzwierciedlają to, co faktycznie może wylosować silnik walki.
function buildStatRange(base: number, variancePercent: number, roundFn: (n: number) => number = Math.round): StatRange {
  if (variancePercent <= 0) return { min: base, max: base, base };
  const v = variancePercent / 100;
  return {
    base,
    min: roundFn(base * (1 - v)),
    max: roundFn(base * (1 + v)),
  };
}

function buildEntityNotebookEntry(
  entity: MinorEntityDef,
  encounteredSources: EncounterSource[]
): NotebookEntityEntry {
  const variance = entity.damageVariance;

  const hpRange = buildStatRange(entity.hp, variance, n => Math.max(1, Math.round(n)));
  const initiativeRange = buildStatRange(entity.initiative, variance, n => Math.max(0, Math.round(n)));

  const resistanceRanges: Record<string, StatRange> = {};
  for (const [element, value] of Object.entries(entity.resistances)) {
    if (value === undefined) continue;
    resistanceRanges[element] = buildStatRange(value, variance);
  }

  const mainAttack = entity.attacks[0];
  const damageRange = mainAttack
    ? buildStatRange(mainAttack.damage, variance, n => Math.max(0, Math.round(n)))
    : { min: 0, max: 0, base: 0 };

  return {
    id: entity.id,
    name: entity.name,
    imageKey: entity.imageKey,
    description: entity.entityType === "exploration" ? entity.reward.description : null,
    hpRange,
    initiativeRange,
    resistanceRanges,
    damageRange,
    variancePercent: variance,
    encounteredSources,
    discovered: true,
  };
}

export async function getNotebookEntities(userId: number): Promise<NotebookEntitiesPage> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const level = await getNotebookLevel(character.id);
  requireLevel(level, 2, "Przeciwnicy");

  const encounters = await prisma.pveEncounter.findMany({
    where: { characterId: character.id },
    select: { entityId: true, source: true },
  });

  // Grupuj źródła per entityId
  const sourcesByEntity = new Map<string, Set<EncounterSource>>();
  for (const enc of encounters) {
    const set = sourcesByEntity.get(enc.entityId) ?? new Set<EncounterSource>();
    set.add((enc.source ?? "exploration") as EncounterSource);
    sourcesByEntity.set(enc.entityId, set);
  }

  const discovered: NotebookEntityEntry[] = [];
  for (const [entityId, sources] of sourcesByEntity.entries()) {
    const def = ENTITY_MAP.get(entityId);
    if (!def) continue; // przeciwnik usunięty z danych gry — pomijamy
    discovered.push(buildEntityNotebookEntry(def, [...sources]));
  }

  discovered.sort((a, b) => a.name.localeCompare(b.name, "pl"));

  return {
    discovered,
    totalDiscovered: discovered.length,
    totalAvailable: ALL_ENTITIES.length,
  };
}

// ═══════════════════════════════════════════════════════════════════
// STRONA 3 — PRZEDMIOTY (poziom notesu >= 3)
// ═══════════════════════════════════════════════════════════════════

export interface NotebookItemStats {
  reqKnowledge: number; reqIntelligence: number; reqPower: number;
  reqEndurance: number; reqResistance: number; reqInitiative: number;
  reqElementalMagic: number; reqAstralMagic: number; reqBloodMagic: number;
  bonusKnowledge: number; bonusIntelligence: number; bonusPower: number;
  bonusEndurance: number; bonusResistance: number; bonusInitiative: number;
  bonusElementalMagic: number; bonusAstralMagic: number; bonusBloodMagic: number;
}

export interface NotebookItemEntry {
  id: number;
  name: string;
  category: string;       // = slot
  rarity: string;
  weaponType: string | null;
  element: string | null;
  notebookDescription: string;
  statsAtTier: NotebookItemStats; // przeliczone dla zadanego tieru (domyślnie 1)
  tierShown: number;
}

// ── Skalowanie statystyk przedmiotu wg tieru ──────────────────────
// Używa DOKŁADNIE tej samej logiki co equipment.service.ts (scaleItem):
// tierMultiplier(tier) = 1 + (tier-1)*0.2  →  +20% bazowej wartości za każdy tier.
// Importowane bezpośrednio z equipment.service.ts (tierMultiplier, scaleValue)
// żeby uniknąć rozjazdu — patrz import na górze pliku.

function buildStatsAtTier(item: any, tier: number): NotebookItemStats {
  return {
    reqKnowledge:        scaleValue(item.reqKnowledge, tier),
    reqIntelligence:     scaleValue(item.reqIntelligence, tier),
    reqPower:            scaleValue(item.reqPower, tier),
    reqEndurance:        scaleValue(item.reqEndurance, tier),
    reqResistance:       scaleValue(item.reqResistance, tier),
    reqInitiative:       scaleValue(item.reqInitiative, tier),
    reqElementalMagic:   scaleValue(item.reqElementalMagic, tier),
    reqAstralMagic:      scaleValue(item.reqAstralMagic, tier),
    reqBloodMagic:       scaleValue(item.reqBloodMagic, tier),
    bonusKnowledge:      scaleValue(item.bonusKnowledge, tier),
    bonusIntelligence:   scaleValue(item.bonusIntelligence, tier),
    bonusPower:          scaleValue(item.bonusPower, tier),
    bonusEndurance:      scaleValue(item.bonusEndurance, tier),
    bonusResistance:     scaleValue(item.bonusResistance, tier),
    bonusInitiative:     scaleValue(item.bonusInitiative, tier),
    bonusElementalMagic: scaleValue(item.bonusElementalMagic ?? 0, tier),
    bonusAstralMagic:    scaleValue(item.bonusAstralMagic ?? 0, tier),
    bonusBloodMagic:     scaleValue(item.bonusBloodMagic ?? 0, tier),
  };
}

export interface NotebookItemsPage {
  discovered: NotebookItemEntry[];
  totalDiscovered: number;
  totalAvailable: number;
}

export async function getNotebookItems(userId: number, tier: number = 1): Promise<NotebookItemsPage> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const level = await getNotebookLevel(character.id);
  requireLevel(level, 3, "Przedmioty");

  const clampedTier = Math.min(Math.max(1, Math.round(tier)), 10);

  const discoveredRows = await prisma.characterItem.findMany({
    where: { characterId: character.id },
    distinct: ["itemId"],
    include: { item: true },
  });

  const discovered: NotebookItemEntry[] = discoveredRows.map(row => ({
    id: row.item.id,
    name: row.item.name,
    category: row.item.slot,
    rarity: row.item.rarity,
    weaponType: row.item.weaponType,
    element: row.item.element,
    notebookDescription: (row.item as any).notebookDescription ?? "",
    statsAtTier: buildStatsAtTier(row.item, clampedTier),
    tierShown: clampedTier,
  }));

  discovered.sort((a, b) => a.name.localeCompare(b.name, "pl"));

  const totalAvailable = await prisma.item.count();

  return {
    discovered,
    totalDiscovered: discovered.length,
    totalAvailable,
  };
}

// ═══════════════════════════════════════════════════════════════════
// STRONA 4 — KRAINY + SZCZELINY (poziom notesu >= 4)
// ═══════════════════════════════════════════════════════════════════

export interface NotebookWorldEntry {
  key: string;
  name: string;
  riftKey: string;
  notebookDescription: string;
  encounteredEntities: { id: string; name: string }[]; // spotkani w tej krainie
  earnedTrophies: { key: string; name: string }[];      // zdobyte w tej krainie
}

export interface NotebookRiftEntry {
  key: string;
  name: string;
  color: string;
  type: "unstable" | "stable";
  visitedWorldKeys: string[]; // krainy odkryte w ramach tej szczeliny
}

export interface NotebookWorldsPage {
  rifts: NotebookRiftEntry[];
  worlds: NotebookWorldEntry[];
  totalWorldsDiscovered: number;
  totalWorldsAvailable: number;
  totalRiftsDiscovered: number;
  totalRiftsAvailable: number;
}

export async function getNotebookWorlds(userId: number): Promise<NotebookWorldsPage> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const level = await getNotebookLevel(character.id);
  requireLevel(level, 4, "Krainy i Szczeliny");

  const characterId = character.id;

  const visits = await prisma.riftWorldHistory.findMany({
    where: { characterId },
    select: { riftKey: true, worldKey: true },
  });

  const visitedWorldKeys = new Set(visits.map(v => v.worldKey));
  const visitedRiftKeys = new Set(visits.map(v => v.riftKey));

  // Przeciwnicy spotkani per kraina — wnioskowane z RIFT_ENTITIES dla danej krainy
  // PRZECIĘTE z faktycznie napotkanymi encounter.entityId gracza (źródło "rift")
  const riftEncounters = await prisma.pveEncounter.findMany({
    where: { characterId, source: "rift" },
    distinct: ["entityId"],
    select: { entityId: true },
  });
  const encounteredEntityIds = new Set(riftEncounters.map(e => e.entityId));

  // Trofea zdobyte per kraina
  const earnedRiftTrophies = await prisma.characterRiftTrophy.findMany({
    where: { characterId },
    include: { trophy: true },
  });

  const worlds: NotebookWorldEntry[] = [];
  for (const worldDef of RIFT_WORLDS) {
    if (!visitedWorldKeys.has(worldDef.key)) continue;

    // Przeciwnicy zdefiniowani dla tej krainy, którzy zostali faktycznie napotkani
    const worldEntities = ALL_ENTITIES.filter(
      e => e.entityType === "rift" && (e as any).riftWorldKey === worldDef.key
    );
    const encounteredInWorld = worldEntities
      .filter(e => encounteredEntityIds.has(e.id))
      .map(e => ({ id: e.id, name: e.name }));

    const trophiesInWorld = earnedRiftTrophies
      .filter(t => t.earnedInWorldKey === worldDef.key)
      .map(t => ({ key: t.trophy.key, name: t.trophy.name }));

    worlds.push({
      key: worldDef.key,
      name: worldDef.name,
      riftKey: worldDef.riftKey,
      notebookDescription: (worldDef as any).notebookDescription ?? worldDef.nodes.find(n => n.key === worldDef.startNodeKey)?.description ?? "",
      encounteredEntities: encounteredInWorld,
      earnedTrophies: trophiesInWorld,
    });
  }
  worlds.sort((a, b) => a.name.localeCompare(b.name, "pl"));

  const rifts: NotebookRiftEntry[] = [];
  for (const riftDef of RIFTS) {
    if (!visitedRiftKeys.has(riftDef.key)) continue;
    const worldsInThisRift = [...visitedWorldKeys].filter(wk => {
      const wd = getRiftWorldByKey(wk);
      return wd?.riftKey === riftDef.key;
    });
    rifts.push({
      key: riftDef.key,
      name: riftDef.name,
      color: riftDef.color,
      type: riftDef.type,
      visitedWorldKeys: worldsInThisRift,
    });
  }
  rifts.sort((a, b) => a.name.localeCompare(b.name, "pl"));

  return {
    rifts,
    worlds,
    totalWorldsDiscovered: worlds.length,
    totalWorldsAvailable: RIFT_WORLDS.length,
    totalRiftsDiscovered: rifts.length,
    totalRiftsAvailable: RIFTS.length,
  };
}

// ═══════════════════════════════════════════════════════════════════
// STRONA 5 — RANKINGI (poziom notesu >= 5)
// ═══════════════════════════════════════════════════════════════════

const RANKING_CATEGORIES: RankingCategory[] = [
  "level", "prestige", "builders", "warriors", "showoffs", "collectors",
];

const RANKING_LABELS: Record<RankingCategory, string> = {
  level:      "Poziom",
  prestige:   "Prestiż",
  builders:   "Budowniczowie",
  warriors:   "Wojownicy (PvP)",
  showoffs:   "Szpanerzy (Turnieje)",
  collectors: "Zbieracze (Trofea)",
};

export interface NotebookRankingEntry {
  category: RankingCategory;
  label: string;
  currentRank: number | null;
  bestRank: number | null;
  bestRankAchievedAt: Date | null;
  isCurrentlyBest: boolean; // true = obecna pozycja JEST najlepszą kiedykolwiek osiągniętą
}

export interface NotebookRankingsPage {
  rankings: NotebookRankingEntry[];
}

// Wywoływane przy KAŻDYM odpytaniu rankingów (w tym ze strony Rankingi
// poza notesem) — nadpisuje snapshot jeśli obecna pozycja jest lepsza.
export async function updateRankingSnapshot(
  characterId: number,
  category: RankingCategory,
  currentRank: number
): Promise<void> {
  const existing = await prisma.rankingSnapshot.findUnique({
    where: { characterId_category: { characterId, category } },
  });

  if (!existing) {
    await prisma.rankingSnapshot.create({
      data: { characterId, category, bestRank: currentRank },
    });
    return;
  }

  if (currentRank < existing.bestRank) {
    await prisma.rankingSnapshot.update({
      where: { id: existing.id },
      data: { bestRank: currentRank, achievedAt: new Date() },
    });
  }
}

export async function getNotebookRankings(userId: number): Promise<NotebookRankingsPage> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const level = await getNotebookLevel(character.id);
  requireLevel(level, 5, "Rankingi");

  const characterId = character.id;

  const rankings: NotebookRankingEntry[] = [];

  for (const category of RANKING_CATEGORIES) {
    // pobieramy tylko myRank — nie potrzebujemy pełnej strony
    const page = await getRanking(userId, category, 1, 1);
    const currentRank = page.myRank?.rank ?? null;

    if (currentRank !== null) {
      await updateRankingSnapshot(characterId, category, currentRank);
    }

    const snapshot = await prisma.rankingSnapshot.findUnique({
      where: { characterId_category: { characterId, category } },
    });

    rankings.push({
      category,
      label: RANKING_LABELS[category],
      currentRank,
      bestRank: snapshot?.bestRank ?? currentRank,
      bestRankAchievedAt: snapshot?.achievedAt ?? null,
      isCurrentlyBest: currentRank !== null && snapshot?.bestRank === currentRank,
    });
  }

  return { rankings };
}

// ═══════════════════════════════════════════════════════════════════
// META — informacja o dostępnych stronach (dla frontendu, do renderowania zakładek)
// ═══════════════════════════════════════════════════════════════════

export interface NotebookMeta {
  level: number;
  unlockedPages: {
    overview: boolean;
    entities: boolean;
    items: boolean;
    worlds: boolean;
    rankings: boolean;
  };
}

export async function getNotebookMeta(userId: number): Promise<NotebookMeta> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const level = await getNotebookLevel(character.id);

  return {
    level,
    unlockedPages: {
      overview: level >= 1,
      entities: level >= 2,
      items:    level >= 3,
      worlds:   level >= 4,
      rankings: level >= 5,
    },
  };
}