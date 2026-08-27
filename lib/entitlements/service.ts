import { db } from "@/lib/db/client";
import { getSystemSettings } from "@/lib/config/service";
import { SubscriptionTier, QuotaReservationStatus } from "@prisma/client";
import {
  FeatureEntitlement,
  UserEntitlementStatus,
  FeatureEntitlementDecision,
  DailyQuotaCheckResult,
  QuotaReservationResult,
  SubscriptionTierType,
  UserEntitlementSummary,
  UserCustomLimits,
  FEATURE_REGISTRY,
} from "./types";

// In-Memory Fallback strictly for offline unit test execution environments
const inMemoryEntitlements = new Map<string, { tier: SubscriptionTierType; validUntil: Date | null; customLimits?: UserCustomLimits }>();
const inMemoryUsage = new Map<string, number>();
const inMemoryReservations = new Map<string, { userId: string; featureKey: string; usageDate: string; status: "RESERVED" | "COMMITTED" | "REFUNDED" }>();

function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test" || Boolean(process.env.VITEST) || Boolean(process.env.JEST_WORKER_ID);
}

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
 * Validates tier, expiry date, custom limits, and feature registry implementation status.
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
        AD_FREE: false,
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

  let record: { tier: SubscriptionTier | string; validUntil: Date | null; customLimits?: any } | null = null;
  try {
    record = await db.userEntitlement.findUnique({
      where: { userId },
    });
  } catch (dbErr) {
    if (isTestEnvironment()) {
      const mem = inMemoryEntitlements.get(userId);
      if (mem) {
        record = {
          tier: mem.tier === "PREMIUM" ? SubscriptionTier.PREMIUM : SubscriptionTier.FREE,
          validUntil: mem.validUntil,
          customLimits: mem.customLimits || {},
        };
      }
    } else {
      console.error("[getUserEntitlement DB Error]: Safe fail-closed to FREE.", dbErr);
    }
  }

  const now = new Date();
  const isPremiumValid =
    record?.tier === SubscriptionTier.PREMIUM &&
    (!record.validUntil || record.validUntil > now);

  const tier: SubscriptionTierType = isPremiumValid ? "PREMIUM" : "FREE";

  const customLimits: UserCustomLimits =
    (record?.customLimits as UserCustomLimits) || {};
  const featureOverrides = customLimits.featureOverrides || {};

  // Build feature map strictly adhering to canonical feature registry status
  const features: Record<FeatureEntitlement, boolean> = {
    // 1. AI_DISCOVER: Active for both Free and Premium
    AI_DISCOVER: featureOverrides.AI_DISCOVER ?? true,

    // 2. MOVIE_NIGHT_ADVANCED: Active for Premium or explicit override
    MOVIE_NIGHT_ADVANCED: featureOverrides.MOVIE_NIGHT_ADVANCED ?? isPremiumValid,

    // 3. AD_FREE: Active for Premium or explicit override (Free is strictly false)
    AD_FREE: featureOverrides.AD_FREE ?? isPremiumValid,

    // 4. COMING_SOON Features: Strictly false regardless of tier
    PROFILE_COMPARE: false,
    ADVANCED_DNA: false,
    TASTE_EVOLUTION: false,
    ADVANCED_FILTERS: false,
    WATCHLIST_INTELLIGENCE: false,
    WEEKLY_DIGEST: false,
    IMPORT_EXPORT: false,
  };

  return {
    tier,
    isPremium: isPremiumValid,
    validUntil: record?.validUntil || null,
    features,
    customLimits,
  };
}

/**
 * Canonical feature entitlement decision engine.
 * Every feature gate in the application must evaluate permissions through this single service.
 * Resolution Order:
 * 1. Feature implementation status (COMING_SOON -> allowed: false, reason: "FEATURE_NOT_AVAILABLE")
 * 2. Subscription tier (PREMIUM vs FREE with expiry validation)
 * 3. Explicit feature override from customLimits
 * 4. Quota check where applicable
 */
