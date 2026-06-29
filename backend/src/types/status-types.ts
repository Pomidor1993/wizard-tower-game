// ═══════════════════════════════════════════════════════════════════════════════
// STATUS TYPES
// src/types/status-types.ts
//
// Kompletna specyfikacja typów statusów dla systemu walki.
//
// Podział statusów:
//   Ofensywne  — dot, vulnerable, damage_on_move, stun
//   Wspierające — heal_chance, stat_boost, clean, resist, invisibility
//   Minionowe  — taunt (tylko miniony; duration zawsze = 1)
//
// Zasady wyświetlania w raporcie:
//   • tickInfo / failTickInfo — tylko gdy duration > 1
//   • endInfo — na poziomie CZARU (nie statusu); jedno pole, wyświetlane raz
//     gdy wygasają wszystkie statusy nałożone przez dany czar
//   • failTickInfo — tylko dla statusów posiadających statusChance (stun,
//     dot z chance < 100, damage_on_move, heal_chance, invisibility, taunt)
// ═══════════════════════════════════════════════════════════════════════════════

// ── TARGETY ──────────────────────────────────────────────────────────────────

/** Target dla statusów nakładanych przez czary graczy */
export type StatusTargetType =
  | "self"          // rzucający
  | "target"        // losowy przeciwnik (jeden)
  | "randomEnemy"   // alias dla target — używany zamiennie
  | "randomAlly"    // losowy sojusznik (jeden)
  | "allEnemies"    // wszyscy przeciwnicy
  | "allAllies"     // wszyscy sojusznicy
  | "all"           // wszyscy biorący udział w walce
  | "nEnemies"      // n losowych przeciwników (wymaga pola count)
  | "nAllies";      // n losowych sojuszników (wymaga pola count)

/** Target dla ataków minionów */
export type MinionTargetType =
  | "self"          // minion targetuje siebie (np. buff/leczenie)
  | "randomEnemy"
  | "randomAlly"
  | "allEnemies"
  | "allAllies"
  | "all"
  | "randomAny";    // losowy uczestnik walki niezależnie od strony

// ── TRYBY POMOCNICZE ─────────────────────────────────────────────────────────

export type StatMode = "flat" | "percent";
export type HealMode = "flat" | "percent";
export type CleanMode = "all" | "negative" | "types";

/** Statystyki które może modyfikować stat_boost */
export type BoostableStat =
  | "power"
  | "initiative"
  | "resistance"
  | "intelligence"
  | "elementalMagic"
  | "astralMagic"
  | "bloodMagic";

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINICJE STATUSÓW — baza
// ═══════════════════════════════════════════════════════════════════════════════

interface StatusEffectBase {
  /** Target: kto otrzymuje status */
  target: StatusTargetType | MinionTargetType;
  /**
   * Liczba tur działania statusu.
   * null = permanentny (resist bez duration, stat_boost bez duration).
   * Dla stun zawsze null — ogłuszenie nie jest turowym statusem, lecz
   * jednorazowym rzutem z efektem trwającym stunDuration tur.
   * Dla taunt zawsze 1.
   */
  duration: number | null;
  /**
   * Liczba celów — tylko dla target: "nEnemies" | "nAllies".
   * Ignorowane dla innych targetów.
   */
  count?: number;

