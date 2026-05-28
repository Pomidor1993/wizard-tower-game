-- CreateTable
CREATE TABLE "AlignmentProfile" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "moralAxis" INTEGER NOT NULL DEFAULT 0,
    "orderAxis" INTEGER NOT NULL DEFAULT 0,
    "finalClass" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlignmentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlignmentTriggerProgress" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "triggerCode" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlignmentTriggerProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlignmentEventQueue" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "eventCode" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "selectedOption" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlignmentEventQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlignmentEventChoice" (
    "id" SERIAL NOT NULL,
    "eventCode" TEXT NOT NULL,
    "optionIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "moralDelta" INTEGER NOT NULL,
    "orderDelta" INTEGER NOT NULL,

    CONSTRAINT "AlignmentEventChoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlignmentProfile_characterId_key" ON "AlignmentProfile"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "AlignmentTriggerProgress_characterId_triggerCode_key" ON "AlignmentTriggerProgress"("characterId", "triggerCode");

-- AddForeignKey
ALTER TABLE "AlignmentProfile" ADD CONSTRAINT "AlignmentProfile_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlignmentTriggerProgress" ADD CONSTRAINT "AlignmentTriggerProgress_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlignmentEventQueue" ADD CONSTRAINT "AlignmentEventQueue_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