export async function evaluateFeatureEntitlement(
  userId: string,
  feature: FeatureEntitlement
): Promise<FeatureEntitlementDecision> {
  const def = FEATURE_REGISTRY[feature];
  const entitlement = await getUserEntitlement(userId);
  const tier = entitlement.tier;

  // 1. Feature Implementation Status Gate
  if (!def || def.status === "COMING_SOON") {
    return {
      feature,
      tier,
      allowed: false,
      reason: "FEATURE_NOT_AVAILABLE",
    };
  }

  // 2. Explicit Feature Override from customLimits
  const override = entitlement.customLimits?.featureOverrides?.[feature];
  if (override === false) {
    return {
      feature,
      tier,
      allowed: false,
      reason: "FEATURE_DISABLED_BY_OVERRIDE",
    };
  }
  if (override === true) {
    if (feature === "AI_DISCOVER") {
      const quotaStatus = await getDailyQuotaStatus(userId, "AI_DISCOVER");
      return {
        feature,
        tier,
        allowed: quotaStatus.allowed,
        remaining: quotaStatus.remaining,
        limit: quotaStatus.limit,
        reason: quotaStatus.allowed ? undefined : (tier === "PREMIUM" ? "PREMIUM_FAIR_USE_LIMIT" : "QUOTA_EXHAUSTED"),
      };
    }
    return {
      feature,
      tier,
      allowed: true,
    };
  }

  // 3. AI_DISCOVER quota evaluation
  if (feature === "AI_DISCOVER") {
    const quotaStatus = await getDailyQuotaStatus(userId, "AI_DISCOVER");
    return {
      feature,
      tier,
      allowed: quotaStatus.allowed,
      remaining: quotaStatus.remaining,
      limit: quotaStatus.limit,
      reason: quotaStatus.allowed ? undefined : (tier === "PREMIUM" ? "PREMIUM_FAIR_USE_LIMIT" : "QUOTA_EXHAUSTED"),
    };
  }

  // 4. Default active features for Premium vs Free
  const isAllowed = entitlement.features[feature] === true;
  return {
    feature,
    tier,
    allowed: isAllowed,
    reason: isAllowed ? undefined : "FEATURE_GATED",
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
 * Resolves effective daily limit for a user taking custom limits and settings into account.
 */
async function resolveEffectiveDailyLimit(userId: string, entitlement: UserEntitlementStatus, featureKey: string): Promise<number> {
  if (featureKey === "AI_DISCOVER" && entitlement.customLimits?.dailyLimits?.AI_DISCOVER) {
    return entitlement.customLimits.dailyLimits.AI_DISCOVER;
  }

  const settings = await getSystemSettings();
  if (entitlement.isPremium) {
    return (settings as any).premiumAiDiscoverFairUseLimit ?? 100;
  }
  return (settings as any).freeAiDiscoverDailyLimit ?? 5;
}

/**
 * Atomically reserves a single unit of daily feature quota at the database level.
 * Generates unique reservationId with state RESERVED.
 * Fail-closed in production if database cannot process reservation.
 */
export async function reserveDailyQuota(
  userId: string,
  featureKey: string = "AI_DISCOVER"
): Promise<QuotaReservationResult> {
  const entitlement = await getUserEntitlement(userId);
  const tier = entitlement.tier;
  const limit = await resolveEffectiveDailyLimit(userId, entitlement, featureKey);
  const usageDate = getCanonicalUtcUsageDate();
  const resetAtUtc = getNextUtcMidnightIso();
  const reservationId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

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

      // 2. Atomic conditional increment: only update if count < limit
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
          reservationId: null,
          consumed: currentCount,
          remaining: 0,
          reason: tier === "PREMIUM" ? "PREMIUM_FAIR_USE_LIMIT" : "QUOTA_EXHAUSTED",
        };
      }

      // 3. Create QuotaReservation record
      await tx.quotaReservation.create({
        data: {
          id: reservationId,
          userId,
          featureKey,
          usageDate,
          status: QuotaReservationStatus.RESERVED,
        },
      });

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
        reservationId,
        consumed: currentCount,
        remaining: Math.max(0, limit - currentCount),
        reason: undefined,
      };
    });

    return {
      allowed: result.allowed,
      reservationId: result.reservationId,
      tier,
      limit,
      consumed: result.consumed,
      remaining: result.remaining,
      resetAtUtc,
      reason: result.reason,
    };
  } catch (err: any) {
    if (isTestEnvironment()) {
      // In-memory fallback strictly for offline test runner
      const key = `${userId}_${featureKey}_${usageDate}`;
      const current = inMemoryUsage.get(key) || 0;
      if (current >= limit) {
        return {
          allowed: false,
          reservationId: null,
          tier,
          limit,
          consumed: current,
          remaining: 0,
          resetAtUtc,
          reason: tier === "PREMIUM" ? "PREMIUM_FAIR_USE_LIMIT" : "QUOTA_EXHAUSTED",
        };
      }
      const next = current + 1;
      inMemoryUsage.set(key, next);
      inMemoryReservations.set(reservationId, {
        userId,
        featureKey,
        usageDate,
        status: "RESERVED",
      });
      return {
        allowed: true,
        reservationId,
        tier,
        limit,
        consumed: next,
        remaining: Math.max(0, limit - next),
        resetAtUtc,
      };
    }

    console.error("[reserveDailyQuota DB Error]: Fail-closed in production.", err);
    throw new Error("QUOTA_SERVICE_UNAVAILABLE");
  }
}

