-- CreateTable
CREATE TABLE "RecommendationExplanation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "profileVersion" INTEGER NOT NULL DEFAULT 1,
    "matchVersion" INTEGER NOT NULL DEFAULT 1,
    "headline" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationExplanation_userId_idx" ON "RecommendationExplanation"("userId");

-- CreateIndex
CREATE INDEX "RecommendationExplanation_movieId_idx" ON "RecommendationExplanation"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationExplanation_userId_movieId_profileVersion_mat_key" ON "RecommendationExplanation"("userId", "movieId", "profileVersion", "matchVersion");
