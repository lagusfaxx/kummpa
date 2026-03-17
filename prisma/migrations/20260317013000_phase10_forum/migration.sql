-- CreateEnum
CREATE TYPE "ForumReportTargetType" AS ENUM ('TOPIC', 'REPLY');

-- CreateEnum
CREATE TYPE "ForumReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "providerType" DROP DEFAULT,
ALTER COLUMN "providerName" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ForumCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumTopic" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumReply" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "quotedReplyId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumReplyUsefulVote" (
    "id" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumReplyUsefulVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumReport" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "targetType" "ForumReportTargetType" NOT NULL,
    "topicId" TEXT,
    "replyId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "ForumReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewNotes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ForumCategory_slug_key" ON "ForumCategory"("slug");

-- CreateIndex
CREATE INDEX "ForumCategory_isActive_sortOrder_idx" ON "ForumCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ForumTopic_categoryId_createdAt_idx" ON "ForumTopic"("categoryId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumTopic_authorId_createdAt_idx" ON "ForumTopic"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumTopic_isPinned_createdAt_idx" ON "ForumTopic"("isPinned", "createdAt");

-- CreateIndex
CREATE INDEX "ForumTopic_deletedAt_idx" ON "ForumTopic"("deletedAt");

-- CreateIndex
CREATE INDEX "ForumReply_topicId_createdAt_idx" ON "ForumReply"("topicId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumReply_authorId_createdAt_idx" ON "ForumReply"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumReply_deletedAt_idx" ON "ForumReply"("deletedAt");

-- CreateIndex
CREATE INDEX "ForumReplyUsefulVote_userId_createdAt_idx" ON "ForumReplyUsefulVote"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ForumReplyUsefulVote_replyId_userId_key" ON "ForumReplyUsefulVote"("replyId", "userId");

-- CreateIndex
CREATE INDEX "ForumReport_targetType_status_createdAt_idx" ON "ForumReport"("targetType", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ForumReport_reporterUserId_createdAt_idx" ON "ForumReport"("reporterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumReport_status_updatedAt_idx" ON "ForumReport"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "ForumTopic" ADD CONSTRAINT "ForumTopic_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ForumCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumTopic" ADD CONSTRAINT "ForumTopic_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ForumTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_quotedReplyId_fkey" FOREIGN KEY ("quotedReplyId") REFERENCES "ForumReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReplyUsefulVote" ADD CONSTRAINT "ForumReplyUsefulVote_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "ForumReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReplyUsefulVote" ADD CONSTRAINT "ForumReplyUsefulVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ForumTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "ForumReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

