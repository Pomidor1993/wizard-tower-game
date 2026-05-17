-- CreateTable
CREATE TABLE "ChaosVaultItem" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "itemId" INTEGER,
    "spellId" INTEGER,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChaosVaultItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChaosVaultItem_characterId_idx" ON "ChaosVaultItem"("characterId");

-- AddForeignKey
ALTER TABLE "ChaosVaultItem" ADD CONSTRAINT "ChaosVaultItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaosVaultItem" ADD CONSTRAINT "ChaosVaultItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaosVaultItem" ADD CONSTRAINT "ChaosVaultItem_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE SET NULL ON UPDATE CASCADE;
