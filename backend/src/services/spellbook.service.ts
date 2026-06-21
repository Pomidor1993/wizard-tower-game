// ═══════════════════════════════════════════════════════════════════════════════
// SPELLBOOK SERVICE — Księga Magii
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";

export type SpellbookSource = "study";

// ── REJESTRACJA ODKRYCIA ──────────────────────────────────────────────────────

export async function recordSpellbookEntry(
  characterId: number,
  spellId: number,
  source: SpellbookSource
): Promise<void> {
  try {
    await prisma.spellbookEntry.upsert({
      where: { characterId_spellId: { characterId, spellId } },
      update: {},
      create: { characterId, spellId, source },
    });

    const spellCount = await prisma.spellbookEntry.count({
      where: { characterId }
    });

  } catch (err) {
    console.error(`[spellbook] Failed to record entry char=${characterId} spell=${spellId}:`, err);
  }
}

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

// ── GET SPELLBOOK ─────────────────────────────────────────────────────────────

export interface SpellbookSpell {
  id: number;
  discovered: boolean;
  basicCost: number;
  equippedSlot?: number | null;// 1-4, jeśli czar jest aktualnie przypisany do slotu w bibliotece

  // Zawsze widoczne
  element: string;
  spellPool: string;
  rarity: string;
  category: string;

  // Dla discovered === true
  name?: string;
  damage?: number;
  special?: string;
  isDirectional?: boolean;
  statusEffects?: string;
  reqElementalMagic?: number;
  reqAstralMagic?: number;
  reqBloodMagic?: number;
  summonCount?: number;
  summonElement?: string | null;

  // Metadata odkrycia
  discoveredAt?: Date;
  source?: string;

  // Czy gracz posiada czar w bibliotece
  owned?: boolean;
}


export async function getSpellbook(userId: number): Promise<SpellbookSpell[]> {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      spellbookEntries: { select: { spellId: true, source: true, discoveredAt: true } },
    },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  const equippedSlots = await prisma.characterSpellSlots.findMany({
    where: { characterId: character.id },
    select: { spellId: true, slotIndex: true },
  });
  const equippedMap = new Map(equippedSlots.map(s => [s.spellId, s.slotIndex]));

  const allSpellsRaw = await prisma.spell.findMany({
  where: { spellType: "combat" },
  orderBy: [{ element: "asc" }, { spellPool: "asc" }, { rarity: "asc" }],
});

  const allSpells = allSpellsRaw;

  const discoveredMap = new Map(
    character.spellbookEntries.map(e => [e.spellId, e])
  );

  return allSpells.map(spell => {
    const entry      = discoveredMap.get(spell.id);
    const discovered = !!entry;
    const category   = detectCategory(spell);
    const equippedSlot = equippedMap.get(spell.id) ?? null;

    if (discovered) {
      return {
        id:            spell.id,
        discovered:    true,
        basicCost:     spell.basicCost,
        element:       spell.element,
        spellPool:     spell.spellPool,
        rarity:        spell.rarity,
        category,
        name:          spell.name,
        damage:        spell.damage,
        special:       spell.special ?? undefined,
        spellbookDescription: spell.spellbookDescription,
        isDirectional: spell.isDirectional,
        statusEffects: spell.statusEffects,
        reqElementalMagic: spell.reqElementalMagic,
        reqAstralMagic:    spell.reqAstralMagic,
        reqBloodMagic:     spell.reqBloodMagic,
        summonCount:   spell.summonCount,
        summonElement: spell.summonElement,
        discoveredAt:  entry?.discoveredAt,
        source:        entry?.source,
        equippedSlot,
      };
    }

    return {
      id:        spell.id,
      discovered: false,
      basicCost: 0,
      element:   spell.element,
      spellPool: spell.spellPool,
      rarity:    spell.rarity,
      category,
      equippedSlot: null,
    };
  });
}

export async function getSpellbookStats(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");


const allSpellsRaw = await prisma.spell.findMany({
  where: { spellType: "combat" },
  select: { allowedClasses: true },
});
const total = allSpellsRaw.filter(spell => {}).length;

  const discovered = await prisma.spellbookEntry.count({
    where: { characterId: character.id },
  });

  return { total, discovered, hidden: total - discovered };
}

// ── HELPER: kategoria czaru ───────────────────────────────────────────────────

function detectCategory(spell: {
  summonCount: number;
  damage: number;
  statusEffects: string;
  category?: string;
}): string {
  if ("category" in spell && spell.category) return spell.category;
  if (spell.summonCount > 0) return "summoner";
  try {
    const effects = JSON.parse(spell.statusEffects) as Array<{ type: string }>;
    const hasDefensive = effects.some(e =>
      ["resist", "heal_chance", "invisibility"].includes(e.type)
    );
    if (hasDefensive) return "defensive";
  } catch { /* noop */ }
  if (spell.damage > 0) return "offensive";
  return "offensive";
}