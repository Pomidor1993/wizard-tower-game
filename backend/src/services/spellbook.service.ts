// ═══════════════════════════════════════════════════════════════════════════════
// SPELLBOOK SERVICE — Księga Magii
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";
import { applySpellUpgrades } from "../types/spell-upgrade.js";
import { MAX_UPGRADE_TIER } from "../types/spell-upgrade.js";

export type SpellbookSource = "study" | "school";

// ── REJESTRACJA ODKRYCIA / ULEPSZENIA ────────────────────────────────────────

/**
 * Rejestruje odkrycie czaru lub jego ulepszenie.
 *
 * Logika:
 *  - Jeśli wpis nie istnieje → tworzy z upgradeTier = 0 (odkrycie bazowe).
 *  - Jeśli istnieje i upgradeTier < MAX_UPGRADE_TIER → inkrementuje upgradeTier.
 *  - Jeśli istnieje i upgradeTier >= MAX_UPGRADE_TIER → brak akcji (nie powinno się tu trafić).
 *
 * Zwraca { isNew, upgradeTier } — potrzebne do raportu w claimStudy.
 */
export async function recordSpellbookEntry(
  characterId: number,
  spellId: number,
  source: SpellbookSource
): Promise<{ isNew: boolean; upgradeTier: number }> {
  try {
    const existing = await prisma.spellbookEntry.findUnique({
      where: { characterId_spellId: { characterId, spellId } },
    });

    if (!existing) {
      await prisma.spellbookEntry.create({
        data: { characterId, spellId, source, upgradeTier: 0 },
      });
      return { isNew: true, upgradeTier: 0 };
    }

    if (existing.upgradeTier >= MAX_UPGRADE_TIER) {
      // Czar w pełni ulepszony — nie powinno tutaj trafić (logika puli w claimStudy),
      // ale zabezpieczamy się.
      return { isNew: false, upgradeTier: existing.upgradeTier };
    }

    const newTier = existing.upgradeTier + 1;
    await prisma.spellbookEntry.update({
      where: { characterId_spellId: { characterId, spellId } },
      data: {
        upgradeTier: newTier,
        lastUpgradedAt: new Date(),
      },
    });
    return { isNew: false, upgradeTier: newTier };
  } catch (err) {
    console.error(`[spellbook] Failed to record entry char=${characterId} spell=${spellId}:`, err);
    return { isNew: false, upgradeTier: 0 };
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
  equippedSlot?: number | null;

  // Zawsze widoczne
  element: string;
  spellPool: string;
  rarity: string;
  category: string;

  // Dla discovered === true
  name?: string;
  damage?: number;
  special?: string;
  statusEffects?: string;   // JSON przeliczony wg upgradeTier
  reqElementalMagic?: number;
  reqAstralMagic?: number;
  reqBloodMagic?: number;
  summonCount?: number;
  summonHp?: number;
  summonInitiative?: number;
  summonElement?: string | null;
  minionAttacks?: string;   // JSON przeliczony wg upgradeTier
  utilityEffect?: string;   // JSON przeliczony wg upgradeTier

  // Upgrade info
  upgradeTier?: number;
  maxUpgradeTier?: number;
  isMaxUpgrade?: boolean;

  // Metadata odkrycia
  discoveredAt?: Date;
  lastUpgradedAt?: Date | null;
  source?: string;

  // Czy gracz posiada czar w bibliotece
  owned?: boolean;
}


export async function getSpellbook(userId: number): Promise<SpellbookSpell[]> {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      spellbookEntries: {
        select: {
          spellId: true,
          source: true,
          discoveredAt: true,
          upgradeTier: true,
          lastUpgradedAt: true,
        },
      },
    },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  const equippedSlots = await prisma.characterSpellSlots.findMany({
    where: { characterId: character.id },
    select: { spellId: true, slotIndex: true },
  });
  const equippedMap = new Map(equippedSlots.map(s => [s.spellId, s.slotIndex]));

  const allSpellsRaw = await prisma.spell.findMany({
    where: { category: { not: "utility" } },
    orderBy: [{ element: "asc" }, { spellPool: "asc" }, { rarity: "asc" }],
  });

  const discoveredMap = new Map(
    character.spellbookEntries.map(e => [e.spellId, e])
  );

  return allSpellsRaw.map(spell => {
    const entry = discoveredMap.get(spell.id);
    const discovered = !!entry;
    const category = detectCategory(spell);
    const equippedSlot = equippedMap.get(spell.id) ?? null;

    if (discovered && entry) {
      const tier = entry.upgradeTier ?? 0;

      // Przelicz parametry wg tieru
      const upgraded = applySpellUpgrades(
        {
          category: spell.category,
          damage: spell.damage,
          basicCost: spell.basicCost,
          statusEffects: spell.statusEffects,
          summonHp: spell.summonHp,
          summonInitiative: spell.summonInitiative,
          minionAttacks: spell.minionAttacks,
          utilityEffect: spell.utilityEffect,
        },
        tier
      );

      return {
        id:            spell.id,
        discovered:    true,
        basicCost:     upgraded.basicCost,
        element:       spell.element,
        spellPool:     spell.spellPool,
        rarity:        spell.rarity,
        category,
        name:          spell.name,
        damage:        upgraded.damage,
        special:       spell.special ?? undefined,
        statusEffects: JSON.stringify(upgraded.statusEffects),
        reqElementalMagic: spell.reqElementalMagic,
        reqAstralMagic:    spell.reqAstralMagic,
        reqBloodMagic:     spell.reqBloodMagic,
        summonCount:       spell.summonCount,
        summonHp:          upgraded.summonHp,
        summonInitiative:  upgraded.summonInitiative,
        summonElement:     spell.summonElement,
        minionAttacks:     JSON.stringify(upgraded.minionAttacks),
        utilityEffect:     JSON.stringify(upgraded.utilityEffect),
        upgradeTier:       tier,
        maxUpgradeTier:    MAX_UPGRADE_TIER,
        isMaxUpgrade:      tier >= MAX_UPGRADE_TIER,
        discoveredAt:      entry.discoveredAt,
        lastUpgradedAt:    entry.lastUpgradedAt ?? null,
        source:            entry.source,
        equippedSlot,
      };
    }

    return {
      id:         spell.id,
      discovered: false,
      basicCost:  0,
      element:    spell.element,
      spellPool:  spell.spellPool,
      rarity:     spell.rarity,
      category,
      equippedSlot: null,
    };
  });
}

export async function getSpellbookStats(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const total = await prisma.spell.count({
    where: { category: { not: "utility" } },
  });

  // Łączna liczba "odkryć" to liczba czarów × (MAX_UPGRADE_TIER + 1),
  // ale dla uproszczenia raportujemy liczbę unikalnych odkrytych czarów.
  const discovered = await prisma.spellbookEntry.count({
    where: { characterId: character.id },
  });

  // Ile czarów jest w pełni ulepszonych
  const maxed = await prisma.spellbookEntry.count({
    where: { characterId: character.id, upgradeTier: MAX_UPGRADE_TIER },
  });

  return { total, discovered, hidden: total - discovered, maxed };
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