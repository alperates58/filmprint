-- CreateEnum
CREATE TYPE "RecommendationAction" AS ENUM ('WATCH_LATER', 'NOT_INTERESTED', 'ALREADY_WATCHED', 'WATCHED_FROM_RECOMMENDATION');

-- CreateTable
CREATE TABLE "RecommendationFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL DEFAULT 0,
    "action" "RecommendationAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationFeedback_userId_idx" ON "RecommendationFeedback"("userId");

-- CreateIndex
CREATE INDEX "RecommendationFeedback_movieId_idx" ON "RecommendationFeedback"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationFeedback_userId_movieId_key" ON "RecommendationFeedback"("userId", "movieId");

-- AddForeignKey
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
