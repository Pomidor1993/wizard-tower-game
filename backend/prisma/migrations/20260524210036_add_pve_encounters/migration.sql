-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "runicStoneShards" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PveEncounter" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "locationLevel" INTEGER NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "playerWon" BOOLEAN NOT NULL,
    "runicShardsEarned" INTEGER NOT NULL DEFAULT 0,
    "battleLog" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "foughtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PveEncounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PveEncounter_characterId_idx" ON "PveEncounter"("characterId");

-- CreateIndex
CREATE INDEX "PveEncounter_characterId_playerWon_idx" ON "PveEncounter"("characterId", "playerWon");

-- AddForeignKey
ALTER TABLE "PveEncounter" ADD CONSTRAINT "PveEncounter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
