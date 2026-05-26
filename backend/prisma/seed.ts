import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERY
// ═══════════════════════════════════════════════════════════════════════════════

// Skrót do serializacji statusów — używaj wszędzie zamiast ręcznego JSON.stringify
function fx(effects: object[]): string {
  return JSON.stringify(effects);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEED
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {

  // ── PRZEDMIOTY ─────────────────────────────────────────────────────────────
  console.log("Seeding items...");

  await prisma.item.createMany({
    skipDuplicates: true,
    data: [
      // SZATY
      { name: "Podarta szata nowicjusza",   rarity: "common",   slot: "robe",       bonusEndurance: 3 },
      { name: "Szata ucznia magii",          rarity: "uncommon", slot: "robe",       reqKnowledge: 5,  bonusEndurance: 8,  bonusPower: 2 },
      { name: "Szata arcymaga",              rarity: "rare",     slot: "robe",       reqKnowledge: 20, bonusEndurance: 20, bonusPower: 8 },
      // BUTY
      { name: "Znoszone buty",              rarity: "common",   slot: "boots",      bonusEndurance: 5 },
      { name: "Buty wędrowca",              rarity: "uncommon", slot: "boots",      reqKnowledge: 5,  bonusEndurance: 10, bonusAirMagic: 2 },
      // CZAPKI
      { name: "Słomkowy kapelusz",          rarity: "common",   slot: "hat",        bonusPower: 1 },
      { name: "Spiczasta czapka maga",      rarity: "uncommon", slot: "hat",        reqKnowledge: 5,  bonusPower: 4,  bonusInitiative: 2 },
      { name: "Kaptur chaosu",              rarity: "rare",     slot: "hat",        reqChaosMagic: 10, bonusChaosMagic: 5, bonusPower: 6 },
      // AMULETY
      { name: "Sznurek z kamieniem",        rarity: "common",   slot: "amulet",     bonusFireMagic: 1 },
      { name: "Magiczny łańcuch",           rarity: "uncommon", slot: "amulet",     reqKnowledge: 5,  bonusFireMagic: 3, bonusWaterMagic: 3, bonusEarthMagic: 3, bonusAirMagic: 3, bonusChaosMagic: 3 },
      // BRONIE JEDNORĘCZNE
      { name: "Chyba-magiczny-patyk",       rarity: "common",   slot: "weapon_one", weaponType: "one_handed", bonusEarthMagic: 1 },
      { name: "Różdżka ucznia",             rarity: "common",   slot: "weapon_one", weaponType: "one_handed", bonusInitiative: 2 },
      { name: "Kryształowa różdżka",        rarity: "uncommon", slot: "weapon_one", weaponType: "one_handed", reqKnowledge: 10, bonusInitiative: 5, bonusPower: 3 },
      // BRONIE DWURĘCZNE
      { name: "Drewniany kij",              rarity: "common",   slot: "weapon_two", weaponType: "two_handed", bonusEndurance: 5, bonusPower: 2 },
      { name: "Kostur wędrowca",            rarity: "uncommon", slot: "weapon_two", weaponType: "two_handed", reqKnowledge: 8,  bonusPower: 8, bonusInitiative: 4 },
      { name: "Wypełniony magią kostur",    rarity: "rare",     slot: "weapon_two", weaponType: "two_handed", reqKnowledge: 25, bonusPower: 18, bonusInitiative: 10 },
    ],
  });

  // ── CZARY ──────────────────────────────────────────────────────────────────
  console.log("Seeding spells...");

  await prisma.spell.createMany({
    skipDuplicates: true,
    data: [
///////////////NOWE CZARY - ZWYKŁE////////////////////////
      {
        name: "Pomniejszy pocisk chaosu",
        category: "offensive", spellPool: "chaotic",
        rarity: "common", spellBook: true,
        element: "chaos", damage: 7, directional: true, 
        reqChaosMagic: 15,
        special: "Wystrzeliwuje w fioletowy pocisk, który uderza w {target} i zadaje {damage} obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Pocisk chaosu",
        category: "offensive", spellPool: "controlled",
        rarity: "common", spellBook: true,
        element: "chaos", damage: 14, directional: true, 
        reqChaosMagic: 30,
        special: "Wystrzeliwuje w fioletowy pocisk, który uderza w {target} i zadaje {damage} obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Potężny pocisk chaosu",
        category: "offensive", spellPool: "incantation",
        rarity: "common", spellBook: true,
        element: "chaos", damage: 25, directional: true, 
        reqChaosMagic: 45,
        special: "Wystrzeliwuje w fioletowy pocisk, który uderza w {target} i zadaje {damage} obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Pomniejsza wiązka energii",
        category: "offensive", spellPool: "chaotic",
        rarity: "common", spellBook: true,
        element: "energy", damage: 5, directional: true, 
        reqEnergyMagic: 5,
        special: "Wystrzeliwuje wiązkę energii, która razi {target} zadając {damage} obrazeń.",
        statusEffects: fx([]),
      },
      {
        name: "Wiązka energii",
        category: "offensive", spellPool: "controlled",
        rarity: "common", spellBook: true,
        element: "energy", damage: 10, directional: true, 
        reqEnergyMagic: 20,
        special: "Wystrzeliwuje wiązkę energii, która razi {target} zadając {damage} obrazeń.",
        statusEffects: fx([]),
      },
      {
        name: "Potężna wiązka energii",
        category: "offensive", spellPool: "incantation",
        rarity: "common", spellBook: true,
        element: "energy", damage: 15, directional: true, 
        reqEnergyMagic: 35,
        special: "Wystrzeliwuje wiązkę energii, która razi {target} zadając {damage} obrazeń.",
        statusEffects: fx([]),
      },
      {
        name: "Pomniejszy pocisk lodowy",
        category: "offensive", spellPool: "chaotic",
        rarity: "common", spellBook: true,
        element: "water", damage: 5, directional: true, 
        reqWaterMagic: 5,
        special: "W {target} uderzają lodowe sople zadając {damage} obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Pocisk lodowy",
        category: "offensive", spellPool: "controlled",
        rarity: "common", spellBook: true,
        element: "water", damage: 10, directional: true, 
        reqWaterMagic: 20,
        special: "W {target} uderzają lodowe sople zadając {damage} obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Potężny pocisk lodowy",
        category: "offensive", spellPool: "incantation",
        rarity: "common", spellBook: true,
        element: "water", damage: 15, directional: true, 
        reqWaterMagic: 35,
        special: "W {target} uderzają lodowe sople zadając {damage} obrażeń.",
        statusEffects: fx([]),
      },
      {
  name: "Pomniejsza ognista strzała",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "common",
  spellBook: true,
  element: "fire",
  damage: 5,
  directional: true,
  reqFireMagic: 5,
  special: "W {target} uderza ognista strzała, zadając {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Ognista strzała",
  category: "offensive",
  spellPool: "controlled",
  rarity: "common",
  spellBook: true,
  element: "fire",
  damage: 10,
  directional: true,
  reqFireMagic: 20,
  special: "W {target} uderza ognista strzała, zadając {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Potężna ognista strzała",
  category: "offensive",
  spellPool: "incantation",
  rarity: "common",
  spellBook: true,
  element: "fire",
  damage: 15,
  directional: true,
  reqFireMagic: 35,
  special: "W {target} uderza ognista strzała, zadając {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Pomniejsza pięść wiatru",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "common",
  spellBook: true,
  element: "air",
  damage: 5,
  directional: true,
  reqAirMagic: 5,
  special: "Uderzenie wiatru trafia w {target}, zadając {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Pięść wiatru",
  category: "offensive",
  spellPool: "controlled",
  rarity: "common",
  spellBook: true,
  element: "air",
  damage: 10,
  directional: true,
  reqAirMagic: 20,
  special: "Uderzenie wiatru trafia w {target}, zadając {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Potężna pięść wiatru",
  category: "offensive",
  spellPool: "incantation",
  rarity: "common",
  spellBook: true,
  element: "air",
  damage: 15,
  directional: true,
  reqAirMagic: 35,
  special: "Uderzenie wiatru trafia w {target}, zadając {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Kamień",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "common",
  spellBook: true,
  element: "earth",
  damage: 5,
  directional: true,
  reqEarthMagic: 5,
  special: "Nad {target} materializuje się kamień, który spadając zadaje {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Duży kamień",
  category: "offensive",
  spellPool: "controlled",
  rarity: "common",
  spellBook: true,
  element: "earth",
  damage: 10,
  directional: true,
  reqEarthMagic: 20,
  special: "Nad {target} materializuje się duży kamień, który spadając zadaje {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Głaz",
  category: "offensive",
  spellPool: "incantation",
  rarity: "common",
  spellBook: true,
  element: "earth",
  damage: 15,
  directional: true,
  reqEarthMagic: 35,
  special: "Nad {target} materializuje się duży głaz, który spadając zadaje {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Jamnik",
  category: "other",
  spellPool: "chaotic",
  rarity: "common",
  spellBook: false,
  element: "basic",
  damage: 2,
  directional: false,
  reqDeathMagic: 5,
  special: "Przywołuje ożywiony szkielet jamnika, który atakuje {target} zadając {damage} obrażeń, po czym rozpada się.",
  statusEffects: fx([]),
},

{
  name: "Kamienny Golem",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 0,
  directional: false,
  reqEarthMagic: 5,
  special: "Przywołuje kamiennego golema. Jest tak kamienny, jak to tylko możliwe..",
  statusEffects: fx([]),
},

{
  name: "Modliszka",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 0,
  directional: false,
  nan: 0,
  special: "Przywołuje regularnych rozmiarów modliszkę, która groźnie wygląda.",
  statusEffects: fx([]),
},

{
  name: "Karaluch",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 0,
  directional: false,
  nan: 0,
  special: "Przywołuje ogromną ilość karaluchów. Chodzenie po nich jest bardzo nieprzyjemne.",
  statusEffects: fx([]),
},

{
  name: "Centaur",
  category: "summoner",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 0,
  directional: false,
  reqreqLifeMagicMagic: 10,
  special: "Na polu walki pojawia się Centaur! Nie wygląda na zbyt zachwyconego tą sytuacją...",
  statusEffects: fx([]),
},

{
  name: "Sklepikarz z okolicznej wsi",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 0,
  directional: false,
  reqreqLifeMagicMagic: 10,
  special: "Przywołuje sklepikarza z okolicznej wsi. Patrzy na pole walki z politowaniem, po czym odchodzi, jakby nic się nie wydarzyło..",
  statusEffects: fx([]),
},

{
  name: "Kaczka",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 0,
  directional: false,
  nan: 0,
  special: "Przywołuje nad przeciwnikiem gumową kaczkę, która spadając, nie zadaje absolutnie żadnych obrażeń ",
  statusEffects: fx([]),
},

{
  name: "Jajko",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 0,
  directional: false,
  nan: 0,
  special: "Przywołuje nad {target} jajko, które po uderzeniu pęka i wszystko brudzi",
  statusEffects: fx([]),
},

{
  name: "Cegła",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "common",
  spellBook: false,
  element: "basic",
  damage: 2,
  directional: false,
  nan: 0,
  special: "Przywołuje nad {target} cegłę, która spadając zadaje {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Kłoda",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "common",
  spellBook: false,
  element: "basic",
  damage: 5,
  directional: false,
  nan: 0,
  special: "Przywołuje nad {target} pokaźną kłodę, która spadając zadaje {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Drzwi",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 3,
  directional: false,
  nan: 0,
  special: "Przywołuje nad {target} rozlatujące się drzwi, który spadając zadają {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Jabłka",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 1,
  directional: false,
  nan: 0,
  special: "Przywołuje nad głową {target} kilkanaście jabłek, które spadając zadają {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Mały wybuch",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "fire",
  damage: 1,
  directional: false,
  nan: 0,
  special: "Wywołuje wybuch, który zadaje {target} {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Sztabki złota",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 2,
  directional: false,
  reqEnergyMagic: 15,
  special: "Przywołuje deszcz sztabek złota, które zadają każdemu {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Wściekłe kurczaki",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 2,
  directional: false,
  reqreqLifeMagicMagic: 10,
  special: "Przywołuje stado wściekłych kurczaków, które atakują {target} zadając {damage} obrażeń, po czym oddalają się w kompletnym chaosie",
  statusEffects: fx([]),
},

{
  name: "Krzesło",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 0,
  directional: false,
  reqEnergyMagic: 10,
  special: "Przywołuje krzesło, które bardzo agresywnie stoi",
  statusEffects: fx([]),
},

{
  name: "Pomidorowy grad",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 1,
  directional: false,
  reqEnergyMagic: 5,
  special: "Wywołuje pomidorowy grad, które spadając zadają każdemu {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Miecz dwuręczny",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  spellBook: false,
  element: "basic",
  damage: 0,
  directional: false,
  nan: 0,
  special: "Przywołuje potężny dwuręczny miecz! Tak potężny, że nie ma siły go podnieść.",
  statusEffects: fx([]),
},
 ///////////////STARE CZARY/////////////////////     
  
      {
        name: "Prześcieradło",
        element: "air", rarity: "common", damage: 0, spellPool: "chaotic",
        isDirectional: false,
        special: "Przywołuje nad głową {target} ogromne prześcieradło, które spadając blokuje jego ruchy.",
        statusEffects: fx([
          {
            type: "stun",
            damage: 0,
            target: "target",
            duration: 1,
            "stunChance": 100,
            "stunDuration": 1
          },
        ]),
      },
      {
        name: "Motyle",
        element: "air", rarity: "common", damage: 0, spellPool: "chaotic",
        isDirectional: false,
        reqLifeMagic: 5,
        special: "Przywołuje chmarę pięknych, kolorowych motyli — przez chwilę wszyscy stoją zauroczeni.",
        statusEffects: fx([          
          {
            type: "stun",
            damage: 0,
            target: "all",
            duration: 1,
            "stunChance": 100,
            "stunDuration": 1
          },
        ]),
      },
      {
        name: "Wściekłe kurczaki",
        element: "chaos", rarity: "common", damage: 0, spellPool: "chaotic",
        isDirectional: false,
        reqLifeMagic: 10,
        special: "Przywołuje stado wściekłych kurczaków, które atakują {target}.",
        statusEffects: fx([]),
      },
      {
        name: "Krzesło",
        element: "earth", rarity: "common", damage: 0, spellPool: "chaotic",
        isDirectional: false,
        special: "Przywołuje krzesło, które bardzo agresywnie stoi.",
        statusEffects: fx([]),
      },
      {
        name: "Miecz dwuręczny",
        element: "earth", rarity: "common", damage: 0, spellPool: "chaotic",
        isDirectional: false,
        special: "Przywołuje potężny miecz dwuręczny. Tak potężny, że nikt nie ma siły go podnieść.",
        statusEffects: fx([]),
      },
      {
        name: "Porywisty wiatr",
        element: "air", rarity: "common", damage: 0, spellPool: "chaotic",
        isDirectional: false,
        special: "Przywołuje porywisty wiatr.",
        statusEffects: fx([]),
      },
      {
        name: "Własny cień",
        element: "death", rarity: "common", damage: 0, spellPool: "chaotic",
        isDirectional: false,
        special: "Przywołuje własny cień, który zaczyna przedrzeźniać właściciela.",
        statusEffects: fx([]),
      },
      {
        name: "Cegła",
        element: "earth", rarity: "common", damage: 2, spellPool: "chaotic",
        isDirectional: true,
        special: "Przywołuje nad głową {target} cegłę, która spadając zadaje 2 pkt obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Kłoda",
        element: "earth", rarity: "common", damage: 3, spellPool: "chaotic",
        isDirectional: true,
        special: "Przywołuje nad głową {target} pokaźną kłodę, która spadając zadaje 3 pkt obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Drzwi",
        element: "earth", rarity: "common", damage: 2, spellPool: "chaotic",
        isDirectional: true,
        special: "Przywołuje nad głową {target} rozpadające się drzwi, które zadają 2 pkt obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Jabłka",
        element: "earth", rarity: "common", damage: 1, spellPool: "chaotic",
        isDirectional: true,
        special: "Przywołuje nad głową {target} kilkanaście jabłek, które spadając zadają 1 pkt obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Mały wybuch",
        element: "fire", rarity: "common", damage: 1, spellPool: "chaotic",
        isDirectional: true,
        special: "Wywołuje wybuch, który zadaje 1 pkt obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Sztabki złota",
        element: "chaos", rarity: "common", damage: 5, spellPool: "chaotic",
        isDirectional: true,
        reqEnergyMagic: 15,
        special: "Przywołuje deszcz sztabek złota.",
        statusEffects: fx([]),
      },
      {
        name: "Pomidorowy grad",
        element: "water", rarity: "common", damage: 1, spellPool: "chaotic",
        isDirectional: false,  // uderza wszystkich
        reqEnergyMagic: 5,
        special: "Przywołuje grad pomidorów, które spadając zadają wszystkim 1 pkt obrażeń.",
        statusEffects: fx([]),
      },

      {
        name: "Rój much",
        element: "chaos", rarity: "common", damage: 0, spellPool: "chaotic",
        isDirectional: false,
        special: "Przywołuje nad głową {target} ogromny rój much, który rozprasza jego uwagę.",
        statusEffects: fx([
          {
            type: "miss_chance",
            missChance: 25,
            target: "all",
            duration: null,
          },
        ]),
      },

      {
        name: "Lodowisko",
        element: "water", rarity: "common", damage: 0, spellPool: "chaotic",
        isDirectional: false,
        special: "Sprawia, że całe podłoże zostaje skute lodem — każde działanie ma 50% szansy na 1 pkt obrażeń.",
        statusEffects: fx([
          {
            type: "damage_on_move",
            moveChance: 50,
            moveDamage: 1,
            element: "basic",
            target: "all",
            duration: 2,
          },
        ]),
      },

      // ── Iskierki → dot fire na target ─────────────────────────────────────
      {
        name: "Iskierki",
        element: "fire", rarity: "common", damage: 0, spellPool: "chaotic",
        isDirectional: false,
        reqFireMagic: 1,
        special: "Z dłoni maga sypią się iskry, lekko parząc {target}.",
        statusEffects: fx([
          {
            type: "dot",
            element: "fire",
            damage: 1,
            target: "target",
            duration: null,
          },
        ]),
      },

      // ════════════════════════════════════════════════════════════════════════
      // NOWE CZARY — demonstracja wszystkich typów statusów
      // (możesz je usunąć lub zachować — gotowe do użycia w grze)
      // ════════════════════════════════════════════════════════════════════════

      // ── DOT wieloturowy ───────────────────────────────────────────────────
      {
        name: "Trujące opary",
        element: "earth", rarity: "uncommon", damage: 0, spellPool: "controlled",
        isDirectional: false,
        reqChaosMagic: 15,
        special: "Gęste opary owijają wszystkich wrogów — powoli ich trując.",
        statusEffects: fx([
          {
            type: "dot",
            element: "chaos",
            damage: 2,
            target: "allEnemies",
            duration: 3,
          },
        ]),
      },

      // ── RESIST ────────────────────────────────────────────────────────────
      {
        name: "Tarcza ognia",
        element: "fire", rarity: "uncommon", damage: 0, spellPool: "controlled",
        isDirectional: false,
        reqFireMagic: 10,
        special: "Otacza {attacker} i jego sojuszników ognistą barierą.",
        statusEffects: fx([
          {
            type: "resist",
            element: "fire",
            value: 50,
            target: "allAllies",
            duration: 3,
          },
        ]),
      },

      // ── VULNERABLE ────────────────────────────────────────────────────────
      {
        name: "Przemoczenie",
        element: "water", rarity: "common", damage: 0, spellPool: "controlled",
        isDirectional: true,
        reqWaterMagic: 5,
        special: "Cel zostaje przemoczony — energia razi go mocniej.",
        statusEffects: fx([
          {
            type: "vulnerable",
            element: "energy",
            value: 50,
            target: "target",
            duration: null,
          },
        ]),
      },

      // ── STUN ──────────────────────────────────────────────────────────────
      {
        name: "Uderzenie piorunem",
        element: "air", rarity: "rare", damage: 5, spellPool: "incantation",
        isDirectional: true,
        reqAirMagic: 15,
        special: "Piorun uderza w {target} — może go ogłuszyć na 2 tury.",
        statusEffects: fx([
          {
            type: "stun",
            stunChance: 50,
            stunDuration: 2,
            target: "target",
            duration: null,
          },
        ]),
      },

      // ── INVISIBILITY ─────────────────────────────────────────────────────
      {
        name: "Płaszcz cieni",
        element: "death", rarity: "rare", damage: 0, spellPool: "professional",
        isDirectional: false,
        reqDeathMagic: 20,
        special: "{attacker} wtapia się w cienie — trudno go zauważyć przez 3 tury.",
        statusEffects: fx([
          {
            type: "invisibility",
            invisChance: 75,
            target: "self",
            duration: 3,
          },
        ]),
      },

      // ── HEAL_CHANCE ───────────────────────────────────────────────────────
      {
        name: "Błogosławieństwo",
        element: "life", rarity: "uncommon", damage: 0, spellPool: "controlled",
        isDirectional: false,
        reqLifeMagic: 10,
        special: "Boska energia otacza sojuszników — każda tura może ich uleczyć o 3 HP.",
        statusEffects: fx([
          {
            type: "heal_chance",
            healChance: 40,
            healAmount: 3,
            target: "allAllies",
            duration: 4,
          },
        ]),
      },

      // ── WIELE EFEKTÓW — DOT + VULNERABLE ─────────────────────────────────
      {
        name: "Klątwa ognia",
        element: "fire", rarity: "rare", damage: 3, spellPool: "incantation",
        isDirectional: true,
        reqFireMagic: 20,
        special: "Podpala {target} i czyni go wrażliwym na kolejne ataki ogniem.",
        statusEffects: fx([
          {
            type: "dot",
            element: "fire",
            damage: 2,
            target: "target",
            duration: null,
          },
          {
            type: "vulnerable",
            element: "fire",
            value: 25,
            target: "target",
            duration: null,
          },
        ]),
      },

      // ── N LOSOWYCH CELÓW — DOT na 2 wrogów ───────────────────────────────
      {
        name: "Łańcuch piorunów",
        element: "air", rarity: "uncommon", damage: 2, spellPool: "controlled",
        isDirectional: true,
        reqAirMagic: 10,
        special: "Piorun przeskakuje między 2 losowymi wrogami, zadając każdemu 2 pkt i podpalając.",
        statusEffects: fx([
          {
            type: "dot",
            element: "air",
            damage: 1,
            target: "nEnemies",
            count: 2,
            duration: 2,
          },
        ]),
      },

      // ── RESIST na self z ograniczonym czasem ─────────────────────────────
      {
        name: "Lodowa zbroja",
        element: "water", rarity: "uncommon", damage: 0, spellPool: "controlled",
        isDirectional: false,
        reqWaterMagic: 10,
        special: "{attacker} okrywa się lodem — przez 4 tury jest odporny na 30% obrażeń od ognia.",
        statusEffects: fx([
          {
            type: "resist",
            element: "fire",
            value: 30,
            target: "self",
            duration: 4,
          },
        ]),
      },

      // ── MISS_CHANCE globalny (dotyczy WSZYSTKICH kierunkowych czarów) ────
      {
        name: "Mgła wojenna",
        element: "air", rarity: "uncommon", damage: 0, spellPool: "controlled",
        isDirectional: false,
        reqAirMagic: 8,
        special: "Gęsta mgła spowija pole walki — wszyscy mają 35% szansy na chybienie.",
        statusEffects: fx([
          {
            type: "miss_chance",
            missChance: 35,
            target: "all",
            duration: 3,
          },
        ]),
      },

      // ── HEAL_CHANCE na self ────────────────────────────────────────────
      {
        name: "Regeneracja",
        element: "life", rarity: "uncommon", damage: 0, spellPool: "controlled",
        isDirectional: false,
        reqLifeMagic: 8,
        special: "{attacker} koncentruje energię życia — 60% szansy na +2 HP co turę przez 5 tur.",
        statusEffects: fx([
          {
            type: "heal_chance",
            healChance: 60,
            healAmount: 2,
            target: "self",
            duration: 5,
          },
        ]),
      },

      // ── VULNERABLE na allEnemies ──────────────────────────────────────────
      {
        name: "Przekleństwo ziemi",
        element: "death", rarity: "rare", damage: 0, spellPool: "incantation",
        isDirectional: false,
        reqDeathMagic: 15,
        special: "Mroczna klątwa sprawia, że wszyscy wrogowie są bardziej podatni na obrażenia ziemi.",
        statusEffects: fx([
          {
            type: "vulnerable",
            element: "earth",
            value: 40,
            target: "allEnemies",
            duration: 3,
          },
        ]),
      },

      // ── STUN na randomEnemy z niską szansą ────────────────────────────────
      {
        name: "Oślepiający błysk",
        element: "energy", rarity: "uncommon", damage: 2, spellPool: "controlled",
        isDirectional: true,
        reqEnergyMagic: 8,
        special: "Oślepia {target} — 25% szansy na zatrzymanie na 1 turę.",
        statusEffects: fx([
          {
            type: "stun",
            stunChance: 25,
            stunDuration: 1,
            target: "target",
            duration: null,
          },
        ]),
      },

      // ── STAT BOOST — demonstracja ─────────────────────────────────────────────

// Buff power o stałą wartość (na siebie, 3 tury)
{
  name: "Wzmocnienie mocy",
  element: "energy", rarity: "uncommon", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqEnergyMagic: 8,
  special: "{attacker} koncentruje energię — jego moc wzrasta o 5 pkt na 3 tury.",
  statusEffects: fx([
    {
      type: "stat_boost",
      stat: "power",
      statMode: "flat",
      statAmount: 5,
      target: "self",
      duration: 3,
    },
  ]),
},

// Debuff initiative wroga o % (do końca walki)
{
  name: "Spowolnienie",
  element: "water", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: true,
  reqWaterMagic: 5,
  special: "Gęsta woda spowalnia ruchy {target} — traci 30% inicjatywy na stałe.",
  statusEffects: fx([
    {
      type: "stat_boost",
      stat: "initiative",
      statMode: "percent",
      statAmount: -30,
      target: "target",
      duration: null,
    },
  ]),
},

// Buff fireMagic sojuszników procentowo (krótko, ale mocno)
{
  name: "Zew ognia",
  element: "fire", rarity: "rare", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqFireMagic: 20,
  special: "Płomień w sercach sojuszników — +50% do magii ognia na 2 tury.",
  statusEffects: fx([
    {
      type: "stat_boost",
      stat: "fireMagic",
      statMode: "percent",
      statAmount: 50,
      target: "allAllies",
      duration: 2,
    },
  ]),
},

// Debuff resistance wroga flat — obniża odporność
{
  name: "Przebicie pancerza",
  element: "chaos", rarity: "uncommon", damage: 2, spellPool: "controlled",
  isDirectional: true,
  reqChaosMagic: 10,
  special: "Chaotyczna energia rozbija magiczny pancerz {target} — traci 10 pkt odporności.",
  statusEffects: fx([
    {
      type: "stat_boost",
      stat: "resistance",
      statMode: "flat",
      statAmount: -10,
      target: "target",
      duration: null,
    },
  ]),
},

    ],
  });

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());