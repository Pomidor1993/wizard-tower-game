// ═══════════════════════════════════════════════════════════════════════════════
// STATUS SYSTEM — TYPES
// ═══════════════════════════════════════════════════════════════════════════════

// ── CELE STATUSÓW ────────────────────────────────────────────────────────────
export type StatusTargetType =
  | "self"           // rzucający
  | "target"         // bezpośredni cel czaru
  | "allAllies"      // rzucający + jego miniony
  | "allEnemies"     // cel + jego miniony
  | "all"            // wszyscy uczestnicy walki
  | "randomEnemy"    // losowy wróg (cel lub jeden z jego minionów)
  | "randomAlly"     // losowy sojusznik (rzucający lub jeden z jego minionów)
  | "nEnemies"       // N losowych wrogów (wymaga count)
  | "nAllies";       // N losowych sojuszników (wymaga count)

// ── ŻYWIOŁY ──────────────────────────────────────────────────────────────────
export type Element =
  | "fire" | "water" | "earth" | "air"
  | "chaos" | "energy" | "life" | "death" | "basic";

// ── TYPY EFEKTÓW STATUSU ─────────────────────────────────────────────────────
export type StatusEffectType =
  | "dot"            // obrażenia co turę
  | "resist"         // odporność na żywioł X%
  | "vulnerable"     // podatność na żywioł X%
  | "miss_chance"    // X% szansy że własne kierunkowe czary chybią
  | "damage_on_move" // X% szansy na Y obrażeń przy każdej akcji
  | "stun"           // X% szansy na utratę akcji na N tur
  | "invisibility"   // X% szansy że przeciwnik nie wybierze tego celu
  | "heal_chance"    // X% szansy na uleczenie Y pkt życia na początku tury
  | "stat_boost"     // modyfikator statystyki (buff/debuff)
  | "clean";         // czyści statusy z celu

// ── KATEGORIE BOOSTU STATYSTYKI ──────────────────────────────────────────────
// Używane przez stat_boost oraz resist/vulnerable
// Statystyki postaci:
export type FighterStatCategory =
  | "power" | "initiative" | "resistance"
  | "fireMagic" | "waterMagic" | "earthMagic" | "airMagic"
  | "chaosMagic" | "energyMagic" | "lifeMagic" | "deathMagic";

// ── TRYB CLEAN ────────────────────────────────────────────────────────────────
// Określa co czyści efekt "clean"
export type CleanMode =
  | "all"       // usuwa WSZYSTKIE statusy z celu
  | "negative"  // usuwa tylko negatywne: dot, vulnerable, miss_chance, stun, damage_on_move, stat_boost z ujemnym statAmount
  | "types";    // usuwa tylko typy wymienione w cleanTypes[]

// ── DEFINICJA EFEKTU (zapisywana w JSON czaru) ────────────────────────────────
export interface StatusEffectDef {
  type: StatusEffectType;

  // Cel — kogo efekt dotyka po rzuceniu czaru
  target: StatusTargetType;
  count?: number;          // tylko dla nEnemies / nAllies — ilu celów

  // Czas trwania
  duration: number | null; // null = do końca walki, N = liczba tur

  // ── dot ──────────────────────────────────────────────────────────────────
  // StatusTypeChance: szansa w % (0–100) że dot tick nastąpi w danej turze
  // StatusTypeMinEffect / StatusTypeMaxEffect: zakres obrażeń per tick (losowany każdy tick)
  damage?: number;         // stara kompatybilność — jeśli brak minDamage/maxDamage
  minDamage?: number;      // min obrażeń per tick (dot, damage_on_move)
  maxDamage?: number;      // max obrażeń per tick (dot, damage_on_move)
  element?: Element;       // żywioł obrażeń (dot, resist, vulnerable, damage_on_move)

  // ── resist / vulnerable ──────────────────────────────────────────────────
  // StatusTypeBoostCategory: np. "fire" — dany żywioł / statystyka
  // StatusTypeBoostMode: "flat" = +N pkt do resist, "percent" = +N% do resist
  // StatusTypeMinEffect / StatusTypeMaxEffect: zakres wartości efektu (losowany przy nałożeniu)
  value?: number;          // stara kompatybilność — jeśli brak minValue/maxValue
  minValue?: number;       // min % odporności lub podatności
  maxValue?: number;       // max % odporności lub podatności

  // ── miss_chance ───────────────────────────────────────────────────────────
  // StatusTypeChance: szansa w % że kierunkowy czar chybi
  missChance?: number;

  // ── damage_on_move ────────────────────────────────────────────────────────
  // StatusTypeChance: szansa w % że akcja spowoduje obrażenia
  // StatusTypeMinEffect / StatusTypeMaxEffect: zakres obrażeń (losowany przy każdej akcji)
  moveChance?: number;     // % szansy że ruch spowoduje obrażenia
  moveDamage?: number;     // stara kompatybilność
  minMoveDamage?: number;
  maxMoveDamage?: number;

