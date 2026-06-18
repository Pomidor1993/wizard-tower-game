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
  // ════════════════════════════════════════════════════════
    // SZATY (robe)
    // ════════════════════════════════════════════════════════
 
    // common
    {
      name: "Podarta szata nowicjusza",
      rarity: "common", slot: "robe", 
      locationTypes: JSON.stringify(["A", "B", "C"]),
      bonusEndurance: 3,
    },
    {
      name: "Gruba lniana szata",
      rarity: "common", slot: "robe", 
      locationTypes: JSON.stringify(["B"]),          // tylko B → lepsze staty
      bonusEndurance: 5, bonusResistance: 2,
    },
 
    // uncommon
    {
      name: "Szata wędrownego maga",
      rarity: "uncommon", slot: "robe", 
      locationTypes: JSON.stringify(["A", "B"]),
      reqKnowledge: 8,
      bonusEndurance: 10, bonusPower: 3,
    },
    {
      name: "Szata pustelnika",
      rarity: "uncommon", slot: "robe", 
      locationTypes: JSON.stringify(["C"]),          // tylko C
      reqKnowledge: 10,
      bonusEndurance: 14, bonusPower: 5, bonusResistance: 3,
    },
 
    // rare
    {
      name: "Szata arcymaga",
      rarity: "rare", slot: "robe", 
      locationTypes: JSON.stringify(["A", "B", "C"]),
      reqKnowledge: 25, reqIntelligence: 10,
      bonusEndurance: 22, bonusPower: 9,
    },
    {
      name: "Szata Tkacza Iluzji",
      rarity: "rare", slot: "robe", 
      locationTypes: JSON.stringify(["B"]),          // tylko B
      reqKnowledge: 28, reqAstralMagic: 8,
      bonusEndurance: 28, bonusPower: 11, bonusAstralMagic: 6,
    },
 
    // unique
    {
      name: "Całun Wiecznego Mrozu",
      rarity: "unique", slot: "robe",
      locationTypes: JSON.stringify(["A", "C"]),
      reqKnowledge: 40, reqElementalMagic: 15,
      bonusEndurance: 38, bonusPower: 15, bonusElementalMagic: 12,
    },
    {
      name: "Skóra Pierwotnego Chaosu",
      rarity: "unique", slot: "robe", 
      locationTypes: JSON.stringify(["A"]),          // tylko A
      reqKnowledge: 45, reqBloodMagic: 18,
      bonusEndurance: 50, bonusPower: 20, bonusBloodMagic: 15, bonusResistance: 8,
    },
 
    // ════════════════════════════════════════════════════════
    // BUTY (boots)
    // ════════════════════════════════════════════════════════
 
    // common
    {
      name: "Znoszone sandały",
      rarity: "common", slot: "boots", 
      locationTypes: JSON.stringify(["A", "B", "C"]),
      bonusInitiative: 2,
    },
    {
      name: "Błotniste buty wędrowca",
      rarity: "common", slot: "boots", 
      locationTypes: JSON.stringify(["C"]),          // tylko C
      bonusInitiative: 3, bonusEndurance: 2,
    },
 
    // uncommon
    {
      name: "Buty szybkiego uciekania",
      rarity: "uncommon", slot: "boots", 
      locationTypes: JSON.stringify(["A", "C"]),
      reqInitiative: 5,
      bonusInitiative: 7, bonusEndurance: 4,
    },
    {
      name: "Mokasyny leśnego zwiadowcy",
      rarity: "uncommon", slot: "boots", 
      locationTypes: JSON.stringify(["B"]),          // tylko B
      reqInitiative: 6,
      bonusInitiative: 9, bonusEndurance: 5, bonusPower: 2,
    },
 
    // rare
    {
      name: "Buty Tancerza Błyskawic",
      rarity: "rare", slot: "boots", 
      locationTypes: JSON.stringify(["A", "B", "C"]),
      reqInitiative: 15, reqElementalMagic: 8,
      bonusInitiative: 18, bonusElementalMagic: 6,
    },
    {
      name: "Sandały Pielgrzyma Głębi",
      rarity: "rare", slot: "boots",
      locationTypes: JSON.stringify(["C"]),          // tylko C
      reqInitiative: 18, reqAstralMagic: 8,
      bonusInitiative: 22, bonusAstralMagic: 7, bonusEndurance: 5,
    },
 
    // unique
    {
      name: "Trzewiki Nieuchwytnego Cienia",
      rarity: "unique", slot: "boots", 
      locationTypes: JSON.stringify(["B", "C"]),
      reqInitiative: 30, reqKnowledge: 20,
      bonusInitiative: 35, bonusEndurance: 12, bonusPower: 8,
    },
    {
      name: "Bose Stopy Pierwszego Maga",
      rarity: "unique", slot: "boots", 
      locationTypes: JSON.stringify(["A"]),          // tylko A
      reqInitiative: 35, reqKnowledge: 25,
      bonusInitiative: 45, bonusEndurance: 15, bonusPower: 12, bonusElementalMagic: 8,
    },
 
    // ════════════════════════════════════════════════════════
    // KAPELUSZE (hat)
    // ════════════════════════════════════════════════════════
 
    // common
    {
      name: "Słomkowy kapelusz ogrodnika",
      rarity: "common", slot: "hat", 
      locationTypes: JSON.stringify(["A", "B", "C"]),
      bonusPower: 1,
    },
    {
      name: "Czapka z króliczego futra",
      rarity: "common", slot: "hat", 
      locationTypes: JSON.stringify(["B"]),          // tylko B
      bonusPower: 2, bonusKnowledge: 1,
    },
 
    // uncommon
    {
      name: "Spiczasta czapka ucznia",
      rarity: "uncommon", slot: "hat", 
      locationTypes: JSON.stringify(["A", "B", "C"]),
      reqKnowledge: 5,
      bonusPower: 4, bonusKnowledge: 3,
    },
    {
      name: "Kaptur pustelnika zaklęć",
      rarity: "uncommon", slot: "hat", 
      locationTypes: JSON.stringify(["A"]),          // tylko A
      reqKnowledge: 7, reqAstralMagic: 3,
      bonusPower: 5, bonusKnowledge: 4, bonusAstralMagic: 3,
    },
 
    // rare
    {
      name: "Kaptur Chaosu",
      rarity: "rare", slot: "hat", 
      locationTypes: JSON.stringify(["A", "C"]),
      reqIntelligence: 15, reqBloodMagic: 8,
      bonusAstralMagic: 8, bonusBloodMagic: 6, bonusPower: 7,
    },
    {
      name: "Diadem Jasnowidza",
      rarity: "rare", slot: "hat", 
      locationTypes: JSON.stringify(["C"]),          // tylko C
      reqIntelligence: 18, reqAstralMagic: 10,
      bonusAstralMagic: 10, bonusIntelligence: 8, bonusPower: 8,
    },
 
    // unique
    {
      name: "Tiara Pani Gwiazd",
      rarity: "unique", slot: "hat",
      locationTypes: JSON.stringify(["B", "C"]),
      reqIntelligence: 30, reqAstralMagic: 20,
      bonusAstralMagic: 18, bonusIntelligence: 12, bonusPower: 14,
    },
    {
      name: "Czaszka Pierwszego Nekromanty",
      rarity: "unique", slot: "hat", 
      locationTypes: JSON.stringify(["A"]),          // tylko A
      reqBloodMagic: 25, reqIntelligence: 25,
      bonusBloodMagic: 22, bonusAstralMagic: 12, bonusPower: 16, bonusIntelligence: 10,
    },
 
    // ════════════════════════════════════════════════════════
    // AMULETY (amulet)
    // ════════════════════════════════════════════════════════
 
    // common
    {
      name: "Sznurek z zagiętą monetą",
      rarity: "common", slot: "amulet", 
      locationTypes: JSON.stringify(["A", "B", "C"]),
      bonusElementalMagic: 1,
    },
    {
      name: "Korzeń zasuszony w kształt ryby",
      rarity: "common", slot: "amulet", 
      locationTypes: JSON.stringify(["C"]),          // tylko C
      bonusElementalMagic: 2, bonusBloodMagic: 1,
    },
 
    // uncommon
    {
      name: "Kamień z wyrytą runą",
      rarity: "uncommon", slot: "amulet", 
      locationTypes: JSON.stringify(["A", "B"]),
      reqKnowledge: 5,
      bonusElementalMagic: 4, bonusAstralMagic: 3,
    },
    {
      name: "Wisiorek z kryształem jaskiniowym",
      rarity: "uncommon", slot: "amulet", 
      locationTypes: JSON.stringify(["A"]),          // tylko A
      reqKnowledge: 6, reqElementalMagic: 4,
      bonusElementalMagic: 6, bonusAstralMagic: 4, bonusResistance: 3,
    },
 
    // rare
    {
      name: "Łańcuch Trzech Żywiołów",
      rarity: "rare", slot: "amulet", 
      locationTypes: JSON.stringify(["A", "B", "C"]),
      reqKnowledge: 20, reqElementalMagic: 10,
      bonusElementalMagic: 10, bonusAstralMagic: 8, bonusBloodMagic: 8,
    },
    {
      name: "Medalion Utopionego Kapłana",
      rarity: "rare", slot: "amulet", 
      locationTypes: JSON.stringify(["C"]),          // tylko C
      reqKnowledge: 22, reqAstralMagic: 12,
      bonusElementalMagic: 12, bonusAstralMagic: 10, bonusBloodMagic: 9, bonusResistance: 5,
    },
 
    // unique
    {
      name: "Oko Smoka Głębin",
      rarity: "unique", slot: "amulet",
      locationTypes: JSON.stringify(["B", "C"]),
      reqKnowledge: 38, reqElementalMagic: 22,
      bonusElementalMagic: 20, bonusAstralMagic: 16, bonusBloodMagic: 14, bonusPower: 10,
    },
    {
      name: "Serce Zamkniętego Boga",
      rarity: "unique", slot: "amulet",
      locationTypes: JSON.stringify(["A"]),          // tylko A
      reqKnowledge: 45, reqBloodMagic: 22,
      bonusElementalMagic: 25, bonusAstralMagic: 20, bonusBloodMagic: 20, bonusPower: 12,
    },
 
    // ════════════════════════════════════════════════════════
    // BRONIE JEDNORĘCZNE (weapon_one)
    // ════════════════════════════════════════════════════════
 
    // common
    {
      name: "Chyba-magiczny-patyk",
      rarity: "common", slot: "weapon_one", weaponType: "one_handed",
      locationTypes: JSON.stringify(["A", "B", "C"]),
      bonusElementalMagic: 1,
    },
    {
      name: "Różdżka z gałęzi wierzby",
      rarity: "common", slot: "weapon_one", weaponType: "one_handed",
      locationTypes: JSON.stringify(["B"]),          // tylko B
      bonusElementalMagic: 2, bonusInitiative: 2,
    },
 
    // uncommon
    {
      name: "Różdżka ucznia nekromancji",
      rarity: "uncommon", slot: "weapon_one", weaponType: "one_handed",
      locationTypes: JSON.stringify(["A", "C"]),
      reqKnowledge: 8, reqBloodMagic: 3,
      bonusBloodMagic: 5, bonusInitiative: 4,
    },
    {
      name: "Kryształowy sztylet maga",
      rarity: "uncommon", slot: "weapon_one", weaponType: "one_handed", 
      locationTypes: JSON.stringify(["C"]),          // tylko C
      reqKnowledge: 10, reqElementalMagic: 5,
      bonusElementalMagic: 6, bonusPower: 4, bonusInitiative: 5,
    },
 
    // rare
    {
      name: "Berło Rozszczepionych Ech",
      rarity: "rare", slot: "weapon_one", weaponType: "one_handed",
      locationTypes: JSON.stringify(["A", "B"]),
      reqKnowledge: 22, reqAstralMagic: 10,
      bonusAstralMagic: 10, bonusPower: 8, bonusInitiative: 8,
    },
    {
      name: "Ostrze Związanego Demona",
      rarity: "rare", slot: "weapon_one", weaponType: "one_handed",
      locationTypes: JSON.stringify(["A"]),          // tylko A
      reqKnowledge: 25, reqBloodMagic: 14,
      bonusBloodMagic: 12, bonusPower: 10, bonusInitiative: 9, bonusIntelligence: 5,
    },
 
    // unique
    {
      name: "Palec Wieszcza",
      rarity: "unique", slot: "weapon_one", weaponType: "one_handed",
      locationTypes: JSON.stringify(["A", "B", "C"]),
      reqKnowledge: 38, reqAstralMagic: 20,
      bonusAstralMagic: 18, bonusPower: 16, bonusInitiative: 14,
    },
    {
      name: "Igła Przeszywająca Rzeczywistość",
      rarity: "unique", slot: "weapon_one", weaponType: "one_handed",
      locationTypes: JSON.stringify(["B"]),          // tylko B
      reqKnowledge: 44, reqAstralMagic: 24,
      bonusAstralMagic: 22, bonusPower: 20, bonusInitiative: 18, bonusIntelligence: 10,
    },
 
    // ════════════════════════════════════════════════════════
    // BRONIE DWURĘCZNE (weapon_two)
    // ════════════════════════════════════════════════════════
 
    // common
    {
      name: "Drewniany kij",
      rarity: "common", slot: "weapon_two", weaponType: "two_handed",
      locationTypes: JSON.stringify(["A", "B", "C"]),
      bonusEndurance: 4, bonusPower: 1,
    },
    {
      name: "Wiązka starych kości",
      rarity: "common", slot: "weapon_two", weaponType: "two_handed",
      locationTypes: JSON.stringify(["A"]),          // tylko A
      bonusEndurance: 5, bonusPower: 2, bonusBloodMagic: 1,
    },
 
    // uncommon
    {
      name: "Kostur wędrowca",
      rarity: "uncommon", slot: "weapon_two", weaponType: "two_handed",
      locationTypes: JSON.stringify(["A", "B", "C"]),
      reqKnowledge: 8,
      bonusPower: 7, bonusInitiative: 4, bonusEndurance: 5,
    },
    {
      name: "Kostur z korzenia bagna",
      rarity: "uncommon", slot: "weapon_two", weaponType: "two_handed",
      locationTypes: JSON.stringify(["C"]),          // tylko C
      reqKnowledge: 10, reqElementalMagic: 4,
      bonusPower: 9, bonusInitiative: 5, bonusElementalMagic: 5, bonusEndurance: 6,
    },
 
    // rare
    {
      name: "Kostur Roztrzaskanego Czasu",
      rarity: "rare", slot: "weapon_two", weaponType: "two_handed",
      locationTypes: JSON.stringify(["A", "B"]),
      reqKnowledge: 25, reqIntelligence: 12,
      bonusPower: 18, bonusInitiative: 10, bonusIntelligence: 8,
    },
    {
      name: "Trójząb Przeklętego Bagna",
      rarity: "rare", slot: "weapon_two", weaponType: "two_handed",
      locationTypes: JSON.stringify(["C"]),          // tylko C
      reqKnowledge: 28, reqElementalMagic: 16,
      bonusPower: 22, bonusInitiative: 12, bonusElementalMagic: 12, bonusEndurance: 8,
    },
 
    // unique
    {
      name: "Laska Skradziona Bogu",
      rarity: "unique", slot: "weapon_two", weaponType: "two_handed",
      locationTypes: JSON.stringify(["A", "B"]),
      reqKnowledge: 40, reqIntelligence: 25,
      bonusPower: 32, bonusInitiative: 20, bonusIntelligence: 15, bonusAstralMagic: 10,
    },
    {
      name: "Kość Wymarłego Lewiatana",
      rarity: "unique", slot: "weapon_two", weaponType: "two_handed", 
      locationTypes: JSON.stringify(["C"]),          // tylko C
      reqKnowledge: 45, reqElementalMagic: 28,
      bonusPower: 40, bonusInitiative: 24, bonusElementalMagic: 20, bonusEndurance: 15,
    },
  ],
});

  // ── CZARY ──────────────────────────────────────────────────────────────────
  console.log("Seeding spells...");

  await prisma.spell.createMany({
    skipDuplicates: true,
    data: [
///////////////NOWE CZARY - ZWYKŁE////////////////////////
      {
        name: "Pomniejsze przywołanie",
        category: "offensive", spellPool: "chaotic",
        rarity: "common", 
        element: "basic", damage: 1, isDirectional: true,
        isTutorialReward: true, 
        special: "Nad {target} materializuje się {list} i spadając, zadaje {damage} pkt obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Pomniejszy pocisk chaosu",
        category: "offensive", spellPool: "chaotic",
        rarity: "common", 
        element: "chaos", damage: 7, isDirectional: true, 
        reqBloodMagic: 15,
        special: "Wystrzeliwuje w fioletowy pocisk, który uderza w {target} i zadaje {damage} obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Pocisk chaosu",
        category: "offensive", spellPool: "controlled",
        rarity: "common", 
        element: "chaos", damage: 14, isDirectional: true, 
        reqBloodMagic: 30,
        special: "Wystrzeliwuje w fioletowy pocisk, który uderza w {target} i zadaje {damage} obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Potężny pocisk chaosu",
        category: "offensive", spellPool: "incantation",
        rarity: "common", 
        element: "chaos", damage: 25, isDirectional: true, 
        reqBloodMagic: 45,
        special: "Wystrzeliwuje w fioletowy pocisk, który uderza w {target} i zadaje {damage} obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Pomniejsza wiązka energii",
        category: "offensive", spellPool: "chaotic",
        rarity: "common", 
        element: "energy", damage: 5, isDirectional: true, 
        reqAstralMagic: 5,
        special: "Wystrzeliwuje wiązkę energii, która razi {target} zadając {damage} obrazeń.",
        statusEffects: fx([]),
      },
      {
        name: "Wiązka energii",
        category: "offensive", spellPool: "controlled",
        rarity: "common", 
        element: "energy", damage: 10, isDirectional: true, 
        reqAstralMagic: 20,
        special: "Wystrzeliwuje wiązkę energii, która razi {target} zadając {damage} obrazeń.",
        statusEffects: fx([]),
      },
      {
        name: "Potężna wiązka energii",
        category: "offensive", spellPool: "incantation",
        rarity: "common", 
        element: "energy", damage: 15, isDirectional: true, 
        reqAstralMagic: 35,
        special: "Wystrzeliwuje wiązkę energii, która razi {target} zadając {damage} obrazeń.",
        statusEffects: fx([]),
      },
      {
        name: "Pomniejszy pocisk lodowy",
        category: "offensive", spellPool: "chaotic",
        rarity: "common", 
        element: "water", damage: 5, isDirectional: true, 
        reqElementalMagic: 5,
        special: "W {target} uderzają lodowe sople zadając {damage} obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Pocisk lodowy",
        category: "offensive", spellPool: "controlled",
        rarity: "common", 
        element: "water", damage: 10, isDirectional: true, 
        reqElementalMagic: 20,
        special: "W {target} uderzają lodowe sople zadając {damage} obrażeń.",
        statusEffects: fx([]),
      },
      {
        name: "Potężny pocisk lodowy",
        category: "offensive", spellPool: "incantation",
        rarity: "common", 
        element: "water", damage: 15, isDirectional: true, 
        reqElementalMagic: 35,
        special: "W {target} uderzają lodowe sople zadając {damage} obrażeń.",
        statusEffects: fx([]),
      },
      {
  name: "Pomniejsza ognista strzała",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "common",
  
  element: "fire",
  damage: 5,
  isDirectional: true,
  reqElementalMagic: 5,
  special: "W {target} uderza ognista strzała, zadając {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Ognista strzała",
  category: "offensive",
  spellPool: "controlled",
  rarity: "common",
  
  element: "fire",
  damage: 10,
  isDirectional: true,
  reqElementalMagic: 20,
  special: "W {target} uderza ognista strzała, zadając {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Potężna ognista strzała",
  category: "offensive",
  spellPool: "incantation",
  rarity: "common",
  
  element: "fire",
  damage: 15,
  isDirectional: true,
  reqElementalMagic: 35,
  special: "W {target} uderza ognista strzała, zadając {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Pomniejsza pięść wiatru",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "common",
  
  element: "air",
  damage: 5,
  isDirectional: true,
  reqElementalMagic: 5,
  special: "Uderzenie wiatru trafia w {target}, zadając {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Pięść wiatru",
  category: "offensive",
  spellPool: "controlled",
  rarity: "common",
  
  element: "air",
  damage: 10,
  isDirectional: true,
  reqElementalMagic: 20,
  special: "Uderzenie wiatru trafia w {target}, zadając {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Potężna pięść wiatru",
  category: "offensive",
  spellPool: "incantation",
  rarity: "common",
  
  element: "air",
  damage: 15,
  isDirectional: true,
  reqElementalMagic: 35,
  special: "Uderzenie wiatru trafia w {target}, zadając {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Kamień",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "common",
  
  element: "earth",
  damage: 5,
  isDirectional: true,
  reqElementalMagic: 5,
  special: "Nad {target} materializuje się kamień, który spadając zadaje {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Duży kamień",
  category: "offensive",
  spellPool: "controlled",
  rarity: "common",
  
  element: "earth",
  damage: 10,
  isDirectional: true,
  reqElementalMagic: 20,
  special: "Nad {target} materializuje się duży kamień, który spadając zadaje {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Głaz",
  category: "offensive",
  spellPool: "incantation",
  rarity: "common",
  
  element: "earth",
  damage: 15,
  isDirectional: true,
  reqElementalMagic: 35,
  special: "Nad {target} materializuje się duży głaz, który spadając zadaje {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Jamnik",
  category: "other",
  spellPool: "chaotic",
  rarity: "common",
  
  element: "basic",
  damage: 2,
  isDirectional: false,
  reqBloodMagic: 5,
  special: "Przywołuje ożywiony szkielet jamnika, który atakuje {target} zadając {damage} obrażeń, po czym rozpada się.",
  statusEffects: fx([]),
},

{
  name: "Kamienny Golem",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 0,
  isDirectional: false,
  reqElementalMagic: 5,
  special: "Przywołuje kamiennego golema. Jest tak kamienny, jak to tylko możliwe..",
  statusEffects: fx([]),
},

{
  name: "Modliszka",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 0,
  isDirectional: false,
  special: "Przywołuje regularnych rozmiarów modliszkę, która groźnie wygląda.",
  statusEffects: fx([]),
},

{
  name: "Karaluch",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 0,
  isDirectional: false,
  special: "Przywołuje ogromną ilość karaluchów. Chodzenie po nich jest bardzo nieprzyjemne.",
  statusEffects: fx([]),
},

{
  name: "Centaur",
  category: "summoner",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 0,
  isDirectional: false,
  reqBloodMagic: 10,
  special: "Na polu walki pojawia się Centaur! Nie wygląda na zbyt zachwyconego tą sytuacją...",
  statusEffects: fx([]),
},

{
  name: "Sklepikarz z okolicznej wsi",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 0,
  isDirectional: false,
  reqBloodMagic: 10,
  special: "Przywołuje sklepikarza z okolicznej wsi. Patrzy na pole walki z politowaniem, po czym odchodzi, jakby nic się nie wydarzyło..",
  statusEffects: fx([]),
},

{
  name: "Kaczka",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 0,
  isDirectional: false,
  special: "Przywołuje nad przeciwnikiem gumową kaczkę, która spadając, nie zadaje absolutnie żadnych obrażeń ",
  statusEffects: fx([]),
},

{
  name: "Jajko",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 0,
  isDirectional: false,
  special: "Przywołuje nad {target} jajko, które po uderzeniu pęka i wszystko brudzi",
  statusEffects: fx([]),
},

{
  name: "Cegła",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "common",
  
  element: "basic",
  damage: 2,
  isDirectional: false,
  special: "Przywołuje nad {target} cegłę, która spadając zadaje {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Kłoda",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "common",
  
  element: "basic",
  damage: 5,
  isDirectional: false,
  special: "Przywołuje nad {target} pokaźną kłodę, która spadając zadaje {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Drzwi",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 3,
  isDirectional: false,
  special: "Przywołuje nad {target} rozlatujące się drzwi, który spadając zadają {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Jabłka",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 1,
  isDirectional: false,
  special: "Przywołuje nad głową {target} kilkanaście jabłek, które spadając zadają {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Mały wybuch",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "fire",
  damage: 1,
  isDirectional: false,
  special: "Wywołuje wybuch, który zadaje {target} {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Sztabki złota",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 2,
  isDirectional: false,
  reqAstralMagic: 15,
  special: "Przywołuje deszcz sztabek złota, które zadają każdemu {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Wściekłe kurczaki",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 2,
  isDirectional: false,
  reqBloodMagic: 10,
  special: "Przywołuje stado wściekłych kurczaków, które atakują {target} zadając {damage} obrażeń, po czym oddalają się w kompletnym chaosie",
  statusEffects: fx([]),
},

{
  name: "Krzesło",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 0,
  isDirectional: false,
  reqAstralMagic: 10,
  special: "Przywołuje krzesło, które bardzo agresywnie stoi",
  statusEffects: fx([]),
},

{
  name: "Pomidorowy grad",
  category: "offensive",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 1,
  isDirectional: false,
  reqAstralMagic: 5,
  special: "Wywołuje pomidorowy grad, które spadając zadają każdemu {damage} obrażeń",
  statusEffects: fx([]),
},

{
  name: "Miecz dwuręczny",
  category: "other",
  spellPool: "chaotic",
  rarity: "none",
  
  element: "basic",
  damage: 0,
  isDirectional: false,
  special: "Przywołuje potężny dwuręczny miecz! Tak potężny, że nie ma siły go podnieść.",
  statusEffects: fx([]),
},
 // ── damage_on_move ────────────────────────────────────────────────────────────

{
  name: "LaLava",
  element: "fire", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 10,
  
  special: "Na pobojowisku pojawia się mnóstwo lawy!",
  statusEffects: fx([{
    type: "damage_on_move",
    moveChance: 50,
    moveDamage: 1,
    element: "fire",
    target: "allEnemies",
    duration: 3,
    tickInfo: "Lawa ochlapała {target} zadając {damage} obrażeń.",
    endInfo: "Lawa zanika.",
  }]),
},

{
  name: "Morowe powietrze",
  element: "death", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqBloodMagic: 10,
  
  special: "Pobojowisko wypełnia śmiercionośne powietrze.",
  statusEffects: fx([{
    type: "damage_on_move",
    moveChance: 50,
    moveDamage: 1,
    element: "death",
    target: "allEnemies",
    duration: 3,
    tickInfo: "Morowe powietrze wypełnia płuca {target} zadając {damage} obrażeń.",
    endInfo: "Morowe powietrze zanika.",
  }]),
},

{
  name: "Zdradliwe bagno",
  element: "earth", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 10,
  
  special: "Pobojowisko zalewa nieprzeniknione, ruchome bagno.",
  statusEffects: fx([{
    type: "damage_on_move",
    moveChance: 50,
    moveDamage: 1,
    element: "earth",
    target: "allEnemies",
    duration: 3,
    tickInfo: "Nieprzeniknione bagno okala {target} zadając {damage} obrażeń.",
    endInfo: "Bagno zanika.",
  }]),
},

{
  name: "Rozstrzaskane lustra",
  element: "basic", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  
  special: "Przywołuje dziesiątki luster, które roztrzaskują się o podłoże.",
  statusEffects: fx([{
    type: "damage_on_move",
    moveChance: 50,
    moveDamage: 1,
    element: "basic",
    target: "all",
    duration: 3,
    tickInfo: "Walające się szkło rani {target} zadając {damage} obrażeń.",
    endInfo: "Kawałki szkła magicznie znikają.",
  }]),
},

{
  name: "Lodowisko",
  element: "water", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 10,
  
  special: "Udało mu się sprawić, że całe podłoże zostało skute lodem — strasznie ślisko!",
  statusEffects: fx([{
    type: "damage_on_move",
    moveChance: 50,
    moveDamage: 1,
    element: "water",
    target: "allEnemies",
    duration: 3,
    tickInfo: "{target} poślizgnął się na lodzie i otrzymał {damage} obrażeń.",
    endInfo: "Lód się roztopił.",
  }]),
},

// ── dot ───────────────────────────────────────────────────────────────────────

{
  name: "Iskierki",
  element: "fire", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: true,
  reqElementalMagic: 1,
  
  special: "Niechcący przywołał mnóstwo iskier, które parzą mu dłonie!",
  statusEffects: fx([{
    type: "dot",
    element: "fire",
    damage: 1,
    target: "self",
    duration: 2,
    tickInfo: "{target} otrzymuje {damage} od poparzenia.",
    endInfo: "Poparzenie {target} mija.",
  }]),
},

{
  name: "Zatrucie",
  element: "chaos", rarity: "uncommon", damage: 0, spellPool: "chaotic",
  isDirectional: true,
  reqBloodMagic: 5,
  
  special: "Zatruwa {target}.",
  statusEffects: fx([{
    type: "dot",
    element: "death",
    damage: 1,
    target: "target",
    duration: 5,
    tickInfo: "{target} otrzymuje {damage} od zatrucia.",
    endInfo: "Zatrucie {target} mija.",
  }]),
},

{
  name: "Podpalenie",
  element: "fire", rarity: "uncommon", damage: 0, spellPool: "chaotic",
  isDirectional: true,
  reqElementalMagic: 5,
  
  special: "Podpala {target}.",
  statusEffects: fx([{
    type: "dot",
    element: "fire",
    damage: 1,
    target: "target",
    duration: 5,
    tickInfo: "{target} otrzymuje {damage} od podpalenia.",
    endInfo: "Podpalenie {target} mija.",
  }]),
},

{
  name: "Pomniejszy ładunek energii",
  element: "energy", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqAstralMagic: 15,
  
  special: "Przywołuje ładunek energii, który skacze pomiędzy przeciwnikami zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "energy",
    damage: 2,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od ładunku energii.",
    endInfo: "Ładunek energii zanika.",
  }]),
},

