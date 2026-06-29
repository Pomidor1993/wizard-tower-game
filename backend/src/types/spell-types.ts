// ═══════════════════════════════════════════════════════════════════════════════
// SPELL TYPES
// src/types/spell-types.ts
//
// Kompletna specyfikacja typów dla 4 kategorii czarów.
//
// Każdy czar musi mieć 6 pól podstawowych (info podstawowe):
//   name, bookDescription, requirements, spellPool, rarity, basicCost
//
// Następnie pola specyficzne dla kategorii — opisane poniżej.
// ═══════════════════════════════════════════════════════════════════════════════

import type { StatusEffectDef, MinionTargetType } from "./status-types.js";

// ── POLA WSPÓLNE (info podstawowe) ───────────────────────────────────────────

export type SpellPool = "chaotic" | "controlled" | "incantation" | "professional" | "master";
export type SpellRarity = "common" | "uncommon" | "rare" | "unique";
export type SpellCategory = "offensive" | "supportive" | "summoner" | "utility";

export interface SpellRequirements {
  reqElementalMagic?: number;
  reqAstralMagic?: number;
  reqBloodMagic?: number;
}

/** 6 pól obowiązkowych dla każdego czaru */
interface SpellBase extends SpellRequirements {
  name: string;
  /** Opis widoczny w Księdze Magii */
  bookDescription: string;
  spellPool: SpellPool;
  rarity: SpellRarity;
  basicCost: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TARGET czarów bojowych
// ═══════════════════════════════════════════════════════════════════════════════

export type OffensiveTarget =
  | "randomEnemy"   // losowy przeciwnik
  | "nEnemies"      // n losowych przeciwników (wymaga targetCount)
  | "allEnemies"    // wszyscy przeciwnicy
  | "all";          // wszyscy biorący udział (sojusznicy + przeciwnicy)

export type SupportiveTarget =
  | "self"
  | "nAllies"       // n losowych sojuszników (wymaga targetCount)
  | "allAllies"     // wszyscy sojusznicy
  | "all";          // wszyscy biorący udział

// ═══════════════════════════════════════════════════════════════════════════════
// CZAR OFENSYWNY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Czar bojowy ofensywny.
 *
 * Zasady obrażeń i statusów:
 *   • damage = obrażenia bezpośrednie (może być 0 jeśli czar zadaje tylko przez status)
 *   • element = żywioł obrażeń bezpośrednich
 *   • statusEffects[] = lista statusów nakładanych przez czar
 *
 * Wyświetlanie w raporcie:
 *   • special — zawsze wyświetlane po rzuceniu czaru
 *   • Jeśli target = randomEnemy → obrażenia zawarte w special lub tickInfo
 *   • Jeśli target ≠ randomEnemy → dodatkowo "{target} otrzymuje {damage} obrażeń"
 *     dla każdego celu osobno
 *   • endInfo — jedno pole na poziomie czaru, wyświetlane gdy wygasną
 *     WSZYSTKIE statusy nałożone przez ten czar (tylko gdy duration > 1)
 */
export interface OffensiveSpell extends SpellBase {
  category: "offensive";
  /** Obrażenia bezpośrednie (0 = brak) */
  damage: number;
  /** Żywioł obrażeń bezpośrednich */
  element: string;
  /** Tekst fabularny wyświetlany przy rzuceniu */
  special: string;
  /** Cel czaru */
  target: OffensiveTarget;
  /** Liczba celów — tylko dla target "nEnemies" */
  targetCount?: number;
  /** Lista statusów nakładanych przez czar (może być pusta) */
  statusEffects: StatusEffectDef[];
  /**
   * Tekst wyświetlany gdy wygasają wszystkie statusy tego czaru.
   * Tylko gdy czar nakłada statusy z duration > 1.
   */
  endInfo?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CZAR WSPIERAJĄCY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Czar bojowy wspierający.
 * Nigdy nie zadaje obrażeń bezpośrednich (damage = 0 zawsze).
 * Zawsze nakłada co najmniej jeden status wspierający.
 *
 * Dostępne typy statusów wspierających:
 *   heal_chance, stat_boost, clean, resist, invisibility
 *
 * Wyświetlanie w raporcie:
 *   • special — zawsze wyświetlane przy rzuceniu
 *   • tickInfo/failTickInfo per status (tylko duration > 1)
 *   • endInfo — jedno pole na poziomie czaru (tylko gdy duration > 1)
 */
export interface SupportiveSpell extends SpellBase {
  category: "supportive";
  damage: 0;
  element: string;
  /** Tekst fabularny wyświetlany przy rzuceniu */
  special: string;
  /** Cel czaru */
  target: SupportiveTarget;
  /** Liczba celów — tylko dla target "nAllies" */
  targetCount?: number;
  /** Lista statusów nakładanych przez czar (min. 1) */
  statusEffects: StatusEffectDef[];
  /**
   * Tekst wyświetlany gdy wygasają wszystkie statusy tego czaru.
   * Tylko gdy czar nakłada statusy z duration > 1.
   */
  endInfo?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CZAR SUMMONERSKI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Atak miniona — używany zarówno przez przyzywane miniony jak i byty PvE.
 * Może nakładać dowolne statusy (ofensywne i wspierające).
 */
export interface MinionAttack {
  name: string;
  /** Obrażenia bezpośrednie ataku */
  damage: number;
  element: string;
  /** Cel ataku */
  target: MinionTargetType;
  /** Tekstowy opis akcji miniona w raporcie. Zmienne: {attacker}, {target}, {damage} */
  actionDesc: string;
  /** Statusy nakładane przez atak (mogą być stackujące lub nie wg zasad) */
  statusEffects: StatusEffectDef[];
  /** Waga w losowaniu ataku (wyżej = częściej) */
  weight: number;
}

/**
 * Czar summonerski — przywołuje miniony do walki.
 *
 * Statystyki minionów losowane z bazowych ±25% (zaokrąglane do całości).
 * Ataki minionów powtarzają się co rundę.
 * Statusy stackujące (dot, vulnerable, resist, damage_on_move) kumulują
 * się przy kolejnych atakach na ten sam cel.
 */
export interface SummonerSpell extends SpellBase {
  category: "summoner";
  damage: 0;
  element: string;
  /** Tekst wyświetlany przy przywołaniu */
  special: string;
  /** Liczba przywoływanych minionów */
  summonCount: number;
  /** Bazowe HP miniona (losowane ±25%) */
  summonHp: number;
  /** Bazowa inicjatywa miniona (losowana ±25%) */
  summonInitiative: number;
  /** Bazowe obrażenia miniona (losowane ±25%) */
  summonDamage: number;
  /** Żywioł obrażeń miniona */
  summonElement: string;
  /** Domyślny cel ataków miniona (może być nadpisany przez konkretny atak) */
  summonTargetType: MinionTargetType;
  /** Pula ataków miniona */
  minionAttacks: MinionAttack[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CZAR UŻYTKOWY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Czar użytkowy — nie bierze udziału w walce, daje bonusy eksploracyjne.
 * Aktywowany przez przypisanie do slotu użytkowego.
 *
 * utilityEffect — definicja bonusu (patrz utility-types.ts)
 * utilityDescriptions — 5 poziomów opisu (wyświetlane w księdze i raportach)
 */
export interface UtilitySpell extends SpellBase {
  category: "utility";
  damage: 0;
  element: string;
  utilityEffect: Record<string, unknown>;
  utilityDescriptions: Record<1 | 2 | 3 | 4 | 5, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIA TYPÓW
// ═══════════════════════════════════════════════════════════════════════════════

export type AnySpell = OffensiveSpell | SupportiveSpell | SummonerSpell | UtilitySpell;

// ═══════════════════════════════════════════════════════════════════════════════
// TYP RUNTIME — czar po wczytaniu z bazy (dla silnika walki)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reprezentacja czaru używana przez silnik walki.
 * Pola JSON (statusEffects, minionAttacks) są już sparsowane.
 */
export interface BattleSpell {
  id: number;
  name: string;
  category: SpellCategory;
  damage: number;
  element: string;
  spellPool: SpellPool | "pve";
  basicCost: number;
  special: string | null;
  endInfo: string | null;
  /** Cel czaru ofensywnego/wspierającego */
  target: OffensiveTarget | SupportiveTarget | null;
  targetCount?: number;
  statusEffects: StatusEffectDef[];
  /** Wymagania statystyk */
  reqElementalMagic: number;
  reqAstralMagic: number;
  reqBloodMagic: number;
  /** Pola summonera */
  summonCount: number;
  summonHp: number;
  summonDamage: number;
  summonInitiative: number;
  summonElement: string | null;
  summonTargetType: MinionTargetType | null;
  minionAttacks: MinionAttack[];
}