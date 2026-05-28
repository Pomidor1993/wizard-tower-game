/*
  Warnings:

  - You are about to drop the column `airMagic` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `chaosMagic` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `deathMagic` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `earthMagic` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `elementPower` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `energyMagic` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `fireMagic` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `lifeMagic` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `waterMagic` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `bonusAirMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `bonusChaosMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `bonusDeathMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `bonusEarthMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `bonusElementPower` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `bonusEnergyMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `bonusFireMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `bonusLifeMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `bonusWaterMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqAirMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqChaosMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqDeathMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqEarthMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqElementPower` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqEnergyMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqFireMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqLifeMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `reqWaterMagic` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `maxDamage` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `minDamage` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `reqAirMagic` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `reqChaosMagic` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `reqDeathMagic` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `reqEarthMagic` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `reqEnergyMagic` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `reqFireMagic` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `reqLifeMagic` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `reqWaterMagic` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `summonMaxDamage` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `summonMaxHp` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `summonMaxInitiative` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `summonMinDamage` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `summonMinHp` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `summonMinInitiative` on the `Spell` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Character" DROP COLUMN "airMagic",
DROP COLUMN "chaosMagic",
DROP COLUMN "deathMagic",
DROP COLUMN "earthMagic",
DROP COLUMN "elementPower",
DROP COLUMN "energyMagic",
DROP COLUMN "fireMagic",
DROP COLUMN "lifeMagic",
DROP COLUMN "waterMagic",
ADD COLUMN     "astralMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bloodMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "elementalMagic" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "bonusAirMagic",
DROP COLUMN "bonusChaosMagic",
DROP COLUMN "bonusDeathMagic",
DROP COLUMN "bonusEarthMagic",
DROP COLUMN "bonusElementPower",
DROP COLUMN "bonusEnergyMagic",
DROP COLUMN "bonusFireMagic",
DROP COLUMN "bonusLifeMagic",
DROP COLUMN "bonusWaterMagic",
DROP COLUMN "reqAirMagic",
DROP COLUMN "reqChaosMagic",
DROP COLUMN "reqDeathMagic",
DROP COLUMN "reqEarthMagic",
DROP COLUMN "reqElementPower",
DROP COLUMN "reqEnergyMagic",
DROP COLUMN "reqFireMagic",
DROP COLUMN "reqLifeMagic",
DROP COLUMN "reqWaterMagic",
ADD COLUMN     "bonusAstralMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusBloodlMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusElementalMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqAstralMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqBloodMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqElementalMagic" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Spell" DROP COLUMN "maxDamage",
DROP COLUMN "minDamage",
DROP COLUMN "reqAirMagic",
DROP COLUMN "reqChaosMagic",
DROP COLUMN "reqDeathMagic",
DROP COLUMN "reqEarthMagic",
DROP COLUMN "reqEnergyMagic",
DROP COLUMN "reqFireMagic",
DROP COLUMN "reqLifeMagic",
DROP COLUMN "reqWaterMagic",
DROP COLUMN "summonMaxDamage",
DROP COLUMN "summonMaxHp",
DROP COLUMN "summonMaxInitiative",
DROP COLUMN "summonMinDamage",
DROP COLUMN "summonMinHp",
DROP COLUMN "summonMinInitiative",
ADD COLUMN     "reqAstralMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqBloodMagic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqElementalMagic" INTEGER NOT NULL DEFAULT 0;