{
  name: "Ładunek energii",
  element: "energy", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqAstralMagic: 30,
  
  special: "Przywołuje ładunek energii, który skacze pomiędzy przeciwnikami zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "energy",
    damage: 4,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od ładunku energii.",
    endInfo: "Ładunek energii zanika.",
  }]),
},

{
  name: "Potężny ładunek energii",
  element: "energy", rarity: "common", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqAstralMagic: 45,
  
  special: "Przywołuje ładunek energii, który skacze pomiędzy przeciwnikami zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "energy",
    damage: 7,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od ładunku energii.",
    endInfo: "Ładunek energii zanika.",
  }]),
},

{
  name: "Pomniejsze lodowe kolce",
  element: "water", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 15,
  
  special: "Przywołuje lodowe kolce, które ranią przeciwników zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "water",
    damage: 2,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od lodowych kolców.",
    endInfo: "Lodowe kolce roztapiają się.",
  }]),
},

{
  name: "Lodowe kolce",
  element: "water", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqElementalMagic: 30,
  
  special: "Przywołuje lodowe kolce, które ranią przeciwników zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "water",
    damage: 4,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od lodowych kolców.",
    endInfo: "Lodowe kolce roztapiają się.",
  }]),
},

{
  name: "Potężne lodowe kolce",
  element: "water", rarity: "common", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqElementalMagic: 45,
  
  special: "Przywołuje lodowe kolce, które ranią przeciwników zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "water",
    damage: 7,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od lodowych kolców.",
    endInfo: "Lodowe kolce roztapiają się.",
  }]),
},

