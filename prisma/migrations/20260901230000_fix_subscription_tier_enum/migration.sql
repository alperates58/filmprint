-- AlterEnum: Add PREMIUM to SubscriptionTier if not exists
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'PREMIUM';
