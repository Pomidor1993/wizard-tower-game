-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "alignmentClass" TEXT,
ADD COLUMN     "alignmentPath" TEXT,
ADD COLUMN     "finalClassUnlocked" BOOLEAN NOT NULL DEFAULT false;
