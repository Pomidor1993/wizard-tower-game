-- CreateTable
CREATE TABLE "EquipmentPreset" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "hatItemId" INTEGER,
    "robeItemId" INTEGER,
    "bootsItemId" INTEGER,
    "amuletItemId" INTEGER,
    "mainHandItemId" INTEGER,
    "offHandItemId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EquipmentPreset_characterId_idx" ON "EquipmentPreset"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentPreset_characterId_slotIndex_key" ON "EquipmentPreset"("characterId", "slotIndex");

-- AddForeignKey
ALTER TABLE "EquipmentPreset" ADD CONSTRAINT "EquipmentPreset_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
