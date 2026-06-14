-- AlterTable
ALTER TABLE "Spell" ADD COLUMN     "isTutorialReward" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CharacterTutorial" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "step" TEXT NOT NULL DEFAULT 'INTRO',
    "duelUnlockShown" BOOLEAN NOT NULL DEFAULT false,
    "schoolUnlockShown" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterTutorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeRepairTask" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "taskCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "startedAt" TIMESTAMP(3),
    "finishesAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "HomeRepairTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterTutorial_characterId_key" ON "CharacterTutorial"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeRepairTask_characterId_taskCode_key" ON "HomeRepairTask"("characterId", "taskCode");

-- AddForeignKey
ALTER TABLE "CharacterTutorial" ADD CONSTRAINT "CharacterTutorial_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeRepairTask" ADD CONSTRAINT "HomeRepairTask_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
