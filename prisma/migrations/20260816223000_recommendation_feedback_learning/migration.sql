-- AlterEnum
ALTER TYPE "RecommendationAction" ADD VALUE IF NOT EXISTS 'LIKE';
ALTER TYPE "RecommendationAction" ADD VALUE IF NOT EXISTS 'DISLIKE';
ALTER TYPE "RecommendationAction" ADD VALUE IF NOT EXISTS 'HIDE';
ALTER TYPE "RecommendationAction" ADD VALUE IF NOT EXISTS 'WATCHLIST';

-- AlterTable
ALTER TABLE "RecommendationFeedback" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'RECOMMENDATIONS';
ALTER TABLE "RecommendationFeedback" ADD COLUMN IF NOT EXISTS "engineVersion" INTEGER DEFAULT 3;
ALTER TABLE "RecommendationFeedback" ADD COLUMN IF NOT EXISTS "deterministicScore" INTEGER;
ALTER TABLE "RecommendationFeedback" ADD COLUMN IF NOT EXISTS "aiScore" INTEGER;
ALTER TABLE "RecommendationFeedback" ADD COLUMN IF NOT EXISTS "hybridScore" INTEGER;

-- AlterTable
ALTER TABLE "TvRecommendationFeedback" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'RECOMMENDATIONS';
ALTER TABLE "TvRecommendationFeedback" ADD COLUMN IF NOT EXISTS "engineVersion" INTEGER DEFAULT 1;
ALTER TABLE "TvRecommendationFeedback" ADD COLUMN IF NOT EXISTS "deterministicScore" INTEGER;
ALTER TABLE "TvRecommendationFeedback" ADD COLUMN IF NOT EXISTS "aiScore" INTEGER;
ALTER TABLE "TvRecommendationFeedback" ADD COLUMN IF NOT EXISTS "hybridScore" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RecommendationFeedback_action_idx" ON "RecommendationFeedback"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TvRecommendationFeedback_action_idx" ON "TvRecommendationFeedback"("action");
