-- Manual migration for Phase 9 Step 15 (walks, meetups and pet tinder)
-- Apply with: psql -f prisma/manual-migrations/20260317_phase9_walks_meetups.sql

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PetEnergyLevel') THEN
    CREATE TYPE "PetEnergyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SocialWalkInvitationStatus') THEN
    CREATE TYPE "SocialWalkInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SocialEventType') THEN
    CREATE TYPE "SocialEventType" AS ENUM ('WALK', 'PLAYDATE', 'TRAINING', 'HIKE', 'OTHER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SocialEventStatus') THEN
    CREATE TYPE "SocialEventStatus" AS ENUM ('OPEN', 'FULL', 'CANCELLED', 'COMPLETED');
  END IF;
END $$;

ALTER TABLE "PetSocialProfile"
  ADD COLUMN IF NOT EXISTS "energyLevel" "PetEnergyLevel" DEFAULT 'MEDIUM';

UPDATE "PetSocialProfile"
SET "energyLevel" = 'MEDIUM'
WHERE "energyLevel" IS NULL;

ALTER TABLE "PetSocialProfile"
  ALTER COLUMN "energyLevel" SET DEFAULT 'MEDIUM',
  ALTER COLUMN "energyLevel" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "PetSocialProfile_energyLevel_updatedAt_idx"
  ON "PetSocialProfile" ("energyLevel", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SocialWalkProfile'
  ) THEN
    CREATE TABLE "SocialWalkProfile" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "displayName" TEXT,
      "bio" TEXT,
      "city" TEXT,
      "district" TEXT,
      "latitude" DECIMAL(9, 6),
      "longitude" DECIMAL(9, 6),
      "preferredSpecies" TEXT,
      "preferredSizes" "PetSize"[] NOT NULL DEFAULT ARRAY[]::"PetSize"[],
      "preferredEnergyLevels" "PetEnergyLevel"[] NOT NULL DEFAULT ARRAY[]::"PetEnergyLevel"[],
      "preferredMinAgeMonths" INTEGER,
      "preferredMaxAgeMonths" INTEGER,
      "isDiscoverable" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialWalkProfile_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialWalkProfile_userId_fkey'
  ) THEN
    ALTER TABLE "SocialWalkProfile"
      ADD CONSTRAINT "SocialWalkProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SocialWalkProfile_userId_key"
  ON "SocialWalkProfile" ("userId");

CREATE INDEX IF NOT EXISTS "SocialWalkProfile_isDiscoverable_city_district_idx"
  ON "SocialWalkProfile" ("isDiscoverable", "city", "district");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SocialWalkInvitation'
  ) THEN
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialWalkInvitation_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialWalkInvitation_fromUserId_fkey'
  ) THEN
    ALTER TABLE "SocialWalkInvitation"
      ADD CONSTRAINT "SocialWalkInvitation_fromUserId_fkey"
      FOREIGN KEY ("fromUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialWalkInvitation_toUserId_fkey'
  ) THEN
    ALTER TABLE "SocialWalkInvitation"
      ADD CONSTRAINT "SocialWalkInvitation_toUserId_fkey"
      FOREIGN KEY ("toUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialWalkInvitation_petId_fkey'
  ) THEN
    ALTER TABLE "SocialWalkInvitation"
      ADD CONSTRAINT "SocialWalkInvitation_petId_fkey"
      FOREIGN KEY ("petId") REFERENCES "Pet"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SocialWalkInvitation_toUserId_status_createdAt_idx"
  ON "SocialWalkInvitation" ("toUserId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "SocialWalkInvitation_fromUserId_status_createdAt_idx"
  ON "SocialWalkInvitation" ("fromUserId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "SocialWalkInvitation_petId_createdAt_idx"
  ON "SocialWalkInvitation" ("petId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SocialWalkChatMessage'
  ) THEN
    CREATE TABLE "SocialWalkChatMessage" (
      "id" TEXT NOT NULL,
      "invitationId" TEXT NOT NULL,
      "senderUserId" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialWalkChatMessage_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialWalkChatMessage_invitationId_fkey'
  ) THEN
    ALTER TABLE "SocialWalkChatMessage"
      ADD CONSTRAINT "SocialWalkChatMessage_invitationId_fkey"
      FOREIGN KEY ("invitationId") REFERENCES "SocialWalkInvitation"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialWalkChatMessage_senderUserId_fkey'
  ) THEN
    ALTER TABLE "SocialWalkChatMessage"
      ADD CONSTRAINT "SocialWalkChatMessage_senderUserId_fkey"
      FOREIGN KEY ("senderUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SocialWalkChatMessage_invitationId_createdAt_idx"
  ON "SocialWalkChatMessage" ("invitationId", "createdAt");

CREATE INDEX IF NOT EXISTS "SocialWalkChatMessage_senderUserId_createdAt_idx"
  ON "SocialWalkChatMessage" ("senderUserId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SocialGroupEvent'
  ) THEN
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialGroupEvent_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialGroupEvent_creatorUserId_fkey'
  ) THEN
    ALTER TABLE "SocialGroupEvent"
      ADD CONSTRAINT "SocialGroupEvent_creatorUserId_fkey"
      FOREIGN KEY ("creatorUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SocialGroupEvent_status_startsAt_idx"
  ON "SocialGroupEvent" ("status", "startsAt");

CREATE INDEX IF NOT EXISTS "SocialGroupEvent_city_district_startsAt_idx"
  ON "SocialGroupEvent" ("city", "district", "startsAt");

CREATE INDEX IF NOT EXISTS "SocialGroupEvent_creatorUserId_createdAt_idx"
  ON "SocialGroupEvent" ("creatorUserId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SocialGroupEventMember'
  ) THEN
    CREATE TABLE "SocialGroupEventMember" (
      "id" TEXT NOT NULL,
      "eventId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "petId" TEXT,
      "note" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialGroupEventMember_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialGroupEventMember_eventId_fkey'
  ) THEN
    ALTER TABLE "SocialGroupEventMember"
      ADD CONSTRAINT "SocialGroupEventMember_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "SocialGroupEvent"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialGroupEventMember_userId_fkey'
  ) THEN
    ALTER TABLE "SocialGroupEventMember"
      ADD CONSTRAINT "SocialGroupEventMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialGroupEventMember_petId_fkey'
  ) THEN
    ALTER TABLE "SocialGroupEventMember"
      ADD CONSTRAINT "SocialGroupEventMember_petId_fkey"
      FOREIGN KEY ("petId") REFERENCES "Pet"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SocialGroupEventMember_eventId_userId_key"
  ON "SocialGroupEventMember" ("eventId", "userId");

CREATE INDEX IF NOT EXISTS "SocialGroupEventMember_userId_createdAt_idx"
  ON "SocialGroupEventMember" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "SocialGroupEventMember_petId_createdAt_idx"
  ON "SocialGroupEventMember" ("petId", "createdAt");

COMMIT;
