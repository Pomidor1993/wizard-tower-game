-- CreateTable
CREATE TABLE "GameReport" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameReport_characterId_createdAt_idx" ON "GameReport"("characterId", "createdAt");

-- AddForeignKey
ALTER TABLE "GameReport" ADD CONSTRAINT "GameReport_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