{
  name: "Pomniejszy ognisty krąg",
  element: "fire", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 15,
  
  special: "Przywołuje ognisty krąg wokół przeciwników, który pali ich zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "fire",
    damage: 2,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od ognistego kręgu.",
    endInfo: "Ognisty krąg zanika.",
  }]),
},

{
  name: "Ognisty krąg",
  element: "fire", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqElementalMagic: 30,
  
  special: "Przywołuje ognisty krąg wokół przeciwników, który pali ich zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "fire",
    damage: 4,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od ognistego kręgu.",
    endInfo: "Ognisty krąg zanika.",
  }]),
},

{
  name: "Potężny ognisty krąg",
  element: "fire", rarity: "common", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqElementalMagic: 45,
  
  special: "Przywołuje ognisty krąg wokół przeciwników, który pali ich zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "fire",
    damage: 7,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od ognistego kręgu.",
    endInfo: "Ognisty krąg zanika.",
  }]),
},

{
  name: "Pomniejszy wir powietrza",
  element: "air", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 15,
  
  special: "Przywołuje powietrzny wir, który krąży pomiędzy przeciwnikami zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "air",
    damage: 2,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od wiru powietrza.",
    endInfo: "Wir powietrza zanika.",
  }]),
},

{
  name: "Wir powietrza",
  element: "air", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqElementalMagic: 30,
  
  special: "Przywołuje powietrzny wir, który krąży pomiędzy przeciwnikami zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "air",
    damage: 4,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od wiru powietrza.",
    endInfo: "Wir powietrza zanika.",
  }]),
},

