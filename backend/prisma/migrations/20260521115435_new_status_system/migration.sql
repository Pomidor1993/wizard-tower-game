/*
  Warnings:

  - You are about to drop the column `specialType` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `specialValue` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `statusEffect` on the `Spell` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Spell" DROP COLUMN "specialType",
DROP COLUMN "specialValue",
DROP COLUMN "statusEffect",
ADD COLUMN     "isDirectional" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "statusEffects" TEXT NOT NULL DEFAULT '[]';
