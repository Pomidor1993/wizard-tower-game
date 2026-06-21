/*
  Warnings:

  - You are about to drop the `ArchetypeEventChoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ArchetypeEventQueue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ArchetypeProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ArchetypeTriggerProgress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ArchetypeEventQueue" DROP CONSTRAINT "ArchetypeEventQueue_characterId_fkey";

-- DropForeignKey
ALTER TABLE "ArchetypeProfile" DROP CONSTRAINT "ArchetypeProfile_characterId_fkey";

-- DropForeignKey
ALTER TABLE "ArchetypeTriggerProgress" DROP CONSTRAINT "ArchetypeTriggerProgress_characterId_fkey";

-- AlterTable
ALTER TABLE "Spell" ADD COLUMN     "spellType" TEXT NOT NULL DEFAULT 'combat',
ADD COLUMN     "utilityDescriptions" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "utilityEffect" TEXT NOT NULL DEFAULT '{}';

-- DropTable
DROP TABLE "ArchetypeEventChoice";

-- DropTable
DROP TABLE "ArchetypeEventQueue";

-- DropTable
DROP TABLE "ArchetypeProfile";

-- DropTable
DROP TABLE "ArchetypeTriggerProgress";

-- CreateTable
CREATE TABLE "CharacterUtilitySlots" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "spellId" INTEGER NOT NULL,
    "slotIndex" INTEGER NOT NULL,

    CONSTRAINT "CharacterUtilitySlots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicTournament" (
    "id" SERIAL NOT NULL,
    "challengerId" INTEGER NOT NULL,
    "defenderId" INTEGER NOT NULL,
    "winnerId" INTEGER,
    "log" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "prestigeGain" INTEGER NOT NULL DEFAULT 0,
    "foughtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicTournament_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterUtilitySlots_characterId_slotIndex_key" ON "CharacterUtilitySlots"("characterId", "slotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterUtilitySlots_characterId_spellId_key" ON "CharacterUtilitySlots"("characterId", "spellId");

-- CreateIndex
CREATE INDEX "MagicTournament_challengerId_idx" ON "MagicTournament"("challengerId");

-- CreateIndex
CREATE INDEX "MagicTournament_defenderId_idx" ON "MagicTournament"("defenderId");

-- AddForeignKey
ALTER TABLE "CharacterUtilitySlots" ADD CONSTRAINT "CharacterUtilitySlots_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterUtilitySlots" ADD CONSTRAINT "CharacterUtilitySlots_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicTournament" ADD CONSTRAINT "MagicTournament_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicTournament" ADD CONSTRAINT "MagicTournament_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicTournament" ADD CONSTRAINT "MagicTournament_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
