import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding items...");

  await prisma.item.createMany({
    skipDuplicates: true,
    data: [
      // ── SZATY ──
      { name: "Podarta szata nowicjusza",   rarity: "common",   slot: "robe",       bonusEndurance: 3 },
      { name: "Szata ucznia magii",          rarity: "uncommon", slot: "robe",       reqKnowledge: 5,  bonusEndurance: 8,  bonusPower: 2 },
      { name: "Szata arcymaga",              rarity: "rare",     slot: "robe",       reqKnowledge: 20, bonusEndurance: 20, bonusPower: 8 },
      // ── BUTY ──
      { name: "Znoszone buty",              rarity: "common",   slot: "boots",      bonusEndurance: 5 },
      { name: "Buty wędrowca",              rarity: "uncommon", slot: "boots",      reqKnowledge: 5,  bonusEndurance: 10, bonusAir: 2 },
      // ── CZAPKI ──
      { name: "Słomkowy kapelusz",          rarity: "common",   slot: "hat",        bonusPower: 1 },
      { name: "Spiczasta czapka maga",      rarity: "uncommon", slot: "hat",        reqKnowledge: 5,  bonusPower: 4,  bonusCastSpeed: 2 },
      { name: "Kaptur chaosu",              rarity: "rare",     slot: "hat",        reqChaos: 10,     bonusChaos: 5,  bonusPower: 6 },
      // ── AMULETY ──
      { name: "Sznurek z kamieniem",        rarity: "common",   slot: "amulet",     bonusFire: 1 },
      { name: "Magiczny łańcuch",           rarity: "uncommon", slot: "amulet",     reqKnowledge: 5,  bonusFire: 3, bonusWater: 3, bonusEarth: 3, bonusAir: 3, bonusChaos: 3 },
      // ── BRONIE JEDNORĘCZNE ──
      { name: "Chyba-magiczny-patyk",       rarity: "common",   slot: "weapon_one", weaponType: "one_handed", bonusEarth: 1 },
      { name: "Różdżka ucznia",             rarity: "common",   slot: "weapon_one", weaponType: "one_handed", bonusCastSpeed: 2 },
      { name: "Kryształowa różdżka",        rarity: "uncommon", slot: "weapon_one", weaponType: "one_handed", reqKnowledge: 10, bonusCastSpeed: 5, bonusPower: 3 },
      // ── BRONIE DWURĘCZNE ──
      { name: "Drewniany kij",              rarity: "common",   slot: "weapon_two", weaponType: "two_handed", bonusEndurance: 5, bonusPower: 2 },
      { name: "Kostur wędrowca",            rarity: "uncommon", slot: "weapon_two", weaponType: "two_handed", reqKnowledge: 8,  bonusPower: 8, bonusCastSpeed: 4 },
      { name: "Wypełniony magią kostur",    rarity: "rare",     slot: "weapon_two", weaponType: "two_handed", reqKnowledge: 25, bonusPower: 18, bonusCastSpeed: 10 },
    ],
  });

  console.log("Seeding spells...");

  await prisma.spell.createMany({
    skipDuplicates: true,
    data: [
      { name: "Kula ognia",               element: "fire",  rarity: "common",   damage: 10, reqFire: 5,  reqChaos: 1 },
      { name: "Piorun kulisty",           element: "air",   rarity: "common",   damage: 10, reqAir: 5,   reqChaos: 1 },
      { name: "Sople lodu",               element: "water", rarity: "common",   damage: 10, reqWater: 5, reqChaos: 1 },
      { name: "Błoto",                    element: "earth", rarity: "common",   damage: 2,  reqWater: 1, reqEarth: 1 },
      { name: "Strumień wody",            element: "water", rarity: "common",   damage: 2,  reqWater: 2 },
      { name: "Podmuch",                  element: "air",   rarity: "common",   damage: 2,  reqAir: 2 },
      { name: "Zabójczy królik",          element: "chaos", rarity: "uncommon", damage: 25, reqChaos: 10 },
      { name: "Tornado",                  element: "air",   rarity: "uncommon", damage: 25, reqAir: 10,  reqChaos: 5 },
      { name: "Rój magicznych pszczół",   element: "chaos", rarity: "uncommon", damage: 15, reqFire: 3,  reqWater: 3, reqEarth: 3, reqAir: 3, reqChaos: 3 },
    ],
  });

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());