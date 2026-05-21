// ═══════════════════════════════════════════════════════════════════════════════
// STATUS SYSTEM — TYPES
// ═══════════════════════════════════════════════════════════════════════════════

// ── CELE STATUSÓW ────────────────────────────────────────────────────────────
// Określa kogo dotyczy efekt przy rzuceniu czaru
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
  | "heal_chance";   // X% szansy na uleczenie Y pkt życia na początku tury

// ── DEFINICJA EFEKTU (zapisywana w JSON czaru) ────────────────────────────────
export interface StatusEffectDef {
  type: StatusEffectType;

  // Cel — kogo efekt dotyka po rzuceniu czaru
  target: StatusTargetType;
  count?: number;          // tylko dla nEnemies / nAllies — ilu celów

  // Czas trwania
  duration: number | null; // null = do końca walki, N = liczba tur

  // Parametry zależne od typu:

  // dot
  damage?: number;         // pkt obrażeń na turę (dot, damage_on_move)
  element?: Element;       // żywioł obrażeń (dot, resist, vulnerable, damage_on_move)

  // resist / vulnerable
  value?: number;          // % odporności lub podatności

  // miss_chance
  missChance?: number;     // % szansy na chybienie

  // damage_on_move
  moveChance?: number;     // % szansy że ruch spowoduje obrażenia
  moveDamage?: number;     // ile obrażeń zadaje ruch

  // stun
  stunChance?: number;     // % szansy na zastosowanie stuna
  stunDuration?: number;   // ile tur trwa stun gdy się powiedzie

  // invisibility
  invisChance?: number;    // % szansy że cel nie zostanie wybrany

  // heal_chance
  healChance?: number;     // % szansy na uleczenie
  healAmount?: number;     // ile HP przywraca
}

// ── TYPY CAST EFFECTÓW (jednorazowe efekty przy rzuceniu czaru) ──────────
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
  selfHpPercent?: number;     // % obecnego HP rzucającego do zapłaty
  healTargetPercent?: number; // % maxHP celu przywracane

  // resurrect
  healPercent?: number;       // % maxHP przy wskrzeszeniu
}

// ── AKTYWNY STATUS NA POSTACI / GLOBALNY ─────────────────────────────────────
// Instancja efektu nałożona w trakcie walki
export interface AppliedStatus {
  effectDef: StatusEffectDef;
  sourceName: string;      // nazwa czaru który nałożył (do logów)
  turnsLeft: number | null; // null = permanentny, dekrementowany każdą turą
  // Stun przechowuje osobny licznik (niezależny od turnsLeft samego statusu)
  stunTurnsLeft?: number;
}

// ── STAN STATUSÓW W WALCE ────────────────────────────────────────────────────
// Zastępuje obecne BattleStatusEffects + ActiveStatus[]
export interface BattleStatuses {
  attacker: AppliedStatus[];
  defender: AppliedStatus[];
  // Statusy globalne (target: "all") — np. Lodowisko dotyka każdego
  global: AppliedStatus[];
}

// ── HELPER: Pobranie wszystkich statusów danego fightera ─────────────────────
// Łączy własne statusy + globalne (global zawsze dotyczą wszystkich)
export function getEffectiveStatuses(
  own: AppliedStatus[],
  global: AppliedStatus[]
): AppliedStatus[] {
  return [...own, ...global];
}

// ── PARSER: JSON string → StatusEffectDef[] ──────────────────────────────────
// Używany w buildFighter() przy ładowaniu czarów z bazy
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

// ── WALIDATOR (opcjonalny, przydatny przy tworzeniu seedów) ──────────────────
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
      if (!def.damage)  errors.push("dot wymaga 'damage'");
      if (!def.element) errors.push("dot wymaga 'element'");
      break;
    case "resist":
    case "vulnerable":
      if (!def.value)   errors.push(`${def.type} wymaga 'value' (% odporności/podatności)`);
      if (!def.element) errors.push(`${def.type} wymaga 'element'`);
      break;
    case "miss_chance":
      if (!def.missChance) errors.push("miss_chance wymaga 'missChance'");
      break;
    case "damage_on_move":
      if (!def.moveChance) errors.push("damage_on_move wymaga 'moveChance'");
      if (!def.moveDamage) errors.push("damage_on_move wymaga 'moveDamage'");
      break;
    case "stun":
      if (!def.stunChance)   errors.push("stun wymaga 'stunChance'");
      if (!def.stunDuration) errors.push("stun wymaga 'stunDuration'");
      break;
    case "invisibility":
      if (!def.invisChance) errors.push("invisibility wymaga 'invisChance'");
      break;
    case "heal_chance":
      if (!def.healChance)  errors.push("heal_chance wymaga 'healChance'");
      if (!def.healAmount)  errors.push("heal_chance wymaga 'healAmount'");
      break;
    default:
      errors.push(`Nieznany typ statusu: ${(def as any).type}`);
  }

  return errors;
}

export function validateCastEffectDef(def: CastEffectDef): string[] {
  const errors: string[] = [];

  if (!def.type) errors.push("Brak pola 'type'");
  if (!def.target) errors.push("Brak pola 'target'");

  switch (def.type) {
    case "sacrifice":
      if (def.selfHpPercent == null) errors.push("sacrifice wymaga 'selfHpPercent'");
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