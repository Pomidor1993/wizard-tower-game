-- AlterTable
ALTER TABLE "PveEncounter" ADD COLUMN     "source" TEXT DEFAULT 'exploration',
ADD COLUMN     "studyLevel" INTEGER;
