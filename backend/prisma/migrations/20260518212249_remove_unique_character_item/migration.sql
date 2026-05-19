/*
  Warnings:

  - You are about to drop the column `reqAir` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqChaos` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqEarth` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqFire` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqWater` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqAir` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `reqChaos` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `reqEarth` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `reqFire` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `reqWater` on the `Spell` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Character" ALTER COLUMN "powerShards" SET DEFAULT 1,
ALTER COLUMN "studyActions" SET DEFAULT 30,
ALTER COLUMN "explorationActions" SET DEFAULT 15;

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "reqAir",
DROP COLUMN "reqChaos",
DROP COLUMN "reqEarth",
DROP COLUMN "reqFire",
DROP COLUMN "reqWater",
ADD COLUMN     "bonusDeathMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusEnergyMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusIntelligence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusKnowledge" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusLifeMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusResistance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqAirMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqChaosMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqDeathMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqEarthMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqEndurance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqEnergyMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqFireMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqInitiative" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqIntelligence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqLifeMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqPower" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqResistance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqWaterMagic" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Spell" DROP COLUMN "reqAir",
DROP COLUMN "reqChaos",
DROP COLUMN "reqEarth",
DROP COLUMN "reqFire",
DROP COLUMN "reqWater",
ADD COLUMN     "reqAirMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqChaosMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqDeathMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqEarthMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqEnergyMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqFireMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqLifeMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqWaterMagic" INTEGER NOT NULL DEFAULT 0;
