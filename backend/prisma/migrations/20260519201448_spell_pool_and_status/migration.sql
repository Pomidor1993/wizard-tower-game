-- AlterTable
ALTER TABLE "Spell" ADD COLUMN     "spellPool" TEXT NOT NULL DEFAULT 'chaotic',
ADD COLUMN     "statusEffect" TEXT;
