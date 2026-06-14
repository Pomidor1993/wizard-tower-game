/*
  Warnings:

  - You are about to drop the column `isBasic` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `spellBook` on the `Spell` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Spell" DROP COLUMN "isBasic",
DROP COLUMN "spellBook",
ADD COLUMN     "allowedClasses" TEXT NOT NULL DEFAULT '[]';
