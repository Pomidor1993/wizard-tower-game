-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumUntil" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "knowledge" INTEGER NOT NULL DEFAULT 0,
    "intelligence" INTEGER NOT NULL DEFAULT 0,
    "power" INTEGER NOT NULL DEFAULT 0,
    "fireElement" INTEGER NOT NULL DEFAULT 0,
    "earthElement" INTEGER NOT NULL DEFAULT 0,
    "airElement" INTEGER NOT NULL DEFAULT 0,
    "waterElement" INTEGER NOT NULL DEFAULT 0,
    "chaos" INTEGER NOT NULL DEFAULT 0,
    "castSpeed" INTEGER NOT NULL DEFAULT 0,
    "endurance" INTEGER NOT NULL DEFAULT 0,
    "powerShards" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "skillPoints" INTEGER NOT NULL DEFAULT 0,
    "prestige" INTEGER NOT NULL DEFAULT 0,
    "studyActions" INTEGER NOT NULL DEFAULT 5,
    "explorationActions" INTEGER NOT NULL DEFAULT 3,
    "lastStudyRegen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastExploreRegen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tower" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TowerBuilding" (
    "id" SERIAL NOT NULL,
    "towerId" INTEGER NOT NULL,
    "buildingType" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isUpgrading" BOOLEAN NOT NULL DEFAULT false,
    "upgradeFinishesAt" TIMESTAMP(3),

    CONSTRAINT "TowerBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spell" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "damage" INTEGER NOT NULL,
    "reqFire" INTEGER NOT NULL DEFAULT 0,
    "reqWater" INTEGER NOT NULL DEFAULT 0,
    "reqEarth" INTEGER NOT NULL DEFAULT 0,
    "reqAir" INTEGER NOT NULL DEFAULT 0,
    "reqChaos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Spell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSpell" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "spellId" INTEGER NOT NULL,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterSpell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "reqKnowledge" INTEGER NOT NULL DEFAULT 0,
    "bonusFire" INTEGER NOT NULL DEFAULT 0,
    "bonusWater" INTEGER NOT NULL DEFAULT 0,
    "bonusEarth" INTEGER NOT NULL DEFAULT 0,
    "bonusAir" INTEGER NOT NULL DEFAULT 0,
    "bonusChaos" INTEGER NOT NULL DEFAULT 0,
    "bonusEndurance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterItem" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "foundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Character_userId_key" ON "Character"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tower_characterId_key" ON "Tower"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "TowerBuilding_towerId_buildingType_key" ON "TowerBuilding"("towerId", "buildingType");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSpell_characterId_spellId_key" ON "CharacterSpell"("characterId", "spellId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterItem_characterId_itemId_key" ON "CharacterItem"("characterId", "itemId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tower" ADD CONSTRAINT "Tower_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowerBuilding" ADD CONSTRAINT "TowerBuilding_towerId_fkey" FOREIGN KEY ("towerId") REFERENCES "Tower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSpell" ADD CONSTRAINT "CharacterSpell_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSpell" ADD CONSTRAINT "CharacterSpell_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterItem" ADD CONSTRAINT "CharacterItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterItem" ADD CONSTRAINT "CharacterItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