/**
 * Atomically and idempotently commits a quota reservation when a chargeable AI response is successfully returned.
 * Allowed transition: RESERVED -> COMMITTED.
 * Terminal states: COMMITTED (returns true, idempotent), REFUNDED (returns false, forbidden).
 */
export async function commitDailyQuotaReservation(reservationId: string): Promise<boolean> {
  if (!reservationId) return false;

  try {
    // 1. Atomic conditional transition: RESERVED -> COMMITTED
    const updated = await db.quotaReservation.updateMany({
      where: {
        id: reservationId,
        status: QuotaReservationStatus.RESERVED,
      },
      data: {
        status: QuotaReservationStatus.COMMITTED,
      },
    });

    if (updated.count === 1) {
      return true;
    }

    // 2. If updated.count === 0, inspect current state
    const current = await db.quotaReservation.findUnique({
      where: { id: reservationId },
    });

    if (!current) {
      return false; // missing record -> false
    }

    if (current.status === QuotaReservationStatus.COMMITTED) {
      return true; // already committed -> idempotent success
    }

    if (current.status === QuotaReservationStatus.REFUNDED) {
      return false; // terminal state: REFUNDED cannot commit
    }

    return false;
  } catch (err) {
    if (isTestEnvironment()) {
      const mem = inMemoryReservations.get(reservationId);
      if (!mem) return false;
      if (mem.status === "COMMITTED") return true; // idempotent
      if (mem.status === "REFUNDED") return false; // terminal state
      if (mem.status === "RESERVED") {
        mem.status = "COMMITTED";
        return true;
      }
      return false;
    }
    console.error("[commitDailyQuotaReservation Error]:", err);
    return false;
  }
}

/**
 * Atomically and idempotently refunds a quota reservation if provider fails, credentials are missing, or response is non-chargeable.
 * Allowed transition: RESERVED -> REFUNDED.
 * Decrements daily aggregate count by 1 (clamped at 0) exactly once using conditional updateMany inside ONE transaction.
 * Terminal states: REFUNDED (returns true, idempotent), COMMITTED (returns false, forbidden).
 */
