-- Safe Additive Migration: Add index on QuotaReservation(status, createdAt)
SET lock_timeout = '2s';

CREATE INDEX IF NOT EXISTS "QuotaReservation_status_createdAt_idx" ON "QuotaReservation"("status", "createdAt");
