-- Manual migration for Phase 7 (pet digital identity QR/NFC)
-- Apply with: psql -f prisma/manual-migrations/20260317_phase7_pet_identity.sql

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PetEmergencyStatus') THEN
    CREATE TYPE "PetEmergencyStatus" AS ENUM (
      'NORMAL',
      'LOST',
      'FOUND',
      'IN_TREATMENT'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'PetPublicIdentity'
  ) THEN
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PetPublicIdentity_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PetPublicIdentity_petId_fkey'
  ) THEN
    ALTER TABLE "PetPublicIdentity"
      ADD CONSTRAINT "PetPublicIdentity_petId_fkey"
      FOREIGN KEY ("petId") REFERENCES "Pet"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "PetPublicIdentity_petId_key"
  ON "PetPublicIdentity" ("petId");

CREATE UNIQUE INDEX IF NOT EXISTS "PetPublicIdentity_publicToken_key"
  ON "PetPublicIdentity" ("publicToken");

CREATE UNIQUE INDEX IF NOT EXISTS "PetPublicIdentity_nfcCode_key"
  ON "PetPublicIdentity" ("nfcCode");

CREATE INDEX IF NOT EXISTS "PetPublicIdentity_emergencyStatus_updatedAt_idx"
  ON "PetPublicIdentity" ("emergencyStatus", "updatedAt");

COMMIT;
