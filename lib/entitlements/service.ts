import { db } from "@/lib/db/client";
import { getSystemSettings } from "@/lib/config/service";
import { SubscriptionTier } from "@prisma/client";
import {
  FeatureEntitlement,
  UserEntitlementStatus,
  DailyQuotaCheckResult,
  SubscriptionTierType,
} from "./types";

/**
 * Returns canonical UTC date string "YYYY-MM-DD" for idempotent daily quota windows.
 */
export function getCanonicalUtcUsageDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Calculates next UTC midnight timestamp for reset timers.
 */
export function getNextUtcMidnightIso(): string {
  const now = new Date();
  const nextMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  );
  return nextMidnight.toISOString();
}

/**
 * Fetches entitlement status and active feature grants for a user.
 */
export async function getUserEntitlement(userId: string): Promise<UserEntitlementStatus> {
  const record = await db.userEntitlement.findUnique({
    where: { userId },
  });

  const now = new Date();
  const isPremiumValid =
    record?.tier === SubscriptionTier.PREMIUM &&
    (!record.validUntil || record.validUntil > now);

  const tier: SubscriptionTierType = isPremiumValid ? "PREMIUM" : "FREE";

  const features: Record<FeatureEntitlement, boolean> = {
    AI_DISCOVER: true, // Both have access; Free is quota-bounded, Premium is unlimited
    MOVIE_NIGHT_ADVANCED: isPremiumValid,
    AD_FREE: true, // Ads are globally off; Premium guarantees ad-free permanently
    PROFILE_COMPARE: isPremiumValid,
    ADVANCED_DNA: isPremiumValid,
    TASTE_EVOLUTION: isPremiumValid,
    ADVANCED_FILTERS: isPremiumValid,
    WATCHLIST_INTELLIGENCE: isPremiumValid,
    WEEKLY_DIGEST: isPremiumValid,
    IMPORT_EXPORT: isPremiumValid,
  };

  return {
    tier,
    isPremium: isPremiumValid,
    validUntil: record?.validUntil || null,
    features,
  };
}

/**
 * Checks if a specific feature entitlement is granted to a user.
 */
export async function hasEntitlement(
  userId: string,
  feature: FeatureEntitlement
): Promise<boolean> {
  const status = await getUserEntitlement(userId);
  return status.features[feature] ?? false;
}

/**
 * Atomically checks and consumes a single unit of daily feature quota.
 * Guarantees race-condition safety on concurrent API requests.
 */
export async function checkAndConsumeDailyQuota(
  userId: string,
  featureKey: string = "AI_DISCOVER"
): Promise<DailyQuotaCheckResult> {
  const [entitlement, settings] = await Promise.all([
    getUserEntitlement(userId),
    getSystemSettings(),
  ]);

  const isPremium = entitlement.isPremium;
  const tier: SubscriptionTierType = isPremium ? "PREMIUM" : "FREE";

  const limit = isPremium
    ? (settings as any).premiumAiDiscoverFairUseLimit || 100
    : (settings as any).freeAiDiscoverDailyLimit || 5;

  const usageDate = getCanonicalUtcUsageDate();
  const resetAtUtc = getNextUtcMidnightIso();

  // Atomic database transaction to prevent concurrent race condition bypasses
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.featureUsageDaily.findUnique({
      where: {
        userId_featureKey_usageDate: {
          userId,
          featureKey,
          usageDate,
        },
      },
    });

    const currentCount = existing ? existing.count : 0;

    if (currentCount >= limit) {
      return {
        allowed: false,
        consumed: currentCount,
        remaining: 0,
      };
    }

    // Increment usage
    const updated = await tx.featureUsageDaily.upsert({
      where: {
        userId_featureKey_usageDate: {
          userId,
          featureKey,
          usageDate,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        userId,
        featureKey,
        usageDate,
        count: 1,
      },
    });

    return {
      allowed: true,
      consumed: updated.count,
      remaining: Math.max(0, limit - updated.count),
    };
  });

  return {
    allowed: result.allowed,
    tier,
    limit,
    consumed: result.consumed,
    remaining: result.remaining,
    resetAtUtc,
  };
}

/**
 * Atomically refunds a consumed quota unit (e.g. if the LLM provider fails or times out).
 */
export async function refundDailyQuota(
  userId: string,
  featureKey: string = "AI_DISCOVER"
): Promise<void> {
  const usageDate = getCanonicalUtcUsageDate();

  try {
    await db.featureUsageDaily.updateMany({
      where: {
        userId,
        featureKey,
        usageDate,
        count: { gt: 0 },
      },
      data: {
        count: { decrement: 1 },
      },
    });
  } catch (error) {
    console.error("[refundDailyQuota Error]:", error);
  }
}

/**
 * Gets remaining daily quota without consuming it.
 */
export async function getDailyQuotaStatus(
  userId: string,
  featureKey: string = "AI_DISCOVER"
): Promise<DailyQuotaCheckResult> {
  const [entitlement, settings] = await Promise.all([
    getUserEntitlement(userId),
    getSystemSettings(),
  ]);

  const isPremium = entitlement.isPremium;
  const tier: SubscriptionTierType = isPremium ? "PREMIUM" : "FREE";
  const limit = isPremium
    ? (settings as any).premiumAiDiscoverFairUseLimit || 100
    : (settings as any).freeAiDiscoverDailyLimit || 5;

  const usageDate = getCanonicalUtcUsageDate();
  const resetAtUtc = getNextUtcMidnightIso();

  const usage = await db.featureUsageDaily.findUnique({
    where: {
      userId_featureKey_usageDate: {
        userId,
        featureKey,
        usageDate,
      },
    },
  });

  const consumed = usage ? usage.count : 0;
  const remaining = Math.max(0, limit - consumed);

  return {
    allowed: consumed < limit,
    tier,
    limit,
    consumed,
    remaining,
    resetAtUtc,
  };
}
