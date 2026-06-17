/*
  Warnings:

  - You are about to drop the column `characterId` on the `ChaosVaultItem` table. All the data in the column will be lost.
  - You are about to drop the column `itemId` on the `ChaosVaultItem` table. All the data in the column will be lost.
  - You are about to drop the column `spellId` on the `ChaosVaultItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ownedItemId]` on the table `ChaosVaultItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[robeId]` on the table `CharacterEquipment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bootsId]` on the table `CharacterEquipment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hatId]` on the table `CharacterEquipment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[amuletId]` on the table `CharacterEquipment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mainHandId]` on the table `CharacterEquipment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[offHandId]` on the table `CharacterEquipment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[offHand2Id]` on the table `CharacterEquipment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ownedItemId` to the `ChaosVaultItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ChaosVaultItem" DROP CONSTRAINT "ChaosVaultItem_characterId_fkey";

-- DropForeignKey
ALTER TABLE "ChaosVaultItem" DROP CONSTRAINT "ChaosVaultItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "ChaosVaultItem" DROP CONSTRAINT "ChaosVaultItem_spellId_fkey";

-- DropIndex
DROP INDEX "ChaosVaultItem_characterId_idx";

-- AlterTable
ALTER TABLE "ChaosVaultItem" DROP COLUMN "characterId",
DROP COLUMN "itemId",
DROP COLUMN "spellId",
ADD COLUMN     "ownedItemId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "OwnedItem" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnedItem_characterId_idx" ON "OwnedItem"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaosVaultItem_ownedItemId_key" ON "ChaosVaultItem"("ownedItemId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterEquipment_robeId_key" ON "CharacterEquipment"("robeId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterEquipment_bootsId_key" ON "CharacterEquipment"("bootsId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterEquipment_hatId_key" ON "CharacterEquipment"("hatId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterEquipment_amuletId_key" ON "CharacterEquipment"("amuletId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterEquipment_mainHandId_key" ON "CharacterEquipment"("mainHandId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterEquipment_offHandId_key" ON "CharacterEquipment"("offHandId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterEquipment_offHand2Id_key" ON "CharacterEquipment"("offHand2Id");

-- AddForeignKey
ALTER TABLE "OwnedItem" ADD CONSTRAINT "OwnedItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedItem" ADD CONSTRAINT "OwnedItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterEquipment" ADD CONSTRAINT "CharacterEquipment_robeId_fkey" FOREIGN KEY ("robeId") REFERENCES "OwnedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterEquipment" ADD CONSTRAINT "CharacterEquipment_bootsId_fkey" FOREIGN KEY ("bootsId") REFERENCES "OwnedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterEquipment" ADD CONSTRAINT "CharacterEquipment_hatId_fkey" FOREIGN KEY ("hatId") REFERENCES "OwnedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterEquipment" ADD CONSTRAINT "CharacterEquipment_amuletId_fkey" FOREIGN KEY ("amuletId") REFERENCES "OwnedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterEquipment" ADD CONSTRAINT "CharacterEquipment_mainHandId_fkey" FOREIGN KEY ("mainHandId") REFERENCES "OwnedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterEquipment" ADD CONSTRAINT "CharacterEquipment_offHandId_fkey" FOREIGN KEY ("offHandId") REFERENCES "OwnedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterEquipment" ADD CONSTRAINT "CharacterEquipment_offHand2Id_fkey" FOREIGN KEY ("offHand2Id") REFERENCES "OwnedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaosVaultItem" ADD CONSTRAINT "ChaosVaultItem_ownedItemId_fkey" FOREIGN KEY ("ownedItemId") REFERENCES "OwnedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
