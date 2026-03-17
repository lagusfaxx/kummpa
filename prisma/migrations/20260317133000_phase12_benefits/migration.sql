-- CreateEnum
CREATE TYPE "BenefitRedemptionStatus" AS ENUM ('ACTIVE', 'USED', 'CANCELLED', 'EXPIRED');

-- DropIndex
DROP INDEX "Benefit_city_idx";

-- AlterTable
ALTER TABLE "Benefit" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "discountLabel" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "landingUrl" TEXT,
ADD COLUMN     "maxRedemptions" INTEGER,
ADD COLUMN     "providerName" TEXT,
ADD COLUMN     "providerType" "ProviderType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "redemptionsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "terms" TEXT;

-- CreateTable
CREATE TABLE "BenefitSave" (
    "id" TEXT NOT NULL,
    "benefitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenefitSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenefitRedemption" (
    "id" TEXT NOT NULL,
    "benefitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activationCode" TEXT NOT NULL,
    "status" "BenefitRedemptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenefitRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BenefitSave_userId_createdAt_idx" ON "BenefitSave"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BenefitSave_benefitId_userId_key" ON "BenefitSave"("benefitId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BenefitRedemption_activationCode_key" ON "BenefitRedemption"("activationCode");

-- CreateIndex
CREATE INDEX "BenefitRedemption_userId_status_createdAt_idx" ON "BenefitRedemption"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BenefitRedemption_expiresAt_status_idx" ON "BenefitRedemption"("expiresAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BenefitRedemption_benefitId_userId_key" ON "BenefitRedemption"("benefitId", "userId");

-- CreateIndex
CREATE INDEX "Benefit_isActive_isFeatured_validTo_idx" ON "Benefit"("isActive", "isFeatured", "validTo");

-- CreateIndex
CREATE INDEX "Benefit_city_district_validTo_idx" ON "Benefit"("city", "district", "validTo");

-- CreateIndex
CREATE INDEX "Benefit_providerType_validTo_idx" ON "Benefit"("providerType", "validTo");

-- AddForeignKey
ALTER TABLE "BenefitSave" ADD CONSTRAINT "BenefitSave_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "Benefit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitSave" ADD CONSTRAINT "BenefitSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitRedemption" ADD CONSTRAINT "BenefitRedemption_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "Benefit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitRedemption" ADD CONSTRAINT "BenefitRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

