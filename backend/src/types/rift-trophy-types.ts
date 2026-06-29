// ═══════════════════════════════════════════════════════════════════
// TYPY BONUSÓW TROFEÓW SZCZELIN
// src/types/rift-trophy-types.ts
// ═══════════════════════════════════════════════════════════════════

// ── STATYSTYKI POSTACI (te same co w Character) ──────────────────
export type CharacterStat =
  | "knowledge"
  | "intelligence"
  | "power"
  | "endurance"
  | "resistance"
  | "initiative"
  | "elementalMagic"
  | "astralMagic"
  | "bloodMagic";

// ── ŻYWIOŁY (te same co w Spell / MinorEntityDef) ───────────────
export type SpellElement =
  | "fire" | "water" | "earth" | "air"
  | "life" | "death" | "harmony" | "chaos"
  | "basic";

// ── SLOTY EKWIPUNKU (te same co w CharacterEquipment) ────────────
export type EquipmentSlot =
  | "mainHand"
  | "offHand"
  | "robe"
  | "hat"
  | "boots"
  | "talisman";

// ═══════════════════════════════════════════════════════════════════
// GŁÓWNY TYP BONUSÓW TROFEUM
// ═══════════════════════════════════════════════════════════════════
// Wszystkie pola są opcjonalne.
// Trofeum może mieć 1 bonus lub kilka naraz.

export interface RiftTrophyBonuses {

  // C1/C2/C3/C4/C5 — bonus/malus do wybranych lub wszystkich statystyk
  // Klucz = nazwa statystyki, wartość = flat bonus (ujemna = malus)
  // Przykład: { "power": 3, "intelligence": -1 }
  stats?: Partial<Record<CharacterStat, number>>;

  // C6 — bonus/malus odporności na konkretne żywioły (w %)
  // Przykład: { "fire": 15, "water": -10 }
  // Jak czytać: przy otrzymaniu obrażeń ognia gracz otrzymuje 15% mniej
  elementResist?: Partial<Record<SpellElement, number>>;

  // C7 — bonus/malus odporności na WSZYSTKIE obrażenia (w %)
  // Przykład: 5 = 5% redukcja wszystkich obrażeń
  // Stosowany razem z elementResist — oba się sumują (najpierw allResist, potem elementResist)
  allResist?: number;

  // C8 — modyfikator kosztu czaru w powerShards (flat, per rzut)
  // Ujemna = taniej, dodatnia = drożej
  // Przykład: -1 = każdy czar kosztuje o 1 powerShard mniej (minimum 0)
  // Stosowany w silniku walki PRZED odjęciem powerShards
  spellCostModifier?: number;

  // C9 — procentowa redukcja wymagań (osobno dla ekwipunku i budynków wieży)
  // Przykład: { "equipment": 10, "tower": 5 }
  // equipment: przy sprawdzaniu czy gracz może założyć przedmiot, jego req * (1 - 0.10)
  // tower: przy sprawdzaniu czy gracz może rozbudować budynek wieży, req * (1 - 0.05)
  // Zaokrąglenie: Math.floor (wymaganie zawsze w dół)
  reqReduction?: {
    equipment?: number;  // % redukcji wymagań statystyk przedmiotów
    tower?: number;      // % redukcji wymagań poziomu wieży do budynków
  };

  // C10 — bonus do tieru znajdowanych przedmiotów (flat)
  // Przykład: 1 = każdy znaleziony przedmiot ma tier o 1 wyższy (do max 10)
  // Stosowany w exploration.service.ts przy addItemToChaosVaultWithMessage
  itemTierBonus?: number;

  // C11 — gwarancja trafienia czaru NA TURNIEJU MAGICZNYM
  // true = mechanizm chybienia wynikający z intelligence jest ignorowany podczas turnieju
  // (normalnie niska intelligence = szansa na miss przy rzucaniu czaru)
  guaranteedHitTournament?: boolean;

