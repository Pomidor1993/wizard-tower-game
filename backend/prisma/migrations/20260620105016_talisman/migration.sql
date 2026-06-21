/*
  Warnings:

  - You are about to drop the column `amuletId` on the `CharacterEquipment` table. All the data in the column will be lost.
  - You are about to drop the column `amuletItemId` on the `EquipmentPreset` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[talismanId]` on the table `CharacterEquipment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "CharacterEquipment" DROP CONSTRAINT "CharacterEquipment_amuletId_fkey";

-- DropIndex
DROP INDEX "CharacterEquipment_amuletId_key";

-- AlterTable
ALTER TABLE "CharacterEquipment" DROP COLUMN "amuletId",
ADD COLUMN     "talismanId" INTEGER;

-- AlterTable
ALTER TABLE "EquipmentPreset" DROP COLUMN "amuletItemId",
ADD COLUMN     "talismanItemId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "CharacterEquipment_talismanId_key" ON "CharacterEquipment"("talismanId");

-- AddForeignKey
ALTER TABLE "CharacterEquipment" ADD CONSTRAINT "CharacterEquipment_talismanId_fkey" FOREIGN KEY ("talismanId") REFERENCES "OwnedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
