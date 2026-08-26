-- Production Lock Safety: Fail fast instead of waiting indefinitely behind long-running transactions
SET lock_timeout = '5s';

-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuotaReservationStatus') THEN
        CREATE TYPE "QuotaReservationStatus" AS ENUM ('RESERVED', 'COMMITTED', 'REFUNDED');
    END IF;
END $$;

-- CreateTable QuotaReservation
CREATE TABLE IF NOT EXISTS "QuotaReservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "usageDate" TEXT NOT NULL,
    "status" "QuotaReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotaReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuotaReservation_userId_featureKey_usageDate_idx" ON "QuotaReservation"("userId", "featureKey", "usageDate");
CREATE INDEX IF NOT EXISTS "QuotaReservation_status_idx" ON "QuotaReservation"("status");

-- AddForeignKey (QuotaReservation -> User)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuotaReservation_userId_fkey') THEN
        ALTER TABLE "QuotaReservation" ADD CONSTRAINT "QuotaReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;