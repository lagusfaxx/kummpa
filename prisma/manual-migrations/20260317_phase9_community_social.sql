-- Manual migration for Phase 9 (community social module)
-- Apply with: psql -f prisma/manual-migrations/20260317_phase9_community_social.sql

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SocialPostVisibility') THEN
    CREATE TYPE "SocialPostVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SocialReportTargetType') THEN
    CREATE TYPE "SocialReportTargetType" AS ENUM ('POST', 'COMMENT', 'PROFILE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SocialReportStatus') THEN
    CREATE TYPE "SocialReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');
  END IF;
END $$;

ALTER TABLE "SocialPost"
  ADD COLUMN IF NOT EXISTS "petId" TEXT,
  ADD COLUMN IF NOT EXISTS "visibility" "SocialPostVisibility" DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS "allowComments" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

UPDATE "SocialPost"
SET "visibility" = 'PUBLIC'
WHERE "visibility" IS NULL;

UPDATE "SocialPost"
SET "allowComments" = true
WHERE "allowComments" IS NULL;

ALTER TABLE "SocialPost"
  ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC',
  ALTER COLUMN "visibility" SET NOT NULL,
  ALTER COLUMN "allowComments" SET DEFAULT true,
  ALTER COLUMN "allowComments" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialPost_petId_fkey'
  ) THEN
    ALTER TABLE "SocialPost"
      ADD CONSTRAINT "SocialPost_petId_fkey"
      FOREIGN KEY ("petId") REFERENCES "Pet"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SocialProfile'
  ) THEN
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialProfile_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialProfile_userId_fkey'
  ) THEN
    ALTER TABLE "SocialProfile"
      ADD CONSTRAINT "SocialProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SocialProfile_userId_key"
  ON "SocialProfile" ("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "SocialProfile_handle_key"
  ON "SocialProfile" ("handle");

CREATE INDEX IF NOT EXISTS "SocialProfile_isPublic_updatedAt_idx"
  ON "SocialProfile" ("isPublic", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'PetSocialProfile'
  ) THEN
    CREATE TABLE "PetSocialProfile" (
      "id" TEXT NOT NULL,
      "petId" TEXT NOT NULL,
      "handle" TEXT,
      "avatarUrl" TEXT,
      "coverUrl" TEXT,
      "bio" TEXT,
      "isPublic" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PetSocialProfile_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PetSocialProfile_petId_fkey'
  ) THEN
    ALTER TABLE "PetSocialProfile"
      ADD CONSTRAINT "PetSocialProfile_petId_fkey"
      FOREIGN KEY ("petId") REFERENCES "Pet"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "PetSocialProfile_petId_key"
  ON "PetSocialProfile" ("petId");

CREATE UNIQUE INDEX IF NOT EXISTS "PetSocialProfile_handle_key"
  ON "PetSocialProfile" ("handle");

CREATE INDEX IF NOT EXISTS "PetSocialProfile_isPublic_updatedAt_idx"
  ON "PetSocialProfile" ("isPublic", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SocialPostComment'
  ) THEN
    CREATE TABLE "SocialPostComment" (
      "id" TEXT NOT NULL,
      "postId" TEXT NOT NULL,
      "authorId" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" TIMESTAMP(3),
      CONSTRAINT "SocialPostComment_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialPostComment_postId_fkey'
  ) THEN
    ALTER TABLE "SocialPostComment"
      ADD CONSTRAINT "SocialPostComment_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "SocialPost"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialPostComment_authorId_fkey'
  ) THEN
    ALTER TABLE "SocialPostComment"
      ADD CONSTRAINT "SocialPostComment_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SocialPostComment_postId_createdAt_idx"
  ON "SocialPostComment" ("postId", "createdAt");

CREATE INDEX IF NOT EXISTS "SocialPostComment_authorId_createdAt_idx"
  ON "SocialPostComment" ("authorId", "createdAt");

CREATE INDEX IF NOT EXISTS "SocialPostComment_deletedAt_idx"
  ON "SocialPostComment" ("deletedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SocialPostLike'
  ) THEN
    CREATE TABLE "SocialPostLike" (
      "id" TEXT NOT NULL,
      "postId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialPostLike_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialPostLike_postId_fkey'
  ) THEN
    ALTER TABLE "SocialPostLike"
      ADD CONSTRAINT "SocialPostLike_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "SocialPost"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialPostLike_userId_fkey'
  ) THEN
    ALTER TABLE "SocialPostLike"
      ADD CONSTRAINT "SocialPostLike_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SocialPostLike_postId_userId_key"
  ON "SocialPostLike" ("postId", "userId");

