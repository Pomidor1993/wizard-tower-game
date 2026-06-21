-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "battleDraws" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "battleLosses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "battleWins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "levelUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tournamentDraws" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tournamentLosses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tournamentWins" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Trophy" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trophy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterTrophy" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "trophyId" INTEGER NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterTrophy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trophy_name_key" ON "Trophy"("name");

-- CreateIndex
CREATE INDEX "CharacterTrophy_characterId_idx" ON "CharacterTrophy"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterTrophy_characterId_trophyId_key" ON "CharacterTrophy"("characterId", "trophyId");

-- AddForeignKey
ALTER TABLE "CharacterTrophy" ADD CONSTRAINT "CharacterTrophy_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterTrophy" ADD CONSTRAINT "CharacterTrophy_trophyId_fkey" FOREIGN KEY ("trophyId") REFERENCES "Trophy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
