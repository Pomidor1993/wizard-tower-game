-- CreateTable
CREATE TABLE "RiftTrophy" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '',
    "riftKey" TEXT NOT NULL,
    "bonuses" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiftTrophy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterRiftTrophy" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "trophyId" INTEGER NOT NULL,
    "earnedInRiftKey" TEXT NOT NULL,
    "earnedInWorldKey" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterRiftTrophy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnstableRift" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "riftKey" TEXT NOT NULL,
    "worldKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enteredAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "UnstableRift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiftRun" (
    "id" SERIAL NOT NULL,
    "riftId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "worldKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "xpEarned" INTEGER,
    "prestigeEarned" INTEGER,
    "itemOwnedItemId" INTEGER,
    "trophyId" INTEGER,
    "xpModifier" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "RiftRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiftRunStep" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "choiceKey" TEXT NOT NULL,
    "testRolled" BOOLEAN,
    "testSuccess" BOOLEAN,
    "fightOccurred" BOOLEAN,
    "fightWon" BOOLEAN,
    "fightLog" TEXT,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiftRunStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StableRiftParty" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "leaderId" INTEGER NOT NULL,
    "riftKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'forming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "StableRiftParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StableRiftMember" (
    "id" SERIAL NOT NULL,
    "partyId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StableRiftMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StableRiftRun" (
    "id" SERIAL NOT NULL,
    "partyId" INTEGER NOT NULL,
    "riftKey" TEXT NOT NULL,
    "worldKey" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "results" TEXT NOT NULL DEFAULT '[]',
    "battleLogs" TEXT NOT NULL DEFAULT '[]',
    "foughtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StableRiftRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiftWorldHistory" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "riftKey" TEXT NOT NULL,
    "worldKey" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiftWorldHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiftTrophy_key_key" ON "RiftTrophy"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RiftTrophy_name_key" ON "RiftTrophy"("name");

-- CreateIndex
CREATE INDEX "CharacterRiftTrophy_characterId_idx" ON "CharacterRiftTrophy"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterRiftTrophy_characterId_trophyId_key" ON "CharacterRiftTrophy"("characterId", "trophyId");

-- CreateIndex
CREATE UNIQUE INDEX "UnstableRift_characterId_key" ON "UnstableRift"("characterId");

-- CreateIndex
CREATE INDEX "UnstableRift_characterId_status_idx" ON "UnstableRift"("characterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RiftRun_riftId_key" ON "RiftRun"("riftId");

-- CreateIndex
CREATE INDEX "RiftRun_characterId_idx" ON "RiftRun"("characterId");

-- CreateIndex
CREATE INDEX "RiftRunStep_runId_idx" ON "RiftRunStep"("runId");

-- CreateIndex
CREATE INDEX "StableRiftParty_schoolId_status_idx" ON "StableRiftParty"("schoolId", "status");

-- CreateIndex
CREATE INDEX "StableRiftParty_leaderId_idx" ON "StableRiftParty"("leaderId");

-- CreateIndex
CREATE INDEX "StableRiftMember_partyId_status_idx" ON "StableRiftMember"("partyId", "status");

-- CreateIndex
CREATE INDEX "StableRiftMember_characterId_idx" ON "StableRiftMember"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "StableRiftMember_partyId_characterId_key" ON "StableRiftMember"("partyId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "StableRiftRun_partyId_key" ON "StableRiftRun"("partyId");

-- CreateIndex
CREATE INDEX "StableRiftRun_partyId_idx" ON "StableRiftRun"("partyId");

-- CreateIndex
CREATE INDEX "RiftWorldHistory_characterId_riftKey_idx" ON "RiftWorldHistory"("characterId", "riftKey");

-- AddForeignKey
ALTER TABLE "CharacterRiftTrophy" ADD CONSTRAINT "CharacterRiftTrophy_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterRiftTrophy" ADD CONSTRAINT "CharacterRiftTrophy_trophyId_fkey" FOREIGN KEY ("trophyId") REFERENCES "RiftTrophy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnstableRift" ADD CONSTRAINT "UnstableRift_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiftRun" ADD CONSTRAINT "RiftRun_riftId_fkey" FOREIGN KEY ("riftId") REFERENCES "UnstableRift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiftRun" ADD CONSTRAINT "RiftRun_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiftRunStep" ADD CONSTRAINT "RiftRunStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RiftRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StableRiftParty" ADD CONSTRAINT "StableRiftParty_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "MagicSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StableRiftParty" ADD CONSTRAINT "StableRiftParty_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StableRiftMember" ADD CONSTRAINT "StableRiftMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "StableRiftParty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StableRiftMember" ADD CONSTRAINT "StableRiftMember_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StableRiftRun" ADD CONSTRAINT "StableRiftRun_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "StableRiftParty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiftWorldHistory" ADD CONSTRAINT "RiftWorldHistory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
