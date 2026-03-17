-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "appointmentServiceId" TEXT;

-- CreateTable
CREATE TABLE "BusinessLocation" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "address" TEXT,
    "district" TEXT,
    "city" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "timezone" TEXT NOT NULL DEFAULT 'America/Santiago',
    "openingHours" JSONB,
    "contactPhone" TEXT,
    "vetProfileId" TEXT,
    "caregiverProfileId" TEXT,
    "shopProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicPetProfile" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "headline" TEXT,
    "biography" TEXT,
    "cityLabel" TEXT,
    "traits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "showOwnerName" BOOLEAN NOT NULL DEFAULT true,
    "showOwnerPhone" BOOLEAN NOT NULL DEFAULT true,
    "showHealthDetails" BOOLEAN NOT NULL DEFAULT true,
    "showEmergencyContacts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicPetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentService" (
    "id" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "providerType" "ProviderType" NOT NULL,
    "providerSourceId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "serviceType" "ServiceType" NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "priceCents" INTEGER,
    "currencyCode" TEXT NOT NULL DEFAULT 'CLP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessLocation_vetProfileId_key" ON "BusinessLocation"("vetProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessLocation_caregiverProfileId_key" ON "BusinessLocation"("caregiverProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessLocation_shopProfileId_key" ON "BusinessLocation"("shopProfileId");

-- CreateIndex
CREATE INDEX "BusinessLocation_city_district_idx" ON "BusinessLocation"("city", "district");

-- CreateIndex
CREATE INDEX "BusinessLocation_latitude_longitude_idx" ON "BusinessLocation"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "PublicPetProfile_petId_key" ON "PublicPetProfile"("petId");

-- CreateIndex
CREATE INDEX "PublicPetProfile_updatedAt_idx" ON "PublicPetProfile"("updatedAt");

-- CreateIndex
CREATE INDEX "AppointmentService_providerUserId_isActive_sortOrder_idx" ON "AppointmentService"("providerUserId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "AppointmentService_providerType_providerSourceId_isActive_idx" ON "AppointmentService"("providerType", "providerSourceId", "isActive");

-- CreateIndex
CREATE INDEX "Appointment_appointmentServiceId_idx" ON "Appointment"("appointmentServiceId");

-- AddForeignKey
ALTER TABLE "BusinessLocation" ADD CONSTRAINT "BusinessLocation_vetProfileId_fkey" FOREIGN KEY ("vetProfileId") REFERENCES "VetProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessLocation" ADD CONSTRAINT "BusinessLocation_caregiverProfileId_fkey" FOREIGN KEY ("caregiverProfileId") REFERENCES "CaregiverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessLocation" ADD CONSTRAINT "BusinessLocation_shopProfileId_fkey" FOREIGN KEY ("shopProfileId") REFERENCES "ShopProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicPetProfile" ADD CONSTRAINT "PublicPetProfile_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_appointmentServiceId_fkey" FOREIGN KEY ("appointmentServiceId") REFERENCES "AppointmentService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

