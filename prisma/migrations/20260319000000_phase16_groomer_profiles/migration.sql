-- AlterEnum: Add GROOMING role
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GROOMING';

-- AlterTable: Add groomerProfileId to BusinessLocation
ALTER TABLE "BusinessLocation" ADD COLUMN IF NOT EXISTS "groomerProfileId" TEXT;

-- CreateTable: GroomerProfile
CREATE TABLE IF NOT EXISTS "GroomerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "logoUrl" TEXT,
    "description" TEXT,
    "address" TEXT,
    "district" TEXT,
    "city" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "openingHours" JSONB,
    "services" JSONB,
    "referencePrices" JSONB,
    "photos" JSONB,
    "paymentMethods" JSONB,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "websiteUrl" TEXT,
    "ratingAverage" DECIMAL(3,2),
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GroomerProfile_userId_key" ON "GroomerProfile"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroomerProfile_city_district_idx" ON "GroomerProfile"("city", "district");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroomerProfile_latitude_longitude_idx" ON "GroomerProfile"("latitude", "longitude");

-- CreateUniqueIndex for BusinessLocation.groomerProfileId
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessLocation_groomerProfileId_key" ON "BusinessLocation"("groomerProfileId");

-- AddForeignKey: GroomerProfile -> User
ALTER TABLE "GroomerProfile" DROP CONSTRAINT IF EXISTS "GroomerProfile_userId_fkey";
ALTER TABLE "GroomerProfile" ADD CONSTRAINT "GroomerProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: BusinessLocation -> GroomerProfile
ALTER TABLE "BusinessLocation" DROP CONSTRAINT IF EXISTS "BusinessLocation_groomerProfileId_fkey";
ALTER TABLE "BusinessLocation" ADD CONSTRAINT "BusinessLocation_groomerProfileId_fkey"
    FOREIGN KEY ("groomerProfileId") REFERENCES "GroomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add missing columns to existing GroomerProfile (idempotent upgrades)
ALTER TABLE "GroomerProfile" ADD COLUMN IF NOT EXISTS "photos" JSONB;
ALTER TABLE "GroomerProfile" ADD COLUMN IF NOT EXISTS "paymentMethods" JSONB;
