// ═══════════════════════════════════════════════════════════════════════════════
// SPELLBOOK SERVICE — Księga Magii (z obsługą czarów podstawowych)
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";
import { alignmentTriggerService } from "./alignment/alignment-trigger.service.js";

export type SpellbookSource = "study" | "battle_cast" | "school" | "basic_purchase";

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

    await alignmentTriggerService.checkTrigger(
      characterId,
      "SPELLS_100_DISCOVERED",
      { spellCount }
    );
    // ──────

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
  spellBook: boolean;
  basicCost: number;

  // Zawsze widoczne
  element: string;
  spellPool: string;
  rarity: string;
  category: string;

  // Dla discovered === true LUB spellBook === true
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
    const entry      = discoveredMap.get(spell.id);
    // Czar jest "odkryty" jeśli ma wpis w spellbookEntries LUB jest podstawowy
    const discovered = !!entry || spell.spellBook;
    const category   = detectCategory(spell);

    if (discovered) {
      return {
        id:            spell.id,
        discovered:    true,
        spellBook:     spell.spellBook,
        basicCost:     spell.basicCost,
        element:       spell.element,
        spellPool:     spell.spellPool,
        rarity:        spell.rarity,
        category,
        name:          spell.name,
        damage:        spell.damage,
        special:       spell.special ?? undefined,
        isDirectional: spell.isDirectional,
        statusEffects: spell.statusEffects,
        reqFireMagic:  spell.reqElementalMagic,
        reqWaterMagic: spell.reqAstralMagic,
        reqEarthMagic: spell.reqBloodMagic,
        summonCount:   spell.summonCount,
        summonElement: spell.summonElement,
        discoveredAt:  entry?.discoveredAt,
        source:        entry?.source ?? (spell.spellBook ? "basic" : undefined),
        owned:         ownedSet.has(spell.id),
      };
    }

    return {
      id:        spell.id,
      discovered: false,
      spellBook:   false,
      basicCost: 0,
      element:   spell.element,
      spellPool: spell.spellPool,
      rarity:    spell.rarity,
      category,
      owned:     false,
    };
  });
}

// ── ZAKUP CZARU PODSTAWOWEGO ──────────────────────────────────────────────────

export async function learnBasicSpell(userId: number, spellId: number): Promise<{
  message: string;
  shardsSpent: number;
  destination: "library" | "chaos_vault";
}> {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { spells: true },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const spell = await prisma.spell.findUnique({ where: { id: spellId } });
  if (!spell) throw new Error("Czar nie istnieje");
  if (!spell.spellBook) throw new Error("To nie jest czar podstawowy");

  const alreadyOwned = character.spells.some(s => s.spellId === spellId);
  if (alreadyOwned) throw new Error("Już posiadasz ten czar w bibliotece");

  const unmet = [
    spell.reqElementalMagic   > 0 && character.elementalMagic   < spell.reqElementalMagic   && `Ogień ${spell.reqElementalMagic}`,
    spell.reqAstralMagic  > 0 && character.astralMagic  < spell.reqAstralMagic  && `Woda ${spell.reqAstralMagic}`,
    spell.reqBloodMagic  > 0 && character.bloodMagic  < spell.reqBloodMagic  && `Ziemia ${spell.reqBloodMagic}`,
  ].filter(Boolean);

  if (unmet.length > 0) {
    throw new Error(`Nie spełniasz wymagań: ${unmet.join(", ")}`);
  }

  if (character.powerShards < spell.basicCost) {
    throw new Error(
      `Niewystarczające okruchy mocy. Potrzebujesz ${spell.basicCost}, masz ${character.powerShards}.`
    );
  }

  const destination: "library" | "chaos_vault" =
    character.spells.length < character.maxSpells ? "library" : "chaos_vault";

  await prisma.$transaction(async (tx) => {
    await tx.character.update({
      where: { id: character.id },
      data: { powerShards: { decrement: spell.basicCost } },
    });

    if (destination === "library") {
      await tx.characterSpell.create({
        data: { characterId: character.id, spellId },
      });
    } else {
      await tx.chaosVaultItem.create({
        data: { characterId: character.id, spellId },
      });
    }

    await tx.spellbookEntry.upsert({
      where: { characterId_spellId: { characterId: character.id, spellId } },
      update: {},
      create: { characterId: character.id, spellId, source: "basic_purchase" },
    });
  });

  const message = destination === "library"
    ? `Nauczyłeś się czaru "${spell.name}"! Wydałeś ${spell.basicCost} okruchów mocy.`
    : `Nauczyłeś się czaru "${spell.name}"! Wydałeś ${spell.basicCost} okruchów mocy. Biblioteka jest pełna — czar trafił do Komnaty Nieładu.`;

  return { message, shardsSpent: spell.basicCost, destination };
}

// ── STATYSTYKI KSIĘGI ─────────────────────────────────────────────────────────

export async function getSpellbookStats(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const [total, basicCount, discovered] = await Promise.all([
    prisma.spell.count(),
    prisma.spell.count({ where: { spellBook: true } }),
    prisma.spellbookEntry.count({ where: { characterId: character.id } }),
  ]);

  const discoveredWithBasic = Math.min(total, discovered + basicCount);
  return { total, discovered: discoveredWithBasic, hidden: total - discoveredWithBasic };
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