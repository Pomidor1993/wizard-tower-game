-- CreateTable
CREATE TABLE "CharacterAction" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionLevel" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishesAt" TIMESTAMP(3) NOT NULL,
    "skillPointsEarned" INTEGER,
    "spellDiscovered" TEXT,
    "report" TEXT,

    CONSTRAINT "CharacterAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterAction_characterId_status_idx" ON "CharacterAction"("characterId", "status");

-- AddForeignKey
ALTER TABLE "CharacterAction" ADD CONSTRAINT "CharacterAction_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
