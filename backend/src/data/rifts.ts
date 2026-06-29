// ═══════════════════════════════════════════════════════════════════
// DEFINICJE SZCZELIN
// src/data/rifts.ts
//
// Każda szczelina ma:
//   - klucz, nazwę, kolor, typ (unstable/stable)
//   - bazowe XP i prestiż za walkę
//   - utratę prestiżu za przegraną walkę
//   - listę krain (worldKeys) z wagami losowania
//   - widełki tieru przedmiotów
//   - trofea możliwe do zdobycia
//   - dla niestabilnych: szansa wystąpienia + na jakich akcjach
// ═══════════════════════════════════════════════════════════════════

export type RiftType = "unstable" | "stable";

export type RiftColor =
  | "green"   // niestabilna — zieleń/błękit
  | "white";  // stabilna — bazowa

export type ActionTrigger =
  | "study_1"       // studia poziom 1
  | "study_2"
  | "study_3"
  | "study_4"
  | "study_5"
  | "exploration_1" // eksploracja poziom 1
  | "exploration_2"
  | "exploration_3"
  | "exploration_4"
  | "exploration_5";

export interface RiftWorldEntry {
  worldKey: string;
  weight: number; // waga losowania — wyższy = częstszy
}

export interface UnstableTriggerConfig {
  chance: number;        // bazowa szansa (0–1), np. 0.01 = 1%
  chancePerAction: number; // przyrost per akcja (0–1), np. 0.001 = 0.1%
  actions: ActionTrigger[];
}

export interface RiftDef {
  key: RiftColor;
  name: string;             // wyświetlana nazwa
  type: RiftType;
  color: string;            // kolor CSS do UI, np. "#4ade80"
  colorSecondary: string;   // drugi kolor gradientu/obramowania

  // XP — bazowa pula, modyfikowana przebiegiem wyprawy
  baseXpMin: number;
  baseXpMax: number;

  // Prestiż za wygraną walkę
  basePrestigeGain: number;

  // Utrata prestiżu za przegraną walkę (losowana z przedziału)
  prestigeLossMin: number;
  prestigeLossMax: number;

  // Przedmioty — widełki tieru dla tej szczeliny
  itemTierMin: number;
  itemTierMax: number;

  // Krainy dostępne w tej szczelinie (losowanie z wagami)
  worlds: RiftWorldEntry[];

  // Trofea możliwe do zdobycia w tej szczelinie (klucze z rift-trophies.ts)
  // Używane tylko informacyjnie — konkretne trofeum przypisane jest w rift-worlds.ts
  trophyKeys: string[];

  // Tylko dla niestabilnych
  trigger?: UnstableTriggerConfig;

  // Tylko dla stabilnych — poziom budynku rift_chamber wymagany do odblokowania
  riftChamberLevelRequired?: number;
}

// ═══════════════════════════════════════════════════════════════════
// KATALOG SZCZELIN
// ═══════════════════════════════════════════════════════════════════

export const RIFTS: RiftDef[] = [

  // ── ZIELONA (niestabilna) ──────────────────────────────────────
  {
    key: "green",
    name: "Zielona Szczelina",
    type: "unstable",
    color: "#4ade80",
    colorSecondary: "#38bdf8",

    baseXpMin: 30,
    baseXpMax: 80,

    basePrestigeGain: 3,
    prestigeLossMin: 1,
    prestigeLossMax: 3,

    itemTierMin: 1,
    itemTierMax: 4,

    worlds: [
      { worldKey: "stokrotka", weight: 35 },
      { worldKey: "hobbiton",  weight: 35 },
      { worldKey: "szmaragdowe_miasto", weight: 30 },
    ],

    trophyKeys: [
      "stokrotka",
      "pierscien_z_dziwnymi_znakami",
      "maly_kaftanik",
      "medal_odwagi",
      "szmaragdowa_brosza",
      "rubinowe_pantofelki",
    ],

    trigger: {
      chance: 99.01,
      chancePerAction: 0.01, // 1% per odebranie akcji
      actions: [
        "study_1",
        "study_2",
        "exploration_1",
        "exploration_2",
      ],
    },
  },

  // ── BIAŁA (stabilna) ──────────────────────────────────────────
  {
    key: "white",
    name: "Biała Szczelina",
    type: "stable",
    color: "#f8fafc",
    colorSecondary: "#e2e8f0",

    baseXpMin: 50,
    baseXpMax: 120,

    basePrestigeGain: 5,
    prestigeLossMin: 2,
    prestigeLossMax: 5,

    itemTierMin: 2,
    itemTierMax: 5,

    worlds: [
      { worldKey: "rust_wasteland", weight: 100 },
    ],

    trophyKeys: [
      "kamien",
      "swiecace_cos",
    ],

    riftChamberLevelRequired: 1,
  },

];

// ═══════════════════════════════════════════════════════════════════
// HELPERY
// ═══════════════════════════════════════════════════════════════════

export function getRiftByKey(key: RiftColor): RiftDef | undefined {
  return RIFTS.find(r => r.key === key);
}

export function getUnstableRifts(): RiftDef[] {
  return RIFTS.filter(r => r.type === "unstable");
}

export function getStableRifts(): RiftDef[] {
  return RIFTS.filter(r => r.type === "stable");
}

// Losuje krainę z puli szczeliny z wykluczeniem ostatnich N odwiedzonych
export function rollWorldKey(
  rift: RiftDef,
  recentWorldKeys: string[] // ostatnie 5 kluczy — wykluczone z losowania
): string {
  const excluded = new Set(recentWorldKeys);
  let pool = rift.worlds.filter(w => !excluded.has(w.worldKey));

  // Fallback: jeśli wszystkie wykluczone (mała pula), losuj ze wszystkich
  if (pool.length === 0) pool = rift.worlds;

  const totalWeight = pool.reduce((sum, w) => sum + w.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.worldKey;
  }
  return pool[pool.length - 1]!.worldKey;
}

// Sprawdza czy akcja może triggerować niestabilną szczelinę
export function canTriggerRift(
  rift: RiftDef,
  action: ActionTrigger
): boolean {
  if (rift.type !== "unstable" || !rift.trigger) return false;
  return rift.trigger.actions.includes(action);
}

// Losuje czy szczelina się otwiera przy danej akcji
export function rollRiftTrigger(rift: RiftDef): boolean {
  if (!rift.trigger) return false;
  return Math.random() < rift.trigger.chance;
}