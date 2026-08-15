-- CreateEnum
CREATE TYPE "TvInteractionStatus" AS ENUM ('WATCHED', 'PARTIALLY_WATCHED', 'NOT_WATCHED', 'UNSURE');

-- CreateTable
CREATE TABLE "TvShow" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "overview" TEXT NOT NULL DEFAULT '',
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "firstAirDate" TEXT,
    "lastAirDate" TEXT,
    "status" TEXT,
    "originalLanguage" TEXT,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "voteAverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "voteCount" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TvShow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TvInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tvShowId" TEXT NOT NULL,
    "status" "TvInteractionStatus" NOT NULL,
    "rating" "RatingStatus",
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TvInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTvTasteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "profileJson" JSONB NOT NULL DEFAULT '{}',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sourceInteractionCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTvTasteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TvRecommendationFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tvShowId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL DEFAULT 0,
    "action" "RecommendationAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TvRecommendationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TvShow_tmdbId_key" ON "TvShow"("tmdbId");

-- CreateIndex
CREATE INDEX "TvShow_tmdbId_idx" ON "TvShow"("tmdbId");

-- CreateIndex
CREATE INDEX "TvShow_popularity_idx" ON "TvShow"("popularity");

-- CreateIndex
CREATE INDEX "TvInteraction_userId_idx" ON "TvInteraction"("userId");

-- CreateIndex
CREATE INDEX "TvInteraction_tvShowId_idx" ON "TvInteraction"("tvShowId");

-- CreateIndex
CREATE UNIQUE INDEX "TvInteraction_userId_tvShowId_key" ON "TvInteraction"("userId", "tvShowId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTvTasteProfile_userId_key" ON "UserTvTasteProfile"("userId");

-- CreateIndex
CREATE INDEX "TvRecommendationFeedback_userId_idx" ON "TvRecommendationFeedback"("userId");

-- CreateIndex
CREATE INDEX "TvRecommendationFeedback_tvShowId_idx" ON "TvRecommendationFeedback"("tvShowId");

-- CreateIndex
CREATE UNIQUE INDEX "TvRecommendationFeedback_userId_tvShowId_key" ON "TvRecommendationFeedback"("userId", "tvShowId");

-- AddForeignKey
ALTER TABLE "TvInteraction" ADD CONSTRAINT "TvInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvInteraction" ADD CONSTRAINT "TvInteraction_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TvShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTvTasteProfile" ADD CONSTRAINT "UserTvTasteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvRecommendationFeedback" ADD CONSTRAINT "TvRecommendationFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvRecommendationFeedback" ADD CONSTRAINT "TvRecommendationFeedback_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TvShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
