-- AlterTable
ALTER TABLE "Spell" ADD COLUMN     "special" TEXT,
ADD COLUMN     "specialValue" INTEGER NOT NULL DEFAULT 0;
