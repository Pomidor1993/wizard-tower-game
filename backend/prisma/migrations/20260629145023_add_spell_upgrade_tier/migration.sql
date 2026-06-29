-- AlterTable
ALTER TABLE "SpellbookEntry" ADD COLUMN     "lastUpgradedAt" TIMESTAMP(3),
ADD COLUMN     "upgradeTier" INTEGER NOT NULL DEFAULT 0;