  // C12 — gwarancja trafienia czaru W WALCE PVP/PVE
  // true = mechanizm chybienia wynikający z intelligence jest ignorowany w combat.service
  guaranteedHitCombat?: boolean;

  // C13 — bonus/malus do obrażeń zadawanych z konkretnego żywiołu (w %)
  // Przykład: { "fire": 20 } = zadajesz 20% więcej obrażeń ogniem
  // Przykład: { "death": -15 } = zadajesz 15% mniej obrażeń śmiercią
  // Stosowany w silniku walki po obliczeniu bazowych obrażeń czaru
  elementDamage?: Partial<Record<SpellElement, number>>;

  // C14 — mnożnik na statystyki przywoływanych minionów
  // Przykład: 1.25 = miniony mają 25% wyższe HP, damage, initiative
  // Stosowany przy tworzeniu minionów w silniku walki
  // Dotyczy: summonHp, summonDamage, summonInitiative ze Spell
  minionStatMultiplier?: number;

  // C15 — bonus do czarów z puli CHAOTIC (w %)
  // Dotyczy dwóch przypadków:
  //   A) czar losowany z puli chaotic podczas walki (spellPool = "chaotic")
  //   B) czar aktywny (zaplanowany przez gracza) JEŚLI jego spellPool = "chaotic"
  // Przykład: 15 = takie czary zadają 15% więcej obrażeń
  // Stosowany w combat.service po wylosowaniu / wybraniu czaru, przed obliczeniem damage
  chaoticSpellBonus?: number;

  // C16 — mnożnik bonusów z ekwipunku per slot
  // Klucz = slot, wartość = mnożnik (1.0 = bez zmian, 1.25 = +25%, 0.75 = -25%)
  // Przykład: { "mainHand": 1.25 } = bonusy z głównej ręki są o 25% wyższe
  // Dotyczy wszystkich bonusStatX z OwnedItem/Item przy obliczaniu statystyk postaci
  // Stosowany w character.service przy getEffectiveStats()
  equipmentBonusMultiplier?: Partial<Record<EquipmentSlot, number>>;
}

// ═══════════════════════════════════════════════════════════════════
// ZAGREGOWANE BONUSY (wynik sumowania wszystkich trofeów gracza)
// ═══════════════════════════════════════════════════════════════════
// Zwracany przez getRiftTrophyBonuses(characterId) — gotowy do użycia
// w serwisach bez konieczności parsowania każdego trofeum osobno.

export interface AggregatedRiftTrophyBonuses {
  stats: Partial<Record<CharacterStat, number>>;
  elementResist: Partial<Record<SpellElement, number>>;
  allResist: number;
  spellCostModifier: number;
  reqReduction: { equipment: number; tower: number };
  itemTierBonus: number;
  dodge: number;
  guaranteedHitTournament: boolean;
  guaranteedHitCombat: boolean;
  elementDamage: Partial<Record<SpellElement, number>>;
  minionStatMultiplier: number;        // sumowane jako: (mnożniki - 1) + 1, czyli addytywne delty
  chaoticSpellBonus: number;           // sumowane addytywnie w %
  equipmentBonusMultiplier: Partial<Record<EquipmentSlot, number>>;  // j.w.
}

// ── DEFAULT — puste bonusy (używane jako fallback) ───────────────
export const EMPTY_RIFT_TROPHY_BONUSES: AggregatedRiftTrophyBonuses = {
  stats: {},
  elementResist: {},
  allResist: 0,
  spellCostModifier: 0,
  reqReduction: { equipment: 0, tower: 0 },
  itemTierBonus: 0,
  dodge: 0,
  guaranteedHitTournament: false,
  guaranteedHitCombat: false,
  elementDamage: {},
  minionStatMultiplier: 1.0,
  chaoticSpellBonus: 0,
  equipmentBonusMultiplier: {},
};