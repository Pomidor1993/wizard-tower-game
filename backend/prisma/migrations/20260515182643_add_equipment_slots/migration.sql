/*
  Warnings:

  - You are about to drop the column `isEquipped` on the `CharacterItem` table. All the data in the column will be lost.
  - Added the required column `slot` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
TRUNCATE TABLE "Item" CASCADE;
ALTER TABLE "CharacterItem" DROP COLUMN "isEquipped";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "bonusInitiative" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusPower" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqAir" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqChaos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqEarth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqFire" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reqWater" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slot" TEXT NOT NULL,
ADD COLUMN     "weaponType" TEXT;

-- CreateTable
CREATE TABLE "CharacterEquipment" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "robeId" INTEGER,
    "bootsId" INTEGER,
    "hatId" INTEGER,
    "amuletId" INTEGER,
    "mainHandId" INTEGER,
    "offHandId" INTEGER,

    CONSTRAINT "CharacterEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSpellSlots" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "spellId" INTEGER NOT NULL,
    "slotIndex" INTEGER NOT NULL,

    CONSTRAINT "CharacterSpellSlots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterEquipment_characterId_key" ON "CharacterEquipment"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSpellSlots_characterId_slotIndex_key" ON "CharacterSpellSlots"("characterId", "slotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSpellSlots_characterId_spellId_key" ON "CharacterSpellSlots"("characterId", "spellId");

-- AddForeignKey
ALTER TABLE "CharacterEquipment" ADD CONSTRAINT "CharacterEquipment_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSpellSlots" ADD CONSTRAINT "CharacterSpellSlots_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSpellSlots" ADD CONSTRAINT "CharacterSpellSlots_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
