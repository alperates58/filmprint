-- CreateTable
CREATE TABLE "TvRecommendationExplanation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tvShowId" TEXT NOT NULL,
    "profileVersion" INTEGER NOT NULL DEFAULT 1,
    "matchVersion" INTEGER NOT NULL DEFAULT 1,
    "headline" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TvRecommendationExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TvRecommendationExplanation_userId_idx" ON "TvRecommendationExplanation"("userId");

-- CreateIndex
CREATE INDEX "TvRecommendationExplanation_tvShowId_idx" ON "TvRecommendationExplanation"("tvShowId");

-- CreateIndex
CREATE UNIQUE INDEX "TvRecommendationExplanation_userId_tvShowId_profileVersion_matchVersion_key" ON "TvRecommendationExplanation"("userId", "tvShowId", "profileVersion", "matchVersion");

-- AddForeignKey
ALTER TABLE "TvRecommendationExplanation" ADD CONSTRAINT "TvRecommendationExplanation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvRecommendationExplanation" ADD CONSTRAINT "TvRecommendationExplanation_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TvShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
