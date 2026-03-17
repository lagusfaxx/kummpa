-- Manual migration for Phase 8 (lost pets + sightings)
-- Apply with: psql -f prisma/manual-migrations/20260317_phase8_lost_pets.sql

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LostPetAlertStatus') THEN
    CREATE TYPE "LostPetAlertStatus" AS ENUM ('ACTIVE', 'FOUND', 'CLOSED');
  END IF;
END $$;

ALTER TABLE "LostPetAlert"
  ADD COLUMN IF NOT EXISTS "lastSeenAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "searchRadiusKm" INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "broadcastEnabled" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "shareToken" TEXT,
  ADD COLUMN IF NOT EXISTS "foundAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

UPDATE "LostPetAlert"
SET "searchRadiusKm" = 10
WHERE "searchRadiusKm" IS NULL;

UPDATE "LostPetAlert"
SET "broadcastEnabled" = true
WHERE "broadcastEnabled" IS NULL;

UPDATE "LostPetAlert"
SET "shareToken" = CONCAT('legacy-', "id")
WHERE "shareToken" IS NULL OR "shareToken" = '';

DO $$
DECLARE
  current_type TEXT;
BEGIN
  SELECT data_type
  INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'LostPetAlert'
    AND column_name = 'status'
    AND table_schema = 'public';

  IF current_type IN ('character varying', 'text') THEN
    ALTER TABLE "LostPetAlert" ADD COLUMN IF NOT EXISTS "status_tmp" "LostPetAlertStatus";

    UPDATE "LostPetAlert"
    SET "status_tmp" = CASE
      WHEN LOWER(COALESCE("status", '')) IN ('active', 'activa') THEN 'ACTIVE'::"LostPetAlertStatus"
      WHEN LOWER(COALESCE("status", '')) IN ('found', 'encontrada', 'founded') THEN 'FOUND'::"LostPetAlertStatus"
      WHEN LOWER(COALESCE("status", '')) IN ('closed', 'cerrada') THEN 'CLOSED'::"LostPetAlertStatus"
      ELSE 'ACTIVE'::"LostPetAlertStatus"
    END;

    ALTER TABLE "LostPetAlert" DROP COLUMN IF EXISTS "status";
    ALTER TABLE "LostPetAlert" RENAME COLUMN "status_tmp" TO "status";
  END IF;
END $$;

ALTER TABLE "LostPetAlert"
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "searchRadiusKm" SET DEFAULT 10,
  ALTER COLUMN "searchRadiusKm" SET NOT NULL,
  ALTER COLUMN "broadcastEnabled" SET DEFAULT true,
  ALTER COLUMN "broadcastEnabled" SET NOT NULL,
  ALTER COLUMN "shareToken" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'LostPetSighting'
  ) THEN
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LostPetSighting_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LostPetSighting_alertId_fkey'
  ) THEN
    ALTER TABLE "LostPetSighting"
      ADD CONSTRAINT "LostPetSighting_alertId_fkey"
      FOREIGN KEY ("alertId") REFERENCES "LostPetAlert"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LostPetSighting_reporterUserId_fkey'
  ) THEN
    ALTER TABLE "LostPetSighting"
      ADD CONSTRAINT "LostPetSighting_reporterUserId_fkey"
      FOREIGN KEY ("reporterUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "LostPetAlert_shareToken_key"
  ON "LostPetAlert" ("shareToken");

CREATE INDEX IF NOT EXISTS "LostPetAlert_status_updatedAt_idx"
  ON "LostPetAlert" ("status", "updatedAt");

CREATE INDEX IF NOT EXISTS "LostPetSighting_alertId_sightingAt_idx"
  ON "LostPetSighting" ("alertId", "sightingAt");

CREATE INDEX IF NOT EXISTS "LostPetSighting_reporterUserId_createdAt_idx"
  ON "LostPetSighting" ("reporterUserId", "createdAt");

COMMIT;
