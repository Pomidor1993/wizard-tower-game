-- AlterTable
ALTER TABLE "Tower" ADD COLUMN     "isUpgrading" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "upgradeFinishesAt" TIMESTAMP(3);