CREATE INDEX IF NOT EXISTS "SocialPostLike_userId_createdAt_idx"
  ON "SocialPostLike" ("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SocialPostSave'
  ) THEN
    CREATE TABLE "SocialPostSave" (
      "id" TEXT NOT NULL,
      "postId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialPostSave_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialPostSave_postId_fkey'
  ) THEN
    ALTER TABLE "SocialPostSave"
      ADD CONSTRAINT "SocialPostSave_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "SocialPost"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialPostSave_userId_fkey'
  ) THEN
    ALTER TABLE "SocialPostSave"
      ADD CONSTRAINT "SocialPostSave_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SocialPostSave_postId_userId_key"
  ON "SocialPostSave" ("postId", "userId");

CREATE INDEX IF NOT EXISTS "SocialPostSave_userId_createdAt_idx"
  ON "SocialPostSave" ("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SocialPostShare'
  ) THEN
    CREATE TABLE "SocialPostShare" (
      "id" TEXT NOT NULL,
      "postId" TEXT NOT NULL,
      "userId" TEXT,
      "channel" TEXT NOT NULL DEFAULT 'internal',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialPostShare_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialPostShare_postId_fkey'
  ) THEN
    ALTER TABLE "SocialPostShare"
      ADD CONSTRAINT "SocialPostShare_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "SocialPost"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialPostShare_userId_fkey'
  ) THEN
    ALTER TABLE "SocialPostShare"
      ADD CONSTRAINT "SocialPostShare_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SocialPostShare_postId_createdAt_idx"
  ON "SocialPostShare" ("postId", "createdAt");

CREATE INDEX IF NOT EXISTS "SocialPostShare_userId_createdAt_idx"
  ON "SocialPostShare" ("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SocialFollow'
  ) THEN
    CREATE TABLE "SocialFollow" (
      "id" TEXT NOT NULL,
      "followerId" TEXT NOT NULL,
      "followingId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialFollow_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialFollow_followerId_fkey'
  ) THEN
    ALTER TABLE "SocialFollow"
      ADD CONSTRAINT "SocialFollow_followerId_fkey"
      FOREIGN KEY ("followerId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialFollow_followingId_fkey'
  ) THEN
    ALTER TABLE "SocialFollow"
      ADD CONSTRAINT "SocialFollow_followingId_fkey"
      FOREIGN KEY ("followingId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SocialFollow_followerId_followingId_key"
  ON "SocialFollow" ("followerId", "followingId");

CREATE INDEX IF NOT EXISTS "SocialFollow_followingId_createdAt_idx"
  ON "SocialFollow" ("followingId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SocialReport'
  ) THEN
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocialReport_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialReport_reporterUserId_fkey'
  ) THEN
    ALTER TABLE "SocialReport"
      ADD CONSTRAINT "SocialReport_reporterUserId_fkey"
      FOREIGN KEY ("reporterUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialReport_reviewedByUserId_fkey'
  ) THEN
    ALTER TABLE "SocialReport"
      ADD CONSTRAINT "SocialReport_reviewedByUserId_fkey"
      FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialReport_postId_fkey'
  ) THEN
    ALTER TABLE "SocialReport"
      ADD CONSTRAINT "SocialReport_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "SocialPost"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialReport_commentId_fkey'
  ) THEN
    ALTER TABLE "SocialReport"
      ADD CONSTRAINT "SocialReport_commentId_fkey"
      FOREIGN KEY ("commentId") REFERENCES "SocialPostComment"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SocialReport_reportedUserId_fkey'
  ) THEN
    ALTER TABLE "SocialReport"
      ADD CONSTRAINT "SocialReport_reportedUserId_fkey"
      FOREIGN KEY ("reportedUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SocialReport_targetType_status_createdAt_idx"
  ON "SocialReport" ("targetType", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "SocialReport_reporterUserId_createdAt_idx"
  ON "SocialReport" ("reporterUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "SocialReport_status_updatedAt_idx"
  ON "SocialReport" ("status", "updatedAt");

CREATE INDEX IF NOT EXISTS "SocialPost_petId_createdAt_idx"
  ON "SocialPost" ("petId", "createdAt");

CREATE INDEX IF NOT EXISTS "SocialPost_visibility_createdAt_idx"
  ON "SocialPost" ("visibility", "createdAt");

CREATE INDEX IF NOT EXISTS "SocialPost_deletedAt_idx"
  ON "SocialPost" ("deletedAt");

COMMIT;