{
  name: "Potężny wir powietrza",
  element: "air", rarity: "common", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqElementalMagic: 45,
  
  special: "Przywołuje powietrzny wir, który krąży pomiędzy przeciwnikami zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "air",
    damage: 7,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od wiru powietrza.",
    endInfo: "Wir powietrza zanika.",
  }]),
},

{
  name: "Pomniejsze wstrząsy",
  element: "earth", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 15,
  
  special: "Wywołuje wstrząsy, które ranią przeciwników zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "earth",
    damage: 2,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od wstrząsów.",
    endInfo: "Wstrząsy ustają.",
  }]),
},

{
  name: "Wstrząsy",
  element: "earth", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqElementalMagic: 30,
  
  special: "Wywołuje wstrząsy, które ranią przeciwników zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "earth",
    damage: 4,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od wstrząsów.",
    endInfo: "Wstrząsy ustają.",
  }]),
},

{
  name: "Potężne wstrząsy",
  element: "earth", rarity: "common", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqElementalMagic: 45,
  
  special: "Wywołuje wstrząsy, które ranią przeciwników zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "earth",
    damage: 7,
    target: "nEnemies",
    count: 2,
    duration: 4,
    tickInfo: "{target} otrzymuje {damage} od wstrząsów.",
    endInfo: "Wstrząsy ustają.",
  }]),
},