  // ── stun ─────────────────────────────────────────────────────────────────
  // StatusTypeChance: szansa w % na zastosowanie stuna
  // StatusTypeMinEffect / StatusTypeMaxEffect: zakres czasu trwania stuna w turach
  stunChance?: number;     // % szansy na stun
  stunDuration?: number;   // stara kompatybilność
  minStunDuration?: number;
  maxStunDuration?: number;

  // ── invisibility ──────────────────────────────────────────────────────────
  // StatusTypeChance: szansa w % że cel nie zostanie wybrany przez przeciwnika
  invisChance?: number;

  // ── heal_chance ───────────────────────────────────────────────────────────
  // StatusTypeChance: szansa w % na uleczenie w danej turze
  // StatusTypeMinEffect / StatusTypeMaxEffect: zakres HP do uleczenia (losowany per tick)
  healChance?: number;
  healAmount?: number;     // stara kompatybilność
  minHealAmount?: number;
  maxHealAmount?: number;
  healMode?: "flat" | "percent";

  // ── stat_boost ────────────────────────────────────────────────────────────
  // StatusTypeBoostCategory: która statystyka (np. "power", "fireMagic")
  // StatusTypeBoostMode: "flat" = wartość absolutna, "percent" = % bazy
  // StatusTypeMinEffect / StatusTypeMaxEffect: zakres wartości (losowany przy nałożeniu, ujemna = debuff)
  stat?: FighterStatCategory;
  statMode?: "flat" | "percent";
  statAmount?: number;     // stara kompatybilność
  minStatAmount?: number;
  maxStatAmount?: number;

  // ── clean ─────────────────────────────────────────────────────────────────
  // cleanMode: co czyścić
  // cleanTypes: jeśli cleanMode === "types" — lista typów do usunięcia
  cleanMode?: CleanMode;
  cleanTypes?: StatusEffectType[];

  endInfo?: string | null;
  applyInfo?: string | null;
  tickInfo?: string | null;
  descAlt?: string | null;
}

// ── TYPY CAST EFFECTÓW (jednorazowe efekty przy rzuceniu czaru) ──────────────
export type CastEffectType = "sacrifice" | "dominate" | "resurrect";

export type CastEffectTargetType =
  | "randomAlly"
  | "randomEnemy"
  | "randomDeadAlly";

export interface CastEffectDef {
  type: CastEffectType;
  target: CastEffectTargetType;
  count?: number;

  // sacrifice
  selfHpPercent?: number;
  healTargetPercent?: number;

  // resurrect
  healPercent?: number;
}

// ── AKTYWNY STATUS NA POSTACI / GLOBALNY ──────────────────────────────────────
export interface AppliedStatus {
  effectDef: StatusEffectDef;
  sourceName: string;
  turnsLeft: number | null;
  stunTurnsLeft?: number;
  applyInfo?: string | null;
  healMode?: "flat" | "percent" | null;
  tickInfo?: string | null;
  endInfo?: string | null;

  // Wartości losowane przy nałożeniu statusu (dla zakresów min/max)
  // Przechowujemy raz wylosowaną wartość żeby była spójna przez całe trwanie statusu
  resolvedEffect?: number;   // np. wylosowany statAmount, value, healAmount, stunDuration
}

// ── STAN STATUSÓW W WALCE ─────────────────────────────────────────────────────
export interface BattleStatuses {
  attacker: AppliedStatus[];
  defender: AppliedStatus[];
  global:   AppliedStatus[];
}

// ── HELPER: Pobranie wszystkich statusów danego fightera ──────────────────────
export function getEffectiveStatuses(
  own: AppliedStatus[],
  global: AppliedStatus[]
): AppliedStatus[] {
  return [...own, ...global];
}

// ── HELPER: Losowanie wartości z zakresu (używane przy nakładaniu statusów) ───
export function resolveRange(min: number | undefined, max: number | undefined, fallback: number): number {
  if (min == null && max == null) return fallback;
  const lo = min ?? fallback;
  const hi = max ?? fallback;
  if (lo === hi) return lo;
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

// ── HELPER: Czy dany status jest "negatywny" (używane przez clean mode=negative) ─
const NEGATIVE_STATUS_TYPES: StatusEffectType[] = [
  "dot", "vulnerable", "miss_chance", "stun", "damage_on_move",
];

export function isNegativeStatus(status: AppliedStatus): boolean {
  if (NEGATIVE_STATUS_TYPES.includes(status.effectDef.type)) return true;
  // stat_boost jest negatywny gdy resolvedEffect lub statAmount < 0
  if (status.effectDef.type === "stat_boost") {
    const val = status.resolvedEffect ?? status.effectDef.statAmount ?? 0;
    return val < 0;
  }
  return false;
}

// ── PARSER: JSON string → StatusEffectDef[] ──────────────────────────────────
export function parseStatusEffects(raw: string | null): StatusEffectDef[] {
  if (!raw || raw === "[]") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StatusEffectDef[];
  } catch {
    console.warn(`[StatusParser] Nieprawidłowy JSON statusów: ${raw}`);
    return [];
  }
}

