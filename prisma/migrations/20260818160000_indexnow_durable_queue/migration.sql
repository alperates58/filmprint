-- CreateEnum
CREATE TYPE "IndexNowStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUBMITTED', 'FAILED');

-- CreateTable
CREATE TABLE "IndexNowSubmission" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "status" "IndexNowStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexNowSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndexNowSubmission_urlHash_key" ON "IndexNowSubmission"("urlHash");

-- CreateIndex
CREATE INDEX "IndexNowSubmission_status_nextAttemptAt_idx" ON "IndexNowSubmission"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "IndexNowSubmission_createdAt_idx" ON "IndexNowSubmission"("createdAt");
