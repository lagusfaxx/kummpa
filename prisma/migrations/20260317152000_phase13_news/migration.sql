-- CreateEnum
CREATE TYPE "NewsCategory" AS ENUM ('FOOD', 'GADGETS', 'VET_NEWS', 'HEALTH_TIPS', 'PET_EVENTS', 'HEALTH_ALERTS', 'ADOPTION', 'OTHER');

-- DropIndex
DROP INDEX "NewsArticle_publishedAt_idx";

-- AlterTable
ALTER TABLE "NewsArticle" ADD COLUMN     "category" "NewsCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "NewsArticleSave" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsArticleSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsArticleShare" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'internal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsArticleShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsArticleSave_userId_createdAt_idx" ON "NewsArticleSave"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticleSave_articleId_userId_key" ON "NewsArticleSave"("articleId", "userId");

-- CreateIndex
CREATE INDEX "NewsArticleShare_articleId_createdAt_idx" ON "NewsArticleShare"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "NewsArticleShare_userId_createdAt_idx" ON "NewsArticleShare"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NewsArticle_category_publishedAt_idx" ON "NewsArticle"("category", "publishedAt");

-- CreateIndex
CREATE INDEX "NewsArticle_isFeatured_publishedAt_idx" ON "NewsArticle"("isFeatured", "publishedAt");

-- CreateIndex
CREATE INDEX "NewsArticle_isPublished_publishedAt_idx" ON "NewsArticle"("isPublished", "publishedAt");

-- AddForeignKey
ALTER TABLE "NewsArticleSave" ADD CONSTRAINT "NewsArticleSave_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsArticleSave" ADD CONSTRAINT "NewsArticleSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsArticleShare" ADD CONSTRAINT "NewsArticleShare_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsArticleShare" ADD CONSTRAINT "NewsArticleShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