{
  name: "Pomniejszy mroczny wir",
  element: "chaos", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqBloodMagic: 5,
  
  special: "Mroczny wir zaczyna krążyć wokół przeciwników, zadając im {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "chaos",
    damage: 1,
    target: "nEnemies",
    count: 3,
    duration: 3,
    tickInfo: "{target} otrzymuje {damage} od mrocznego wiru.",
    endInfo: "Mroczny wir zanika.",
  }]),
},

{
  name: "Mroczny wir",
  element: "chaos", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqBloodMagic: 20,
  
  special: "Mroczny wir zaczyna krążyć wokół przeciwników, zadając im {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "chaos",
    damage: 3,
    target: "nEnemies",
    count: 3,
    duration: 3,
    tickInfo: "{target} otrzymuje {damage} od mrocznego wiru.",
    endInfo: "Mroczny wir zanika.",
  }]),
},

{
  name: "Potężny mroczny wir",
  element: "chaos", rarity: "common", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqBloodMagic: 35,
  
  special: "Mroczny wir zaczyna krążyć wokół przeciwników, zadając im {damage} obrażeń.",
  statusEffects: fx([{
    type: "dot",
    element: "chaos",
    damage: 5,
    target: "nEnemies",
    count: 3,
    duration: 3,
    tickInfo: "{target} otrzymuje {damage} od mrocznego wiru.",
    endInfo: "Mroczny wir zanika.",
  }]),
},

