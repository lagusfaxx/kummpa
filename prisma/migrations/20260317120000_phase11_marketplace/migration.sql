-- CreateEnum
CREATE TYPE "MarketplaceCategory" AS ENUM ('BED', 'CARRIER', 'TOY', 'LEASH', 'CAGE', 'CLOTHES', 'FEEDER', 'ACCESSORY', 'OTHER');

-- CreateEnum
CREATE TYPE "MarketplaceReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- DropIndex
DROP INDEX "MarketplaceListing_isActive_condition_idx";

-- AlterTable
ALTER TABLE "MarketplaceListing" ADD COLUMN     "category" "MarketplaceCategory" NOT NULL DEFAULT 'ACCESSORY',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "district" TEXT,
ADD COLUMN     "featuredUntil" TIMESTAMP(3),
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "MarketplaceFavorite" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceConversation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceReport" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "MarketplaceReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewNotes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceFavorite_userId_createdAt_idx" ON "MarketplaceFavorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceFavorite_listingId_userId_key" ON "MarketplaceFavorite"("listingId", "userId");

-- CreateIndex
CREATE INDEX "MarketplaceConversation_buyerId_updatedAt_idx" ON "MarketplaceConversation"("buyerId", "updatedAt");

-- CreateIndex
CREATE INDEX "MarketplaceConversation_sellerId_updatedAt_idx" ON "MarketplaceConversation"("sellerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceConversation_listingId_buyerId_key" ON "MarketplaceConversation"("listingId", "buyerId");

-- CreateIndex
CREATE INDEX "MarketplaceMessage_conversationId_createdAt_idx" ON "MarketplaceMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceMessage_senderUserId_createdAt_idx" ON "MarketplaceMessage"("senderUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceReport_listingId_status_createdAt_idx" ON "MarketplaceReport"("listingId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceReport_reporterUserId_createdAt_idx" ON "MarketplaceReport"("reporterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceReport_status_updatedAt_idx" ON "MarketplaceReport"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "MarketplaceListing_isActive_category_condition_createdAt_idx" ON "MarketplaceListing"("isActive", "category", "condition", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceListing_city_district_createdAt_idx" ON "MarketplaceListing"("city", "district", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceListing_latitude_longitude_idx" ON "MarketplaceListing"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "MarketplaceListing_featuredUntil_idx" ON "MarketplaceListing"("featuredUntil");

-- CreateIndex
CREATE INDEX "MarketplaceListing_deletedAt_idx" ON "MarketplaceListing"("deletedAt");

-- AddForeignKey
ALTER TABLE "MarketplaceFavorite" ADD CONSTRAINT "MarketplaceFavorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceFavorite" ADD CONSTRAINT "MarketplaceFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceConversation" ADD CONSTRAINT "MarketplaceConversation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceConversation" ADD CONSTRAINT "MarketplaceConversation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceConversation" ADD CONSTRAINT "MarketplaceConversation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessage" ADD CONSTRAINT "MarketplaceMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MarketplaceConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessage" ADD CONSTRAINT "MarketplaceMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceReport" ADD CONSTRAINT "MarketplaceReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceReport" ADD CONSTRAINT "MarketplaceReport_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceReport" ADD CONSTRAINT "MarketplaceReport_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

