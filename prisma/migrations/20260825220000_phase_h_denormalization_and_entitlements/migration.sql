-- Production Lock Safety: Fail fast instead of waiting indefinitely behind long-running transactions
SET lock_timeout = '5s';

-- Enable pg_trgm extension for full-text and trigram indexing
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "ContentSafetyLevel" AS ENUM ('SAFE', 'MATURE', 'SEXUAL_CONTENT', 'EROTIC', 'ADULT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GenrePreferenceLevel" AS ENUM ('PREFER', 'NEUTRAL', 'AVOID', 'EXCLUDE');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PLUS', 'PRO');

-- CreateEnum
CREATE TYPE "BackfillJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED');

-- AlterTable Movie: Add Phase H physical denormalized columns with non-destructive defaults
-- Note: On PostgreSQL 11+, adding columns with constant defaults performs catalog metadata update only without table rewrite.
ALTER TABLE "Movie" 
    ADD COLUMN IF NOT EXISTS "voteCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "genreIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    ADD COLUMN IF NOT EXISTS "adult" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "contentRating" TEXT,
    ADD COLUMN IF NOT EXISTS "normalizedMinimumAge" INTEGER,
    ADD COLUMN IF NOT EXISTS "safetyLevel" "ContentSafetyLevel" NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN IF NOT EXISTS "calibrationPriorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "searchNormalizedTitle" TEXT NOT NULL DEFAULT '';

-- AlterTable TvShow: Add Phase H physical denormalized columns with non-destructive defaults
ALTER TABLE "TvShow" 
    ADD COLUMN IF NOT EXISTS "firstAirYear" INTEGER,
    ADD COLUMN IF NOT EXISTS "genreIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    ADD COLUMN IF NOT EXISTS "adult" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "contentRating" TEXT,
    ADD COLUMN IF NOT EXISTS "normalizedMinimumAge" INTEGER,
    ADD COLUMN IF NOT EXISTS "safetyLevel" "ContentSafetyLevel" NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN IF NOT EXISTS "calibrationPriorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "searchNormalizedTitle" TEXT NOT NULL DEFAULT '';

-- CreateTable UserGenrePreference
CREATE TABLE IF NOT EXISTS "UserGenrePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL DEFAULT 'FILM',
    "genreId" INTEGER NOT NULL,
    "preference" "GenrePreferenceLevel" NOT NULL DEFAULT 'NEUTRAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGenrePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable UserEntitlement
CREATE TABLE IF NOT EXISTS "UserEntitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "validUntil" TIMESTAMP(3),
    "customLimits" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable FeatureUsageDaily
CREATE TABLE IF NOT EXISTS "FeatureUsageDaily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "usageDate" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureUsageDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable CatalogBackfillJob
CREATE TABLE IF NOT EXISTS "CatalogBackfillJob" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "status" "BackfillJobStatus" NOT NULL DEFAULT 'PENDING',
    "lastCursor" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "safeCount" INTEGER NOT NULL DEFAULT 0,
    "matureCount" INTEGER NOT NULL DEFAULT 0,
    "blockedCount" INTEGER NOT NULL DEFAULT 0,
    "unknownCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogBackfillJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on new small tables (Zero large-table index creation here)
CREATE UNIQUE INDEX IF NOT EXISTS "UserGenrePreference_userId_mediaType_genreId_key" ON "UserGenrePreference"("userId", "mediaType", "genreId");
CREATE INDEX IF NOT EXISTS "UserGenrePreference_userId_mediaType_idx" ON "UserGenrePreference"("userId", "mediaType");

CREATE UNIQUE INDEX IF NOT EXISTS "UserEntitlement_userId_key" ON "UserEntitlement"("userId");
CREATE INDEX IF NOT EXISTS "UserEntitlement_tier_idx" ON "UserEntitlement"("tier");

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureUsageDaily_userId_featureKey_usageDate_key" ON "FeatureUsageDaily"("userId", "featureKey", "usageDate");
CREATE INDEX IF NOT EXISTS "FeatureUsageDaily_userId_usageDate_idx" ON "FeatureUsageDaily"("userId", "usageDate");

CREATE UNIQUE INDEX IF NOT EXISTS "CatalogBackfillJob_jobType_mediaType_key" ON "CatalogBackfillJob"("jobType", "mediaType");
CREATE INDEX IF NOT EXISTS "CatalogBackfillJob_status_idx" ON "CatalogBackfillJob"("status");

-- AddForeignKey (UserGenrePreference -> User)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserGenrePreference_userId_fkey') THEN
        ALTER TABLE "UserGenrePreference" ADD CONSTRAINT "UserGenrePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (UserEntitlement -> User)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserEntitlement_userId_fkey') THEN
        ALTER TABLE "UserEntitlement" ADD CONSTRAINT "UserEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (FeatureUsageDaily -> User)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeatureUsageDaily_userId_fkey') THEN
        ALTER TABLE "FeatureUsageDaily" ADD CONSTRAINT "FeatureUsageDaily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
