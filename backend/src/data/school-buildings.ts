// ═══════════════════════════════════════════════════════════════════
// KONFIGURACJA BUDYNKÓW SZKOŁY MAGII
// ═══════════════════════════════════════════════════════════════════

export type BuildingType =
  | "main_hall"
  | "astro_tower"
  | "library"
  | "rift_chamber"
  | "canteen";

export interface BuildingLevelConfig {
  level: number;
  costRunicShards: number; // koszt w okruchach runicznych
  description: string;     // co ten poziom daje
}

export interface BuildingConfig {
  type: BuildingType;
  name: string;
  maxLevel: number;
  levels: BuildingLevelConfig[];
}

export const SCHOOL_BUILDINGS: Record<BuildingType, BuildingConfig> = {
  main_hall: {
    type: "main_hall",
    name: "Sala Główna",
    maxLevel: 5,
    levels: [
      { level: 1, costRunicShards: 100,  description: "Szkoła może przyjąć do 10 członków." },
      { level: 2, costRunicShards: 250,  description: "Szkoła może przyjąć do 15 członków." },
      { level: 3, costRunicShards: 500,  description: "Szkoła może przyjąć do 20 członków." },
      { level: 4, costRunicShards: 900,  description: "Szkoła może przyjąć do 25 członków." },
      { level: 5, costRunicShards: 1500, description: "Szkoła może przyjąć do 30 członków." },
    ],
  },

  astro_tower: {
    type: "astro_tower",
    name: "Wieża Astronomiczna",
    maxLevel: 3,
    levels: [
      { level: 1, costRunicShards: 300,  description: "Odblokowuje 3. poziom eksploracji dla wszystkich członków." },
      { level: 2, costRunicShards: 700,  description: "Odblokowuje 4. poziom eksploracji dla wszystkich członków." },
      { level: 3, costRunicShards: 1200, description: "Odblokowuje 5. poziom eksploracji dla wszystkich członków." },
    ],
  },

  library: {
    type: "library",
    name: "Szkolna Biblioteka",
    maxLevel: 10,
    levels: [
      { level: 1,  costRunicShards: 150,  description: "10 slotów na czary w bibliotece." },
      { level: 2,  costRunicShards: 300,  description: "20 slotów na czary w bibliotece." },
      { level: 3,  costRunicShards: 500,  description: "30 slotów na czary w bibliotece." },
      { level: 4,  costRunicShards: 750,  description: "40 slotów na czary w bibliotece." },
      { level: 5,  costRunicShards: 1000, description: "50 slotów na czary w bibliotece." },
      { level: 6,  costRunicShards: 1300, description: "60 slotów na czary w bibliotece." },
      { level: 7,  costRunicShards: 1650, description: "70 slotów na czary w bibliotece." },
      { level: 8,  costRunicShards: 2050, description: "80 slotów na czary w bibliotece." },
      { level: 9,  costRunicShards: 2500, description: "90 slotów na czary w bibliotece." },
      { level: 10, costRunicShards: 3000, description: "100 slotów na czary w bibliotece." },
    ],
  },

  rift_chamber: {
    type: "rift_chamber",
    name: "Komnata Szczelin",
    maxLevel: 3,
    levels: [
      { level: 1, costRunicShards: 500,  description: "Odblokowuje Czerwoną Szczelinę." },
      { level: 2, costRunicShards: 1000, description: "Odblokowuje Złotą Szczelinę." },
      { level: 3, costRunicShards: 2000, description: "Odblokowuje Czarną Szczelinę." },
    ],
  },

  canteen: {
    type: "canteen",
    name: "Stołówka",
    maxLevel: 6,
    levels: [
      { level: 1, costRunicShards: 200,  description: "Odblokowuje bonusy poziomu 1. Aktywny: max 1 bonus." },
      { level: 2, costRunicShards: 450,  description: "Bonusy poziomu 2. Aktywny: max 1 bonus." },
      { level: 3, costRunicShards: 800,  description: "Bonusy poziomu 3. Aktywne: max 2 bonusy." },
      { level: 4, costRunicShards: 1200, description: "Bonusy poziomu 4. Aktywne: max 2 bonusy." },
      { level: 5, costRunicShards: 1800, description: "Bonusy poziomu 5. Aktywne: max 3 bonusy." },
      { level: 6, costRunicShards: 2500, description: "Bonusy poziomu 6. Aktywne: max 3 bonusy." },
    ],
  },
};

// ── LIMITY CZŁONKÓW wg poziomu Sali Głównej ───────────────────────
export function getMaxMembers(mainHallLevel: number): number {
  // poziom 0 (niewybudowana) = 5 miejsc (dyrektor + 4)
  return 5 + mainHallLevel * 5;
}

// ── MAKS SLOTY BIBLIOTEKI wg poziomu ─────────────────────────────
export function getLibrarySlots(libraryLevel: number): number {
  return libraryLevel * 10;
}

// ── MAKS AKTYWNYCH BONUSÓW wg poziomu stołówki ───────────────────
export function getMaxActiveBonuses(canteenLevel: number): number {
  if (canteenLevel <= 2) return 1;
  if (canteenLevel <= 4) return 2;
  return 3;
}

// ── DEFINICJE BONUSÓW STOŁÓWKI ────────────────────────────────────
export interface CanteenBonusDef {
  key: string;
  name: string;
  unlockedAtLevel: number;
  // wartość skaluje się z poziomem stołówki
  getValue: (canteenLevel: number) => number;
  unit: string; // np. "pkt", "%", "pkt życia"
}

export const CANTEEN_BONUSES: CanteenBonusDef[] = [
  {
    key: "stats",
    name: "Bonus do statystyk",
    unlockedAtLevel: 1,
    getValue: (lvl) => lvl * 2,
    unit: "pkt do każdej statystyki",
  },
  {
    key: "item_find",
    name: "Szansa na przedmiot",
    unlockedAtLevel: 1,
    getValue: (lvl) => lvl * 2,
    unit: "% szansy na przedmiot podczas eksploracji",
  },
  {
    key: "spell_find",
    name: "Szansa na czar",
    unlockedAtLevel: 1,
    getValue: (lvl) => lvl * 2,
    unit: "% szansy na odkrycie czaru podczas studiów",
  },
  {
    key: "hp",
    name: "Bonus do punktów życia",
    unlockedAtLevel: 2,
    getValue: (lvl) => lvl * 100,
    unit: "pkt życia podczas walki",
  },
  {
    key: "rift",
    name: "Szansa na unikalną szczelinę",
    unlockedAtLevel: 3,
    getValue: (lvl) => {
      // 0.5% na lvl 3, 0.75% na lvl 4, 1% na lvl 5+
      if (lvl === 3) return 0.5;
      if (lvl === 4) return 0.75;
      return 1.0;
    },
    unit: "% szansy na unikalną szczelinę",
  },
  {
    key: "dodge",
    name: "Szansa na unik",
    unlockedAtLevel: 4,
    getValue: (lvl) => {
      // 5% na lvl 4, 7.5% na lvl 5, 10% na lvl 6
      if (lvl === 4) return 5;
      if (lvl === 5) return 7.5;
      return 10;
    },
    unit: "% szansy na uniknięcie obrażeń",
  },
  {
    key: "spell_slot",
    name: "Dodatkowy slot na czar bojowy",
    unlockedAtLevel: 5,
    getValue: () => 1,
    unit: "dodatkowy slot bojowy",
  },
  {
    key: "utility_slot",
    name: "Dodatkowy slot na czar użytkowy",
    unlockedAtLevel: 6,
    getValue: () => 1,
    unit: "dodatkowy slot użytkowy",
  },
];