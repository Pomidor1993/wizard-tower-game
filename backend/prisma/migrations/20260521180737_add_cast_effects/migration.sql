-- AlterTable
ALTER TABLE "Character" ALTER COLUMN "skillPoints" SET DEFAULT 50;

-- AlterTable
ALTER TABLE "Spell" ADD COLUMN     "castEffects" TEXT NOT NULL DEFAULT '[]';
