import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Usuń duplikaty czarów (id 1-9)
  await prisma.spell.deleteMany({
    where: { id: { lte: 9 } },
  });

  console.log("Duplikaty usunięte!");

  const spells = await prisma.spell.findMany();
  console.log(`Pozostałe czary: ${spells.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());