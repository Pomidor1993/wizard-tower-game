-- AlterTable
ALTER TABLE "Spell" ADD COLUMN     "specialType" TEXT,
ADD COLUMN     "summonCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "summonDamage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "summonElement" TEXT,
ADD COLUMN     "summonHp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "summonInitiative" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "summonTargetType" TEXT;
