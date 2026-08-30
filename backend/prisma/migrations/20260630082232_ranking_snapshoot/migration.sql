-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "notebookDescription" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "RankingSnapshot" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "bestRank" INTEGER NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankingSnapshot_characterId_idx" ON "RankingSnapshot"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "RankingSnapshot_characterId_category_key" ON "RankingSnapshot"("characterId", "category");

-- AddForeignKey
ALTER TABLE "RankingSnapshot" ADD CONSTRAINT "RankingSnapshot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
