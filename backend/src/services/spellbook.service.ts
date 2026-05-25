// ═══════════════════════════════════════════════════════════════════════════════
// SPELLBOOK SERVICE — Księga Magii
//
// Śledzi czary, które gracz "odkrył" (widział w akcji/walce/szkole).
// Odkrycie ≠ posiadanie. Gracz może mieć czar w księdze bez posiadania go
// w bibliotece, i vice versa.
//
// Źródła odkrycia:
//   "study"       — rzucony podczas akcji Studia (startStudyAction / claimStudyAction)
//   "battle_cast" — rzucony przez gracza podczas walki PvP lub PvE
//   "school"      — przejrzany w Szkole Magii (jeszcze niezaimplementowane)
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";

export type SpellbookSource = "study" | "battle_cast" | "school";

// ── REJESTRACJA ODKRYCIA ──────────────────────────────────────────────────────
// Wywołuj tę funkcję wszędzie tam, gdzie gracz "widzi" czar po raz pierwszy.
// Funkcja jest idempotentna — wielokrotne wywołanie dla tego samego czaru
// nie tworzy duplikatów (skipDuplicate).

export async function recordSpellbookEntry(
  characterId: number,
  spellId: number,
  source: SpellbookSource
): Promise<void> {
  try {
    await prisma.spellbookEntry.upsert({
      where: { characterId_spellId: { characterId, spellId } },
      update: {}, // Nie nadpisujemy — pierwsze odkrycie się liczy
      create: { characterId, spellId, source },
    });
  } catch (err) {
    // Nie przerywamy głównej operacji jeśli zapis do księgi się nie uda
    console.error(`[spellbook] Failed to record entry char=${characterId} spell=${spellId}:`, err);
  }
}

// ── BATCH: rejestracja wielu czarów naraz (np. po walce) ─────────────────────

export async function recordSpellbookEntries(
  characterId: number,
  spellIds: number[],
  source: SpellbookSource
): Promise<void> {
  if (spellIds.length === 0) return;
  await Promise.all(
    spellIds.map(spellId => recordSpellbookEntry(characterId, spellId, source))
  );
}

// ── GET SPELLBOOK — główny endpoint ──────────────────────────────────────────
// Zwraca wszystkie czary z bazy.
// Dla odkrytych: pełne dane + metadata odkrycia.
// Dla nieodkrytych: tylko element, spellPool, rarity (do renderowania placeholdera).

export interface SpellbookSpell {
  id: number;
  discovered: boolean;

  // Zawsze widoczne (do filtrowania i placeholderów)
  element: string;
  spellPool: string;
  rarity: string;
  category: string; // "summoner" | "offensive" | "defensive" | "unknown"

  // Tylko dla discovered === true
  name?: string;
  damage?: number;
  special?: string;
  isDirectional?: boolean;
  statusEffects?: string;
  reqFireMagic?: number;
  reqWaterMagic?: number;
  reqEarthMagic?: number;
  reqAirMagic?: number;
  reqChaosMagic?: number;
  reqLifeMagic?: number;
  reqDeathMagic?: number;
  reqEnergyMagic?: number;
  summonCount?: number;
  summonElement?: string | null;

  // Metadata odkrycia (tylko dla discovered)
  discoveredAt?: Date;
  source?: string;

  // Czy gracz aktualnie posiada ten czar w bibliotece
  owned?: boolean;
}

export async function getSpellbook(userId: number): Promise<SpellbookSpell[]> {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      spellbookEntries: { select: { spellId: true, source: true, discoveredAt: true } },
      spells: { select: { spellId: true } },
    },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  const allSpells = await prisma.spell.findMany({
    orderBy: [{ element: "asc" }, { spellPool: "asc" }, { rarity: "asc" }],
  });

  const discoveredMap = new Map(
    character.spellbookEntries.map(e => [e.spellId, e])
  );
  const ownedSet = new Set(character.spells.map(s => s.spellId));

  return allSpells.map(spell => {
    const entry     = discoveredMap.get(spell.id);
    const discovered = !!entry;
    const category  = detectCategory(spell);

    if (discovered) {
      return {
        id:           spell.id,
        discovered:   true,
        element:      spell.element,
        spellPool:    spell.spellPool,
        rarity:       spell.rarity,
        category,
        name:         spell.name,
        damage:       spell.damage,
        special:      spell.special ?? undefined,
        isDirectional: spell.isDirectional,
        statusEffects: spell.statusEffects,
        reqFireMagic:  spell.reqFireMagic,
        reqWaterMagic: spell.reqWaterMagic,
        reqEarthMagic: spell.reqEarthMagic,
        reqAirMagic:   spell.reqAirMagic,
        reqChaosMagic: spell.reqChaosMagic,
        reqLifeMagic:  spell.reqLifeMagic,
        reqDeathMagic: spell.reqDeathMagic,
        reqEnergyMagic: spell.reqEnergyMagic,
        summonCount:   spell.summonCount,
        summonElement: spell.summonElement,
        discoveredAt:  entry.discoveredAt,
        source:        entry.source,
        owned:         ownedSet.has(spell.id),
      };
    }

    return {
      id:        spell.id,
      discovered: false,
      element:   spell.element,
      spellPool: spell.spellPool,
      rarity:    spell.rarity,
      category,
      owned:     false,
    };
  });
}

// ── STATYSTYKI KSIĘGI ──────────────────────────────────────────────────────────

export async function getSpellbookStats(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const [total, discovered] = await Promise.all([
    prisma.spell.count(),
    prisma.spellbookEntry.count({ where: { characterId: character.id } }),
  ]);

  return { total, discovered, hidden: total - discovered };
}

// ── HELPER: kategoria czaru ───────────────────────────────────────────────────
// Tymczasowa logika dopóki nie doda się kolumny `category` do modelu Spell.
// Gdy dodasz pole w seed.ts, zmień tę funkcję na: return spell.category ?? "unknown"

function detectCategory(spell: {
  summonCount: number;
  damage: number;
  statusEffects: string;
  category?: string; // pole z przyszłości
}): string {
  // Gdy pole category będzie dostępne — użyj go bezpośrednio
  if ("category" in spell && spell.category) return spell.category;

  // Fallback: wykryj automatycznie na podstawie struktury czaru
  if (spell.summonCount > 0) return "summoner";

  // Sprawdź statusEffects pod kątem defensywności
  try {
    const effects = JSON.parse(spell.statusEffects) as Array<{ type: string }>;
    const hasDefensive = effects.some(e =>
      ["resist", "heal_chance", "invisibility"].includes(e.type)
    );
    if (hasDefensive) return "defensive";
  } catch {
    // ignore
  }

  if (spell.damage > 0) return "offensive";
  return "offensive"; // Default — efekty statusów ofensywne
}