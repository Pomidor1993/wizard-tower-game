// ═══════════════════════════════════════════════════════════════════════════════
// SEED — CZARY SUMMONERSKIE
// src/prisma/seed-spells-summoner.ts
//
// Czary przyzywające miniony. Miniony atakują co rundę wg swojej puli ataków.
// Ataki stackujące (dot/vulnerable/resist/damage_on_move) kumulują efekty.
// Pozostałe (stun/clean/heal/stat_boost/taunt) nie stackują.
// ═══════════════════════════════════════════════════════════════════════════════

import type { MinionAttack } from "../src/types/spell-types.js";
import type { StatusEffectDef } from "../src/types/status-types.js";

function ma(attacks: MinionAttack[]): string {
  return JSON.stringify(attacks);
}

export const SUMMONER_SPELLS = [

  // ════════════════════════════════════════════════════════════════════════════
  // MINIONY PODSTAWOWE — prosty atak, brak statusów
  // ════════════════════════════════════════════════════════════════════════════

  {
    name: "Ożywiony szkielet",
    category: "summoner", spellPool: "chaotic",
    rarity: "common", element: "death",
    bookDescription: "Przywołuje ożywionego szkieleta, który atakuje losowych wrogów.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 5,
    special: "Z ziemi wyłania się ożywiony szkielet!",
    summonCount: 1,
    summonHp: 15,
    summonDamage: 4,
    summonInitiative: 6,
    summonElement: "death",
    summonTargetType: "randomEnemy",
    minionAttacks: ma([
      {
        name: "Kościste uderzenie",
        damage: 4,
        element: "death",
        target: "randomEnemy",
        actionDesc: "{attacker} uderza {target} kościstą pięścią zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 100,
      },
    ]),
  },

  {
    name: "Ożywiona czaszka",
    category: "summoner", spellPool: "chaotic",
    rarity: "common", element: "death",
    bookDescription: "Przywołuje latającą czaszkę, która gryzie wrogów.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 8,
    special: "Latająca czaszka wyłania się z mroku!",
    summonCount: 2,
    summonHp: 10,
    summonDamage: 3,
    summonInitiative: 12,
    summonElement: "death",
    summonTargetType: "randomEnemy",
    minionAttacks: ma([
      {
        name: "Ugryzienie",
        damage: 3,
        element: "death",
        target: "randomEnemy",
        actionDesc: "{attacker} gryzie {target} zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 100,
      },
    ]),
  },

  {
    name: "Kamienny golem",
    category: "summoner", spellPool: "chaotic",
    rarity: "uncommon", element: "earth",
    bookDescription: "Przywołuje wytrzymałego kamiennego golema.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 10,
    special: "Z kamieni układa się potężny golem!",
    summonCount: 1,
    summonHp: 50,
    summonDamage: 8,
    summonInitiative: 3,
    summonElement: "earth",
    summonTargetType: "randomEnemy",
    minionAttacks: ma([
      {
        name: "Kamienny cios",
        damage: 8,
        element: "earth",
        target: "randomEnemy",
        actionDesc: "{attacker} miażdży {target} kamienną pięścią zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 70,
      },
      {
        name: "Taranowanie",
        damage: 6,
        element: "earth",
        target: "allEnemies",
        actionDesc: "{attacker} taranuje wszystkich przeciwników zadając {damage} obrażeń!",
        statusEffects: [],
        weight: 30,
      },
    ]),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // MINIONY Z DOT — stackujące obrażenia periodyczne
  // ════════════════════════════════════════════════════════════════════════════

  {
    name: "Ognisty elementalny",
    category: "summoner", spellPool: "controlled",
    rarity: "uncommon", element: "fire",
    bookDescription: "Przywołuje istotę ognia, która może podpalać wrogów.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 20,
    special: "Z płomieni wyłania się ognisty elementalny!",
    summonCount: 1,
    summonHp: 30,
    summonDamage: 6,
    summonInitiative: 10,
    summonElement: "fire",
    summonTargetType: "randomEnemy",
    minionAttacks: ma([
      {
        name: "Ognisty cios",
        damage: 6,
        element: "fire",
        target: "randomEnemy",
        actionDesc: "{attacker} atakuje {target} ognistą pięścią zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 60,
      },
      {
        name: "Podpalenie",
        damage: 3,
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
            endInfo: "Ogień na {target} gaśnie.",
          } as StatusEffectDef,
        ],
        weight: 40,
      },
    ]),
  },

  {
    name: "Jadowita mgławica",
    category: "summoner", spellPool: "chaotic",
    rarity: "uncommon", element: "death",
    bookDescription: "Przywołuje trującą mgławicę, która zatruwa losowych wrogów.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 15,
    special: "Zielonkawa mgławica materializuje się na polu walki!",
    summonCount: 1,
    summonHp: 20,
    summonDamage: 2,
    summonInitiative: 8,
    summonElement: "death",
    summonTargetType: "randomEnemy",
    minionAttacks: ma([
      {
        name: "Jadowita chmura",
        damage: 2,
        element: "death",
        target: "randomEnemy",
        actionDesc: "{attacker} otula {target} jadowitą chmurą zadając {damage} obrażeń.",
        statusEffects: [
          {
            type: "dot",
            element: "death",
            damage: 4,
            statusChance: 100,
            target: "randomEnemy",
            duration: 3,
            tickInfo: "Trucizna trawi {target} zadając {damage} obrażeń.",
            endInfo: "Trucizna w żyłach {target} zanika.",
          } as StatusEffectDef,
        ],
        weight: 100,
      },
    ]),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // MINIONY Z TAUNT — prowokują ataki na siebie
  // ════════════════════════════════════════════════════════════════════════════

  {
    name: "Strażnik chaosu",
    category: "summoner", spellPool: "controlled",
    rarity: "rare", element: "chaos",
    bookDescription: "Przywołuje strażnika który prowokuje wrogów i osłania sojuszników.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 25,
    special: "Potężny Strażnik Chaosu staje na polu walki!",
    summonCount: 1,
    summonHp: 60,
    summonDamage: 5,
    summonInitiative: 5,
    summonElement: "chaos",
    summonTargetType: "randomEnemy",
    minionAttacks: ma([
      {
        name: "Prowokacja",
        damage: 3,
        element: "chaos",
        target: "allEnemies",
        actionDesc: "{attacker} wrzeszczy na wszystkich wrogów prowokując ich ataki!",
        statusEffects: [
          {
            type: "taunt",
            statusChance: 80,
            target: "allEnemies",
            duration: 1,
            tickInfo: "{attacker} skutecznie prowokuje wrogów.",
            failTickInfo: "Wrogowie ignorują prowokację {attacker}.",
          } as StatusEffectDef,
        ],
        weight: 40,
      },
      {
        name: "Chaotyczny cios",
        damage: 5,
        element: "chaos",
        target: "randomEnemy",
        actionDesc: "{attacker} uderza {target} chaotyczną mocą zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 60,
      },
    ]),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // MINIONY WSPIERAJĄCE — leczą lub buffują sojuszników
  // ════════════════════════════════════════════════════════════════════════════

  {
    name: "Duch uzdrowiciela",
    category: "summoner", spellPool: "controlled",
    rarity: "rare", element: "life",
    bookDescription: "Przywołuje ducha który co rundę leczy losowego sojusznika.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 20,
    special: "Świetlisty duch uzdrowiciela pojawia się na polu walki!",
    summonCount: 1,
    summonHp: 20,
    summonDamage: 0,
    summonInitiative: 15,
    summonElement: "life",
    summonTargetType: "randomAlly",
    minionAttacks: ma([
      {
        name: "Uzdrowienie",
        damage: 0,
        element: "life",
        target: "randomAlly",
        actionDesc: "{attacker} otacza {target} życiową energią.",
        statusEffects: [
          {
            type: "heal_chance",
            healAmount: 15,
            healMode: "flat",
            statusChance: 100,
            target: "randomAlly",
            duration: 1,
          } as StatusEffectDef,
        ],
        weight: 100,
      },
    ]),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // MINIONY MULTI-ATAK — wiele minionów naraz
  // ════════════════════════════════════════════════════════════════════════════

  {
    name: "Rój szkieletów",
    category: "summoner", spellPool: "incantation",
    rarity: "rare", element: "death",
    bookDescription: "Przywołuje trzy szkielety atakujące losowych wrogów.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 30,
    special: "Trzy szkielety wyłaniają się z ziemi!",
    summonCount: 3,
    summonHp: 12,
    summonDamage: 5,
    summonInitiative: 8,
    summonElement: "death",
    summonTargetType: "randomEnemy",
    minionAttacks: ma([
      {
        name: "Kościsty szpon",
        damage: 5,
        element: "death",
        target: "randomEnemy",
        actionDesc: "{attacker} atakuje {target} kościstymi szponami zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 100,
      },
    ]),
  },

  {
    name: "Lodowe posągi",
    category: "summoner", spellPool: "incantation",
    rarity: "rare", element: "water",
    bookDescription: "Przywołuje dwa lodowe posągi, które mogą spowalniać wrogów.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 30,
    special: "Dwa lodowe posągi wyrastają z ziemi!",
    summonCount: 2,
    summonHp: 35,
    summonDamage: 7,
    summonInitiative: 4,
    summonElement: "water",
    summonTargetType: "randomEnemy",
    minionAttacks: ma([
      {
        name: "Lodowy cios",
        damage: 7,
        element: "water",
        target: "randomEnemy",
        actionDesc: "{attacker} uderza {target} lodową pięścią zadając {damage} obrażeń.",
        statusEffects: [],
        weight: 60,
      },
      {
        name: "Mróz",
        damage: 3,
        element: "water",
        target: "randomEnemy",
        actionDesc: "{attacker} owiewa {target} mrozem!",
        statusEffects: [
          {
            type: "stat_boost",
            stat: "initiative",
            statMode: "percent",
            statAmount: -30,
            target: "randomEnemy",
            duration: 2,
            tickInfo: "Mróz spowalnia {target}.",
            endInfo: "Efekt mrozu zanika.",
          } as StatusEffectDef,
        ],
        weight: 40,
      },
    ]),
  },

] as const;