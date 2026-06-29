import { PrismaClient } from "@prisma/client";
import { UTILITY_SPELLS } from "./utility-spells.seed.js";
import { OFFENSIVE_SPELLS } from "./seed-spells.offensive.js";
import { SUPPORTIVE_SPELLS } from "./seed-spells.supportive.js";
import { SUMMONER_SPELLS } from "./seed-spells.summoner.js";

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

  const allItems = [
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
    // talismany
    // ════════════════════════════════════════════════════════
 
    // common
    {
      name: "Sznurek z zagiętą monetą",
      rarity: "common", slot: "talisman", 
      locationTypes: JSON.stringify(["A", "B", "C"]),
      bonusElementalMagic: 1,
    },
    {
      name: "Korzeń zasuszony w kształt ryby",
      rarity: "common", slot: "talisman", 
      locationTypes: JSON.stringify(["C"]),          // tylko C
      bonusElementalMagic: 2, bonusBloodMagic: 1,
    },
 
    // uncommon
    {
      name: "Kamień z wyrytą runą",
      rarity: "uncommon", slot: "talisman", 
      locationTypes: JSON.stringify(["A", "B"]),
      reqKnowledge: 5,
      bonusElementalMagic: 4, bonusAstralMagic: 3,
    },
    {
      name: "Wisiorek z kryształem jaskiniowym",
      rarity: "uncommon", slot: "talisman", 
      locationTypes: JSON.stringify(["A"]),          // tylko A
      reqKnowledge: 6, reqElementalMagic: 4,
      bonusElementalMagic: 6, bonusAstralMagic: 4, bonusResistance: 3,
    },
 
    // rare
    {
      name: "Łańcuch Trzech Żywiołów",
      rarity: "rare", slot: "talisman", 
      locationTypes: JSON.stringify(["A", "B", "C"]),
      reqKnowledge: 20, reqElementalMagic: 10,
      bonusElementalMagic: 10, bonusAstralMagic: 8, bonusBloodMagic: 8,
    },
    {
      name: "Medalion Utopionego Kapłana",
      rarity: "rare", slot: "talisman", 
      locationTypes: JSON.stringify(["C"]),          // tylko C
      reqKnowledge: 22, reqAstralMagic: 12,
      bonusElementalMagic: 12, bonusAstralMagic: 10, bonusBloodMagic: 9, bonusResistance: 5,
    },
 
    // unique
    {
      name: "Oko Smoka Głębin",
      rarity: "unique", slot: "talisman",
      locationTypes: JSON.stringify(["B", "C"]),
      reqKnowledge: 38, reqElementalMagic: 22,
      bonusElementalMagic: 20, bonusAstralMagic: 16, bonusBloodMagic: 14, bonusPower: 10,
    },
    {
      name: "Serce Zamkniętego Boga",
      rarity: "unique", slot: "talisman",
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
  ];
    for (const item of allItems) {
    await prisma.item.upsert({
      where: { name: item.name },
      update: item,
      create: item,
    });
  }
  console.log("Items done.");


  console.log("Seeding/updating spells...");
  const allSpells = [...UTILITY_SPELLS, ...OFFENSIVE_SPELLS, ...SUPPORTIVE_SPELLS, ...SUMMONER_SPELLS];
  for (const spell of allSpells) {
    await prisma.spell.upsert({
      where: { name: spell.name },
      update: spell,
      create: spell,
    });
  }
  console.log("Spells done.");
}


main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());