export async function refundDailyQuotaReservation(reservationId: string): Promise<boolean> {
  if (!reservationId) return false;

  try {
    return await db.$transaction(async (tx) => {
      // 1. Atomic conditional transition: RESERVED -> REFUNDED
      const updated = await tx.quotaReservation.updateMany({
        where: {
          id: reservationId,
          status: QuotaReservationStatus.RESERVED,
        },
        data: {
          status: QuotaReservationStatus.REFUNDED,
        },
      });

      if (updated.count === 1) {
        // Exactly one concurrent transition won. Decrement aggregate usage count.
        const record = await tx.quotaReservation.findUnique({
          where: { id: reservationId },
        });

        if (record) {
          await tx.featureUsageDaily.updateMany({
            where: {
              userId: record.userId,
              featureKey: record.featureKey,
              usageDate: record.usageDate,
              count: { gt: 0 },
            },
            data: {
              count: { decrement: 1 },
            },
          });
        }
        return true;
      }

      // If updated.count === 0, inspect current state
      const current = await tx.quotaReservation.findUnique({
        where: { id: reservationId },
      });

      if (!current) {
        return false; // missing record -> false, not fake success
      }

      if (current.status === QuotaReservationStatus.REFUNDED) {
        return true; // already refunded -> idempotent true (usage NOT decremented again)
      }

      if (current.status === QuotaReservationStatus.COMMITTED) {
        return false; // terminal state: COMMITTED cannot be refunded
      }

      return false;
    });
  } catch (err) {
    if (isTestEnvironment()) {
      const mem = inMemoryReservations.get(reservationId);
      if (!mem) return false;
      if (mem.status === "REFUNDED") return true; // idempotent
      if (mem.status === "COMMITTED") return false; // terminal state
      if (mem.status === "RESERVED") {
        mem.status = "REFUNDED";
        const key = `${mem.userId}_${mem.featureKey}_${mem.usageDate}`;
        const current = inMemoryUsage.get(key) || 0;
        if (current > 0) {
          inMemoryUsage.set(key, current - 1);
        }
        return true;
      }
      return false;
    }
    console.error("[refundDailyQuotaReservation Error]:", err);
    return false;
  }
}

/**
 * Recovers stale RESERVED quota reservations older than maxAgeMinutes (default: 15 minutes).
 * Performs atomic refund transitions so no quota is leaked if a process crashes mid-request.
 */
export async function recoverStaleQuotaReservations(
  maxAgeMinutes = 15,
  batchSize = 25
): Promise<{ scanned: number; recovered: number }> {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

  try {
    const staleRecords = await db.quotaReservation.findMany({
      where: {
        status: QuotaReservationStatus.RESERVED,
        createdAt: { lt: cutoff },
      },
      select: { id: true },
      take: batchSize,
    });

    let recovered = 0;
    for (const record of staleRecords) {
      const didRefund = await refundDailyQuotaReservation(record.id);
      if (didRefund) recovered++;
    }

    return { scanned: staleRecords.length, recovered };
  } catch (err) {
    if (isTestEnvironment()) {
      let recovered = 0;
      let scanned = 0;
      for (const [id, mem] of inMemoryReservations.entries()) {
        if (mem.status === "RESERVED") {
          scanned++;
          const didRefund = await refundDailyQuotaReservation(id);
          if (didRefund) recovered++;
        }
      }
      return { scanned, recovered };
    }
    console.error("[recoverStaleQuotaReservations Error]:", err);
    return { scanned: 0, recovered: 0 };
  }
}

/**
 * Legacy compatibility alias for checkAndConsumeDailyQuota.
 */
export async function checkAndConsumeDailyQuota(
  userId: string,
  featureKey: string = "AI_DISCOVER"
): Promise<DailyQuotaCheckResult> {
  const reservation = await reserveDailyQuota(userId, featureKey);
  if (reservation.allowed && reservation.reservationId) {
    await commitDailyQuotaReservation(reservation.reservationId);
  }
  return {
    allowed: reservation.allowed,
    tier: reservation.tier,
    limit: reservation.limit,
    consumed: reservation.consumed,
    remaining: reservation.remaining,
    resetAtUtc: reservation.resetAtUtc,
  };
}