// ── heal_chance ───────────────────────────────────────────────────────────────

{
  name: "Uleczenie",
  element: "life", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: true,
  reqBloodMagic: 5,
  
  special: "Generuje aurę leczącą, która co rundę ma szansę uzdrowić część jego punktów życia.",
  statusEffects: fx([{
    type: "heal_chance",
    healChance: 50,
    healAmount: 10,
    target: "self",
    duration: 5,
    tickInfo: "Aura leczy {damage} punktów życia {target}.",
    endInfo: "{target} nie jest już pod wpływem aury leczącej.",
  }]),
},

{
  name: "Pomniejsze leczenie",
  element: "life", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqBloodMagic: 5,
  
  special: "{target} leczy 25% utraconego życia.",
  statusEffects: fx([{
    type: "heal_chance",
    healChance: 100,
    healMode: "percent",
    healAmount: 25,
    target: "self",
    duration: 1,
  }]),
},

{
  name: "Leczenie",
  element: "life", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqBloodMagic: 20,
  
  special: "{target} leczy 50% utraconego życia.",
  statusEffects: fx([{
    type: "heal_chance",
    healChance: 100,
    healMode: "percent",
    healAmount: 50,
    target: "self",
    duration: 1,
  }]),
},

{
  name: "Potężne leczenie",
  element: "life", rarity: "common", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqBloodMagic: 35,
  
  special: "{target} leczy 75% utraconego życia.",
  statusEffects: fx([{
    type: "heal_chance",
    healChance: 100,
    healMode: "percent",
    healAmount: 75,
    target: "self",
    duration: 1,
  }]),
},

{
  name: "Pomniejsza aura lecząca",
  element: "life", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqBloodMagic: 10,
  
  special: "Wokół sojuszników pojawia się życiowa energia, która leczy ich rany.",
  statusEffects: fx([{
    type: "heal_chance",
    healChance: 100,
    healAmount: 10,
    target: "nAllies",
    count: 3,
    duration: 5,
    tickInfo: "Życiowa energia leczy {damage} punktów życia {target}.",
    endInfo: "Aura lecząca przestaje działać.",
  }]),
},

{
  name: "Aura lecząca",
  element: "life", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqBloodMagic: 25,
  
  special: "Wokół sojuszników pojawia się życiowa energia, która leczy ich rany.",
  statusEffects: fx([{
    type: "heal_chance",
    healChance: 100,
    healAmount: 20,
    target: "nAllies",
    count: 3,
    duration: 5,
    tickInfo: "Życiowa energia leczy {damage} punktów życia {target}.",
    endInfo: "Aura lecząca przestaje działać.",
  }]),
},

{
  name: "Potężna aura lecząca",
  element: "life", rarity: "common", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqBloodMagic: 40,
  
  special: "Wokół sojuszników pojawia się życiowa energia, która leczy ich rany.",
  statusEffects: fx([{
    type: "heal_chance",
    healChance: 100,
    healAmount: 30,
    target: "nAllies",
    count: 3,
    duration: 5,
    tickInfo: "Życiowa energia leczy {damage} punktów życia {target}.",
    endInfo: "Aura lecząca przestaje działać.",
  }]),
},

// ── miss_chance ───────────────────────────────────────────────────────────────

{
  name: "Rój much",
  element: "basic", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: true,
  
  special: "Przywołuje rój irytujących much wokół {target} (-25% szansy na trafienie).",
  statusEffects: fx([{
    type: "miss_chance",
    missChance: 25,
    target: "target",
    duration: 2,
    endInfo: "Rój much odleciał.",
  }]),
},

{
  name: "Porywisty wiatr",
  element: "basic", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  
  special: "Przywołuje porywisty wiatr, który utrudnia przeciwnikom celowanie (-35% szansy na trafienie).",
  statusEffects: fx([{
    type: "miss_chance",
    missChance: 35,
    target: "allEnemies",
    duration: 2,
    endInfo: "Wiatr ustał.",
  }]),
},

{
  name: "Mglista zasłona",
  element: "basic", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 5,
  
  special: "Wytworzył w powietrzu mgłę, która utrudnia przeciwnikom celowanie (-50% szansy na trafienie).",
  statusEffects: fx([{
    type: "miss_chance",
    missChance: 50,
    target: "allEnemies",
    duration: 3,
    endInfo: "Mgła zanika.",
  }]),
},

// ── resist ────────────────────────────────────────────────────────────────────

{
  name: "Kamienna skóra",
  element: "basic", rarity: "rare", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 10,
  
  special: "Jego skóra staje się twarda jak kamień! (+50% odporności na obrażenia bazowe).",
  statusEffects: fx([{
    type: "resist",
    element: "basic",
    value: 50,
    target: "self",
    duration: null,
  }]),
},

{
  name: "Pomniejsza ochrona przed energią",
  element: "energy", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqAstralMagic: 5,
  
  special: "Jego ciało pokrywają złote znaki, które absorbują część otrzymywanych obrażeń od energii.",
  statusEffects: fx([{
    type: "resist", element: "energy", value: 25, target: "self", duration: null,
  }]),
},

{
  name: "Pomniejsza ochrona przed chaosem",
  element: "chaos", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqBloodMagic: 5,
  
  special: "Jego ciało pokrywają fioletowe spirale, które absorbują część otrzymywanych obrażeń z chaosu.",
  statusEffects: fx([{
    type: "resist", element: "chaos", value: 25, target: "self", duration: null,
  }]),
},

{
  name: "Pomniejsza ochrona przed żywiołem śmierci",
  element: "death", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqBloodMagic: 5,
  
  special: "Jego ciało pokrywają czarne znaki, które absorbują część otrzymywanych obrażeń z magii śmierci.",
  statusEffects: fx([{
    type: "resist", element: "death", value: 25, target: "self", duration: null,
  }]),
},

{
  name: "Ochrona przed energią",
  element: "energy", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqAstralMagic: 20,
  
  special: "Jego ciało pokrywają złote znaki, które absorbują część otrzymywanych obrażeń od energii.",
  statusEffects: fx([{
    type: "resist", element: "energy", value: 50, target: "self", duration: null,
  }]),
},

{
  name: "Ochrona przed chaosem",
  element: "chaos", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqBloodMagic: 20,
  
  special: "Jego ciało pokrywają fioletowe spirale, które absorbują część otrzymywanych obrażeń z chaosu.",
  statusEffects: fx([{
    type: "resist", element: "chaos", value: 50, target: "self", duration: null,
  }]),
},

