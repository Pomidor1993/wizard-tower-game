-- CreateTable
CREATE TABLE "SchoolJoinRequest" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolJoinRequest_schoolId_status_idx" ON "SchoolJoinRequest"("schoolId", "status");

-- CreateIndex
CREATE INDEX "SchoolJoinRequest_characterId_idx" ON "SchoolJoinRequest"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolJoinRequest_schoolId_characterId_key" ON "SchoolJoinRequest"("schoolId", "characterId");

-- AddForeignKey
ALTER TABLE "SchoolJoinRequest" ADD CONSTRAINT "SchoolJoinRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "MagicSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolJoinRequest" ADD CONSTRAINT "SchoolJoinRequest_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
