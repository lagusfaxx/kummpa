-- Manual migration for Phase 6 (appointments)
-- Apply with: psql -f prisma/manual-migrations/20260317_phase6_appointments.sql


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AppointmentStatus') THEN
    CREATE TYPE "AppointmentStatus" AS ENUM (
      'PENDING',
      'CONFIRMED',
      'COMPLETED',
      'CANCELLED',
      'REJECTED',
      'RESCHEDULED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProviderType') THEN
    CREATE TYPE "ProviderType" AS ENUM (
      'VET',
      'CAREGIVER',
      'SHOP',
      'GROOMING',
      'HOTEL',
      'OTHER'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceType') THEN
    CREATE TYPE "ServiceType" AS ENUM (
      'GENERAL_CONSULT',
      'VACCINATION',
      'EMERGENCY',
      'DEWORMING',
      'GROOMING',
      'HOTEL_DAYCARE',
      'WALKING',
      'TRAINING',
      'OTHER'
    );
  END IF;
END $$;

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "providerUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerType" "ProviderType",
  ADD COLUMN IF NOT EXISTS "providerSourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerName" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceType" "ServiceType",
  ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "cancelReason" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rescheduledFromId" TEXT;

UPDATE "Appointment"
SET "durationMinutes" = 30
WHERE "durationMinutes" IS NULL;

ALTER TABLE "Appointment"
  ALTER COLUMN "durationMinutes" SET DEFAULT 30;

ALTER TABLE "Appointment"
  ALTER COLUMN "providerType" SET DEFAULT 'OTHER';

ALTER TABLE "Appointment"
  ALTER COLUMN "providerName" SET DEFAULT 'Proveedor pet';

UPDATE "Appointment"
SET "providerType" = COALESCE("providerType", 'OTHER'::"ProviderType"),
    "providerName" = COALESCE(NULLIF("providerName", ''), 'Proveedor pet')
WHERE "providerType" IS NULL OR "providerName" IS NULL OR "providerName" = '';

ALTER TABLE "Appointment"
  ALTER COLUMN "providerType" SET NOT NULL,
  ALTER COLUMN "providerName" SET NOT NULL,
  ALTER COLUMN "durationMinutes" SET NOT NULL;

DO $$
DECLARE
  current_type TEXT;
BEGIN
  SELECT data_type
  INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'Appointment'
    AND column_name = 'status'
    AND table_schema = 'public';

  IF current_type IN ('character varying', 'text') THEN
    ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "status";
    ALTER TABLE "Appointment" ADD COLUMN "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING';
  END IF;
END $$;

ALTER TABLE "Appointment"
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ScheduleAvailability'
  ) THEN
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ScheduleAvailability_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Appointment_providerUserId_fkey'
  ) THEN
    ALTER TABLE "Appointment"
      ADD CONSTRAINT "Appointment_providerUserId_fkey"
      FOREIGN KEY ("providerUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Appointment_rescheduledFromId_fkey'
  ) THEN
    ALTER TABLE "Appointment"
      ADD CONSTRAINT "Appointment_rescheduledFromId_fkey"
      FOREIGN KEY ("rescheduledFromId") REFERENCES "Appointment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ScheduleAvailability_providerUserId_fkey'
  ) THEN
    ALTER TABLE "ScheduleAvailability"
      ADD CONSTRAINT "ScheduleAvailability_providerUserId_fkey"
      FOREIGN KEY ("providerUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Appointment_petId_scheduledAt_idx"
  ON "Appointment" ("petId", "scheduledAt");

CREATE INDEX IF NOT EXISTS "Appointment_providerUserId_scheduledAt_idx"
  ON "Appointment" ("providerUserId", "scheduledAt");

CREATE INDEX IF NOT EXISTS "Appointment_status_scheduledAt_idx"
  ON "Appointment" ("status", "scheduledAt");

CREATE INDEX IF NOT EXISTS "Appointment_providerType_providerSourceId_idx"
  ON "Appointment" ("providerType", "providerSourceId");

CREATE INDEX IF NOT EXISTS "ScheduleAvailability_providerUserId_dayOfWeek_isActive_idx"
  ON "ScheduleAvailability" ("providerUserId", "dayOfWeek", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "ScheduleAvailability_providerUserId_dayOfWeek_startTime_endTime_serviceType_key"
  ON "ScheduleAvailability" ("providerUserId", "dayOfWeek", "startTime", "endTime", "serviceType");