{
  name: "Ochrona przed żywiołem śmierci",
  element: "death", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqBloodMagic: 20,
  
  special: "Jego ciało pokrywają czarne znaki, które absorbują część otrzymywanych obrażeń z magii śmierci.",
  statusEffects: fx([{
    type: "resist", element: "death", value: 50, target: "self", duration: null,
  }]),
},

{
  name: "Potężna ochrona przed energią",
  element: "energy", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqAstralMagic: 35,
  
  special: "Jego ciało pokrywają złote znaki, które absorbują część otrzymywanych obrażeń od energii.",
  statusEffects: fx([{
    type: "resist", element: "energy", value: 75, target: "self", duration: null,
  }]),
},

{
  name: "Potężna ochrona przed chaosem",
  element: "chaos", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqBloodMagic: 35,
  
  special: "Jego ciało pokrywają fioletowe spirale, które absorbują część otrzymywanych obrażeń z chaosu.",
  statusEffects: fx([{
    type: "resist", element: "chaos", value: 75, target: "self", duration: null,
  }]),
},

{
  name: "Potężna ochrona przed żywiołem śmierci",
  element: "death", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqBloodMagic: 35,
  
  special: "Jego ciało pokrywają czarne znaki, które absorbują część otrzymywanych obrażeń z magii śmierci.",
  statusEffects: fx([{
    type: "resist", element: "death", value: 75, target: "self", duration: null,
  }]),
},

{
  name: "Pomniejsza ochrona przed żywiołem ognia",
  element: "fire", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 5,
  
  special: "Jego ciało pokrywają ogniste znaki, które absorbują część otrzymywanych obrażeń z magii ognia.",
  statusEffects: fx([{
    type: "resist", element: "fire", value: 25, target: "self", duration: null,
  }]),
},

{
  name: "Pomniejsza ochrona przed żywiołem wody",
  element: "water", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 5,
  
  special: "Jego ciało pokrywają czerwone znaki, które absorbują część otrzymywanych obrażeń z magii wody.",
  statusEffects: fx([{
    type: "resist", element: "water", value: 25, target: "self", duration: null,
  }]),
},

{
  name: "Pomniejsza ochrona przed żywiołem powietrza",
  element: "air", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 5,
  
  special: "Jego ciało pokrywają białe znaki, które absorbują część otrzymywanych obrażeń z magii powietrza.",
  statusEffects: fx([{
    type: "resist", element: "air", value: 25, target: "self", duration: null,
  }]),
},

{
  name: "Pomniejsza ochrona przed żywiołem ziemi",
  element: "earth", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 5,
  
  special: "Jego ciało pokrywają brązowe znaki, które absorbują część otrzymywanych obrażeń z magii ziemi.",
  statusEffects: fx([{
    type: "resist", element: "earth", value: 25, target: "self", duration: null,
  }]),
},

{
  name: "Pomniejsza ochrona przed żywiołami",
  element: "earth", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 5,
  
  special: "Jego ciało pokrywają różne znaki, które absorbują część otrzymywanych obrażeń z magii wody, ziemi, ognia i powietrza.",
  statusEffects: fx([
    { type: "resist", element: "earth", value: 25, target: "self", duration: null },
    { type: "resist", element: "water", value: 25, target: "self", duration: null },
    { type: "resist", element: "fire",  value: 25, target: "self", duration: null },
    { type: "resist", element: "air",   value: 25, target: "self", duration: null },
  ]),
},

{
  name: "Ochrona przed żywiołem ognia",
  element: "fire", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqElementalMagic: 20,
  
  special: "Jego ciało pokrywają ogniste znaki, które absorbują część otrzymywanych obrażeń z magii ognia.",
  statusEffects: fx([{
    type: "resist", element: "fire", value: 50, target: "self", duration: null,
  }]),
},

{
  name: "Ochrona przed żywiołem wody",
  element: "water", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqElementalMagic: 20,
  
  special: "Jego ciało pokrywają czerwone znaki, które absorbują część otrzymywanych obrażeń z magii wody.",
  statusEffects: fx([{
    type: "resist", element: "water", value: 50, target: "self", duration: null,
  }]),
},

{
  name: "Ochrona przed żywiołem powietrza",
  element: "air", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqElementalMagic: 20,
  
  special: "Jego ciało pokrywają białe znaki, które absorbują część otrzymywanych obrażeń z magii powietrza.",
  statusEffects: fx([{
    type: "resist", element: "air", value: 50, target: "self", duration: null,
  }]),
},

{
  name: "Ochrona przed żywiołem ziemi",
  element: "earth", rarity: "common", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqElementalMagic: 20,
  
  special: "Jego ciało pokrywają brązowe znaki, które absorbują część otrzymywanych obrażeń z magii ziemi.",
  statusEffects: fx([{
    type: "resist", element: "earth", value: 50, target: "self", duration: null,
  }]),
},

{
  name: "Ochrona przed żywiołami",
  element: "basic", rarity: "uncommon", damage: 0, spellPool: "controlled",
  isDirectional: false,
  reqElementalMagic: 15,
  
  special: "Jego ciało pokrywają różne znaki, które absorbują część otrzymywanych obrażeń z magii wody, ziemi, ognia i powietrza.",
  statusEffects: fx([
    { type: "resist", element: "fire",  value: 20, target: "self", duration: null },
    { type: "resist", element: "water", value: 20, target: "self", duration: null },
    { type: "resist", element: "air",   value: 20, target: "self", duration: null },
    { type: "resist", element: "earth", value: 20, target: "self", duration: null },
  ]),
},

{
  name: "Potężna ochrona przed żywiołem ognia",
  element: "fire", rarity: "common", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqElementalMagic: 35,
  
  special: "Jego ciało pokrywają ogniste znaki, które absorbują część otrzymywanych obrażeń z magii ognia.",
  statusEffects: fx([{
    type: "resist", element: "fire", value: 75, target: "self", duration: null,
  }]),
},

{
  name: "Potężna ochrona przed żywiołem wody",
  element: "water", rarity: "common", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqElementalMagic: 35,
  
  special: "Jego ciało pokrywają czerwone znaki, które absorbują część otrzymywanych obrażeń z magii wody.",
  statusEffects: fx([{
    type: "resist", element: "water", value: 75, target: "self", duration: null,
  }]),
},

{
  name: "Potężna ochrona przed żywiołem powietrza",
  element: "air", rarity: "common", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqElementalMagic: 35,
  
  special: "Jego ciało pokrywają białe znaki, które absorbują część otrzymywanych obrażeń z magii powietrza.",
  statusEffects: fx([{
    type: "resist", element: "air", value: 75, target: "self", duration: null,
  }]),
},

{
  name: "Potężna ochrona przed żywiołem ziemi",
  element: "earth", rarity: "common", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqElementalMagic: 35,
  
  special: "Jego ciało pokrywają brązowe znaki, które absorbują część otrzymywanych obrażeń z magii ziemi.",
  statusEffects: fx([{
    type: "resist", element: "earth", value: 75, target: "self", duration: null,
  }]),
},

