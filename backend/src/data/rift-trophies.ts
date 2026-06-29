// ═══════════════════════════════════════════════════════════════════
// TROFEA SZCZELIN — katalog
// src/data/rift-trophies.ts
//
// Ten plik jest źródłem prawdy dla seeda bazy danych.
// Każde trofeum trafia do tabeli RiftTrophy przez prisma seed.
//
// Jak dodać nowe trofeum:
//   1. Dodaj wpis do RIFT_TROPHIES
//   2. Uruchom seed (pnpm prisma db seed)
//   3. Odwołaj się do `key` w rift-worlds.ts w odpowiednim węźle scenariusza
// ═══════════════════════════════════════════════════════════════════

import { RiftTrophyBonuses } from "../types/rift-trophy-types";

export interface RiftTrophyDef {
  key: string;               // unikalny identyfikator używany w rift-worlds.ts
  name: string;              // wyświetlana nazwa
  description: string;       // opis fabularny widoczny w UI
  icon: string;              // nazwa pliku grafiki w /assets/trophies/
  riftKey: string;           // szczelina, z której pochodzi
  bonuses: RiftTrophyBonuses;
}

export const RIFT_TROPHIES: RiftTrophyDef[] = [

  // ══════════════════════════════════════════════════════════════
  // SZCZELINA ZIELONA — trofea z krain: Stokrotka, Hobbiton, Szmaragdowe Miasto
  // ══════════════════════════════════════════════════════════════

  {
    key: "stokrotka",
    name: "Stokrotka",
    description: "Mówiący kwiatek, który poczuł się zbyt samotny na swojej polanie. Teraz mieszka w Twojej wieży i komentuje wszystko, co robisz.",
    icon: "trophy_daisy.png",
    riftKey: "green",
    bonuses: {
      stats: {
        knowledge: 1,
        intelligence: 1,
        power: 1,
        endurance: 1,
        resistance: 1,
        initiative: 1,
        elementalMagic: 1,
        astralMagic: 1,
        bloodMagic: 1,
      },
    },
  },

  {
    key: "pierscien_z_dziwnymi_znakami",
    name: "Pierścień z dziwnymi znakami",
    description: "Znaleziony w kuferku w małym okrągłym domku. Znaki na nim zdają się zmieniać zależnie od tego, jak na niego patrzysz. Podobno jest Jeden Jedyny, ale pewności nie ma.",
    icon: "trophy_ring.png",
    riftKey: "green",
    bonuses: {
      stats: {
        knowledge: 1,
        intelligence: 1,
        power: 1,
        endurance: 1,
        resistance: 1,
        initiative: 1,
        elementalMagic: 1,
        astralMagic: 1,
        bloodMagic: 1,
      },
    },
  },

  {
    key: "maly_kaftanik",
    name: "Mały kaftanik",
    description: "Idealnie wyprasowany, starannie złożony. Niestety jest znacznie za mały na Ciebie. Wystawiony na półce wygląda jednak całkiem reprezentacyjnie.",
    icon: "trophy_jacket.png",
    riftKey: "green",
    bonuses: {
      stats: {
        knowledge: 1,
        intelligence: 1,
        power: 1,
        endurance: 1,
        resistance: 1,
        initiative: 1,
        elementalMagic: 1,
        astralMagic: 1,
        bloodMagic: 1,
      },
    },
  },

  {
    key: "medal_odwagi",
    name: "Medal Odwagi",
    description: "Wręczony przez Człowieka-Lwa, który porzucił go w ucieczce. Wygrawerowano na nim napis 'Za Niebywałą Odwagę'. Ironicznie pasuje.",
    icon: "trophy_medal.png",
    riftKey: "green",
    bonuses: {
      stats: {
        knowledge: 1,
        intelligence: 1,
        power: 1,
        endurance: 1,
        resistance: 1,
        initiative: 1,
        elementalMagic: 1,
        astralMagic: 1,
        bloodMagic: 1,
      },
    },
  },

  {
    key: "szmaragdowa_brosza",
    name: "Szmaragdowa Brosza",
    description: "Mała i lśniąca. Stary jubiler z Szmaragdowego Miasta twierdził, że ma historię. Zapomniałeś jej wysłuchać do końca.",
    icon: "trophy_brooch.png",
    riftKey: "green",
    bonuses: {
      stats: {
        knowledge: 1,
        intelligence: 1,
        power: 1,
        endurance: 1,
        resistance: 1,
        initiative: 1,
        elementalMagic: 1,
        astralMagic: 1,
        bloodMagic: 1,
      },
    },
  },

  {
    key: "rubinowe_pantofelki",
    name: "Rubinowe Pantofelki",
    description: "Delikatnie połyskują w słońcu. Rozmiar nie jest Twój, ale i tak nie można ich nie zabrać. Podobno wystarczy trzy razy kliknąć obcasami.",
    icon: "trophy_slippers.png",
    riftKey: "green",
    bonuses: {
      stats: {
        knowledge: 1,
        intelligence: 1,
        power: 1,
        endurance: 1,
        resistance: 1,
        initiative: 1,
        elementalMagic: 1,
        astralMagic: 1,
        bloodMagic: 1,
      },
    },
  },

  // ══════════════════════════════════════════════════════════════
  // SZCZELINA CZERWONA — trofea
  // ══════════════════════════════════════════════════════════════

  {
    key: "kamien",
    name: "Kamień",
    description: "Zwykły, szarawy kamień. Przyniesiony ze stabilnej białej szczeliny. Nie wiadomo dlaczego, ale czujesz do niego sympatię.",
    icon: "trophy_stone.png",
    riftKey: "white",
    bonuses: {
      stats: {
        knowledge: 1,
        intelligence: 1,
        power: 1,
        endurance: 1,
        resistance: 1,
        initiative: 1,
        elementalMagic: 1,
        astralMagic: 1,
        bloodMagic: 1,
      },
    },
  },
   {
    key: "swiecace_cos",
    name: "Świecące Coś",
    description: "Wypadło z kieszeni niebieskiego kombinezonu. Świeci delikatnie niebieskawym blaskiem. Nie wiadomo do czego służy, ale wygląda drogo.",
    icon: "trophy_glowing_thing.png",
    riftKey: "white",
    bonuses: {
      stats: {
        knowledge: 1,
        intelligence: 1,
        power: 1,
        endurance: 1,
        resistance: 1,
        initiative: 1,
        elementalMagic: 1,
        astralMagic: 1,
        bloodMagic: 1,
      },
    },
  },
];

// ── HELPER: znajdź trofeum po kluczu ─────────────────────────────
export function getRiftTrophyByKey(key: string): RiftTrophyDef | undefined {
  return RIFT_TROPHIES.find(t => t.key === key);
}

// ── HELPER: wszystkie trofea danej szczeliny ─────────────────────
export function getRiftTrophiesByRift(riftKey: string): RiftTrophyDef[] {
  return RIFT_TROPHIES.filter(t => t.riftKey === riftKey);
}