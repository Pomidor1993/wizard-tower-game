// ═══════════════════════════════════════════════════════════════════════════════
// POMNIEJSZE BYTY — definicje przeciwników PvE w eksploracji
//
// Jak edytować:
//   • Każdy byt to obiekt MinorEntityDef w tablicy MINOR_ENTITIES
//   • Pole `element` decyduje, w których lokacjach może się pojawić (patrz LOCATION_ELEMENTS)
//   • Pola statystyk działają tak samo jak u gracza (hp, resistance, initiative itd.)
//   • `attacks` to lista własnych ataków bytu (nie używa puli Spell z bazy)
//   • `specialAttacks` to ataki z efektami statusów — opcjonalne
//   • `reward.runicShards` — ile okruchów kamienia runicznego gracz otrzymuje za zwycięstwo
// ═══════════════════════════════════════════════════════════════════════════════

// ── TYPY ────────────────────────────────────────────────────────────────────

export type EntityElement =
  | "fire" | "water" | "earth" | "air"
  | "life" | "death" | "energy" | "chaos";

export type AttackTargetType = "target" | "allEnemies";

export interface EntityAttack {
  name: string;
  description: string;        // Szablon opisu: {attacker}, {target} zostaną zastąpione
  damage: number;
  element: EntityElement | "basic";
  targetType: AttackTargetType;
  weight: number;             // Waga losowania — wyższy = częstszy (wszystkie ataki danego bytu sumują się do 100%)
}

export interface EntityStatusAttack extends EntityAttack {
  statusEffect: {
    type: "dot" | "stun" | "miss_chance" | "vulnerable" | "resist" | "heal_chance" | "stat_boost";
    element?: EntityElement | "basic";
    damage?: number;          // dla dot
    duration: number | null;  // null = do końca walki
    // stun
    stunChance?: number;
    stunDuration?: number;
    // miss_chance
    missChance?: number;
    // vulnerable / resist
    value?: number;
    // heal_chance
    healChance?: number;
    healAmount?: number;
    // stat_boost
    stat?: string;
    statMode?: "flat" | "percent";
    statAmount?: number;
    target: "target" | "self" | "allEnemies" | "allAllies" | "all";
  };
}

export interface MinorEntityDef {
  id: string;                 // Unikalny identyfikator (snake_case)
  name: string;               // Wyświetlana nazwa
  description: string;        // Krótki opis — pojawi się w raporcie walki
  isBoss?: boolean;             // Czy jest to silniejszy byt z unikalnym wyglądem (np. mini-boss)
  element: EntityElement;     // Żywioł bytu — decyduje o lokacji

  // ── Statystyki ──────────────────────────────────────────────────────────
  hp: number;
  resistance: number;
  initiative: number;
  power: number;
  intelligence: number;
  elementPower: number;
  fireMagic: number;
  waterMagic: number;
  earthMagic: number;
  airMagic: number;
  lifeMagic: number;
  deathMagic: number;
  chaosMagic: number;
  energyMagic: number;

  // ── Ataki ───────────────────────────────────────────────────────────────
  attacks: (EntityAttack | EntityStatusAttack)[];

  // ── Nagroda ─────────────────────────────────────────────────────────────
  reward: {
    runicShards: number;      // Okruchy kamienia runicznego za zwycięstwo
    description: string;      // Opis nagrody w raporcie
  };

  // ── Flawory ─────────────────────────────────────────────────────────────
  victoryFlavorText: string;  // Tekst przy przegranej gracza
  defeatFlavorText: string;   // Tekst przy wygranej gracza
}

// ── MAPOWANIE LOKACJI → ŻYWIOŁY ──────────────────────────────────────────────
// Zmień tutaj jeśli chcesz dostosować żywioły do lokacji
export const LOCATION_ELEMENTS: Record<number, EntityElement[]> = {
  1: ["air"],
  2: ["air", "earth", "water"],
  3: ["earth", "fire", "life"],
  4: ["fire", "water", "energy"],
  5: ["energy", "life", "death"],
};