export function parseCastEffects(raw: string | null): CastEffectDef[] {
  if (!raw || raw === "[]") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CastEffectDef[];
  } catch {
    console.warn(`[CastEffectParser] Nieprawidłowy JSON castEffects: ${raw}`);
    return [];
  }
}

// ── WALIDATOR ─────────────────────────────────────────────────────────────────
export function validateStatusEffectDef(def: StatusEffectDef): string[] {
  const errors: string[] = [];

  if (!def.type)   errors.push("Brak pola 'type'");
  if (!def.target) errors.push("Brak pola 'target'");
  if (def.duration !== null && (typeof def.duration !== "number" || def.duration < 1)) {
    errors.push("'duration' musi być null lub liczbą >= 1");
  }
  if ((def.target === "nEnemies" || def.target === "nAllies") && !def.count) {
    errors.push("'count' wymagane dla target nEnemies/nAllies");
  }

  switch (def.type) {
    case "dot":
      if (def.minDamage == null && def.maxDamage == null && def.damage == null)
        errors.push("dot wymaga 'damage' lub 'minDamage'/'maxDamage'");
      if (!def.element) errors.push("dot wymaga 'element'");
      break;
    case "resist":
    case "vulnerable":
      if (def.minValue == null && def.maxValue == null && def.value == null)
        errors.push(`${def.type} wymaga 'value' lub 'minValue'/'maxValue'`);
      if (!def.element) errors.push(`${def.type} wymaga 'element'`);
      break;
    case "miss_chance":
      if (!def.missChance) errors.push("miss_chance wymaga 'missChance'");
      break;
    case "damage_on_move":
      if (!def.moveChance) errors.push("damage_on_move wymaga 'moveChance'");
      if (def.minMoveDamage == null && def.maxMoveDamage == null && def.moveDamage == null)
        errors.push("damage_on_move wymaga 'moveDamage' lub 'minMoveDamage'/'maxMoveDamage'");
      break;
    case "stun":
      if (!def.stunChance) errors.push("stun wymaga 'stunChance'");
      if (def.minStunDuration == null && def.maxStunDuration == null && def.stunDuration == null)
        errors.push("stun wymaga 'stunDuration' lub 'minStunDuration'/'maxStunDuration'");
      break;
    case "invisibility":
      if (!def.invisChance) errors.push("invisibility wymaga 'invisChance'");
      break;
    case "heal_chance":
      if (!def.healChance) errors.push("heal_chance wymaga 'healChance'");
      if (def.minHealAmount == null && def.maxHealAmount == null && def.healAmount == null)
        errors.push("heal_chance wymaga 'healAmount' lub 'minHealAmount'/'maxHealAmount'");
      break;
    case "stat_boost":
      if (!def.stat)     errors.push("stat_boost wymaga 'stat'");
      if (!def.statMode) errors.push("stat_boost wymaga 'statMode' (flat|percent)");
      if (def.minStatAmount == null && def.maxStatAmount == null && def.statAmount == null)
        errors.push("stat_boost wymaga 'statAmount' lub 'minStatAmount'/'maxStatAmount'");
      break;
    case "clean":
      if (!def.cleanMode) errors.push("clean wymaga 'cleanMode' (all|negative|types)");
      if (def.cleanMode === "types" && (!def.cleanTypes || def.cleanTypes.length === 0))
        errors.push("clean z cleanMode='types' wymaga 'cleanTypes[]'");
      break;
    default:
      errors.push(`Nieznany typ statusu: ${(def as any).type}`);
  }

  return errors;
}

export function validateCastEffectDef(def: CastEffectDef): string[] {
  const errors: string[] = [];

  if (!def.type)   errors.push("Brak pola 'type'");
  if (!def.target) errors.push("Brak pola 'target'");

  switch (def.type) {
    case "sacrifice":
      if (def.selfHpPercent == null)     errors.push("sacrifice wymaga 'selfHpPercent'");
      if (def.healTargetPercent == null) errors.push("sacrifice wymaga 'healTargetPercent'");
      break;
    case "dominate":
      if (def.count == null) errors.push("dominate wymaga 'count'");
      break;
    case "resurrect":
      if (def.healPercent == null) errors.push("resurrect wymaga 'healPercent'");
      break;
    default:
      errors.push(`Nieznany typ castEffect: ${(def as any).type}`);
  }

  return errors;
}