import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding items...");

  await prisma.item.createMany({
    skipDuplicates: true,
    data: [
      { name: "Chyba-magiczny-patyk",           rarity: "common",   reqKnowledge: 0, bonusEarth: 1 },
      { name: "Podejrzanie wyglądający liść",    rarity: "common",   reqKnowledge: 0, bonusEarth: 2 },
      { name: "Znoszone buty",                   rarity: "common",   reqKnowledge: 0, bonusEndurance: 5 },
      { name: "Magiczny łańcuch",                rarity: "uncommon", reqKnowledge: 5, bonusFire: 3, bonusWater: 3, bonusEarth: 3, bonusAir: 3, bonusChaos: 3 },
      { name: "Kamień z iskrą",                  rarity: "common",   reqKnowledge: 0, bonusFire: 1 },
      { name: "Muszla szeptacza",                rarity: "common",   reqKnowledge: 0, bonusWater: 1 },
      { name: "Pióro wietrznika",                rarity: "common",   reqKnowledge: 0, bonusAir: 1 },
      { name: "Grudka chaosu",                   rarity: "uncommon", reqKnowledge: 3, bonusChaos: 2 },
      { name: "Starożytny pergamin",             rarity: "rare",     reqKnowledge: 10, bonusFire: 5, bonusWater: 5 },
      { name: "Kryształ mocy",                   rarity: "rare",     reqKnowledge: 15, bonusEarth: 8, bonusEndurance: 10 },
    ],
  });

  console.log("Seeding spells...");

  await prisma.spell.createMany({
    skipDuplicates: true,
    data: [
      { name: "Kula ognia",          element: "fire",  rarity: "common",   damage: 10, reqFire: 5,  reqChaos: 1 },
      { name: "Piorun kulisty",      element: "air",   rarity: "common",   damage: 10, reqAir: 5,   reqChaos: 1 },
      { name: "Sople lodu",          element: "water", rarity: "common",   damage: 10, reqWater: 5, reqChaos: 1 },
      { name: "Błoto",               element: "earth", rarity: "common",   damage: 2,  reqWater: 1, reqEarth: 1 },
      { name: "Strumień wody",       element: "water", rarity: "common",   damage: 2,  reqWater: 2 },
      { name: "Podmuch",             element: "air",   rarity: "common",   damage: 2,  reqAir: 2 },
      { name: "Zabójczy królik",     element: "chaos", rarity: "uncommon", damage: 25, reqChaos: 10 },
      { name: "Tornado",             element: "air",   rarity: "uncommon", damage: 25, reqAir: 10,  reqChaos: 5 },
      { name: "Rój magicznych pszczół", element: "chaos", rarity: "uncommon", damage: 15, reqFire: 3, reqWater: 3, reqEarth: 3, reqAir: 3, reqChaos: 3 },
    ],
  });

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());