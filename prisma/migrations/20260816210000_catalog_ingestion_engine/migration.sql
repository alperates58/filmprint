-- CreateEnum
CREATE TYPE "CatalogIngestionMode" AS ENUM ('INITIAL_FILL', 'MAINTENANCE', 'PAUSED');

-- CreateEnum
CREATE TYPE "CatalogCandidateStatus" AS ENUM ('IMPORTED', 'REJECTED', 'NOT_FOUND', 'ADULT', 'UNSAFE', 'NO_USABLE_TITLE', 'NO_OVERVIEW', 'FAILED_RETRYABLE');

-- CreateTable
CREATE TABLE "CatalogIngestionState" (
    "id" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" "CatalogIngestionMode" NOT NULL DEFAULT 'PAUSED',
    "sourceDate" TEXT,
    "sourceCursor" INTEGER NOT NULL DEFAULT 0,
    "targetDailyItems" INTEGER NOT NULL DEFAULT 10000,
    "requestsPerSecond" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "concurrency" INTEGER NOT NULL DEFAULT 2,
    "initialTarget" INTEGER NOT NULL DEFAULT 100000,
    "processedToday" INTEGER NOT NULL DEFAULT 0,
    "insertedToday" INTEGER NOT NULL DEFAULT 0,
    "updatedToday" INTEGER NOT NULL DEFAULT 0,
    "rejectedToday" INTEGER NOT NULL DEFAULT 0,
    "rateLimitedToday" INTEGER NOT NULL DEFAULT 0,
    "failedToday" INTEGER NOT NULL DEFAULT 0,
    "lastCounterResetDate" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "circuitOpenUntil" TIMESTAMP(3),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogIngestionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogCandidateState" (
    "id" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "status" "CatalogCandidateStatus" NOT NULL,
    "reason" TEXT,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "retryAfter" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogCandidateState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogIngestionState_mediaType_key" ON "CatalogIngestionState"("mediaType");

-- CreateIndex
CREATE INDEX "CatalogIngestionState_mediaType_idx" ON "CatalogIngestionState"("mediaType");

-- CreateIndex
CREATE INDEX "CatalogCandidateState_mediaType_status_idx" ON "CatalogCandidateState"("mediaType", "status");

-- CreateIndex
CREATE INDEX "CatalogCandidateState_retryAfter_idx" ON "CatalogCandidateState"("retryAfter");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogCandidateState_mediaType_tmdbId_key" ON "CatalogCandidateState"("mediaType", "tmdbId");
