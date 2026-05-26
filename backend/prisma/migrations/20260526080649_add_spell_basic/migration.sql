-- AlterTable
ALTER TABLE "Spell" ADD COLUMN     "basicCost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'offensive',
ADD COLUMN     "isBasic" BOOLEAN NOT NULL DEFAULT false;
