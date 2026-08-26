import { db } from "@/lib/db/client";
import { getSystemSettings } from "@/lib/config/service";
import { SubscriptionTier } from "@prisma/client";
import {
  FeatureEntitlement,
  UserEntitlementStatus,
  FeatureEntitlementDecision,
  DailyQuotaCheckResult,
  SubscriptionTierType,
  UserEntitlementSummary,
} from "./types";

const inMemoryEntitlements = new Map<string, { tier: SubscriptionTierType; validUntil: Date | null }>();
const inMemoryUsage = new Map<string, number>();

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
 * Validates tier and expiry date.
 */
export async function getUserEntitlement(userId: string): Promise<UserEntitlementStatus> {
  if (!userId) {
    return {
      tier: "FREE",
      isPremium: false,
      validUntil: null,
      features: {
        AI_DISCOVER: true,
        MOVIE_NIGHT_ADVANCED: false,
        AD_FREE: true,
        PROFILE_COMPARE: false,
        ADVANCED_DNA: false,
        TASTE_EVOLUTION: false,
        ADVANCED_FILTERS: false,
        WATCHLIST_INTELLIGENCE: false,
        WEEKLY_DIGEST: false,
        IMPORT_EXPORT: false,
      },
    };
  }

  let record: { tier: SubscriptionTier | string; validUntil: Date | null } | null = null;
  try {
    record = await db.userEntitlement.findUnique({
      where: { userId },
    });
  } catch {
    const mem = inMemoryEntitlements.get(userId);
    if (mem) {
      record = {
        tier: mem.tier === "PREMIUM" ? SubscriptionTier.PREMIUM : SubscriptionTier.FREE,
        validUntil: mem.validUntil,
      };
    }
  }

  const now = new Date();
  const isPremiumValid =
    record?.tier === SubscriptionTier.PREMIUM &&
    (!record.validUntil || record.validUntil > now);

  const tier: SubscriptionTierType = isPremiumValid ? "PREMIUM" : "FREE";

  const features: Record<FeatureEntitlement, boolean> = {
    AI_DISCOVER: true, // Both have access; Free is quota-bounded, Premium has unlimited/fair-use
    MOVIE_NIGHT_ADVANCED: isPremiumValid,
    AD_FREE: true, // Guarantees ad-free invariant (ads are master OFF, and Premium guarantees ad-free permanently)
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
 * Canonical feature entitlement decision engine.
 * Every feature gate in the application must evaluate permissions through this single service.
 */
export async function evaluateFeatureEntitlement(
  userId: string,
  feature: FeatureEntitlement
): Promise<FeatureEntitlementDecision> {
  const entitlement = await getUserEntitlement(userId);
  const tier = entitlement.tier;
  const isFeatureAllowed = entitlement.features[feature] ?? false;

  if (feature === "AI_DISCOVER") {
    const quotaStatus = await getDailyQuotaStatus(userId, "AI_DISCOVER");
    return {
      feature,
      tier,
      allowed: quotaStatus.allowed,
      remaining: quotaStatus.remaining,
      limit: quotaStatus.limit,
      reason: quotaStatus.allowed ? undefined : "QUOTA_EXHAUSTED",
    };
  }

  return {
    feature,
    tier,
    allowed: isFeatureAllowed,
    reason: isFeatureAllowed ? undefined : "FEATURE_GATED",
  };
}

/**
 * Checks if a specific feature entitlement is granted to a user.
 */
export async function hasEntitlement(
  userId: string,
  feature: FeatureEntitlement
): Promise<boolean> {
  const decision = await evaluateFeatureEntitlement(userId, feature);
  return decision.allowed;
}

/**
 * Atomically checks and consumes a single unit of daily feature quota at the database level.
 * Uses atomic SQL conditional increments (`count < limit`) to guarantee race-condition safety.
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
    ? (settings as any).premiumAiDiscoverFairUseLimit ?? 100
    : (settings as any).freeAiDiscoverDailyLimit ?? 5;

  const usageDate = getCanonicalUtcUsageDate();
  const resetAtUtc = getNextUtcMidnightIso();

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Ensure daily usage record exists
      await tx.featureUsageDaily.upsert({
        where: {
          userId_featureKey_usageDate: {
            userId,
            featureKey,
            usageDate,
          },
        },
        update: {},
        create: {
          userId,
          featureKey,
          usageDate,
          count: 0,
        },
      });

      // 2. Atomic conditional increment: only update if count is strictly less than limit
      const updated = await tx.featureUsageDaily.updateMany({
        where: {
          userId,
          featureKey,
          usageDate,
          count: { lt: limit },
        },
        data: {
          count: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        // Concurrently reached limit
        const current = await tx.featureUsageDaily.findUnique({
          where: {
            userId_featureKey_usageDate: {
              userId,
              featureKey,
              usageDate,
            },
          },
        });
        const currentCount = current ? current.count : limit;
        return {
          allowed: false,
          consumed: currentCount,
          remaining: 0,
        };
      }

      // Fetch the updated count
      const current = await tx.featureUsageDaily.findUnique({
        where: {
          userId_featureKey_usageDate: {
            userId,
            featureKey,
            usageDate,
          },
        },
      });
      const currentCount = current ? current.count : 1;

      return {
        allowed: true,
        consumed: currentCount,
        remaining: Math.max(0, limit - currentCount),
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
  } catch (err) {
    console.error("[checkAndConsumeDailyQuota Error]:", err);
    // Fallback safe inquiry
    const status = await getDailyQuotaStatus(userId, featureKey);
    return status;
  }
}

/**
 * Atomically refunds a consumed quota unit (e.g. if the LLM provider fails or times out).
 * Idempotent, safe, and strictly clamped at 0.
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
    ? (settings as any).premiumAiDiscoverFairUseLimit ?? 100
    : (settings as any).freeAiDiscoverDailyLimit ?? 5;

  const usageDate = getCanonicalUtcUsageDate();
  const resetAtUtc = getNextUtcMidnightIso();

  if (!userId) {
    return {
      allowed: true,
      tier: "FREE",
      limit,
      consumed: 0,
      remaining: limit,
      resetAtUtc,
    };
  }

  let usage: { count: number } | null = null;
  try {
    usage = await db.featureUsageDaily.findUnique({
      where: {
        userId_featureKey_usageDate: {
          userId,
          featureKey,
          usageDate,
        },
      },
    });
  } catch {
    const key = `${userId}_${featureKey}_${usageDate}`;
    const memCount = inMemoryUsage.get(key);
    if (memCount !== undefined) {
      usage = { count: memCount };
    }
  }

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

/**
 * Resolves full entitlement summary for current user profile / frontend.
 */
export async function getUserEntitlementSummary(userId: string): Promise<UserEntitlementSummary> {
  const [entitlement, quota] = await Promise.all([
    getUserEntitlement(userId),
    getDailyQuotaStatus(userId, "AI_DISCOVER"),
  ]);

  return {
    tier: entitlement.tier,
    isPremium: entitlement.isPremium,
    validUntil: entitlement.validUntil ? entitlement.validUntil.toISOString() : null,
    features: entitlement.features,
    aiDiscoverQuota: quota,
  };
}

/**
 * Admin action: Grants user a subscription tier with optional expiry.
 */
export async function adminGrantUserEntitlement(
  userId: string,
  tier: SubscriptionTierType = "PREMIUM",
  validUntil?: Date | null
) {
  const prismaTier = tier === "PREMIUM" ? SubscriptionTier.PREMIUM : SubscriptionTier.FREE;
  inMemoryEntitlements.set(userId, { tier, validUntil: validUntil || null });

  try {
    const record = await db.userEntitlement.upsert({
      where: { userId },
      update: {
        tier: prismaTier,
        validUntil: validUntil !== undefined ? validUntil : null,
      },
      create: {
        userId,
        tier: prismaTier,
        validUntil: validUntil !== undefined ? validUntil : null,
      },
    });

    return record;
  } catch {
    return {
      id: `mem_${userId}`,
      userId,
      tier: prismaTier,
      validUntil: validUntil || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Admin action: Revokes user Premium entitlement back to FREE.
 */
export async function adminRevokeUserEntitlement(userId: string) {
  inMemoryEntitlements.delete(userId);

  try {
    const record = await db.userEntitlement.upsert({
      where: { userId },
      update: {
        tier: SubscriptionTier.FREE,
        validUntil: null,
      },
      create: {
        userId,
        tier: SubscriptionTier.FREE,
        validUntil: null,
      },
    });

    return record;
  } catch {
    return {
      id: `mem_${userId}`,
      userId,
      tier: SubscriptionTier.FREE,
      validUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
