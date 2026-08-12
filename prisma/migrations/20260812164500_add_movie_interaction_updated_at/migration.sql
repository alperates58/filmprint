-- AlterTable safely adds updatedAt column to MovieInteraction if not exists
ALTER TABLE "MovieInteraction" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
