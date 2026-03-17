-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'VET', 'CAREGIVER', 'SHOP', 'ADMIN');

-- CreateEnum
CREATE TYPE "ListingCondition" AS ENUM ('NEW', 'USED');

-- CreateEnum
CREATE TYPE "PetSex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PetSize" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PetEmergencyStatus" AS ENUM ('NORMAL', 'LOST', 'FOUND', 'IN_TREATMENT');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('VACCINE', 'VACCINE_OVERDUE', 'DEWORMING', 'MEDICAL_CHECK', 'MEDICATION', 'GROOMING');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('EMAIL', 'IN_APP', 'PUSH');

-- CreateEnum
CREATE TYPE "ReminderDispatchStatus" AS ENUM ('SENT', 'SKIPPED', 'FAILED', 'PENDING_PUSH');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('VET', 'CAREGIVER', 'SHOP', 'GROOMING', 'HOTEL', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('GENERAL_CONSULT', 'VACCINATION', 'EMERGENCY', 'DEWORMING', 'GROOMING', 'HOTEL_DAYCARE', 'WALKING', 'TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "LostPetAlertStatus" AS ENUM ('ACTIVE', 'FOUND', 'CLOSED');

-- CreateEnum
CREATE TYPE "SocialPostVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "SocialReportTargetType" AS ENUM ('POST', 'COMMENT', 'PROFILE');

-- CreateEnum
CREATE TYPE "SocialReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PetEnergyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SocialWalkInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SocialEventType" AS ENUM ('WALK', 'PLAYDATE', 'TRAINING', 'HIKE', 'OTHER');

-- CreateEnum
CREATE TYPE "SocialEventStatus" AS ENUM ('OPEN', 'FULL', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "district" TEXT,
    "approximateAddress" TEXT,
    "biography" TEXT,
    "notificationPreferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VetProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicName" TEXT,
    "logoUrl" TEXT,
    "address" TEXT,
    "district" TEXT,
    "city" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "openingHours" JSONB,
    "services" JSONB,
    "referencePrices" JSONB,
    "isEmergency24x7" BOOLEAN NOT NULL DEFAULT false,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "description" TEXT,
    "websiteUrl" TEXT,
    "socialLinks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaregiverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "introduction" TEXT,
    "experience" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "services" JSONB,
    "coverageAreas" JSONB,
    "rates" JSONB,
    "schedule" JSONB,
    "ratingAverage" DECIMAL(3,2),
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "logoUrl" TEXT,
    "address" TEXT,
    "district" TEXT,
    "city" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "basicCatalog" JSONB,
    "openingHours" JSONB,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "websiteUrl" TEXT,
    "discounts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryPhotoUrl" TEXT,
    "species" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "sex" "PetSex" NOT NULL DEFAULT 'UNKNOWN',
    "birthDate" TIMESTAMP(3),
    "weightKg" DECIMAL(5,2),
    "color" TEXT,
    "size" "PetSize" NOT NULL DEFAULT 'UNKNOWN',
    "isSterilized" BOOLEAN DEFAULT false,
    "microchipNumber" TEXT,
    "allergies" TEXT,
    "diseases" TEXT,
    "medications" TEXT,
    "feeding" TEXT,
    "usualVetName" TEXT,
    "usualVetContact" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "generalNotes" TEXT,
    "healthStatus" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetPublicIdentity" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "emergencyStatus" "PetEmergencyStatus" NOT NULL DEFAULT 'NORMAL',
    "secondaryContactName" TEXT,
    "secondaryContactPhone" TEXT,
    "cityZone" TEXT,
    "emergencyInstructions" TEXT,
    "nfcCode" TEXT,
    "showOwnerName" BOOLEAN NOT NULL DEFAULT true,
    "showOwnerPhone" BOOLEAN NOT NULL DEFAULT true,
    "showSecondaryContact" BOOLEAN NOT NULL DEFAULT true,
    "showCityZone" BOOLEAN NOT NULL DEFAULT true,
    "showAllergies" BOOLEAN NOT NULL DEFAULT true,
    "showDiseases" BOOLEAN NOT NULL DEFAULT true,
    "showMedications" BOOLEAN NOT NULL DEFAULT true,
    "showUsualVet" BOOLEAN NOT NULL DEFAULT true,
    "showEmergencyInstructions" BOOLEAN NOT NULL DEFAULT true,
    "showGeneralNotes" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetPublicIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetMedia" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaccineRecord" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL,
    "nextDoseAt" TIMESTAMP(3),
    "lotNumber" TEXT,
    "providerName" TEXT,
    "notes" TEXT,
    "certificateUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaccineRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "sourceVaccineRecordId" TEXT,
    "type" "ReminderType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "sendEmail" BOOLEAN NOT NULL DEFAULT true,
    "sendInApp" BOOLEAN NOT NULL DEFAULT true,
    "sendPush" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderDispatchLog" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "ReminderDispatchStatus" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderDispatchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "providerUserId" TEXT,
    "providerType" "ProviderType" NOT NULL,
    "providerSourceId" TEXT,
    "providerName" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "notes" TEXT,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rescheduledFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleAvailability" (
    "id" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "serviceType" "ServiceType",
    "timezone" TEXT NOT NULL DEFAULT 'America/Santiago',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LostPetAlert" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "status" "LostPetAlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenLat" DECIMAL(9,6) NOT NULL,
    "lastSeenLng" DECIMAL(9,6) NOT NULL,
    "lastSeenAddress" TEXT,
    "description" TEXT,
    "emergencyNotes" TEXT,
    "searchRadiusKm" INTEGER NOT NULL DEFAULT 10,
    "broadcastEnabled" BOOLEAN NOT NULL DEFAULT true,
    "medicalPriority" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT NOT NULL,
    "foundAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LostPetAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LostPetSighting" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "sightingAt" TIMESTAMP(3) NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "address" TEXT,
    "comment" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LostPetSighting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "petId" TEXT,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "visibility" "SocialPostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "allowComments" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetSocialProfile" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "handle" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "bio" TEXT,
    "energyLevel" "PetEnergyLevel" NOT NULL DEFAULT 'MEDIUM',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetSocialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SocialPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostSave" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialPostSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostShare" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'internal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialPostShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialReport" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "targetType" "SocialReportTargetType" NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "reportedUserId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "SocialReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewNotes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialWalkProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "district" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "preferredSpecies" TEXT,
    "preferredSizes" "PetSize"[] DEFAULT ARRAY[]::"PetSize"[],
    "preferredEnergyLevels" "PetEnergyLevel"[] DEFAULT ARRAY[]::"PetEnergyLevel"[],
    "preferredMinAgeMonths" INTEGER,
    "preferredMaxAgeMonths" INTEGER,
    "isDiscoverable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialWalkProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialWalkInvitation" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "petId" TEXT,
    "message" TEXT,
    "proposedAt" TIMESTAMP(3),
    "city" TEXT,
    "district" TEXT,
    "placeLabel" TEXT,
    "status" "SocialWalkInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialWalkInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialWalkChatMessage" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialWalkChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialGroupEvent" (
    "id" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "SocialEventType" NOT NULL DEFAULT 'WALK',
    "status" "SocialEventStatus" NOT NULL DEFAULT 'OPEN',
    "city" TEXT NOT NULL,
    "district" TEXT,
    "placeLabel" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "maxAttendees" INTEGER,
    "speciesFilter" TEXT,
    "sizeFilter" "PetSize",
    "energyFilter" "PetEnergyLevel",
    "minPetAgeMonths" INTEGER,
    "maxPetAgeMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialGroupEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialGroupEventMember" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "petId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialGroupEventMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "condition" "ListingCondition" NOT NULL,
    "city" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benefit" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "city" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "User_emailVerifiedAt_idx" ON "User"("emailVerifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerProfile_userId_key" ON "OwnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VetProfile_userId_key" ON "VetProfile"("userId");

-- CreateIndex
CREATE INDEX "VetProfile_city_district_idx" ON "VetProfile"("city", "district");

-- CreateIndex
CREATE INDEX "VetProfile_isEmergency24x7_idx" ON "VetProfile"("isEmergency24x7");

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverProfile_userId_key" ON "CaregiverProfile"("userId");

-- CreateIndex
CREATE INDEX "CaregiverProfile_latitude_longitude_idx" ON "CaregiverProfile"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "ShopProfile_userId_key" ON "ShopProfile"("userId");

-- CreateIndex
CREATE INDEX "ShopProfile_city_district_idx" ON "ShopProfile"("city", "district");

-- CreateIndex
CREATE INDEX "ShopProfile_latitude_longitude_idx" ON "ShopProfile"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthSession_revokedAt_idx" ON "AuthSession"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_usedAt_idx" ON "EmailVerificationToken"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_usedAt_idx" ON "PasswordResetToken"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Pet_shareToken_key" ON "Pet"("shareToken");

-- CreateIndex
CREATE INDEX "Pet_ownerId_idx" ON "Pet"("ownerId");

-- CreateIndex
CREATE INDEX "Pet_isPublic_idx" ON "Pet"("isPublic");

-- CreateIndex
CREATE INDEX "Pet_shareToken_idx" ON "Pet"("shareToken");

-- CreateIndex
CREATE INDEX "Pet_deletedAt_idx" ON "Pet"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PetPublicIdentity_petId_key" ON "PetPublicIdentity"("petId");

-- CreateIndex
CREATE UNIQUE INDEX "PetPublicIdentity_publicToken_key" ON "PetPublicIdentity"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "PetPublicIdentity_nfcCode_key" ON "PetPublicIdentity"("nfcCode");

-- CreateIndex
CREATE INDEX "PetPublicIdentity_emergencyStatus_updatedAt_idx" ON "PetPublicIdentity"("emergencyStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "PetMedia_petId_sortOrder_idx" ON "PetMedia"("petId", "sortOrder");

-- CreateIndex
CREATE INDEX "VaccineRecord_petId_appliedAt_idx" ON "VaccineRecord"("petId", "appliedAt");

-- CreateIndex
CREATE INDEX "VaccineRecord_nextDoseAt_idx" ON "VaccineRecord"("nextDoseAt");

-- CreateIndex
CREATE INDEX "Reminder_userId_dueAt_isActive_idx" ON "Reminder"("userId", "dueAt", "isActive");

-- CreateIndex
CREATE INDEX "Reminder_petId_dueAt_idx" ON "Reminder"("petId", "dueAt");

-- CreateIndex
CREATE INDEX "Reminder_sourceVaccineRecordId_idx" ON "Reminder"("sourceVaccineRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_sourceVaccineRecordId_type_key" ON "Reminder"("sourceVaccineRecordId", "type");

-- CreateIndex
CREATE INDEX "ReminderDispatchLog_status_createdAt_idx" ON "ReminderDispatchLog"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderDispatchLog_reminderId_channel_scheduledFor_key" ON "ReminderDispatchLog"("reminderId", "channel", "scheduledFor");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_petId_scheduledAt_idx" ON "Appointment"("petId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_providerUserId_scheduledAt_idx" ON "Appointment"("providerUserId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_status_scheduledAt_idx" ON "Appointment"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_providerType_providerSourceId_idx" ON "Appointment"("providerType", "providerSourceId");

-- CreateIndex
CREATE INDEX "ScheduleAvailability_providerUserId_dayOfWeek_isActive_idx" ON "ScheduleAvailability"("providerUserId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleAvailability_providerUserId_dayOfWeek_startTime_end_key" ON "ScheduleAvailability"("providerUserId", "dayOfWeek", "startTime", "endTime", "serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "LostPetAlert_shareToken_key" ON "LostPetAlert"("shareToken");

-- CreateIndex
CREATE INDEX "LostPetAlert_petId_status_idx" ON "LostPetAlert"("petId", "status");

-- CreateIndex
CREATE INDEX "LostPetAlert_lastSeenAt_idx" ON "LostPetAlert"("lastSeenAt");

-- CreateIndex
CREATE INDEX "LostPetAlert_status_updatedAt_idx" ON "LostPetAlert"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "LostPetSighting_alertId_sightingAt_idx" ON "LostPetSighting"("alertId", "sightingAt");

-- CreateIndex
CREATE INDEX "LostPetSighting_reporterUserId_createdAt_idx" ON "LostPetSighting"("reporterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPost_authorId_createdAt_idx" ON "SocialPost"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPost_petId_createdAt_idx" ON "SocialPost"("petId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPost_visibility_createdAt_idx" ON "SocialPost"("visibility", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPost_deletedAt_idx" ON "SocialPost"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialProfile_userId_key" ON "SocialProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialProfile_handle_key" ON "SocialProfile"("handle");

-- CreateIndex
CREATE INDEX "SocialProfile_isPublic_updatedAt_idx" ON "SocialProfile"("isPublic", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PetSocialProfile_petId_key" ON "PetSocialProfile"("petId");

-- CreateIndex
CREATE UNIQUE INDEX "PetSocialProfile_handle_key" ON "PetSocialProfile"("handle");

-- CreateIndex
CREATE INDEX "PetSocialProfile_isPublic_updatedAt_idx" ON "PetSocialProfile"("isPublic", "updatedAt");

-- CreateIndex
CREATE INDEX "PetSocialProfile_energyLevel_updatedAt_idx" ON "PetSocialProfile"("energyLevel", "updatedAt");

-- CreateIndex
CREATE INDEX "SocialPostComment_postId_createdAt_idx" ON "SocialPostComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPostComment_authorId_createdAt_idx" ON "SocialPostComment"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPostComment_deletedAt_idx" ON "SocialPostComment"("deletedAt");

-- CreateIndex
CREATE INDEX "SocialPostLike_userId_createdAt_idx" ON "SocialPostLike"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPostLike_postId_userId_key" ON "SocialPostLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "SocialPostSave_userId_createdAt_idx" ON "SocialPostSave"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPostSave_postId_userId_key" ON "SocialPostSave"("postId", "userId");

-- CreateIndex
CREATE INDEX "SocialPostShare_postId_createdAt_idx" ON "SocialPostShare"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPostShare_userId_createdAt_idx" ON "SocialPostShare"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialFollow_followingId_createdAt_idx" ON "SocialFollow"("followingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialFollow_followerId_followingId_key" ON "SocialFollow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "SocialReport_targetType_status_createdAt_idx" ON "SocialReport"("targetType", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SocialReport_reporterUserId_createdAt_idx" ON "SocialReport"("reporterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialReport_status_updatedAt_idx" ON "SocialReport"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialWalkProfile_userId_key" ON "SocialWalkProfile"("userId");

-- CreateIndex
CREATE INDEX "SocialWalkProfile_isDiscoverable_city_district_idx" ON "SocialWalkProfile"("isDiscoverable", "city", "district");

-- CreateIndex
CREATE INDEX "SocialWalkInvitation_toUserId_status_createdAt_idx" ON "SocialWalkInvitation"("toUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SocialWalkInvitation_fromUserId_status_createdAt_idx" ON "SocialWalkInvitation"("fromUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SocialWalkInvitation_petId_createdAt_idx" ON "SocialWalkInvitation"("petId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialWalkChatMessage_invitationId_createdAt_idx" ON "SocialWalkChatMessage"("invitationId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialWalkChatMessage_senderUserId_createdAt_idx" ON "SocialWalkChatMessage"("senderUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialGroupEvent_status_startsAt_idx" ON "SocialGroupEvent"("status", "startsAt");

-- CreateIndex
CREATE INDEX "SocialGroupEvent_city_district_startsAt_idx" ON "SocialGroupEvent"("city", "district", "startsAt");

-- CreateIndex
CREATE INDEX "SocialGroupEvent_creatorUserId_createdAt_idx" ON "SocialGroupEvent"("creatorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialGroupEventMember_userId_createdAt_idx" ON "SocialGroupEventMember"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialGroupEventMember_petId_createdAt_idx" ON "SocialGroupEventMember"("petId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialGroupEventMember_eventId_userId_key" ON "SocialGroupEventMember"("eventId", "userId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_sellerId_createdAt_idx" ON "MarketplaceListing"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceListing_isActive_condition_idx" ON "MarketplaceListing"("isActive", "condition");

-- CreateIndex
CREATE INDEX "Benefit_validFrom_validTo_idx" ON "Benefit"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "Benefit_city_idx" ON "Benefit"("city");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_slug_key" ON "NewsArticle"("slug");

-- CreateIndex
CREATE INDEX "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");

-- AddForeignKey
ALTER TABLE "OwnerProfile" ADD CONSTRAINT "OwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VetProfile" ADD CONSTRAINT "VetProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverProfile" ADD CONSTRAINT "CaregiverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProfile" ADD CONSTRAINT "ShopProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetPublicIdentity" ADD CONSTRAINT "PetPublicIdentity_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetMedia" ADD CONSTRAINT "PetMedia_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineRecord" ADD CONSTRAINT "VaccineRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_sourceVaccineRecordId_fkey" FOREIGN KEY ("sourceVaccineRecordId") REFERENCES "VaccineRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderDispatchLog" ADD CONSTRAINT "ReminderDispatchLog_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAvailability" ADD CONSTRAINT "ScheduleAvailability_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LostPetAlert" ADD CONSTRAINT "LostPetAlert_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LostPetSighting" ADD CONSTRAINT "LostPetSighting_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "LostPetAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LostPetSighting" ADD CONSTRAINT "LostPetSighting_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialProfile" ADD CONSTRAINT "SocialProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetSocialProfile" ADD CONSTRAINT "PetSocialProfile_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostComment" ADD CONSTRAINT "SocialPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostComment" ADD CONSTRAINT "SocialPostComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostLike" ADD CONSTRAINT "SocialPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostLike" ADD CONSTRAINT "SocialPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostSave" ADD CONSTRAINT "SocialPostSave_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostSave" ADD CONSTRAINT "SocialPostSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostShare" ADD CONSTRAINT "SocialPostShare_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostShare" ADD CONSTRAINT "SocialPostShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFollow" ADD CONSTRAINT "SocialFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFollow" ADD CONSTRAINT "SocialFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "SocialPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialWalkProfile" ADD CONSTRAINT "SocialWalkProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialWalkInvitation" ADD CONSTRAINT "SocialWalkInvitation_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialWalkInvitation" ADD CONSTRAINT "SocialWalkInvitation_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialWalkInvitation" ADD CONSTRAINT "SocialWalkInvitation_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialWalkChatMessage" ADD CONSTRAINT "SocialWalkChatMessage_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "SocialWalkInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialWalkChatMessage" ADD CONSTRAINT "SocialWalkChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialGroupEvent" ADD CONSTRAINT "SocialGroupEvent_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialGroupEventMember" ADD CONSTRAINT "SocialGroupEventMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SocialGroupEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialGroupEventMember" ADD CONSTRAINT "SocialGroupEventMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialGroupEventMember" ADD CONSTRAINT "SocialGroupEventMember_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