  // ── Teksty raportu (tylko gdy duration > 1) ───────────────────────────────
  /**
   * Tekst wyświetlany co turę gdy status działa / roll się powiódł.
   * Zmienne: {target}, {damage}, {source}
   */
  tickInfo?: string;
  /**
   * Tekst wyświetlany gdy statusChance roll się nie powiódł w danej turze.
   * Tylko dla statusów posiadających losowość (statusChance).
   * Zmienne: {target}, {source}
   */
  failTickInfo?: string;
  /**
   * Tekst wyświetlany gdy status wygasa.
   * Dla czarów GRACZY: używaj pola endInfo na poziomie BattleSpell (jedno
   * wspólne dla całego czaru). Dla MINIONÓW i bytów PvE: używaj tego pola
   * bezpośrednio na definicji statusu, bo nie mają osobnego pola czaru.
   */
  endInfo?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUSY OFENSYWNE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DOT — obrażenia co turę.
 * damage = obrażenia zadawane każdej turze.
 * statusChance = szansa na zadanie obrażeń w danej turze (roll co turę).
 * Jeśli statusChance = 100 → failTickInfo zbędne, można pominąć.
 * Miniony: nakładanie stackuje obrażenia i odświeża duration.
 */
export interface DotStatusDef extends StatusEffectBase {
  type: "dot";
  element: string;
  damage: number;
  /** Szansa na zadanie obrażeń w danej turze [0–100]. Domyślnie 100. */
  statusChance?: number;
}

/**
 * VULNERABLE — podatność na żywioł.
 * value = procent zwiększenia obrażeń z danego elementu.
 * Nakładanie stackuje wartość i odświeża duration.
 * Brak statusChance — efekt zawsze się nakłada.
 */
export interface VulnerableStatusDef extends StatusEffectBase {
  type: "vulnerable";
  element: string;
  value: number;
}

/**
 * DAMAGE_ON_MOVE — obrażenia przy każdej akcji celu.
 * damage = obrażenia przy akcji.
 * statusChance = szansa na obrażenia przy każdej akcji [0–100].
 * Miniony: nakładanie stackuje obrażenia i odświeża duration.
 */
export interface DamageOnMoveStatusDef extends StatusEffectBase {
  type: "damage_on_move";
  element: string;
  damage: number;
  /** Szansa na obrażenia przy akcji [0–100]. Domyślnie 100. */
  statusChance?: number;
}

/**
 * STUN — ogłuszenie.
 * statusChance = jednorazowa szansa na nałożenie ogłuszenia.
 * stunDuration = liczba tur ogłuszenia (1–10).
 * duration na StatusEffectBase = null (stun nie jest turowym statusem).
 * Miniony: zawsze stunDuration = 1; nie stackuje.
 */
export interface StunStatusDef extends StatusEffectBase {
  type: "stun";
  /** Jednorazowa szansa na ogłuszenie [0–100] */
  statusChance: number;
  /** Liczba tur ogłuszenia [1–10] */
  duration: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUSY WSPIERAJĄCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * HEAL_CHANCE — leczenie co turę.
 * healAmount = ilość HP do leczenia (flat lub % maxHP wg healMode).
 * statusChance = szansa na leczenie w danej turze [0–100].
 * healMode = "flat" (punkty) | "percent" (% maxHP).
 */
export interface HealChanceStatusDef extends StatusEffectBase {
  type: "heal_chance";
  healAmount: number;
  healMode?: HealMode;
  /** Szansa na leczenie w danej turze [0–100]. Domyślnie 100. */
  statusChance?: number;
}

/**
 * STAT_BOOST — wzmocnienie/osłabienie statystyki.
 * stat = która statystyka.
 * statMode = "flat" (punkty) | "percent" (procentowy bonus/malus).
 * statAmount = wartość (może być ujemna = osłabienie).
 * Nakładanie stackuje wartości.
 * Uwaga: bonus "power" nałożony na miniona bez tej statystyki
 * traktowany jest jako +X do obrażeń.
 */
export interface StatBoostStatusDef extends StatusEffectBase {
  type: "stat_boost";
  stat: BoostableStat;
  statMode: StatMode;
  statAmount: number;
}

/**
 * CLEAN — usunięcie statusów.
 * cleanMode = "all" | "negative" | "types"
 * cleanTypes = lista typów do usunięcia (tylko dla cleanMode "types").
 * Brak statusChance — efekt zawsze działa.
 */
export interface CleanStatusDef extends StatusEffectBase {
  type: "clean";
  cleanMode: CleanMode;
  /** Tylko dla cleanMode "types" */
  cleanTypes?: StatusType[];
  duration: null;
}

/**
 * RESIST — odporność na żywioł.
 * value = procent redukcji obrażeń z danego elementu.
 * Nakładanie stackuje wartości i odświeża duration.
 * duration = null oznacza permanentną odporność (do końca walki).
 * Brak statusChance — efekt zawsze się nakłada.
 */
export interface ResistStatusDef extends StatusEffectBase {
  type: "resist";
  element: string;
  value: number;
}

/**
 * INVISIBILITY — niewidzialność / szansa na unik.
 * statusChance = szansa na bycie pominiętym jako cel w danej turze [0–100].
 * Efekt sprawdzany przy każdym wyborze celu przez przeciwnika.
 */
export interface InvisibilityStatusDef extends StatusEffectBase {
  type: "invisibility";
  /** Szansa na uniknięcie bycia celem [0–100] */
  statusChance: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUSY MINIONOWE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TAUNT — prowokacja.
 * Dopóki minion żyje, wszystkie losowe ataki przeciwników (randomEnemy,
 * randomAny) muszą uwzględniać tauntera jako możliwy cel.
 * Ataki "all" działają normalnie — trafią tauntera i tak.
 * statusChance = szansa na skuteczne nałożenie taunt [0–100].
 * duration = zawsze 1 (efekt na bieżącą rundę, odnawiany przez miniona).
 * Nie stackuje.
 */
export interface TauntStatusDef extends StatusEffectBase {
  type: "taunt";
  statusChance: number;
  duration: 1;
  /** Target tauntu: kogo minion prowokuje */
  target: MinionTargetType;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIA TYPÓW
// ═══════════════════════════════════════════════════════════════════════════════

export type StatusEffectDef =
  | DotStatusDef
  | VulnerableStatusDef
  | DamageOnMoveStatusDef
  | StunStatusDef
  | HealChanceStatusDef
  | StatBoostStatusDef
  | CleanStatusDef
  | ResistStatusDef
  | InvisibilityStatusDef
  | TauntStatusDef;

export type StatusType = StatusEffectDef["type"];

// ═══════════════════════════════════════════════════════════════════════════════
// APLIKOWANY STATUS (runtime — przechowywany w Fighter/Minion)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AppliedStatus {
  /** Definicja statusu (z seeda / JSON w bazie) */
  effectDef: StatusEffectDef;
  /** Nazwa czaru/ataku który nałożył status — używane do grupowania endInfo */
  sourceName: string;
  /**
   * Pozostałe tury działania.
   * null = permanentny.
   * Zmniejszany o 1 na końcu każdej tury.
   */
  turnsLeft: number | null;
  /**
   * Wartość rozwiązana przy nakładaniu (np. losowa liczba obrażeń dot,
   * losowy statAmount). Używana zamiast ponownego losowania co turę.
   */
  resolvedEffect?: number;
  /**
   * Tryb leczenia rozwiązany przy nakładaniu (dla heal_chance).
   * Kopiowany z effectDef.healMode żeby uniknąć rzutowania.
   */
  healMode?: HealMode | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERY — nakładanie i kumulowanie statusów minionów
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zwraca true jeśli status jest negatywny (nakładany przez przeciwnika).
 * Używane przez clean z cleanMode "negative".
 */
export function isNegativeStatus(status: AppliedStatus): boolean {
  const negativeTypes: StatusType[] = ["dot", "vulnerable", "damage_on_move", "stun", "taunt"];
  return negativeTypes.includes(status.effectDef.type);
}

/**
 * Nakłada status minionowy z uwzględnieniem zasad kumulowania:
 *
 * STACKUJE (kumuluje + odświeża duration):
 *   dot, vulnerable, resist, damage_on_move
 *
 * NIE STACKUJE (jednorazowa ocena):
 *   heal_chance, stat_boost, stun, clean, invisibility, taunt
 *
 * Mutuje tablicę appliedStatuses w miejscu.
 * Zwraca true jeśli status został dodany/zaktualizowany.
 */
export function applyMinionStatus(
  target: { appliedStatuses: AppliedStatus[] },
  def: StatusEffectDef,
  sourceName: string,
  resolvedEffect?: number
): boolean {
const stackingTypes: StatusType[] = ["dot", "vulnerable", "resist", "damage_on_move"];
const nonRefreshTypes: StatusType[] = ["stun", "heal_chance", "stat_boost", "clean", "invisibility", "taunt"];

if (stackingTypes.includes(def.type)) {
  const existing = target.appliedStatuses.find(
    s =>
      s.effectDef.type === def.type &&
      s.sourceName === sourceName &&
      matchesElement(s.effectDef, def)
  );

  if (existing) {
    if (resolvedEffect !== undefined && existing.resolvedEffect !== undefined) {
      existing.resolvedEffect += resolvedEffect;
    }
    if (def.duration !== null) {
      existing.turnsLeft = def.duration;
    }
    return true;
  }
}

// Dla non-stacking typów — jeśli już istnieje status od tego samego źródła, nie dodawaj duplikatu
if (nonRefreshTypes.includes(def.type)) {
  const existing = target.appliedStatuses.find(
    s => s.effectDef.type === def.type && s.sourceName === sourceName
  );
  if (existing) return false;
}

// Dodaj nowy status
target.appliedStatuses.push({
  effectDef: def,
  sourceName,
  turnsLeft: def.duration,
  resolvedEffect,
});
return true;
}

/** Pomocnik: porównuje element/stat dla statusów stackujących */
function matchesElement(a: StatusEffectDef, b: StatusEffectDef): boolean {
  if (a.type !== b.type) return false;
  if ("element" in a && "element" in b) return a.element === b.element;
  if ("stat" in a && "stat" in b) return a.stat === b.stat;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERY — parsowanie JSON z bazy danych
// ═══════════════════════════════════════════════════════════════════════════════

export function parseStatusEffects(raw: string): StatusEffectDef[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StatusEffectDef[];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERY — endInfo na poziomie czaru
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sprawdza czy wszystkie statusy z danego źródła (czaru) wygasły.
 * Jeśli tak — zwraca endInfo do wyświetlenia.
 * Używane przez silnik walki po tickDownStatuses.
 */
export function checkEndInfo(
  target: { appliedStatuses: AppliedStatus[] },
  sourceName: string,
  endInfo: string
): string | null {
  const stillActive = target.appliedStatuses.some(s => s.sourceName === sourceName);
  return stillActive ? null : endInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERY — efektywne statusy (lokalne + globalne)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zwraca połączoną listę statusów lokalnych (na fighterze) i globalnych
 * (na całym polu walki). Używane przy obliczaniu modyfikatorów.
 */
export function getEffectiveStatuses(
  local: AppliedStatus[],
  global: AppliedStatus[]
): AppliedStatus[] {
  return [...local, ...global];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERY — resolveRange (zakres min/max, fallback na wartość stałą)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Losuje wartość z zakresu [min, max] jeśli oba są podane,
 * w przeciwnym razie zwraca fallback.
 */
export function resolveRange(
  min: number | undefined,
  max: number | undefined,
  fallback: number
): number {
  if (min !== undefined && max !== undefined) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return fallback;
}