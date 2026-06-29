-- CreateTable
CREATE TABLE "RiftTriggerProgress" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "riftKey" TEXT NOT NULL,
    "actionCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RiftTriggerProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiftTriggerProgress_characterId_idx" ON "RiftTriggerProgress"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "RiftTriggerProgress_characterId_riftKey_key" ON "RiftTriggerProgress"("characterId", "riftKey");

-- AddForeignKey
ALTER TABLE "RiftTriggerProgress" ADD CONSTRAINT "RiftTriggerProgress_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
