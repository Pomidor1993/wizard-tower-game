// ═══════════════════════════════════════════════════════════════════════════════
// MINOR ENTITIES — przeciwnicy PvE
// src/data/minor-entities.ts
//
// Dwie grupy:
//   "exploration" — losowani podczas akcji eksploracji
//   "rift"        — przypisani do konkretnych krain w szczelinach
// ═══════════════════════════════════════════════════════════════════════════════

import type { StatusEffectDef } from "../types/status-types.js";

// ── ŻYWIOŁY ──────────────────────────────────────────────────────────────────

export type ElementKey =
  | "fire" | "water" | "earth" | "air"
  | "death" | "chaos" | "none";

// ── TYPY STATUSÓW (dla odporności) ───────────────────────────────────────────

export type StatusType =
  | "dot" | "heal_chance" | "vulnerable" | "resist"
  | "stat_boost" | "stun" | "damage_on_move" | "clean";

// ── ATAK PVE ENTITY ──────────────────────────────────────────────────────────

export interface PveAttack {
  name: string;
  /** Bazowe obrażenia. 0 = atak nie zadaje bezpośrednich obrażeń (np. tylko status). */
  damage: number;
  element: ElementKey;
  /** Target ataku. Działa tak samo jak target minionów graczy. */
  target:
    | "randomEnemy" | "allEnemies" | "nEnemies"
    | "randomAlly"  | "allAllies"
    | "all" | "self" | "randomAny";
  /** Liczba celów — tylko dla "nEnemies" / "nAllies". */
  targetCount?: number;
  /** Template opisu akcji. Zmienne: {attacker}, {target}, {damage}. */
  actionDesc: string;
  /** Statusy nakładane przez atak. Działa identycznie jak w czarach graczy. */
  statusEffects: StatusEffectDef[];
  /** Waga do losowania ataku. Wyższy = częstszy. */
  weight: number;
}

// ── NAGRODA (tylko exploration) ───────────────────────────────────────────────

export interface MinorEntityReward {
  runicShards: number;
  description: string;
  defeatFlavorText: string;
  victoryFlavorText: string;
}

// ── BAZA ENTITY ──────────────────────────────────────────────────────────────

interface MinorEntityBase {
  id: string;
  name: string;
  imageKey: string;

  // Parametry walki
  hp: number;
  initiative: number;

  /**
   * Odporność na obrażenia per-żywioł (flat odejmowanie od obrażeń po modyfikatorach).
   * Np. { fire: 5, earth: 10 } = każdy atak ogniowy zadaje o 5 mniej, ziemny o 10 mniej.
   * Minimum obrażeń po odporności = 1.
   */
  resistances: Partial<Record<ElementKey, number>>;

  /**
   * Odporność na statusy per-typ. Wartość 0–1 (szansa na ODPARCIE statusu).
   * Brak wpisu = brak odporności (status zawsze działa).
   * Np. { stun: 1.0 } = całkowita odporność na ogłuszenie.
   * Np. { dot: 0.5 } = 50% szans że DoT nie zadziała.
   */
  statusImmunities: Partial<Record<StatusType, number>>;

  /**
   * Losowość obrażeń. Wartość 0–100 (procent odchylenia w każdą stronę).
   * Np. 10 = obrażenia ±10% od wyliczonej wartości.
   * Np. 50 = obrażenia od 50% do 150% wyliczonej wartości.
   */
  damageVariance: number;

  attacks: PveAttack[];
}

// ── TYPY FINALNE ─────────────────────────────────────────────────────────────

export interface ExplorationEntityDef extends MinorEntityBase {
  entityType: "exploration";
  reward: MinorEntityReward;
}

export interface RiftEntityDef extends MinorEntityBase {
  entityType: "rift";
  riftWorldKey: string;
}

export type MinorEntityDef = ExplorationEntityDef | RiftEntityDef;

// ═══════════════════════════════════════════════════════════════════════════════
// PRZECIWNICY EKSPLORACYJNI
// ═══════════════════════════════════════════════════════════════════════════════

