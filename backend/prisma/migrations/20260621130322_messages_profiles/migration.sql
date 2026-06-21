-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SystemMessage" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "sourceKey" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeenRandomMessage" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeenRandomMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMessageRoll" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "lastRollDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMessageRoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "participantAId" INTEGER NOT NULL,
    "participantBId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateMessage" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isSavedBySender" BOOLEAN NOT NULL DEFAULT false,
    "isSavedByReceiver" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedPlayer" (
    "id" SERIAL NOT NULL,
    "blockerId" INTEGER NOT NULL,
    "blockedId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageCooldown" (
    "id" SERIAL NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageCooldown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemMessage_characterId_type_idx" ON "SystemMessage"("characterId", "type");

-- CreateIndex
CREATE INDEX "SystemMessage_characterId_isSaved_idx" ON "SystemMessage"("characterId", "isSaved");

-- CreateIndex
CREATE INDEX "SystemMessage_characterId_createdAt_idx" ON "SystemMessage"("characterId", "createdAt");

-- CreateIndex
CREATE INDEX "SeenRandomMessage_characterId_idx" ON "SeenRandomMessage"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "SeenRandomMessage_characterId_sourceKey_key" ON "SeenRandomMessage"("characterId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMessageRoll_characterId_key" ON "DailyMessageRoll"("characterId");

-- CreateIndex
CREATE INDEX "Conversation_participantAId_idx" ON "Conversation"("participantAId");

-- CreateIndex
CREATE INDEX "Conversation_participantBId_idx" ON "Conversation"("participantBId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_participantAId_participantBId_key" ON "Conversation"("participantAId", "participantBId");

-- CreateIndex
CREATE INDEX "PrivateMessage_conversationId_createdAt_idx" ON "PrivateMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "PrivateMessage_senderId_idx" ON "PrivateMessage"("senderId");

-- CreateIndex
CREATE INDEX "BlockedPlayer_blockerId_idx" ON "BlockedPlayer"("blockerId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedPlayer_blockerId_blockedId_key" ON "BlockedPlayer"("blockerId", "blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageCooldown_senderId_receiverId_key" ON "MessageCooldown"("senderId", "receiverId");

-- AddForeignKey
ALTER TABLE "SystemMessage" ADD CONSTRAINT "SystemMessage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeenRandomMessage" ADD CONSTRAINT "SeenRandomMessage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMessageRoll" ADD CONSTRAINT "DailyMessageRoll_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_participantAId_fkey" FOREIGN KEY ("participantAId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_participantBId_fkey" FOREIGN KEY ("participantBId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateMessage" ADD CONSTRAINT "PrivateMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateMessage" ADD CONSTRAINT "PrivateMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedPlayer" ADD CONSTRAINT "BlockedPlayer_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedPlayer" ADD CONSTRAINT "BlockedPlayer_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
