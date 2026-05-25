-- CreateTable
CREATE TABLE "SpellbookEntry" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "spellId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpellbookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpellbookEntry_characterId_idx" ON "SpellbookEntry"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "SpellbookEntry_characterId_spellId_key" ON "SpellbookEntry"("characterId", "spellId");

-- AddForeignKey
ALTER TABLE "SpellbookEntry" ADD CONSTRAINT "SpellbookEntry_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellbookEntry" ADD CONSTRAINT "SpellbookEntry_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
