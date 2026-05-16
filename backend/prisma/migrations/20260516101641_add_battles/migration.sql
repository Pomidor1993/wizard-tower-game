-- CreateTable
CREATE TABLE "Battle" (
    "id" SERIAL NOT NULL,
    "attackerId" INTEGER NOT NULL,
    "defenderId" INTEGER NOT NULL,
    "winnerId" INTEGER NOT NULL,
    "log" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "prestigeGain" INTEGER NOT NULL DEFAULT 0,
    "foughtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Battle_attackerId_idx" ON "Battle"("attackerId");

-- CreateIndex
CREATE INDEX "Battle_defenderId_idx" ON "Battle"("defenderId");

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
