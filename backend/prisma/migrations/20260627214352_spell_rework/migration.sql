/*
  Warnings:

  - You are about to drop the column `allowedClasses` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `castEffects` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `descAlt` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `isDirectional` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `spellType` on the `Spell` table. All the data in the column will be lost.
  - You are about to drop the column `spellbookDescription` on the `Spell` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Spell" DROP COLUMN "allowedClasses",
DROP COLUMN "castEffects",
DROP COLUMN "descAlt",
DROP COLUMN "isDirectional",
DROP COLUMN "spellType",
DROP COLUMN "spellbookDescription",
ADD COLUMN     "bookDescription" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "minionAttacks" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "spellTarget" TEXT,
ADD COLUMN     "spellTargetCount" INTEGER,
ALTER COLUMN "element" SET DEFAULT 'none',
ALTER COLUMN "rarity" SET DEFAULT 'common',
ALTER COLUMN "damage" SET DEFAULT 0;
