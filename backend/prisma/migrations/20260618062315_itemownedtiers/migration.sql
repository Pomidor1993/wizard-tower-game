/*
  Warnings:

  - You are about to drop the column `tier` on the `Item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Item" DROP COLUMN "tier";

-- AlterTable
ALTER TABLE "OwnedItem" ADD COLUMN     "tier" INTEGER NOT NULL DEFAULT 1;
