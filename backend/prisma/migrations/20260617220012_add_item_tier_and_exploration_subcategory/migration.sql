-- AlterTable
ALTER TABLE "CharacterAction" ADD COLUMN     "explorationLocation" TEXT;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "baseBonus" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "baseReqs" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "locationTypes" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "tier" INTEGER NOT NULL DEFAULT 1;
