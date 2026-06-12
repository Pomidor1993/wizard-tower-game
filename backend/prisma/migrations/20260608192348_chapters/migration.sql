-- AlterTable
ALTER TABLE "ArchetypeProfile" ADD COLUMN     "chapter" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "completedEvents" INTEGER NOT NULL DEFAULT 0;