/**
 * Legacy compatibility alias for refundDailyQuota.
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
    if (isTestEnvironment()) {
      const key = `${userId}_${featureKey}_${usageDate}`;
      const current = inMemoryUsage.get(key) || 0;
      if (current > 0) inMemoryUsage.set(key, current - 1);
    }
  }
}

/**
 * Gets remaining daily quota without consuming it.
 */
export async function getDailyQuotaStatus(
  userId: string,
  featureKey: string = "AI_DISCOVER"
): Promise<DailyQuotaCheckResult> {
  const entitlement = await getUserEntitlement(userId);
  const tier: SubscriptionTierType = entitlement.tier;
  const limit = await resolveEffectiveDailyLimit(userId, entitlement, featureKey);
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
    if (isTestEnvironment()) {
      const key = `${userId}_${featureKey}_${usageDate}`;
      const memCount = inMemoryUsage.get(key);
      if (memCount !== undefined) {
        usage = { count: memCount };
      }
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
    isAdFree: entitlement.features.AD_FREE === true,
    validUntil: entitlement.validUntil ? entitlement.validUntil.toISOString() : null,
    features: entitlement.features,
    aiDiscoverQuota: quota,
  };
}

/**
 * Admin action: Grants user a subscription tier with optional expiry and custom limits.
 * Throws in production if database write fails.
 */
export async function adminGrantUserEntitlement(
  userId: string,
  tier: SubscriptionTierType = "PREMIUM",
  validUntil?: Date | null,
  customLimits?: UserCustomLimits
) {
  const prismaTier = tier === "PREMIUM" ? SubscriptionTier.PREMIUM : SubscriptionTier.FREE;

  if (isTestEnvironment()) {
    inMemoryEntitlements.set(userId, {
      tier,
      validUntil: validUntil || null,
      customLimits,
    });
  }

  try {
    const record = await db.userEntitlement.upsert({
      where: { userId },
      update: {
        tier: prismaTier,
        source: "MANUAL",
        validUntil: validUntil !== undefined ? validUntil : null,
        customLimits: customLimits !== undefined ? (customLimits as any) : undefined,
      },
      create: {
        userId,
        tier: prismaTier,
        source: "MANUAL",
        validUntil: validUntil !== undefined ? validUntil : null,
        customLimits: customLimits !== undefined ? (customLimits as any) : {},
      },
    });

    return record;
  } catch (err) {
    if (isTestEnvironment()) {
      return {
        id: `mem_${userId}`,
        userId,
        tier: prismaTier,
        source: "MANUAL",
        validUntil: validUntil || null,
        customLimits: customLimits || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    console.error("[adminGrantUserEntitlement Error]:", err);
    throw err;
  }
}

/**
 * Admin action: Revokes user Premium entitlement back to FREE.
 * Throws in production if database write fails.
 */
export async function adminRevokeUserEntitlement(userId: string) {
  if (isTestEnvironment()) {
    inMemoryEntitlements.delete(userId);
  }

  try {
    const record = await db.userEntitlement.upsert({
      where: { userId },
      update: {
        tier: SubscriptionTier.FREE,
        source: "MANUAL",
        validUntil: null,
      },
      create: {
        userId,
        tier: SubscriptionTier.FREE,
        source: "MANUAL",
        validUntil: null,
      },
    });

    return record;
  } catch (err) {
    if (isTestEnvironment()) {
      return {
        id: `mem_${userId}`,
        userId,
        tier: SubscriptionTier.FREE,
        validUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    console.error("[adminRevokeUserEntitlement Error]:", err);
    throw err;
  }
}
