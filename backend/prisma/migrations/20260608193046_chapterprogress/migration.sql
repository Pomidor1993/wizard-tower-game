/*
  Warnings:

  - You are about to drop the column `completedEvents` on the `ArchetypeProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArchetypeProfile" DROP COLUMN "completedEvents",
ADD COLUMN     "chapterProgress" INTEGER NOT NULL DEFAULT 0;
