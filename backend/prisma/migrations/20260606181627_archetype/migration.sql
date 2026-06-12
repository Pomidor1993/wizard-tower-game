/*
  Warnings:

  - You are about to drop the column `alignmentClass` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `alignmentPath` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `finalClassUnlocked` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the `AlignmentEventChoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AlignmentEventQueue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AlignmentProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AlignmentTriggerProgress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AlignmentEventQueue" DROP CONSTRAINT "AlignmentEventQueue_characterId_fkey";

-- DropForeignKey
ALTER TABLE "AlignmentProfile" DROP CONSTRAINT "AlignmentProfile_characterId_fkey";

-- DropForeignKey
ALTER TABLE "AlignmentTriggerProgress" DROP CONSTRAINT "AlignmentTriggerProgress_characterId_fkey";

-- AlterTable
ALTER TABLE "Character" DROP COLUMN "alignmentClass",
DROP COLUMN "alignmentPath",
DROP COLUMN "finalClassUnlocked";

-- DropTable
DROP TABLE "AlignmentEventChoice";

-- DropTable
DROP TABLE "AlignmentEventQueue";

-- DropTable
DROP TABLE "AlignmentProfile";

-- DropTable
DROP TABLE "AlignmentTriggerProgress";

-- CreateTable
CREATE TABLE "ArchetypeProfile" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "guardianPoints" INTEGER NOT NULL DEFAULT 0,
    "rulerPoints" INTEGER NOT NULL DEFAULT 0,
    "researcherPoints" INTEGER NOT NULL DEFAULT 0,
    "prophetPoints" INTEGER NOT NULL DEFAULT 0,
    "reaperPoints" INTEGER NOT NULL DEFAULT 0,
    "initialPath" TEXT,
    "finalClass" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchetypeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchetypeTriggerProgress" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "triggerCode" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchetypeTriggerProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchetypeEventQueue" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "eventCode" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "selectedOption" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchetypeEventQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchetypeEventChoice" (
    "id" SERIAL NOT NULL,
    "eventCode" TEXT NOT NULL,
    "optionIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "guardianDelta" INTEGER NOT NULL DEFAULT 0,
    "rulerDelta" INTEGER NOT NULL DEFAULT 0,
    "researcherDelta" INTEGER NOT NULL DEFAULT 0,
    "prophetDelta" INTEGER NOT NULL DEFAULT 0,
    "reaperDelta" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArchetypeEventChoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArchetypeProfile_characterId_key" ON "ArchetypeProfile"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "ArchetypeTriggerProgress_characterId_triggerCode_key" ON "ArchetypeTriggerProgress"("characterId", "triggerCode");

-- AddForeignKey
ALTER TABLE "ArchetypeProfile" ADD CONSTRAINT "ArchetypeProfile_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchetypeTriggerProgress" ADD CONSTRAINT "ArchetypeTriggerProgress_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchetypeEventQueue" ADD CONSTRAINT "ArchetypeEventQueue_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
