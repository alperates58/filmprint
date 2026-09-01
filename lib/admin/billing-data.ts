import { db } from "@/lib/db/client";
import { getMaskedPaytrConfig } from "@/lib/billing/paytr/client";

export interface AdminBillingDashboardData {
  paytr: {
    status: string;
    enabled: boolean;
    billingEnabled: boolean;
    testMode: boolean;
    monthlyPrice: number | null;
    yearlyPrice: number | null;
    currency: string;
    callbackUrl: string;
    lastTestedAt: string | null;
    lastSuccessfulCallback: string | null;
    lastCallbackError: string | null;
    lastProviderError: string | null;
  };
  subscriptions: {
    totalEffectivePremiumUsers: number;
    active: number;
    pastDue: number;
    cancelAtPeriodEnd: number;
    expiredOrCancelled: number;
    activeManualGrants: number;
    activeBillingUsers: number;
  };
  payments: {
    totalSucceeded: number;
    totalFailed: number;
    failedLast24h: number;
    failedLast7d: number;
    revenueByCurrency: Record<string, number>;
  };
  recentPayments: Array<{
    id: string;
    merchantOid: string;
    amount: number;
    currency: string;
    status: string;
    failureCode?: string | null;
    failureMessage?: string | null;
    paidAt: string | null;
    createdAt: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }>;
}

export async function getAdminBillingDashboardData(): Promise<AdminBillingDashboardData> {
  const now = new Date();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. PayTR Config & Status
  const paytrConfig = await getMaskedPaytrConfig().catch(() => ({
    merchantId: null,
    merchantKeyMasked: null,
    merchantSaltMasked: null,
    testMode: true,
    enabled: false,
    billingEnabled: false,
    monthlyPrice: null,
    yearlyPrice: null,
    currency: "TRY",
    gracePeriodDays: 3,
    recurringEnabled: false,
    non3dEnabled: false,
    status: "NOT_CONFIGURED" as const,
    callbackUrl: "https://sineai.com.tr/api/billing/paytr/callback",
    lastTestedAt: null,
    lastSuccessfulCallback: null,
    lastCallbackError: null,
    lastProviderError: null,
  }));

  // 2. Subscription Counts
  const [
    activeSubsCount,
    pastDueSubsCount,
    cancelAtEndCount,
    expiredSubsCount,
    activeManualGrantsCount,
    activeSubUsers,
    activeManualUsers,
  ] = await Promise.all([
    db.subscription.count({ where: { status: "ACTIVE" } }).catch(() => 0),
    db.subscription.count({ where: { status: "PAST_DUE" } }).catch(() => 0),
    db.subscription.count({ where: { status: "CANCEL_AT_PERIOD_END" } }).catch(() => 0),
    db.subscription.count({ where: { status: { in: ["EXPIRED", "CANCELLED"] } } }).catch(() => 0),
    db.userEntitlement.count({
      where: {
        tier: "PREMIUM",
        source: "MANUAL",
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
    }).catch(() => 0),
    db.subscription.findMany({
      where: {
        status: { in: ["ACTIVE", "PAST_DUE", "CANCEL_AT_PERIOD_END"] },
        currentPeriodEnd: { gt: now },
      },
      select: { userId: true },
    }).catch(() => []),
    db.userEntitlement.findMany({
      where: {
        tier: "PREMIUM",
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      select: { userId: true },
    }).catch(() => []),
  ]);

  // Combine unique user IDs with effective Premium entitlement
  const premiumUserSet = new Set<string>();
  for (const s of activeSubUsers) premiumUserSet.add(s.userId);
  for (const m of activeManualUsers) premiumUserSet.add(m.userId);

  // 3. Payment Metrics
  const [
    totalSucceeded,
    totalFailed,
    failedLast24h,
    failedLast7d,
    succeededPayments,
    recentPaymentsRaw,
  ] = await Promise.all([
    db.billingPayment.count({ where: { status: "SUCCEEDED" } }).catch(() => 0),
    db.billingPayment.count({ where: { status: "FAILED" } }).catch(() => 0),
    db.billingPayment.count({ where: { status: "FAILED", createdAt: { gte: last24h } } }).catch(() => 0),
    db.billingPayment.count({ where: { status: "FAILED", createdAt: { gte: last7d } } }).catch(() => 0),
    db.billingPayment.findMany({
      where: { status: "SUCCEEDED" },
      select: { amount: true, currency: true },
    }).catch(() => []),
    db.billingPayment.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }).catch(() => []),
  ]);

  // Revenue strictly grouped by currency (only SUCCEEDED payments)
  const revenueByCurrency: Record<string, number> = {};
  for (const p of succeededPayments) {
    const curr = (p.currency || "TRY").toUpperCase();
    revenueByCurrency[curr] = (revenueByCurrency[curr] || 0) + p.amount;
  }

  const recentPayments = recentPaymentsRaw.map((p) => ({
    id: p.id,
    merchantOid: p.merchantOid,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    failureCode: p.failureCode,
    failureMessage: p.failureMessage,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    user: {
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
    },
  }));

  return {
    paytr: {
      status: paytrConfig.status,
      enabled: paytrConfig.enabled,
      billingEnabled: paytrConfig.billingEnabled,
      testMode: paytrConfig.testMode,
      monthlyPrice: paytrConfig.monthlyPrice,
      yearlyPrice: paytrConfig.yearlyPrice,
      currency: paytrConfig.currency,
      callbackUrl: paytrConfig.callbackUrl,
      lastTestedAt: paytrConfig.lastTestedAt,
      lastSuccessfulCallback: paytrConfig.lastSuccessfulCallback,
      lastCallbackError: paytrConfig.lastCallbackError,
      lastProviderError: paytrConfig.lastProviderError,
    },
    subscriptions: {
      totalEffectivePremiumUsers: premiumUserSet.size,
      active: activeSubsCount,
      pastDue: pastDueSubsCount,
      cancelAtPeriodEnd: cancelAtEndCount,
      expiredOrCancelled: expiredSubsCount,
      activeManualGrants: activeManualGrantsCount,
      activeBillingUsers: activeSubUsers.length,
    },
    payments: {
      totalSucceeded,
      totalFailed,
      failedLast24h,
      failedLast7d,
      revenueByCurrency,
    },
    recentPayments,
  };
}