export const EXPLORATION_ENTITIES: ExplorationEntityDef[] = [

  // ── POZIOM 1 ──────────────────────────────────────────────────────────────

  {
    id: "mud_slime",
    name: "Błotny Szlam",
    entityType: "exploration",
    imageKey: "mud_exploration.jpg",
    hp: 25,
    initiative: 3,
    resistances: { earth: 3 },
    statusImmunities: {},
    damageVariance: 15,
    attacks: [
      {
        name: "Błotne uderzenie",
        damage: 3,
        element: "earth",
        target: "randomEnemy",
        actionDesc: "{attacker} chlupocze w kierunku {target} zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 100,
      },
    ],
    reward: {
      runicShards: 2,
      description: "Zdobywasz trochę okruchów kamienia runicznego.",
      defeatFlavorText: "Szlam rozpływa się w kałużę błota.",
      victoryFlavorText: "Błotny Szlam pochłania Cię w swoją masę...",
    },
  },

  {
    id: "chochlik_1",
    name: "Chochlik",
    entityType: "exploration",
    imageKey: "chochlik_study.jpg",
    hp: 30,
    initiative: 5,
    resistances: { earth: 5 },
    statusImmunities: {},
    damageVariance: 15,
    attacks: [
      {
        name: "Kamienny pocisk",
        damage: 4,
        element: "earth",
        target: "randomEnemy",
        actionDesc: "{attacker} rzuca kamieniem w {target} zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 100,
      },
    ],
    reward: {
      runicShards: 3,
      description: "Z roztrzaskanego duszka wypadają kamienne odłamki przesiąknięte energią runiczną.",
      defeatFlavorText: "Skalny Duszek rozsypuje się w kamienne okruchy.",
      victoryFlavorText: "Kamienne pięści Skalnego Duszka okazały się zbyt twarde...",
    },
  },

  {
    id: "mad_rat",
    name: "Opętany Szczur",
    entityType: "exploration",
    imageKey: "rat_exploration.jpg",
    hp: 20,
    initiative: 10,
    resistances: {},
    statusImmunities: {},
    damageVariance: 20,
    attacks: [
      {
        name: "Ugryzienie",
        damage: 3,
        element: "none",
        target: "randomEnemy",
        actionDesc: "{attacker} gryzie {target} zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 100,
      },
    ],
    reward: {
      runicShards: 2,
      description: "Szczur miał przy sobie zaskakująco cenne okruchy.",
      defeatFlavorText: "Opętany Szczur ucieka z piskiem w krzaki.",
      victoryFlavorText: "Zęby Opętanego Szczura okazały się zaskakująco ostre...",
    },
  },

  // ── POZIOM 2 ──────────────────────────────────────────────────────────────

  {
    id: "fire_imp",
    name: "Ognisty Imp",
    entityType: "exploration",
    imageKey: "imp_study.jpg",
    hp: 40,
    initiative: 8,
    resistances: { fire: 5 },
    statusImmunities: { stun: 0.5 },
    damageVariance: 20,
    attacks: [
      {
        name: "Ognisty pazur",
        damage: 5,
        element: "fire",
        target: "randomEnemy",
        actionDesc: "{attacker} rani {target} ognistymi pazurami zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 70,
      },
      {
        name: "Podpalenie",
        damage: 0,
        element: "fire",
        target: "randomEnemy",
        actionDesc: "{attacker} podpala {target}!",
        statusEffects: [
          {
            type: "dot",
            element: "fire",
            damage: 3,
            statusChance: 100,
            target: "randomEnemy",
            duration: 3,
            tickInfo: "{target} płonie i otrzymuje {damage} obrażeń.",
            endInfo: "Płomienie na {target} gasną.",
          },
        ],
        weight: 30,
      },
    ],
    reward: {
      runicShards: 5,
      description: "Popiół Ognistego Impa skrywa cenne runicznie naładowane fragmenty.",
      defeatFlavorText: "Ognisty Imp znika w kłębie dymu z piskliwym wrzaskiem.",
      victoryFlavorText: "Żar Ognistego Impa okazał się nie do zniesienia...",
    },
  },

  {
    id: "swamp_toad",
    name: "Szalonooka Ropucha",
    entityType: "exploration",
    imageKey: "toad_exploration.jpg",
    hp: 45,
    initiative: 4,
    resistances: { death: 5, water: 3 },
    statusImmunities: { dot: 1.0 },
    damageVariance: 15,
    attacks: [
      {
        name: "Jadowity język",
        damage: 3,
        element: "death",
        target: "randomEnemy",
        actionDesc: "{attacker} uderza {target} trującym językiem zadając {damage} obrażeń.",
        statusEffects: [
          {
            type: "dot",
            element: "death",
            damage: 2,
            statusChance: 60,
            target: "randomEnemy",
            duration: 4,
            tickInfo: "{target} trucizna pali i zadaje {damage} obrażeń.",
            failTickInfo: "{target} otrząsa się z jadu.",
            endInfo: "Trucizna w żyłach {target} zanika.",
          },
        ],
        weight: 100,
      },
    ],
    reward: {
      runicShards: 5,
      description: "Gruczoły jadowe Bagiennej Ropuchy zawierają cenne substancje.",
      defeatFlavorText: "Bagienna Ropucha nurkuje w mule z głuchym pluskiem.",
      victoryFlavorText: "Jad Bagiennej Ropuchy stopniowo pozbawia Cię sił...",
    },
  },

  // ── POZIOM 3 ──────────────────────────────────────────────────────────────

  {
    id: "ice_elemental",
    name: "Lodowy Elementalny",
    entityType: "exploration",
    imageKey: "elemental_study.jpg",
    hp: 60,
    initiative: 7,
    resistances: { water: 10, earth: 5 },
    statusImmunities: { dot: 0.5 },
    damageVariance: 15,
    attacks: [
      {
        name: "Lodowy cios",
        damage: 8,
        element: "water",
        target: "randomEnemy",
        actionDesc: "{attacker} uderza {target} lodową pięścią zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 60,
      },
      {
        name: "Zamrożenie",
        damage: 3,
        element: "water",
        target: "randomEnemy",
        actionDesc: "{attacker} próbuje zamrozić {target}!",
        statusEffects: [
          {
            type: "stun",
            statusChance: 40,
            target: "randomEnemy",
            duration: 1,
            tickInfo: "{target} jest zamrożony — traci akcję!",
            failTickInfo: "{target} wyswobadza się z lodu.",
            endInfo: "{target} rozmraża się.",
          },
          {
            type: "vulnerable",
            element: "fire",
            value: 30,
            target: "randomEnemy",
            duration: 3,
            endInfo: "Lód na {target} topnieje.",
          },
        ],
        weight: 40,
      },
    ],
    reward: {
      runicShards: 8,
      description: "Rdzeń Lodowego Elementalnego zawiera skoncentrowaną moc runiczną.",
      defeatFlavorText: "Lodowy Elementalny rozpada się na tysiące lodowych kryształków.",
      victoryFlavorText: "Lodowy Elementalny zakuł Cię w lód nie do przebicia...",
    },
  },

  {
    id: "1wolf1",
    name: "Zły Wilk",
    entityType: "exploration",
    imageKey: "wolf_exploration.jpg",
    hp: 55,
    initiative: 15,
    resistances: { chaos: 5 },
    statusImmunities: { stun: 0.5, damage_on_move: 0.5 },
    damageVariance: 25,
    attacks: [
      {
        name: "Szarża",
        damage: 10,
        element: "none",
        target: "randomEnemy",
        actionDesc: "{attacker} rzuca się na {target} zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 70,
      },
      {
        name: "Mroczny skok",
        damage: 6,
        element: "chaos",
        target: "randomEnemy",
        actionDesc: "{attacker} wyskakuje z cienia i uderza {target} zadając {damage} obrażeń.",
        statusEffects: [
          {
            type: "dot",
            element: "chaos",
            damage: 3,
            statusChance: 100,
            target: "randomEnemy",
            duration: 2,
            tickInfo: "Mroczna energia szarpie {target} zadając {damage} obrażeń.",
            endInfo: "Mroczna energia słabnie.",
          },
        ],
        weight: 30,
      },
    ],
    reward: {
      runicShards: 8,
      description: "Mroczna sierść Złego Wilka zawiera pulsującą energię runiczną.",
      defeatFlavorText: "Zły Wilk rozpływa się w ciemności z cichym wycem.",
      victoryFlavorText: "Zły Wilk rozszarpał Cię zanim zdążyłeś zareagować...",
    },
  },

  // ── POZIOM 4 ──────────────────────────────────────────────────────────────

  {
    id: "chaos_golem",
    name: "Golem Chaosu",
    entityType: "exploration",
    imageKey: "chaos_golem.jpg",
    hp: 90,
    initiative: 4,
    resistances: { chaos: 8, earth: 8 },
    statusImmunities: { stun: 1.0, damage_on_move: 1.0 },
    damageVariance: 10,
    attacks: [
      {
        name: "Chaotyczny cios",
        damage: 14,
        element: "chaos",
        target: "randomEnemy",
        actionDesc: "{attacker} miażdży {target} chaotyczną pięścią zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 60,
      },
      {
        name: "Uderzenie obszarowe",
        damage: 8,
        element: "earth",
        target: "allEnemies",
        actionDesc: "{attacker} trzęsie ziemią — wszyscy odczuwają wstrząs!",
        statusEffects: [],
        weight: 40,
      },
    ],
    reward: {
      runicShards: 12,
      description: "Kamienne serce Golema Chaosu emanuje potężną energią runiczną.",
      defeatFlavorText: "Golem Chaosu rozsypuje się w kupę dymiących głazów.",
      victoryFlavorText: "Nieokiełznana siła Golema Chaosu zmiażdżyła wszelki opór...",
    },
  },

  {
    id: "blood_witch",
    name: "Wiedźma Krwi",
    entityType: "exploration",
    imageKey: "blood_witch.jpg",
    hp: 70,
    initiative: 12,
    resistances: { death: 8 },
    statusImmunities: { dot: 0.5 },
    damageVariance: 20,
    attacks: [
      {
        name: "Krwawa strzała",
        damage: 10,
        element: "death",
        target: "randomEnemy",
        actionDesc: "{attacker} wysyła krwawą strzałę w {target} zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 50,
      },
      {
        name: "Klątwa krwi",
        damage: 5,
        element: "death",
        target: "randomEnemy",
        actionDesc: "{attacker} rzuca klątwę krwi na {target}!",
        statusEffects: [
          {
            type: "dot",
            element: "death",
            damage: 5,
            statusChance: 100,
            target: "randomEnemy",
            duration: 4,
            tickInfo: "Klątwa wysysa życie z {target} zadając {damage} obrażeń.",
            endInfo: "Klątwa krwi na {target} ustępuje.",
          },
        ],
        weight: 30,
      },
      {
        name: "Krwawa tarcza",
        damage: 0,
        element: "death",
        target: "self",
        actionDesc: "{attacker} owija się mroczną tarczą.",
        statusEffects: [
          {
            type: "resist",
            element: "death",
            value: 30,
            target: "self",
            duration: 3,
          },
        ],
        weight: 20,
      },
    ],
    reward: {
      runicShards: 12,
      description: "Grimuar Wiedźmy Krwi skrywa zapiski o runicznej magii.",
      defeatFlavorText: "Wiedźma Krwi znika w kłębie czarnego dymu z przeklęciem na ustach.",
      victoryFlavorText: "Klątwy Wiedźmy Krwi oplotły Cię i pozbawiły woli walki...",
    },
  },

  // ── POZIOM 5 ──────────────────────────────────────────────────────────────

  {
    id: "storm_drake",
    name: "Burzowy Drakon",
    entityType: "exploration",
    imageKey: "storm_drake.jpg",
    hp: 120,
    initiative: 14,
    resistances: { fire: 5, air: 10 },
    statusImmunities: { stun: 0.75 },
    damageVariance: 20,
    attacks: [
      {
        name: "Ognisty oddech",
        damage: 15,
        element: "fire",
        target: "allEnemies",
        actionDesc: "{attacker} zieje ogniem na wszystkich!",
        statusEffects: [
          {
            type: "dot",
            element: "fire",
            damage: 5,
            statusChance: 70,
            target: "allEnemies",
            duration: 2,
            tickInfo: "{target} płonie od smoczego ognia zadając {damage} obrażeń.",
            failTickInfo: "{target} unika płomieni.",
            endInfo: "Ogień draka gaśnie.",
          },
        ],
        weight: 40,
      },
      {
        name: "Piorunowy cios skrzydłem",
        damage: 18,
        element: "air",
        target: "randomEnemy",
        actionDesc: "{attacker} uderza {target} piorunującym skrzydłem zadając {damage} obrażeń.",
        statusEffects: [
          {
            type: "stun",
            statusChance: 30,
            target: "randomEnemy",
            duration: 1,
            tickInfo: "{target} jest ogłuszony uderzeniem skrzydła — traci akcję!",
            failTickInfo: "{target} utrzymuje równowagę.",
            endInfo: "{target} dochodzi do siebie.",
          },
        ],
        weight: 35,
      },
      {
        name: "Lot i atak z góry",
        damage: 22,
        element: "none",
        target: "randomEnemy",
        actionDesc: "{attacker} nurkuje z góry na {target} zadając {damage} obrażeń!",
        statusEffects: [],
        weight: 25,
      },
    ],
    reward: {
      runicShards: 20,
      description: "Łuski Burzowego Drakona są przepełnione elektryczną energią runiczną.",
      defeatFlavorText: "Burzowy Drakon wznosi się z rykiem w chmury i znika w burzy.",
      victoryFlavorText: "Burzowy Drakon spalił Cię ogniem i piorunami nie dając żadnych szans...",
    },
  },

  {
    id: "ancient_lich",
    name: "Starożytny Lisz",
    entityType: "exploration",
    imageKey: "ancient_lich.jpg",
    hp: 100,
    initiative: 10,
    resistances: { death: 10, chaos: 5 },
    statusImmunities: { stun: 1.0, dot: 0.5 },
    damageVariance: 15,
    attacks: [
      {
        name: "Śmiertelny dotyk",
        damage: 12,
        element: "death",
        target: "randomEnemy",
        actionDesc: "{attacker} dotyka {target} kościstą dłonią zadając {damage} obrażeń.",
        statusEffects: [
          {
            type: "dot",
            element: "death",
            damage: 6,
            statusChance: 100,
            target: "randomEnemy",
            duration: 5,
            tickInfo: "Nekrotyczna energia trawi {target} zadając {damage} obrażeń.",
            endInfo: "Nekrotyczny efekt wygasa.",
          },
        ],
        weight: 40,
      },
      {
        name: "Fala rozpaczy",
        damage: 8,
        element: "chaos",
        target: "allEnemies",
        actionDesc: "{attacker} wysyła falę rozpaczy — wszyscy odczuwają jej moc!",
        statusEffects: [
          {
            type: "stat_boost",
            stat: "power",
            statMode: "percent",
            statAmount: -25,
            target: "allEnemies",
            duration: 3,
            tickInfo: "Moc {target} jest osłabiona przez falę rozpaczy.",
            endInfo: "Osłabienie od fali rozpaczy ustępuje.",
          },
        ],
        weight: 35,
      },
      {
        name: "Regeneracja nieśmiertelności",
        damage: 0,
        element: "death",
        target: "self",
        actionDesc: "{attacker} regeneruje swoje kościste tkanki.",
        statusEffects: [
          {
            type: "heal_chance",
            healAmount: 15,
            healMode: "flat",
            statusChance: 100,
            target: "self",
            duration: 3,
            tickInfo: "Lisz regeneruje {damage} punktów życia.",
            endInfo: "Regeneracja Lisza kończy się.",
          },
        ],
        weight: 25,
      },
    ],
    reward: {
      runicShards: 20,
      description: "Filokteria Starożytnego Lisza zawiera esencję nieśmiertelności — bezcenną dla alchemika.",
      defeatFlavorText: "Starożytny Lisz rozpada się w pył, ale czujesz że to nie koniec...",
      victoryFlavorText: "Nekrotyczna magia Starożytnego Lisza pochłonęła Twoją żywotność...",
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PRZECIWNICY SZCZELIN
// ═══════════════════════════════════════════════════════════════════════════════

export const RIFT_ENTITIES: RiftEntityDef[] = [

  // ── Stokrotka ─────────────────────────────────────────────────────────────

  {
    id: "rift_green_scout",
    name: "Harcerz",
    entityType: "rift",
    riftWorldKey: "stokrotka",
    imageKey: "petal_guardian.jpg",
    hp: 50,
    initiative: 8,
    resistances: { earth: 5 },
    statusImmunities: {},
    damageVariance: 20,
    attacks: [
      {
        name: "Kolce stokrotki",
        damage: 7,
        element: "earth",
        target: "randomEnemy",
        actionDesc: "{attacker} ciska kolce stokrotki w {target} zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 60,
      },
      {
        name: "Kwiatowy pył",
        damage: 0,
        element: "earth",
        target: "randomEnemy",
        actionDesc: "{attacker} wysyła obłok kwiatowego pyłu na {target}!",
        statusEffects: [
          {
            type: "stun",
            statusChance: 50,
            target: "randomEnemy",
            duration: 1,
            tickInfo: "{target} jest otępiały od kwiatowego pyłu — traci akcję!",
            failTickInfo: "{target} wstrzymuje oddech i unika pyłu.",
            endInfo: "{target} odgania pył i odzyskuje przytomność.",
          },
        ],
        weight: 40,
      },
    ],
  },

  // ── Hobbiton ──────────────────────────────────────────────────────────────

  {
    id: "rift_green_hobbit",
    name: "Hobbitański Łobuz",
    entityType: "rift",
    riftWorldKey: "hobbiton",
    imageKey: "hobbit_green_rift.jpg",
    hp: 45,
    initiative: 12,
    resistances: {},
    statusImmunities: {},
    damageVariance: 25,
    attacks: [
      {
        name: "Ukradkowy cios",
        damage: 8,
        element: "none",
        target: "randomEnemy",
        actionDesc: "{attacker} atakuje {target} z zaskoczenia zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 70,
      },
      {
        name: "Rzut kamieniem",
        damage: 5,
        element: "earth",
        target: "randomEnemy",
        actionDesc: "{attacker} ciśnie kamieniem w {target} zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 30,
      },
    ],
  },

  // ── Szmaragdowe Miasto ────────────────────────────────────────────────────

  {
    id: "rift_green_guard",
    name: "Szmaragdowy Strażnik",
    entityType: "rift",
    riftWorldKey: "szmaragdowe_miasto",
    imageKey: "emerald_sentinel.jpg",
    hp: 70,
    initiative: 6,
    resistances: { earth: 12 },
    statusImmunities: { stun: 0.5 },
    damageVariance: 15,
    attacks: [
      {
        name: "Szmaragdowy cios",
        damage: 10,
        element: "earth",
        target: "randomEnemy",
        actionDesc: "{attacker} uderza {target} szmaragdową pięścią zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 50,
      },
      {
        name: "Tarcza szmaragdu",
        damage: 0,
        element: "earth",
        target: "self",
        actionDesc: "{attacker} okrywa się szmaragdową tarczą.",
        statusEffects: [
          {
            type: "resist",
            element: "earth",
            value: 50,
            target: "self",
            duration: 2,
          },
        ],
        weight: 30,
      },
      {
        name: "Szmaragdowy promień",
        damage: 12,
        element: "earth",
        target: "allEnemies",
        actionDesc: "{attacker} wysyła szmaragdowy promień we wszystkich!",
        statusEffects: [
          {
            type: "vulnerable",
            element: "earth",
            value: 20,
            target: "allEnemies",
            duration: 3,
          },
        ],
        weight: 20,
      },
    ],
  },

  {
    id: "rift_green_cowardly_lion",
    name: "Człowiek-Lew",
    entityType: "rift",
    riftWorldKey: "szmaragdowe_miasto",
    imageKey: "emerald_sentinel.jpg",
    hp: 70,
    initiative: 6,
    resistances: { earth: 12 },
    statusImmunities: { stun: 0.5 },
    damageVariance: 15,
    attacks: [
      {
        name: "Szmaragdowy cios",
        damage: 10,
        element: "earth",
        target: "randomEnemy",
        actionDesc: "{attacker} uderza {target} szmaragdową pięścią zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 50,
      },
      {
        name: "Tarcza szmaragdu",
        damage: 0,
        element: "earth",
        target: "self",
        actionDesc: "{attacker} okrywa się szmaragdową tarczą.",
        statusEffects: [
          {
            type: "resist",
            element: "earth",
            value: 50,
            target: "self",
            duration: 2,
          },
        ],
        weight: 30,
      },
      {
        name: "Szmaragdowy promień",
        damage: 12,
        element: "earth",
        target: "allEnemies",
        actionDesc: "{attacker} wysyła szmaragdowy promień we wszystkich!",
        statusEffects: [
          {
            type: "vulnerable",
            element: "earth",
            value: 20,
            target: "allEnemies",
            duration: 3,
          },
        ],
        weight: 20,
      },
    ],
  },
    {
    id: "rift_green_jeweler",
    name: "Kupiec",
    entityType: "rift",
    riftWorldKey: "szmaragdowe_miasto",
    imageKey: "hobbit_green_rift.jpg",
    hp: 45,
    initiative: 12,
    resistances: {},
    statusImmunities: {},
    damageVariance: 25,
    attacks: [
      {
        name: "Ukradkowy cios",
        damage: 8,
        element: "none",
        target: "randomEnemy",
        actionDesc: "{attacker} atakuje {target} z zaskoczenia zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 70,
      },
      {
        name: "Rzut kamieniem",
        damage: 5,
        element: "earth",
        target: "randomEnemy",
        actionDesc: "{attacker} ciśnie kamieniem w {target} zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 30,
      },
    ],
  },
  // ── Rust Wasteland ────────────────────────────────────────────────────────

  {
    id: "rust_scavenger",
    name: "Zbieracz Rdzy",
    entityType: "rift",
    riftWorldKey: "rust_wasteland",
    imageKey: "rust_scavenger.jpg",
    hp: 65,
    initiative: 10,
    resistances: { chaos: 5 },
    statusImmunities: {},
    damageVariance: 20,
    attacks: [
      {
        name: "Zardzewiały cios",
        damage: 9,
        element: "none",
        target: "randomEnemy",
        actionDesc: "{attacker} uderza {target} zardzewiałym narzędziem zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 60,
      },
      {
        name: "Korozja",
        damage: 4,
        element: "chaos",
        target: "randomEnemy",
        actionDesc: "{attacker} pokrywa {target} korozyjną substancją!",
        statusEffects: [
          {
            type: "dot",
            element: "chaos",
            damage: 4,
            statusChance: 100,
            target: "randomEnemy",
            duration: 3,
            tickInfo: "Korozja trawi {target} zadając {damage} obrażeń.",
            endInfo: "Korozja na {target} zatrzymuje się.",
          },
          {
            type: "vulnerable",
            element: "chaos",
            value: 15,
            target: "randomEnemy",
            duration: 3,
          },
        ],
        weight: 40,
      },
    ],
  },

  {
    id: "rust_colossus",
    name: "Kolos Rdzy",
    entityType: "rift",
    riftWorldKey: "rust_wasteland",
    imageKey: "rust_colossus.jpg",
    hp: 130,
    initiative: 3,
    resistances: { earth: 15, none: 5 },
    statusImmunities: { stun: 1.0, damage_on_move: 1.0, dot: 0.5 },
    damageVariance: 10,
    attacks: [
      {
        name: "Miażdżący cios",
        damage: 20,
        element: "earth",
        target: "randomEnemy",
        actionDesc: "{attacker} miażdży {target} potężną rdzewiałą pięścią zadając {damage} obrażeń!",
        statusEffects: [
          {
            type: "stun",
            statusChance: 25,
            target: "randomEnemy",
            duration: 1,
            tickInfo: "{target} jest ogłuszony ciosem Kolosa — traci akcję!",
            failTickInfo: "{target} utrzymuje przytomność.",
            endInfo: "{target} dochodzi do siebie.",
          },
        ],
        weight: 60,
      },
      {
        name: "Uderzenie obszarowe",
        damage: 12,
        element: "earth",
        target: "allEnemies",
        actionDesc: "{attacker} trzęsie ziemią wstrząsając pobojowiskiem!",
        statusEffects: [],
        weight: 40,
      },
    ],
  },
];


// src/data/minor-entities.ts – dodaj na samym dole, przed eksportami

// ═══════════════════════════════════════════════════════════════════════════════
// PRZECIWNICY STUDIÓW (przypadkowe przywołania)
// ═══════════════════════════════════════════════════════════════════════════════

export const STUDY_ENTITIES: ExplorationEntityDef[] = [
  {
    id: "study_imp_fire",
    name: "Ognisty Imp (przypadkowo przywołany)",
    entityType: "exploration", // używamy tego samego typu dla uproszczenia, ale źródło będziemy rozróżniać w logice
    imageKey: "imp_study.jpg",
    hp: 20,
    initiative: 8,
    resistances: { fire: 3 },
    statusImmunities: {},
    damageVariance: 15,
    attacks: [
      {
        name: "Ognisty pazur",
        damage: 4,
        element: "fire",
        target: "randomEnemy",
        actionDesc: "{attacker} rani {target} ognistym pazurem zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 80,
      },
      {
        name: "Podpalenie",
        damage: 0,
        element: "fire",
        target: "randomEnemy",
        actionDesc: "{attacker} próbuje podpalić {target}!",
        statusEffects: [
          {
            type: "dot",
            element: "fire",
            damage: 2,
            statusChance: 50,
            target: "randomEnemy",
            duration: 2,
            tickInfo: "{target} płonie i otrzymuje {damage} obrażeń.",
            endInfo: "Płomienie na {target} gasną.",
          },
        ],
        weight: 20,
      },
    ],
    reward: {
      runicShards: 2,
      description: "Imp pozostawia po sobie kilka iskier runicznych.",
      defeatFlavorText: "Imp znika w kłębie dymu z wrzaskiem.",
      victoryFlavorText: "Ognisty Imp atakuje Cię z zaskoczenia, ale udaje Ci się odeprzeć atak.",
    },
  },
  {
    id: "study_air_wisp",
    name: "Powietrzny Błąd (przypadkowo przywołany)",
    entityType: "exploration",
    imageKey: "air_wisp.jpg",
    hp: 18,
    initiative: 16,
    resistances: { air: 2 },
    statusImmunities: {},
    damageVariance: 20,
    attacks: [
      {
        name: "Podmuch",
        damage: 3,
        element: "air",
        target: "randomEnemy",
        actionDesc: "{attacker} uderza {target} podmuchem zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 70,
      },
      {
        name: "Zamieszanie",
        damage: 1,
        element: "air",
        target: "randomEnemy",
        actionDesc: "{attacker} próbuje zdezorientować {target}!",
        statusEffects: [
          {
            type: "stun",
            statusChance: 30,
            target: "randomEnemy",
            duration: 1,
            tickInfo: "{target} jest ogłuszony – traci akcję!",
            failTickInfo: "{target} utrzymuje koncentrację.",
            endInfo: "{target} odzyskuje przytomność.",
          },
        ],
        weight: 30,
      },
    ],
    reward: {
      runicShards: 2,
      description: "Błąd pozostawia po sobie wirującą energię.",
      defeatFlavorText: "Powietrzny Błąd rozpływa się w powietrzu.",
      victoryFlavorText: "Błąd atakuje Cię wichurą, ale udaje Ci się go rozproszyć.",
    },
  },
  {
    id: "study_shadow_rat",
    name: "Cieniowy Szczur (przypadkowo przywołany)",
    entityType: "exploration",
    imageKey: "forest_rat.jpg",
    hp: 16,
    initiative: 12,
    resistances: { chaos: 2 },
    statusImmunities: {},
    damageVariance: 15,
    attacks: [
      {
        name: "Ugryzienie z cienia",
        damage: 4,
        element: "chaos",
        target: "randomEnemy",
        actionDesc: "{attacker} atakuje {target} z cienia zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 80,
      },
      {
        name: "Mroczne ukąszenie",
        damage: 2,
        element: "chaos",
        target: "randomEnemy",
        actionDesc: "{attacker} zatapia zęby w {target}!",
        statusEffects: [
          {
            type: "dot",
            element: "chaos",
            damage: 1,
            statusChance: 40,
            target: "randomEnemy",
            duration: 2,
            tickInfo: "{target} odczuwa mroczne pulsowanie, tracąc {damage} HP.",
            endInfo: "Mroczna energia ustępuje.",
          },
        ],
        weight: 20,
      },
    ],
    reward: {
      runicShards: 2,
      description: "Szczur zostawia po sobie ciemny ślad.",
      defeatFlavorText: "Cieniowy Szczur rozpływa się w mroku.",
      victoryFlavorText: "Szczur atakuje z zaskoczenia, ale udaje Ci się go odstraszyć.",
    },
  },
  // Możesz dodać więcej bytów dla wyższych poziomów, na razie zostawiam te trzy dla poziomu 1.
];

// Funkcja pobierająca byty dla danego poziomu studiów
export function getStudyEntitiesForLevel(level: number): ExplorationEntityDef[] {
  // Na razie dla każdego poziomu zwracamy wszystkie, ale możesz zróżnicować:
  // np. poziom 1 -> pierwsze 2, poziom 2 -> wszystkie itp.
  // Dla uproszczenia zwracamy wszystkie, a szansa spotkania i tak jest niska.
  return STUDY_ENTITIES;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EKSPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_ENTITIES: MinorEntityDef[] = [
  ...EXPLORATION_ENTITIES,
  ...RIFT_ENTITIES,
];

export const ENTITY_MAP = new Map<string, MinorEntityDef>(
  ALL_ENTITIES.map(e => [e.id, e])
);

export function getExplorationEntitiesForLevel(level: number): ExplorationEntityDef[] {
  const all = EXPLORATION_ENTITIES;
  if (level <= 1) return all.slice(0, 3);
  if (level <= 2) return all.slice(1, 6);
  if (level <= 3) return all.slice(3, 7);
  if (level <= 4) return all.slice(5, 9);
  return all.slice(7);
}

export function getRiftEntitiesForWorld(worldKey: string): RiftEntityDef[] {
  return RIFT_ENTITIES.filter(e => e.riftWorldKey === worldKey);
}