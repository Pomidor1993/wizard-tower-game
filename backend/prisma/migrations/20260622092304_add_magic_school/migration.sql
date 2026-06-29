-- CreateTable
CREATE TABLE "MagicSchool" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "emblem" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "directorId" INTEGER NOT NULL,

    CONSTRAINT "MagicSchool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolMember" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolBuilding" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "buildingType" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isUpgrading" BOOLEAN NOT NULL DEFAULT false,
    "upgradeFinishesAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolLibrarySpell" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "spellId" INTEGER NOT NULL,
    "proposedById" INTEGER NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "SchoolLibrarySpell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolActiveBonus" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "bonusKey" TEXT NOT NULL,

    CONSTRAINT "SchoolActiveBonus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MagicSchool_name_key" ON "MagicSchool"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MagicSchool_directorId_key" ON "MagicSchool"("directorId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolMember_characterId_key" ON "SchoolMember"("characterId");

-- CreateIndex
CREATE INDEX "SchoolMember_schoolId_idx" ON "SchoolMember"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolBuilding_schoolId_buildingType_key" ON "SchoolBuilding"("schoolId", "buildingType");

-- CreateIndex
CREATE INDEX "SchoolLibrarySpell_schoolId_status_idx" ON "SchoolLibrarySpell"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolLibrarySpell_schoolId_spellId_key" ON "SchoolLibrarySpell"("schoolId", "spellId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolActiveBonus_schoolId_bonusKey_key" ON "SchoolActiveBonus"("schoolId", "bonusKey");

-- AddForeignKey
ALTER TABLE "MagicSchool" ADD CONSTRAINT "MagicSchool_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolMember" ADD CONSTRAINT "SchoolMember_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "MagicSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolMember" ADD CONSTRAINT "SchoolMember_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolBuilding" ADD CONSTRAINT "SchoolBuilding_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "MagicSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolLibrarySpell" ADD CONSTRAINT "SchoolLibrarySpell_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "MagicSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolLibrarySpell" ADD CONSTRAINT "SchoolLibrarySpell_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolLibrarySpell" ADD CONSTRAINT "SchoolLibrarySpell_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolLibrarySpell" ADD CONSTRAINT "SchoolLibrarySpell_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolActiveBonus" ADD CONSTRAINT "SchoolActiveBonus_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "MagicSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
