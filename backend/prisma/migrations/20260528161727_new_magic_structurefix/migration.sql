/*
  Warnings:

  - You are about to drop the column `bonusBloodlMagic` on the `Item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Item" DROP COLUMN "bonusBloodlMagic",
ADD COLUMN     "bonusBloodMagic" INTEGER NOT NULL DEFAULT 0;
