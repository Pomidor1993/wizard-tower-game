// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY SPELL TYPES
// src/types/utility-types.ts
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Bonus eksploracyjny przypisany do czaru użytkowego.
 * Każde pole jest opcjonalne — czar może mieć dowolną kombinację.
 */
export interface UtilityEffectDef {
  /** +X% szansy na znalezienie przedmiotu */
  bonusItemFindChance?: number;

  /** +X% szansy na spotkanie przeciwnika podczas eksploracji */
  bonusEncounterChance?: number;

  /** +X% szansy na uniknięcie spotkania przeciwnika */
  avoidEncounterChance?: number;

  /** +X% szansy na uniknięcie trafienia w walce pve */
  avoidHitChance?: number;

  /** Gracz zawsze rozpoczyna walkę pve (true = zawsze first) */
  alwaysFirstInPve?: boolean;

  /** Znajdowane przedmioty mają o X tierów wyższy poziom (np. 1) */
  bonusItemTier?: number;

  /** Skrócenie czasu trwania akcji eksploracji o X% */
  explorationTimeReduction?: number;

  /**
   * Losowy bonus — silnik losuje jeden z podanych efektów przy każdej eksploracji.
   * Tablica nazw pól z UtilityEffectDef (bez "random").
   */
  randomFrom?: Array<keyof Omit<UtilityEffectDef, "randomFrom">>;

  /** Wartość używana przy randomFrom (jedno wspólne dla wszystkich losowanych) */
  randomValue?: number;
}

export function parseUtilityEffect(raw: string): UtilityEffectDef {
  try {
    return JSON.parse(raw) as UtilityEffectDef;
  } catch {
    return {};
  }
}

export function parseUtilityDescriptions(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

// ── Agregacja bonusów ze wszystkich aktywnych czarów użytkowych ──────────────

export interface AggregatedUtilityBonuses {
  bonusItemFindChance:    number; // suma %
  bonusEncounterChance:   number;
  avoidEncounterChance:   number;
  avoidHitChance:         number;
  alwaysFirstInPve:       boolean;
  bonusItemTier:          number;
  explorationTimeReduction: number; // suma %, max 80
  randomFrom?: Array<keyof Omit<UtilityEffectDef, "randomFrom">>;
  randomValue?: number;
}

export const EMPTY_BONUSES: AggregatedUtilityBonuses = {
  bonusItemFindChance:      0,
  bonusEncounterChance:     0,
  avoidEncounterChance:     0,
  avoidHitChance:           0,
  alwaysFirstInPve:         false,
  bonusItemTier:            0,
  explorationTimeReduction: 0,
};

/**
 * Agreguje UtilityEffectDef[] → AggregatedUtilityBonuses.
 * Czary "random" są przechowywane osobno i rozwiązywane w momencie eksploracji.
 */
export function aggregateUtilityBonuses(
  effects: UtilityEffectDef[]
): AggregatedUtilityBonuses {
  const result: AggregatedUtilityBonuses = { ...EMPTY_BONUSES };

  for (const e of effects) {
    if (e.randomFrom) {
      // Zachowaj definicję losową — będzie rozwiązana w exploration.service
      result.randomFrom  = e.randomFrom;
      result.randomValue = e.randomValue ?? 10;
      continue;
    }
    result.bonusItemFindChance      += e.bonusItemFindChance    ?? 0;
    result.bonusEncounterChance     += e.bonusEncounterChance   ?? 0;
    result.avoidEncounterChance     += e.avoidEncounterChance   ?? 0;
    result.avoidHitChance           += e.avoidHitChance         ?? 0;
    result.alwaysFirstInPve          = result.alwaysFirstInPve || !!e.alwaysFirstInPve;
    result.bonusItemTier            += e.bonusItemTier          ?? 0;
    result.explorationTimeReduction += e.explorationTimeReduction ?? 0;
  }

  result.explorationTimeReduction = Math.min(result.explorationTimeReduction, 80);
  return result;
}