// ── SZANSE NA SPOTKANIE ──────────────────────────────────────────────────────
// Odpowiadają encounterChance z ExplorationPanel
export const LOCATION_ENCOUNTER_CHANCE: Record<number, number> = {
  1: 0.99,   // 5%
  2: 0.10,   // 10%
  3: 0.00,   // 0% — miasto, brak spotkań
  4: 0.40,   // 40%
  5: 0.50,   // 50%
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINICJE BYTÓW
// ═══════════════════════════════════════════════════════════════════════════════

export const MINOR_ENTITIES: MinorEntityDef[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // ŻYWIOŁ POWIETRZA — pojawiają się w lokacjach 1 i 2
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "air_wisp",
    name: "Powietrzny Ognik",
    description: "Mała iskra świadomości utkana z wiatru. Bez złych intencji — po prostu nie potrafi przestać kąsać.",
    element: "air",
    hp: 8,
    resistance: 0,
    initiative: 6,
    power: 1,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 0, airMagic: 3,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Podmuch",
        description: "{attacker} zieje chłodnym podmuchem na {target}, zadając {damage} pkt obrażeń..",
        damage: 2,
        element: "air",
        targetType: "target",
        weight: 60,
      },
      {
        name: "Zawirowanie",
        description: "{attacker} otacza {target} wirującym powietrzem, dezorientując go i zadając {damage} pkt obrażeń..",
        damage: 1,
        element: "air",
        targetType: "target",
        weight: 40,
        statusEffect: {
          type: "miss_chance",
          missChance: 30,
          duration: 2,
          target: "target",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 1,
      description: "Rozwiany byt pozostawia po sobie drobinkę skrystalizowanej magii.",
    },
    victoryFlavorText: "Podmuch zimnego wiatru rozwiewa Cię — tym razem to błądzący wiatr wziął górę.",
    defeatFlavorText: "Rozpraszasz powietrzny byt! Zostaje po nim migocząca drobinka — okruch kamienia runicznego.",
  },

  {
    id: "air_gust",
    name: "Zły Wicher",
    description: "Starszy i bardziej zagniewany krewny Powietrznego Ognika. Wiał nad tymi wzgórzami na długo przed tym, zanim pojawiły się tu wieże.",
    element: "air",
    hp: 14,
    resistance: 1,
    initiative: 5,
  
    power: 2,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 0, airMagic: 5,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Uderzenie wiatru",
        description: "{attacker} uderza {target} silnym porywem, zadając {damage} pkt obrażeń.",
        damage: 3,
        element: "air",
        targetType: "target",
        weight: 50,
      },
      {
        name: "Tumult",
        description: "{attacker} wzbudza tumult, który dezorientuje wszystkich i zadaje {damage} pkt obrażeń.",
        damage: 1,
        element: "air",
        targetType: "allEnemies",
        weight: 30,
        statusEffect: {
          type: "miss_chance",
          missChance: 20,
          duration: 3,
          target: "allEnemies",
        },
      } as EntityStatusAttack,
      {
        name: "Szarża wiatru",
        description: "{attacker} uderza {target} z ogromną prędkością, zadając {damage} pkt obrażeń.",
        damage: 5,
        element: "air",
        targetType: "target",
        weight: 20,
      },
    ],
    reward: {
      runicShards: 2,
      description: "Wicher, rozbity przez twoją magię, zostawia dwa okruchy skrystalizowanego wiatru.",
    },
    victoryFlavorText: "Wicher zbyt gwałtowny — zrywa Cię z nóg i odrzuca.",
    defeatFlavorText: "Uciszasz Zły Wicher! Rozpływa się w powietrzu, zostawiając skrystalizowane okruchy magii.",
  },

  {
    id: "air_sprite",
    name: "Sylfa Burzy",
    description: "Duch burzy zamknięty w ciele małej istoty. Elektryzująca w dosłownym sensie.",
    element: "air",
    hp: 11,
    resistance: 0,
    initiative: 8,
    power: 2,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 0, airMagic: 4,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 2,
    attacks: [
      {
        name: "Iskra",
        description: "{attacker} posyła iskrę elektryczną w {target}, zadając {damage} pkt obrażeń.",
        damage: 3,
        element: "air",
        targetType: "target",
        weight: 50,
      },
      {
        name: "Porażenie",
        description: "{attacker} ładuje energię i wyładowuje ją w {target}, zadając {damage} pkt obrażeń!",
        damage: 2,
        element: "energy",
        targetType: "target",
        weight: 30,
        statusEffect: {
          type: "stun",
          stunChance: 35,
          stunDuration: 1,
          duration: null,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Elektryczny taniec",
        description: "{attacker} tańczy wokół {target}, mącąc jego koncentrację.",
        damage: 0,
        element: "air",
        targetType: "target",
        weight: 20,
        statusEffect: {
          type: "stat_boost",
          stat: "initiative",
          statMode: "percent",
          statAmount: -25,
          duration: 3,
          target: "target",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 2,
      description: "Sylfa burzy rozpada się w iskry, z których krystalizują się okruchy magii.",
    },
    victoryFlavorText: "Sylfa tanczy zbyt szybko — gubisz ją w wirze i padasz ogłuszony.",
    defeatFlavorText: "Rozpraszasz Sylfę Burzy! Iskry, które po niej zostały, skrystalizowały się.",
  },

  {
    id: "air_sentinel",
    name: "Strażnik Szczytu",
    description: "Jeden z najstarszych bytów powietrznych. Strzeże przełęczy z epok przed pierwszymi magami.",
    element: "air",
    hp: 20,
    resistance: 3,
    initiative: 4,
    power: 4,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 0, airMagic: 8,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Cios wiatrem",
        description: "{attacker} rozbija {target} falą skompresowanego powietrza, zadając {damage} pkt obrażeń.",
        damage: 5,
        element: "air",
        targetType: "target",
        weight: 40,
      },
      {
        name: "Wichura",
        description: "{attacker} rozpętuje małą wichurę, która rani wszystkich, zadając {damage} pkt obrażeń.",
        damage: 3,
        element: "air",
        targetType: "allEnemies",
        weight: 35,
      },
      {
        name: "Tarcza wiatru",
        description: "{attacker} otacza się ochronną warstwą powietrza.",
        damage: 0,
        element: "air",
        targetType: "target",
        weight: 25,
        statusEffect: {
          type: "resist",
          element: "air",
          value: 40,
          duration: 3,
          target: "self",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 3,
      description: "Strażnik pozostawia po sobie trzy okruchy dawnej mocy.",
    },
    victoryFlavorText: "Strażnik Szczytu decyduje, że nie przejdziesz — dziś.",
    defeatFlavorText: "Pokonujesz Strażnika Szczytu! Prastary byt rozpada się w wietrze, zostawiając okruchy.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ŻYWIOŁ ZIEMI — pojawiają się w lokacjach 2 i 3
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "earth_gnome",
    name: "Ziemny Skrzat",
    description: "Mały i zwinny. Trudno go trafić, bo ciągle chowa się za kamieniami.",
    element: "earth",
    hp: 10,
    resistance: 2,
    initiative: 3,
    power: 1,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 3, airMagic: 0,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Rzut kamieniem",
        description: "{attacker} rzuca kamieniem w {target}, zadając {damage} pkt obrażeń.",
        damage: 2,
        element: "earth",
        targetType: "target",
        weight: 70,
      },
      {
        name: "Tumult kamieni",
        description: "{attacker} kopie w grunt, podrzucając kamyki, które ranią wszystkich wokół, zadając {damage} pkt obrażeń.",
        damage: 1,
        element: "earth",
        targetType: "allEnemies",
        weight: 30,
      },
    ],
    reward: {
      runicShards: 1,
      description: "Skrzat zostawia po sobie kawałek skrystalizowanej ziemi.",
    },
    victoryFlavorText: "Skrzat chowa się za kamieniem i nie wychodzi. Mądrze.",
    defeatFlavorText: "Skrzat odpada! Pozostawia po sobie okruch magii ziemi.",
  },

  {
    id: "earth_golem_minor",
    name: "Mały Golem",
    description: "Zrobiony z gliny i dobrego humoru. Zły humor zaczyna się wtedy, gdy ktoś zaczyna rzucać w niego czarami.",
    element: "earth",
    hp: 22,
    resistance: 5,
    initiative: 1,
    power: 3,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 5, airMagic: 0,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Uderzenie pięścią",
        description: "{attacker} wali {target} gliniasto-kamienną pięścią, zadając {damage} pkt obrażeń.",
        damage: 5,
        element: "earth",
        targetType: "target",
        weight: 60,
      },
      {
        name: "Ziemny taras",
        description: "{attacker} podrzuca fragment gruntu pod {target}, spychając go i zadając {damage} pkt obrażeń..",
        damage: 3,
        element: "earth",
        targetType: "target",
        weight: 40,
        statusEffect: {
          type: "stat_boost",
          stat: "initiative",
          statMode: "flat",
          statAmount: -3,
          duration: 3,
          target: "target",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 2,
      description: "Golem kruszeje — w glinie błyszczą dwa okruchy runicznej mocy.",
    },
    victoryFlavorText: "Golem jest za ciężki — twoje zaklęcia odbijają się od niego jak od ściany.",
    defeatFlavorText: "Rozkruszasz Małego Golema! Z gliny wypadają okruchy runicznej energii.",
  },

  {
    id: "earth_troll",
    name: "Leśny Troll",
    description: "Nie jest zły — po prostu wszystko, co małe, wydaje mu się kulą do rzucania.",
    element: "earth",
    hp: 18,
    resistance: 4,
    initiative: 2,
    power: 5,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 4, airMagic: 0,
    lifeMagic: 2, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Drzewny cios",
        description: "{attacker} uderza {target} pniem drzewa, zadając {damage} pkt obrażeń.",
        damage: 6,
        element: "earth",
        targetType: "target",
        weight: 50,
      },
      {
        name: "Regeneracja",
        description: "{attacker} liże własne rany — skóra zrasta się powoli.",
        damage: 0,
        element: "life",
        targetType: "target",
        weight: 30,
        statusEffect: {
          type: "heal_chance",
          healChance: 60,
          healAmount: 3,
          duration: 3,
          target: "self",
        },
      } as EntityStatusAttack,
      {
        name: "Miażdżący skok",
        description: "{attacker} skacze i ląduje blisko {target}.",
        damage: 4,
        element: "earth",
        targetType: "target",
        weight: 20,
      },
    ],
    reward: {
      runicShards: 2,
      description: "Troll zostawia po sobie odłupek skrystalizowanej leśnej magii.",
    },
    victoryFlavorText: "Troll poprawia chwyt na pniu drzewa. Tym razem to Ty go potrzebujesz.",
    defeatFlavorText: "Troll pada! Skrystalizowane okruchy wypadają z pnia, który dźwigał.",
  },

  {
    id: "earth_basilisk",
    name: "Bazyliszek Kamienny",
    description: "Nie zamienia w kamień — ale jego spojrzenie sprawia, że bardzo nie chce się ruszać.",
    element: "earth",
    hp: 16,
    resistance: 3,
    initiative: 4,
    power: 3,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 6, airMagic: 0,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Ukąszenie",
        description: "{attacker} kąsa {target} kamienną szczęką.",
        damage: 4,
        element: "earth",
        targetType: "target",
        weight: 45,
      },
      {
        name: "Kamienny wzrok",
        description: "{attacker} wbija wzrok w {target} — coś twardnieje w mięśniach.",
        damage: 0,
        element: "earth",
        targetType: "target",
        weight: 35,
        statusEffect: {
          type: "stat_boost",
          stat: "initiative",
          statMode: "percent",
          statAmount: -40,
          duration: 2,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Kamienny oddech",
        description: "{attacker} zieje kamiennym pyłem na {target}, czyniąc go podatnym.",
        damage: 2,
        element: "earth",
        targetType: "target",
        weight: 20,
        statusEffect: {
          type: "vulnerable",
          element: "earth",
          value: 30,
          duration: 3,
          target: "target",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 2,
      description: "Bazyliszek zostawia po sobie łuski nasiąknięte magią ziemi.",
    },
    victoryFlavorText: "Kamienny wzrok Bazyliszka — i zacierasz się jak posąg.",
    defeatFlavorText: "Bazyliszek się wycofuje! Zostawia po sobie łuski z okruchami magii.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ŻYWIOŁ WODY — pojawiają się w lokacjach 2 i 4
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "water_sprite",
    name: "Wodny Duszek",
    description: "Zwinny duszek strumienia. Lubi spryskiwać przechodniów dla żartu.",
    element: "water",
    hp: 9,
    resistance: 0,
    initiative: 5,
    power: 1,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 3, earthMagic: 0, airMagic: 0,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Strumień wody",
        description: "{attacker} posyła strumień wody w {target}.",
        damage: 2,
        element: "water",
        targetType: "target",
        weight: 60,
      },
      {
        name: "Przemoczenie",
        description: "{attacker} moczy {target} do suchej nitki — energia razi mocniej.",
        damage: 0,
        element: "water",
        targetType: "target",
        weight: 40,
        statusEffect: {
          type: "vulnerable",
          element: "energy",
          value: 40,
          duration: 3,
          target: "target",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 1,
      description: "Duszek zostawia po sobie kroplę skrystalizowanej wody.",
    },
    victoryFlavorText: "Duszek śmieje się i odpływa w górę strumienia.",
    defeatFlavorText: "Rozpraszasz Wodnego Duszka! Zostaje po nim skrystalizowana kropla magii.",
  },

  {
    id: "water_kelpie",
    name: "Niksja",
    description: "Duch wody w półludzkiej postaci. Nie zrobi Ci krzywdy — jeśli jej na to pozwolisz.",
    element: "water",
    hp: 15,
    resistance: 1,
    initiative: 5,
    power: 2,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 5, earthMagic: 0, airMagic: 0,
    lifeMagic: 2, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Fala",
        description: "{attacker} wzywa falę, która uderza {target}.",
        damage: 4,
        element: "water",
        targetType: "target",
        weight: 40,
      },
      {
        name: "Zimny dotyk",
        description: "{attacker} dotyka {target} lodowatą dłonią — krew zwalnia.",
        damage: 2,
        element: "water",
        targetType: "target",
        weight: 35,
        statusEffect: {
          type: "stat_boost",
          stat: "initiative",
          statMode: "flat",
          statAmount: -4,
          duration: 2,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Wodna tarcza",
        description: "{attacker} otacza się wodną zasłoną.",
        damage: 0,
        element: "water",
        targetType: "target",
        weight: 25,
        statusEffect: {
          type: "resist",
          element: "fire",
          value: 50,
          duration: 3,
          target: "self",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 2,
      description: "Niksja zostawia po sobie dwa okruchy wodnistej magii.",
    },
    victoryFlavorText: "Niksja wciąga Cię pod powierzchnię wody — walczysz z nurtem, nie z nią.",
    defeatFlavorText: "Niksja odpływa pokonana! Zostawia po sobie okruchy skrystalizowanej wody.",
  },

  {
    id: "water_leviathan_minor",
    name: "Mały Lewiatan",
    description: "Pomniejszy krewniak Lewiatana. Nadal całkiem imponujący jak na 'mały'.",
    element: "water",
    hp: 24,
    resistance: 3,
    initiative: 2,
    power: 4,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 7, earthMagic: 0, airMagic: 0,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 2,
    attacks: [
      {
        name: "Uderzenie ogonem",
        description: "{attacker} uderza {target} potężnym ogonem.",
        damage: 6,
        element: "water",
        targetType: "target",
        weight: 45,
      },
      {
        name: "Fala uderzeniowa",
        description: "{attacker} rozkazuje wodzie uderzyć wszystkich dookoła.",
        damage: 3,
        element: "water",
        targetType: "allEnemies",
        weight: 35,
      },
      {
        name: "Aura mrozu",
        description: "{attacker} emanuje lodowatym zimnem — wszyscy wrogowie zwalniają.",
        damage: 0,
        element: "water",
        targetType: "allEnemies",
        weight: 20,
        statusEffect: {
          type: "stat_boost",
          stat: "initiative",
          statMode: "percent",
          statAmount: -20,
          duration: 3,
          target: "allEnemies",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 3,
      description: "Mały Lewiatan zostawia po sobie trzy okruchy głębinowej mocy.",
    },
    victoryFlavorText: "Lewiatan zanurza Cię w fali — walczysz z prądem, nie z nim.",
    defeatFlavorText: "Mały Lewiatan odpływa pokonany! Trzy okruchy głębinowej mocy — Twoje.",
  },

  {
    id: "water_siren",
    name: "Wodna Syrena",
    description: "Jej pieśń brzmi jak muzyka sfer. Niestety, sferą jest Twój wróg.",
    element: "water",
    hp: 13,
    resistance: 1,
    initiative: 6,
    power: 2,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 4, earthMagic: 0, airMagic: 1,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Hipnotyczna pieśń",
        description: "{attacker} śpiewa pieśń, która dezorientuje {target}.",
        damage: 0,
        element: "water",
        targetType: "target",
        weight: 40,
        statusEffect: {
          type: "miss_chance",
          missChance: 40,
          duration: 2,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Wodna strzała",
        description: "{attacker} wystrzeliwuje ostrą strzałę z wody.",
        damage: 3,
        element: "water",
        targetType: "target",
        weight: 40,
      },
      {
        name: "Ogłuszające solo",
        description: "{attacker} wyśpiewuje ostry ton, który ogłusza {target}.",
        damage: 1,
        element: "air",
        targetType: "target",
        weight: 20,
        statusEffect: {
          type: "stun",
          stunChance: 45,
          stunDuration: 1,
          duration: null,
          target: "target",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 2,
      description: "Syrena zostawia po sobie echo skrystalizowanego dźwięku.",
    },
    victoryFlavorText: "Pieśń Syreny brzmi pięknie — i na tym koniec Twojej walki.",
    defeatFlavorText: "Syrena milknie! Skrystalizowane echo jej pieśni spada na ziemię.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ŻYWIOŁ OGNIA — pojawiają się w lokacjach 3 i 4
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "fire_imp",
    name: "Ognisty Chochlik",
    description: "Mały i wredny. Jak iskra — mały, irytujący i wystarczy chwila nieuwagi.",
    element: "fire",
    hp: 8,
    resistance: 0,
    initiative: 7,
    power: 1,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 4, waterMagic: 0, earthMagic: 0, airMagic: 0,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Ognista iskra",
        description: "{attacker} pluje iskrą w {target}.",
        damage: 2,
        element: "fire",
        targetType: "target",
        weight: 50,
      },
      {
        name: "Podpalenie",
        description: "{attacker} podpala {target} — płomień będzie go trawić.",
        damage: 1,
        element: "fire",
        targetType: "target",
        weight: 50,
        statusEffect: {
          type: "dot",
          element: "fire",
          damage: 2,
          duration: 3,
          target: "target",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 1,
      description: "Chochlik gaśnie, zostawiając po sobie żarzący okruch.",
    },
    victoryFlavorText: "Chochlik wskakuje na Cię i nie odpuszcza. Tym razem ogień wygrywa.",
    defeatFlavorText: "Gasisz Ognistego Chochlika! Zostaje po nim żarzący okruch runicznej mocy.",
  },

  {
    id: "fire_elemental",
    name: "Płomiennik",
    description: "Prosta kreatura z czystego ognia. Bez złożonej natury — jest ogniem, chce palić.",
    element: "fire",
    hp: 16,
    resistance: 0,
    initiative: 4,
    power: 4,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 6, waterMagic: 0, earthMagic: 0, airMagic: 0,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Ognisty cios",
        description: "{attacker} uderza {target} płonącą ręką.",
        damage: 5,
        element: "fire",
        targetType: "target",
        weight: 40,
      },
      {
        name: "Ognista aura",
        description: "{attacker} wybucha żarem, paląc wszystkich w pobliżu.",
        damage: 3,
        element: "fire",
        targetType: "allEnemies",
        weight: 35,
      },
      {
        name: "Spalenie",
        description: "{attacker} ogarnia {target} płomieniem, który nie gaśnie łatwo.",
        damage: 2,
        element: "fire",
        targetType: "target",
        weight: 25,
        statusEffect: {
          type: "dot",
          element: "fire",
          damage: 3,
          duration: 4,
          target: "target",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 2,
      description: "Płomiennik gaśnie — zostają dwa okruchy skrystalizowanego żaru.",
    },
    victoryFlavorText: "Płomiennik ogarnia Cię falą żaru. Cofa się z satysfakcją.",
    defeatFlavorText: "Gatujesz Płomiennika! Zostają po nim dwa żarzące okruchy mocy.",
  },

  {
    id: "fire_drake",
    name: "Ognisty Drakling",
    description: "Za mały żeby to był smok, za groźny żeby to był jaszczur. Gdzieś pomiędzy.",
    element: "fire",
    hp: 20,
    resistance: 2,
    initiative: 5,
    power: 5,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 7, waterMagic: 0, earthMagic: 0, airMagic: 0,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Ziew ognia",
        description: "{attacker} zieje ogniem na {target}.",
        damage: 6,
        element: "fire",
        targetType: "target",
        weight: 40,
      },
      {
        name: "Plucie żarem",
        description: "{attacker} pluje żarzoną kulą w {target}.",
        damage: 4,
        element: "fire",
        targetType: "target",
        weight: 35,
        statusEffect: {
          type: "dot",
          element: "fire",
          damage: 2,
          duration: 3,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Ogniste skrzydła",
        description: "{attacker} uderza skrzydłami, wzbudzając ognisty podmuch.",
        damage: 4,
        element: "fire",
        targetType: "allEnemies",
        weight: 25,
      },
    ],
    reward: {
      runicShards: 3,
      description: "Drakling zostawia po sobie trzy okruchy ognistej mocy.",
    },
    victoryFlavorText: "Drakling okazał się trudniejszy niż wyglądał. Ogień wygrywa.",
    defeatFlavorText: "Pokonujesz Ognistego Draklinga! Trzy okruchy ognistej mocy są Twoje.",
  },

  {
    id: "fire_phoenix_minor",
    name: "Młody Feniks",
    description: "Jeszcze się nie odrodzić nauczył — ale i tak potrafi porządnie poparzyć.",
    element: "fire",
    hp: 18,
    resistance: 1,
    initiative: 6,
    power: 4,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 6, waterMagic: 0, earthMagic: 0, airMagic: 2,
    lifeMagic: 3, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Ogniste pióra",
        description: "{attacker} strzela ognistymi piórami w {target}.",
        damage: 4,
        element: "fire",
        targetType: "target",
        weight: 40,
      },
      {
        name: "Odnawiające ciepło",
        description: "{attacker} skupia ciepło życia w sobie.",
        damage: 0,
        element: "life",
        targetType: "target",
        weight: 30,
        statusEffect: {
          type: "heal_chance",
          healChance: 50,
          healAmount: 4,
          duration: 3,
          target: "self",
        },
      } as EntityStatusAttack,
      {
        name: "Ognisty taniec",
        description: "{attacker} tańczy w kółko, wzbudzając ochronny płomień.",
        damage: 0,
        element: "fire",
        targetType: "target",
        weight: 30,
        statusEffect: {
          type: "resist",
          element: "fire",
          value: 60,
          duration: 3,
          target: "self",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 3,
      description: "Feniks znika w płomieniu — zostawia po sobie trzy popielate okruchy.",
    },
    victoryFlavorText: "Feniks wznosi się w górę — może kiedyś dorośnie i powróci.",
    defeatFlavorText: "Młody Feniks znika w popiele! Trzy okruchy ognistej magii są Twoje.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ŻYWIOŁ ŻYCIA — pojawiają się w lokacjach 3 i 5
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "life_vine",
    name: "Pnącze Strażnicze",
    description: "Kiedy roślina zaczyna mieć własne zdanie na temat intruzów — to masz Pnącze Strażnicze.",
    element: "life",
    hp: 12,
    resistance: 1,
    initiative: 1,
    power: 1,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 2, airMagic: 0,
    lifeMagic: 4, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Splątanie",
        description: "{attacker} owija {target} pnączami.",
        damage: 1,
        element: "earth",
        targetType: "target",
        weight: 45,
        statusEffect: {
          type: "stat_boost",
          stat: "initiative",
          statMode: "flat",
          statAmount: -5,
          duration: 2,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Kolce",
        description: "{attacker} wypuszcza kolce w {target}.",
        damage: 3,
        element: "earth",
        targetType: "target",
        weight: 35,
      },
      {
        name: "Odrodzenie",
        description: "{attacker} wchłania energię ziemi — odrastają urwane pędy.",
        damage: 0,
        element: "life",
        targetType: "target",
        weight: 20,
        statusEffect: {
          type: "heal_chance",
          healChance: 70,
          healAmount: 3,
          duration: 4,
          target: "self",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 1,
      description: "Pnącze opada — w liściach błyszczy okruch runicznej natury.",
    },
    victoryFlavorText: "Pnącze opasuje Cię pędami. Nie da się walczyć z lasem.",
    defeatFlavorText: "Pnącze Strażnicze opada! W liściach lśni okruch runicznej mocy.",
  },

  {
    id: "life_dryad",
    name: "Driadessa",
    description: "Duch lasu w kobiecej postaci. Chroni swoje drzewa. Twoje drzewa już nie.",
    element: "life",
    hp: 16,
    resistance: 2,
    initiative: 4,
    power: 3,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 2, earthMagic: 2, airMagic: 0,
    lifeMagic: 6, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Zew lasu",
        description: "{attacker} wzywa naturę, by otoczyła {target} kolcami.",
        damage: 3,
        element: "earth",
        targetType: "target",
        weight: 40,
        statusEffect: {
          type: "dot",
          element: "earth",
          damage: 1,
          duration: 4,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Lecznicze promienie",
        description: "{attacker} wchłania promienie słońca — rany zrastają się.",
        damage: 0,
        element: "life",
        targetType: "target",
        weight: 35,
        statusEffect: {
          type: "heal_chance",
          healChance: 65,
          healAmount: 4,
          duration: 3,
          target: "self",
        },
      } as EntityStatusAttack,
      {
        name: "Korzenny cios",
        description: "{attacker} kieruje korzenie drzewa w {target}.",
        damage: 4,
        element: "earth",
        targetType: "target",
        weight: 25,
      },
    ],
    reward: {
      runicShards: 2,
      description: "Driadessa wycofuje się do drzewa — liście, które opadają, kryją okruchy mocy.",
    },
    victoryFlavorText: "Las jest po jej stronie. Widzisz to, kiedy jest za późno.",
    defeatFlavorText: "Driadessa wycofuje się! Opadające liście kryją okruchy runicznej mocy.",
  },

  {
    id: "life_guardian_beast",
    name: "Bestia Strażnik",
    description: "Wielkie stworzenie z natury, chroniące swoje terytorium. Nie atakuje bez powodu — ale Ty dałeś jej powód.",
    element: "life",
    hp: 25,
    resistance: 4,
    initiative: 3,
    power: 5,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 3, airMagic: 0,
    lifeMagic: 6, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Szarża",
        description: "{attacker} szarżuje na {target} z pełną mocą.",
        damage: 7,
        element: "basic",
        targetType: "target",
        weight: 40,
      },
      {
        name: "Ryknięcie",
        description: "{attacker} rży przerażająco — {target} się waha.",
        damage: 0,
        element: "basic",
        targetType: "target",
        weight: 30,
        statusEffect: {
          type: "stat_boost",
          stat: "power",
          statMode: "flat",
          statAmount: -4,
          duration: 2,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Instynkt przetrwania",
        description: "{attacker} skupia energię życia — rany szybciej się goją.",
        damage: 0,
        element: "life",
        targetType: "target",
        weight: 30,
        statusEffect: {
          type: "heal_chance",
          healChance: 55,
          healAmount: 5,
          duration: 4,
          target: "self",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 3,
      description: "Bestia odpada — w sierści błyszczy trzy okruchy życiowej mocy.",
    },
    victoryFlavorText: "Bestia jest na swoim terytorium. Ty — nie.",
    defeatFlavorText: "Bestia Strażnik odpada! Trzy okruchy życiowej mocy są Twoje.",
  },

  {
    id: "life_forest_spirit",
    name: "Duch Puszczy",
    description: "Stary duch puszczy, który pamięta czasy przed pierwszymi magami. Lubi spokój.",
    element: "life",
    hp: 19,
    resistance: 2,
    initiative: 5,
    power: 3,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 1, earthMagic: 2, airMagic: 1,
    lifeMagic: 7, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Leśne splątanie",
        description: "{attacker} woła drzewa — korzenie oplatają {target}.",
        damage: 2,
        element: "earth",
        targetType: "target",
        weight: 35,
        statusEffect: {
          type: "stun",
          stunChance: 40,
          stunDuration: 1,
          duration: null,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Mgła puszczy",
        description: "{attacker} roztacza mgłę — trudno celować.",
        damage: 0,
        element: "air",
        targetType: "allEnemies",
        weight: 35,
        statusEffect: {
          type: "miss_chance",
          missChance: 30,
          duration: 3,
          target: "allEnemies",
        },
      } as EntityStatusAttack,
      {
        name: "Dotyk natury",
        description: "{attacker} przywraca sobie energię z natury wokół.",
        damage: 0,
        element: "life",
        targetType: "target",
        weight: 30,
        statusEffect: {
          type: "heal_chance",
          healChance: 60,
          healAmount: 4,
          duration: 4,
          target: "self",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 2,
      description: "Duch puszczy odpada — leśna energia krystalizuje się w okruchy.",
    },
    victoryFlavorText: "Mgła puszczy gęstnieje. Poza nią nie ma nic — oprócz porażki.",
    defeatFlavorText: "Duch Puszczy odpada! Leśna energia krystalizuje się w dwa okruchy.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ŻYWIOŁ ENERGII — pojawiają się w lokacjach 4 i 5
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "energy_spark",
    name: "Ruchomy Ładunek",
    description: "Kulka czystej energii z własną wolą. Cel — naładować cokolwiek, co znajdzie.",
    element: "energy",
    hp: 10,
    resistance: 0,
    initiative: 8,
    power: 2,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 0, airMagic: 0,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 5,
    attacks: [
      {
        name: "Wyładowanie",
        description: "{attacker} wyładowuje się w {target}.",
        damage: 4,
        element: "energy",
        targetType: "target",
        weight: 60,
      },
      {
        name: "Łańcuch energii",
        description: "{attacker} rozładowuje energię, która razí wszystkich.",
        damage: 2,
        element: "energy",
        targetType: "allEnemies",
        weight: 40,
      },
    ],
    reward: {
      runicShards: 2,
      description: "Ładunek gaśnie — zostają dwa okruchy skrystalizowanej energii.",
    },
    victoryFlavorText: "Energia jest wszędzie — i wszędzie boli.",
    defeatFlavorText: "Ruchomy Ładunek gaśnie! Dwa okruchy skrystalizowanej energii.",
  },

  {
    id: "energy_construct",
    name: "Konstrukt Energii",
    description: "Zbudowany z czystej magicznej energii przez kogoś, kto już nie żyje. Albo żyje. Trudno powiedzieć.",
    element: "energy",
    hp: 18,
    resistance: 2,
    initiative: 5,
    power: 4,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 0, airMagic: 0,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 7,
    attacks: [
      {
        name: "Energetyczny cios",
        description: "{attacker} uderza {target} wiązką energii.",
        damage: 5,
        element: "energy",
        targetType: "target",
        weight: 40,
      },
      {
        name: "Impuls",
        description: "{attacker} emituje impuls energii, który uderza wszystkich.",
        damage: 3,
        element: "energy",
        targetType: "allEnemies",
        weight: 30,
      },
      {
        name: "Podatność energetyczna",
        description: "{attacker} moduluje pole energetyczne wokół {target}.",
        damage: 0,
        element: "energy",
        targetType: "target",
        weight: 30,
        statusEffect: {
          type: "vulnerable",
          element: "energy",
          value: 50,
          duration: 3,
          target: "target",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 3,
      description: "Konstrukt rozpada się — energia krystalizuje w trzy okruchy.",
    },
    victoryFlavorText: "Konstrukt dostosowuje się do Twoich ataków. Ty nie możesz.",
    defeatFlavorText: "Konstrukt Energii rozpada się! Trzy okruchy skrystalizowanej energii.",
  },

  {
    id: "energy_storm_core",
    name: "Rdzeń Burzy",
    description: "Centrum żyjącej burzy. Wyprowadzić go z równowagi to jedno — przeżyć to drugie.",
    element: "energy",
    hp: 22,
    resistance: 1,
    initiative: 6,
    power: 5,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 0, airMagic: 3,
    lifeMagic: 0, deathMagic: 0, chaosMagic: 0, energyMagic: 8,
    attacks: [
      {
        name: "Burzowe wyładowanie",
        description: "{attacker} uwalnia energię burzy w {target}.",
        damage: 7,
        element: "energy",
        targetType: "target",
        weight: 35,
      },
      {
        name: "Burzowa fala",
        description: "{attacker} rozszerza burzę — energia uderza wszystkich.",
        damage: 4,
        element: "energy",
        targetType: "allEnemies",
        weight: 30,
      },
      {
        name: "Ogłuszający piorun",
        description: "{attacker} kieruje piorun bezpośrednio w {target}.",
        damage: 3,
        element: "energy",
        targetType: "target",
        weight: 20,
        statusEffect: {
          type: "stun",
          stunChance: 50,
          stunDuration: 2,
          duration: null,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Pole energetyczne",
        description: "{attacker} otacza się polem energetycznym, które absorbuje obrażenia.",
        damage: 0,
        element: "energy",
        targetType: "target",
        weight: 15,
        statusEffect: {
          type: "resist",
          element: "energy",
          value: 45,
          duration: 2,
          target: "self",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 4,
      description: "Rdzeń Burzy imploduje — cztery okruchy burzowej mocy.",
    },
    victoryFlavorText: "Burza pochłania Cię — jesteś tylko człowiekiem z różdżką.",
    defeatFlavorText: "Rdzeń Burzy imploduje! Cztery okruchy burzowej mocy są Twoje.",
  },

  {
    id: "energy_specter",
    name: "Energetyczny Spektr",
    description: "Coś między duchem a istotą energetyczną. Nikt nie wie, jak powstał. On też nie wie.",
    element: "energy",
    hp: 15,
    resistance: 1,
    initiative: 7,
    power: 3,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 0, airMagic: 0,
    lifeMagic: 0, deathMagic: 2, chaosMagic: 0, energyMagic: 6,
    attacks: [
      {
        name: "Widmowy dotyk",
        description: "{attacker} dotyka {target} przez materię — coś wysysa siłę.",
        damage: 3,
        element: "energy",
        targetType: "target",
        weight: 40,
        statusEffect: {
          type: "stat_boost",
          stat: "power",
          statMode: "flat",
          statAmount: -3,
          duration: 3,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Widmowy puls",
        description: "{attacker} emituje puls, który przenika wszystkich.",
        damage: 3,
        element: "energy",
        targetType: "allEnemies",
        weight: 35,
      },
      {
        name: "Fazowanie",
        description: "{attacker} częściowo materiuje się — trudno go trafić.",
        damage: 0,
        element: "energy",
        targetType: "target",
        weight: 25,
        statusEffect: {
          type: "miss_chance",
          missChance: 45,
          duration: 2,
          target: "self",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 3,
      description: "Spektr rozpada się — zostają trzy okruchy zmateriowanej energii.",
    },
    victoryFlavorText: "Spektr fazuje się przez Twoje ataki. Fizyki nie da się pokonać magią.",
    defeatFlavorText: "Energetyczny Spektr materializuje się ostatni raz — i rozpada. Trzy okruchy.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ŻYWIOŁ ŚMIERCI — pojawiają się w lokacji 5
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "death_wraith",
    name: "Widmo",
    description: "Resztki duszy, która nie chce odejść. Cierpi i chce, żebyś cierpiał razem.",
    element: "death",
    hp: 14,
    resistance: 1,
    initiative: 5,
    power: 2,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 0, airMagic: 0,
    lifeMagic: 0, deathMagic: 5, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Dotyk śmierci",
        description: "{attacker} dotyka {target} lodowatą dłonią.",
        damage: 4,
        element: "death",
        targetType: "target",
        weight: 45,
      },
      {
        name: "Energetyczne wysysanie",
        description: "{attacker} wysysa żywotną energię z {target}.",
        damage: 2,
        element: "death",
        targetType: "target",
        weight: 35,
        statusEffect: {
          type: "dot",
          element: "death",
          damage: 2,
          duration: 3,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Mgła śmierci",
        description: "{attacker} roztacza zimną mgłę — trudno odróżnić widmo od cienia.",
        damage: 0,
        element: "death",
        targetType: "target",
        weight: 20,
        statusEffect: {
          type: "miss_chance",
          missChance: 35,
          duration: 2,
          target: "self",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 3,
      description: "Widmo rozwiewa się — zostają trzy okruchy zamarłej mocy.",
    },
    victoryFlavorText: "Widmo wchłania Twoją żywotną energię. Nie dałeś rady.",
    defeatFlavorText: "Widmo rozwiewa się! Trzy okruchy zamarłej mocy.",
  },

  {
    id: "death_banshee",
    name: "Banshee",
    description: "Jej krzyk zapowiada śmierć. Ciekawe, czyjej.",
    element: "death",
    hp: 17,
    resistance: 0,
    initiative: 6,
    power: 3,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 0, airMagic: 1,
    lifeMagic: 0, deathMagic: 6, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Śmiertelny krzyk",
        description: "{attacker} wydaje przeraźliwy krzyk, który paraliżuje {target}.",
        damage: 2,
        element: "death",
        targetType: "target",
        weight: 40,
        statusEffect: {
          type: "stun",
          stunChance: 55,
          stunDuration: 1,
          duration: null,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Cichy szloch",
        description: "{attacker} szlocha cicho — energia śmierci kruszy wytrzymałość {target}.",
        damage: 3,
        element: "death",
        targetType: "target",
        weight: 35,
        statusEffect: {
          type: "stat_boost",
          stat: "resistance",
          statMode: "flat",
          statAmount: -5,
          duration: 3,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Widmowa forma",
        description: "{attacker} przyjmuje widmową formę — staje się trudniejsza do trafienia.",
        damage: 0,
        element: "death",
        targetType: "target",
        weight: 25,
        statusEffect: {
          type: "miss_chance",
          missChance: 40,
          duration: 2,
          target: "self",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 3,
      description: "Banshee milknie — trzy okruchy śmiertelnej mocy.",
    },
    victoryFlavorText: "Krzyk Banshee brzmi jak wyrok — i jest nim.",
    defeatFlavorText: "Banshee milknie na zawsze! Trzy okruchy śmiertelnej mocy.",
  },

  {
    id: "death_lich_minor",
    name: "Pomniejszy Lich",
    description: "Nie do końca lich — dopiero się uczy. Ale już niebezpieczny.",
    element: "death",
    hp: 20,
    resistance: 2,
    initiative: 3,
    power: 4,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 0, airMagic: 0,
    lifeMagic: 0, deathMagic: 8, chaosMagic: 2, energyMagic: 0,
    attacks: [
      {
        name: "Nekrotyczny cios",
        description: "{attacker} kieruje falę nekrotycznej energii w {target}.",
        damage: 6,
        element: "death",
        targetType: "target",
        weight: 35,
      },
      {
        name: "Klątwa wyczerpania",
        description: "{attacker} rzuca klątwę na {target} — życie wycieka powoli.",
        damage: 0,
        element: "death",
        targetType: "target",
        weight: 35,
        statusEffect: {
          type: "dot",
          element: "death",
          damage: 3,
          duration: 4,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Śmiertelna aura",
        description: "{attacker} roztacza aurę śmierci, która osłabia wszystkich wrogów.",
        damage: 0,
        element: "death",
        targetType: "allEnemies",
        weight: 30,
        statusEffect: {
          type: "stat_boost",
          stat: "power",
          statMode: "percent",
          statAmount: -20,
          duration: 3,
          target: "allEnemies",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 4,
      description: "Lich pada — cztery okruchy prastaro-nekrotycznej mocy.",
    },
    victoryFlavorText: "Lich jest poza Twoją ligą. Na razie.",
    defeatFlavorText: "Pomniejszy Lich pada! Cztery okruchy nekrotycznej mocy.",
  },

  {
    id: "death_soul_fragment",
    name: "Fragment Duszy",
    description: "Urwany kawałek czyjejś duszy, który zaczął działać samodzielnie. Poszukuje reszty.",
    element: "death",
    hp: 12,
    resistance: 0,
    initiative: 7,
    power: 2,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 0, earthMagic: 0, airMagic: 0,
    lifeMagic: 0, deathMagic: 4, chaosMagic: 1, energyMagic: 0,
    attacks: [
      {
        name: "Duszny ciąg",
        description: "{attacker} wysysa żywotność z {target}.",
        damage: 3,
        element: "death",
        targetType: "target",
        weight: 50,
        statusEffect: {
          type: "dot",
          element: "death",
          damage: 1,
          duration: 3,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Rozpad tożsamości",
        description: "{attacker} próbuje wchłonąć tożsamość {target}.",
        damage: 2,
        element: "death",
        targetType: "target",
        weight: 30,
        statusEffect: {
          type: "miss_chance",
          missChance: 25,
          duration: 2,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Nieuchwytność",
        description: "{attacker} staje się częściowo widmowy.",
        damage: 0,
        element: "death",
        targetType: "target",
        weight: 20,
        statusEffect: {
          type: "miss_chance",
          missChance: 50,
          duration: 1,
          target: "self",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 2,
      description: "Fragment duszy przestaje szukać — zostają dwa okruchy uwolnionej energii.",
    },
    victoryFlavorText: "Fragment duszy łączy się z Twoją magią. Nie chcesz tego.",
    defeatFlavorText: "Fragment Duszy uwalnia się! Dwa okruchy uwolnionej energii.",
  },

    {
    id: "dummy_boss",
    name: "BOSS TESTOWY",
    description: "Stary BOSS.",
    isBoss: true,
    element: "life",
    hp: 119,
    resistance: 2,
    initiative: 5,
    power: 3,
    intelligence: 0,
    elementPower: 0,
    fireMagic: 0, waterMagic: 1, earthMagic: 2, airMagic: 1,
    lifeMagic: 7, deathMagic: 0, chaosMagic: 0, energyMagic: 0,
    attacks: [
      {
        name: "Leśne splątanie",
        description: "{attacker} woła drzewa — korzenie oplatają {target}.",
        damage: 2,
        element: "earth",
        targetType: "target",
        weight: 35,
        statusEffect: {
          type: "stun",
          stunChance: 40,
          stunDuration: 1,
          duration: null,
          target: "target",
        },
      } as EntityStatusAttack,
      {
        name: "Mgła puszczy",
        description: "{attacker} roztacza mgłę — trudno celować.",
        damage: 0,
        element: "air",
        targetType: "allEnemies",
        weight: 35,
        statusEffect: {
          type: "miss_chance",
          missChance: 30,
          duration: 3,
          target: "allEnemies",
        },
      } as EntityStatusAttack,
      {
        name: "Dotyk natury",
        description: "{attacker} przywraca sobie energię z natury wokół.",
        damage: 0,
        element: "life",
        targetType: "target",
        weight: 30,
        statusEffect: {
          type: "heal_chance",
          healChance: 60,
          healAmount: 4,
          duration: 4,
          target: "self",
        },
      } as EntityStatusAttack,
    ],
    reward: {
      runicShards: 2,
      description: "Duch puszczy odpada — leśna energia krystalizuje się w okruchy.",
    },
    victoryFlavorText: "Mgła puszczy gęstnieje. Poza nią nie ma nic — oprócz porażki.",
    defeatFlavorText: "Duch Puszczy odpada! Leśna energia krystalizuje się w dwa okruchy.",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERY DOSTĘPU
// ═══════════════════════════════════════════════════════════════════════════════

/** Zwraca wszystkie byty dla danego żywiołu */
export function getEntitiesByElement(element: EntityElement): MinorEntityDef[] {
  return MINOR_ENTITIES.filter(e => e.element === element);
}

/** Zwraca losowy byt dla danego żywiołu */
export function getRandomEntityForElement(element: EntityElement): MinorEntityDef | null {
  const pool = getEntitiesByElement(element);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/** Zwraca losowy żywioł dla danej lokacji */
export function rollElementForLocation(locationLevel: number): EntityElement | null {
  const elements = LOCATION_ELEMENTS[locationLevel];
  if (!elements || elements.length === 0) return null;
  return elements[Math.floor(Math.random() * elements.length)]!;
}

/** Sprawdza czy w danej lokacji dochodzi do spotkania */
export function rollEncounter(locationLevel: number): boolean {
  const chance = LOCATION_ENCOUNTER_CHANCE[locationLevel] ?? 0;
  return Math.random() < chance;
}