{
  name: "Potężna ochrona przed żywiołami",
  element: "basic", rarity: "uncommon", damage: 0, spellPool: "incantation",
  isDirectional: false,
  reqElementalMagic: 25,
  
  special: "Jego ciało pokrywają różne znaki, które absorbują część otrzymywanych obrażeń z magii wody, ziemi, ognia i powietrza.",
  statusEffects: fx([
    { type: "resist", element: "fire",  value: 40, target: "self", duration: null },
    { type: "resist", element: "water", value: 40, target: "self", duration: null },
    { type: "resist", element: "air",   value: 40, target: "self", duration: null },
    { type: "resist", element: "earth", value: 40, target: "self", duration: null },
  ]),
},

// ── stat_boost ────────────────────────────────────────────────────────────────

{
  name: "Przyspieszenie",
  element: "basic", rarity: "uncommon", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 10,
  
  special: "Wokół niego oraz jego sojuszników zaczyna powiewać przyjemna bryza, która przyspiesza ich ruchy.",
  statusEffects: fx([{
    type: "stat_boost",
    stat: "initiative",
    statMode: "flat",
    statAmount: 1000,
    target: "allAllies",
    duration: 5,
    endInfo: "Czar przyspieszenia przemija.",
  }]),
},

{
  name: "Lodowaty podmuch",
  element: "air", rarity: "uncommon", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 10,
  
  special: "Wokół przeciwników zaczyna wiać lodowaty wiatr, który spowalnia ich ruchy.",
  statusEffects: fx([{
    type: "stat_boost",
    stat: "initiative",
    statMode: "percent",
    statAmount: -50,
    target: "allEnemies",
    duration: 5,
    endInfo: "Lodowaty wiatr ustaje.",
  }]),
},

{
  name: "Spowolnienie",
  element: "basic", rarity: "uncommon", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqElementalMagic: 5,
  
  special: "Wokół przeciwników pojawiają się ogromne ilości błota, które znacznie spowalniają ich ruchy (-50% inicjatywy).",
  statusEffects: fx([{
    type: "stat_boost",
    stat: "initiative",
    statMode: "percent",
    statAmount: -50,
    target: "allEnemies",
    duration: 5,
    endInfo: "Błoto zanika.",
  }]),
},

{
  // Oryginał: "+5 do wszystkich statystyk". Dodaj/usuń statystyki wg potrzeb.
  name: "Wzmocnienie",
  element: "basic", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqAstralMagic: 5,
  
  special: "Nakłada na siebie aurę wzmocnienia (+5 do wszystkich statystyk).",
  statusEffects: fx([
    { type: "stat_boost", stat: "power",      statMode: "flat", statAmount: 5, target: "self", duration: 5 },
    { type: "stat_boost", stat: "initiative",  statMode: "flat", statAmount: 5, target: "self", duration: 5 },
    { type: "stat_boost", stat: "resistance",  statMode: "flat", statAmount: 5, target: "self", duration: 5 },
    { type: "stat_boost", stat: "fireMagic",   statMode: "flat", statAmount: 5, target: "self", duration: 5 },
    { type: "stat_boost", stat: "waterMagic",  statMode: "flat", statAmount: 5, target: "self", duration: 5 },
    { type: "stat_boost", stat: "earthMagic",  statMode: "flat", statAmount: 5, target: "self", duration: 5 },
    { type: "stat_boost", stat: "airMagic",    statMode: "flat", statAmount: 5, target: "self", duration: 5 },
    { type: "stat_boost", stat: "chaosMagic",  statMode: "flat", statAmount: 5, target: "self", duration: 5 },
    { type: "stat_boost", stat: "energyMagic", statMode: "flat", statAmount: 5, target: "self", duration: 5 },
    { type: "stat_boost", stat: "lifeMagic",   statMode: "flat", statAmount: 5, target: "self", duration: 5 },
    { type: "stat_boost", stat: "deathMagic",  statMode: "flat", statAmount: 5, target: "self", duration: 5 },
  ]),
},

// ── stun ──────────────────────────────────────────────────────────────────────

{
  name: "Prześcieradło",
  element: "basic", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: true,
  
  special: "Przywołuje prześcieradło nad {target}, które blokuje ruchy!",
  statusEffects: fx([{
    type: "stun",
    stunChance: 100,
    stunDuration: 2,
    target: "target",
    duration: null,
    endInfo: "{target} wyplątał się z prześcieradła.",
  }]),
},

{
  name: "Motyle",
  element: "basic", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: false,
  reqBloodMagic: 5,
  
  special: "Przywołuje chmarę pięknych, kolorowych motyli — wszyscy stoją zauroczeni.",
  statusEffects: fx([{
    type: "stun",
    stunChance: 100,
    stunDuration: 1,
    target: "all",
    duration: null,
  }]),
},

{
  name: "Podmuch",
  element: "air", rarity: "common", damage: 1, spellPool: "chaotic",
  isDirectional: true,
  reqElementalMagic: 5,
  
  special: "Generuje mocny podmuch, który uderza w {target} zadając {damage} obrażeń.",
  statusEffects: fx([{
    type: "stun",
    stunChance: 25,
    stunDuration: 1,
    target: "target",
    duration: null,
    descAlt: "Podmuch wytrąca {target} z równowagi — traci akcję na 1 turę.",
    endInfo: "{target} wstaje.",
  }]),
},

{
  name: "Oślepienie",
  element: "basic", rarity: "common", damage: 0, spellPool: "chaotic",
  isDirectional: true,
  reqAstralMagic: 5,
  
  special: "Generuje potężny błysk, który oślepia {target}.",
  statusEffects: fx([{
    type: "stun",
    stunChance: 100,
    stunDuration: 3,
    target: "randomEnemy",
    duration: null,
    endInfo: "{target} odzyskuje wzrok.",
  }]),
},

// ── vulnerable ────────────────────────────────────────────────────────────────

{
  name: "Wodna kula",
  element: "water", rarity: "common", damage: 5, spellPool: "chaotic",
  isDirectional: true,
  reqElementalMagic: 10,
  
  special: "Tworzy w powietrzu dużą, wodną kulę, która z impetem wpada w {target} zadając {damage} obrażeń i nadając status mokry.",
  statusEffects: fx([{
    type: "vulnerable",
    element: "energy",
    value: 25,
    target: "target",
    duration: 4,
    endInfo: "{target} nie jest już mokry.",
  }]),
},

{
  name: "Piorun kulisty",
  element: "energy", rarity: "common", damage: 5, spellPool: "chaotic",
  isDirectional: true,
  reqAstralMagic: 10,
  
  special: "Generuje mały piorun kulisty, który uderza w {target} zadając {damage} obrażeń i nadając status naelektryzowany.",
  statusEffects: fx([{
    type: "vulnerable",
    element: "water",
    value: 25,
    target: "target",
    duration: 5,
    endInfo: "{target} nie jest już naelektryzowany.",
  }]),
},

{
  name: "Strumień wody",
  element: "water", rarity: "common", damage: 1, spellPool: "chaotic",
  isDirectional: true,
  reqElementalMagic: 10,
  
  special: "Tworzy strumień wody pod ciśnieniem, który uderza w {target} zadając {damage} obrażeń i nadając status mokry.",
  statusEffects: fx([{
    type: "vulnerable",
    element: "energy",
    value: 50,
    target: "target",
    duration: 5,
    endInfo: "{target} nie jest już mokry.",
  }]),
},

    ],
  });

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());