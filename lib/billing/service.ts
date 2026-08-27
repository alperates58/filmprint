import { db } from "@/lib/db/client";
import { getSystemSettings } from "@/lib/config/service";
import { encryptSecret } from "@/lib/security/crypto";
import {
  BillingProvider,
  EffectiveBillingReadiness,
  BillingPlan,
} from "./types";
import { PaytrBillingProvider } from "./paytr/provider";
import {
  getPaytrConfig,
  computePaytrLifecycle,
  createPaytrIframeToken,
  runPaytrRecurringCharge,
} from "./paytr/client";
import {
  PaytrCallbackPayload,
  BillingIntervalType,
} from "./paytr/types";
import {
  verifyPaytrCallbackHash,
  generatePayloadHash,
} from "./paytr/crypto";
import { SubscriptionStatus, SubscriptionTier, EntitlementSource } from "@prisma/client";

const paytrProvider = new PaytrBillingProvider();

export function getBillingProvider(): BillingProvider {
  return paytrProvider;
}

/**
 * Returns effective billing readiness gate.
 * Requires BOTH admin toggle enabled AND live PayTR provider ready with pricing.
 */
export async function getEffectiveBillingReadiness(): Promise<EffectiveBillingReadiness> {
  const [settings, paytrConfig] = await Promise.all([
    getSystemSettings(),
    getPaytrConfig(),
  ]);

  const providerReady = await paytrProvider.isReady();
  const adminEnabled = Boolean(settings.adminBillingEnabled);
  const isReady = adminEnabled && providerReady;

  return {
    isReady,
    adminEnabled,
    providerReady,
    providerName: paytrProvider.name,
    pricing: {
      monthlyPrice: paytrConfig.monthlyPrice,
      yearlyPrice: paytrConfig.yearlyPrice,
      currency: paytrConfig.currency,
    },
  };
}

export interface CreateCheckoutInput {
  userId: string;
  interval: BillingIntervalType;
  userIp?: string;
}

export interface CheckoutResult {
  merchantOid: string;
  checkoutUrl?: string;
  token?: string;
  status: "success" | "failed";
  reason?: string;
}

/**
 * Initiates authenticated user checkout.
 * Enforces server-side pricing, generates pending payment record and PayTR iframe token.
 */
export async function createBillingCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
  const readiness = await getEffectiveBillingReadiness();
  if (!readiness.isReady) {
    throw new Error("BILLING_NOT_READY: Ödeme sağlayıcısı henüz hazır veya aktif değildir.");
  }

  const config = await getPaytrConfig();
  const isMonthly = input.interval === "MONTHLY";
  const amount = isMonthly ? config.monthlyPrice : config.yearlyPrice;

  if (!amount || amount <= 0) {
    throw new Error("PRICING_NOT_CONFIGURED: Fiyatlandırma yapılandırılmamıştır.");
  }

  const user = await db.user.findUnique({
    where: { id: input.userId },
    include: { billingCustomer: true },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND: Kullanıcı bulunamadı.");
  }

  const merchantOid = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const paymentAmountKurus = Math.round(amount * 100);

  // 1. Create Pending Payment Record
  await db.billingPayment.create({
    data: {
      userId: input.userId,
      provider: "PAYTR",
      merchantOid,
      amount,
      currency: config.currency,
      status: "PENDING",
      metadata: {
        planKey: "SINEAI_PREMIUM",
        interval: input.interval,
      },
    },
  });

  // 2. Request PayTR Hosted Iframe Token
  const tokenRes = await createPaytrIframeToken({
    merchantOid,
    userEmail: user.email || `user_${user.id}@sineai.com.tr`,
    userName: user.name || "SINEAI Kullanıcısı",
    userAddress: "Türkiye",
    userPhone: "05555555555",
    paymentAmount: paymentAmountKurus,
    userIp: input.userIp || "127.0.0.1",
    userBasket: [
      {
        name: isMonthly ? "SINEAI Premium (Aylık)" : "SINEAI Premium (Yıllık)",
        price: amount.toFixed(2),
        quantity: 1,
      },
    ],
    okUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr"}/billing/success?oid=${merchantOid}`,
    failUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr"}/billing/failed?oid=${merchantOid}`,
    currency: config.currency === "TRY" ? "TL" : config.currency,
    testMode: config.testMode,
  });

  if (tokenRes.status !== "success" || !tokenRes.iframeUrl) {
    return {
      merchantOid,
      status: "failed",
      reason: tokenRes.reason || "PayTR token oluşturulamadı.",
    };
  }

  return {
    merchantOid,
    checkoutUrl: tokenRes.iframeUrl,
    token: tokenRes.token,
    status: "success",
  };
}

export interface CallbackProcessResult {
  success: boolean;
  message: string;
  output: "OK" | "FAIL";
}

/**
 * Handles incoming PayTR server-to-server webhook callback.
 * Guaranteed idempotent, atomic, timing-safe, and isolates manual admin grants from billing revocations.
 */
export async function handlePaytrCallback(payload: PaytrCallbackPayload): Promise<CallbackProcessResult> {
  const config = await getPaytrConfig();

  if (!config.merchantKey || !config.merchantSalt) {
    console.error("[PayTR Callback Error]: PayTR credentials missing in DB.");
    return { success: false, message: "CREDENTIALS_NOT_CONFIGURED", output: "FAIL" };
  }

  // 1. Timing-Safe HMAC-SHA256 Hash Verification
  const isHashValid = verifyPaytrCallbackHash({
    merchantOid: payload.merchant_oid,
    merchantSalt: config.merchantSalt,
    status: payload.status,
    totalAmount: payload.total_amount,
    merchantKey: config.merchantKey,
    incomingHash: payload.hash,
  });

  if (!isHashValid) {
    console.error(`[PayTR Callback Error]: Invalid hash for merchant_oid: ${payload.merchant_oid}`);
    await db.systemSetting.upsert({
      where: { key: "paytr_last_callback_error" },
      update: { value: `Invalid hash on ${payload.merchant_oid}` },
      create: { key: "paytr_last_callback_error", value: `Invalid hash on ${payload.merchant_oid}` },
    }).catch(() => {});

    return { success: false, message: "INVALID_HASH", output: "FAIL" };
  }

  const payloadHash = generatePayloadHash(payload.merchant_oid, payload.total_amount, payload.status);

  // 2. Database-Level Idempotency Check
  const existingEvent = await db.billingWebhookEvent.findUnique({
    where: {
      provider_merchantOid_payloadHash: {
        provider: "PAYTR",
        merchantOid: payload.merchant_oid,
        payloadHash,
      },
    },
  });

  if (existingEvent && existingEvent.status === "PROCESSED") {
    // Already processed successfully, return canonical OK without mutation
    return { success: true, message: "ALREADY_PROCESSED", output: "OK" };
  }

  // 3. Atomic Database Transaction
  try {
    await db.$transaction(async (tx) => {
      // A. Upsert Webhook Event
      await tx.billingWebhookEvent.upsert({
        where: {
          provider_merchantOid_payloadHash: {
            provider: "PAYTR",
            merchantOid: payload.merchant_oid,
            payloadHash,
          },
        },
        update: {
          status: "PROCESSING",
        },
        create: {
          provider: "PAYTR",
          merchantOid: payload.merchant_oid,
          payloadHash,
          status: "PROCESSING",
        },
      });

      // B. Find Payment Record
      const payment = await tx.billingPayment.findUnique({
        where: { merchantOid: payload.merchant_oid },
      });

      if (!payment) {
        throw new Error(`PAYMENT_NOT_FOUND: ${payload.merchant_oid}`);
      }

      if (payload.status === "success") {
        const meta = (payment.metadata as Record<string, any>) || {};
        const interval: BillingIntervalType = meta.interval === "YEARLY" ? "YEARLY" : "MONTHLY";

        const now = new Date();
        const periodStart = now;
        const periodEnd = new Date(now);
        if (interval === "YEARLY") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setDate(periodEnd.getDate() + 30);
        }

        // C. Update Payment Status to SUCCEEDED
        await tx.billingPayment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCEEDED",
            paidAt: now,
            providerTransactionId: payload.payment_type || "paytr_card",
          },
        });

        // D. Ensure Exactly One Active Subscription Per User (Atomic Upsert / Update)
        const existingSub = await tx.subscription.findFirst({
          where: {
            userId: payment.userId,
            provider: "PAYTR",
            status: { in: ["ACTIVE", "CANCEL_AT_PERIOD_END", "PENDING", "PAST_DUE"] },
          },
          orderBy: { createdAt: "desc" },
        });

        let subscriptionId: string;

        if (existingSub) {
          const updatedSub = await tx.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: "ACTIVE",
              planKey: "SINEAI_PREMIUM",
              billingInterval: interval,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
              cancelledAt: null,
              endedAt: null,
              gracePeriodEnd: null,
            },
          });
          subscriptionId = updatedSub.id;
        } else {
          const newSub = await tx.subscription.create({
            data: {
              userId: payment.userId,
              provider: "PAYTR",
              planKey: "SINEAI_PREMIUM",
              billingInterval: interval,
              status: "ACTIVE",
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
            },
          });
          subscriptionId = newSub.id;
        }

        // Link payment to subscription
        await tx.billingPayment.update({
          where: { id: payment.id },
          data: { subscriptionId },
        });

        // E. Encrypted Utoken Storage (Card token)
        if (payload.utoken) {
          const { encryptedValue } = encryptSecret(payload.utoken);
          await tx.billingCustomer.upsert({
            where: { userId: payment.userId },
            update: {
              encryptedUtoken: encryptedValue,
              provider: "PAYTR",
            },
            create: {
              userId: payment.userId,
              encryptedUtoken: encryptedValue,
              provider: "PAYTR",
            },
          });
        }

        // F. Entitlement Source Isolation
        const existingEntitlement = await tx.userEntitlement.findUnique({
          where: { userId: payment.userId },
        });

        const isManualWithFartherEnd =
          existingEntitlement?.source === EntitlementSource.MANUAL &&
          existingEntitlement?.validUntil &&
          existingEntitlement.validUntil > periodEnd;

        if (!isManualWithFartherEnd) {
          await tx.userEntitlement.upsert({
            where: { userId: payment.userId },
            update: {
              tier: SubscriptionTier.PREMIUM,
              source: EntitlementSource.BILLING,
              validUntil: periodEnd,
            },
            create: {
              userId: payment.userId,
              tier: SubscriptionTier.PREMIUM,
              source: EntitlementSource.BILLING,
              validUntil: periodEnd,
            },
          });
        }

        // G. Mark Webhook Event Processed
        await tx.billingWebhookEvent.update({
          where: {
            provider_merchantOid_payloadHash: {
              provider: "PAYTR",
              merchantOid: payload.merchant_oid,
              payloadHash,
            },
          },
          data: {
            status: "PROCESSED",
            processedAt: now,
          },
        });
      } else {
        // Failed Payment Handling
        await tx.billingPayment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            failureCode: payload.failed_reason_code || "PAYMENT_FAILED",
            failureMessage: payload.failed_reason_msg || "Ödeme işlemi başarısız oldu.",
          },
        });

        if (payment.subscriptionId) {
          const graceDays = config.gracePeriodDays || 3;
          const graceEnd = new Date();
          graceEnd.setDate(graceEnd.getDate() + graceDays);

          await tx.subscription.update({
            where: { id: payment.subscriptionId },
            data: {
              status: "PAST_DUE",
              gracePeriodEnd: graceEnd,
            },
          });
        }

        await tx.billingWebhookEvent.update({
          where: {
            provider_merchantOid_payloadHash: {
              provider: "PAYTR",
              merchantOid: payload.merchant_oid,
              payloadHash,
            },
          },
          data: {
            status: "FAILED",
            processedAt: new Date(),
            error: payload.failed_reason_msg || "Payment failed",
          },
        });
      }
    });

    if (payload.status === "success") {
      await db.systemSetting.upsert({
        where: { key: "paytr_last_successful_callback" },
        update: { value: new Date().toISOString() },
        create: { key: "paytr_last_successful_callback", value: new Date().toISOString() },
      }).catch(() => {});
    }

    return { success: true, message: "PROCESSED", output: "OK" };
  } catch (err: any) {
    console.error("[PayTR Callback Transaction Error]:", err);
    return { success: false, message: err?.message || "TRANSACTION_ERROR", output: "FAIL" };
  }
}

/**
 * User cancellation: marks subscription to cancel at period end.
 * Preserves Premium entitlement until currentPeriodEnd.
 */
export async function cancelSubscriptionAtPeriodEnd(userId: string): Promise<boolean> {
  const sub = await db.subscription.findFirst({
    where: {
      userId,
      provider: "PAYTR",
      status: "ACTIVE",
    },
    orderBy: { currentPeriodEnd: "desc" },
  });

  if (!sub) return false;

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      cancelAtPeriodEnd: true,
      status: "CANCEL_AT_PERIOD_END",
      cancelledAt: new Date(),
    },
  });

  return true;
}

/**
 * Retrieves comprehensive billing details for user account page.
 */
export async function getUserBillingDetails(userId: string) {
  const [sub, payments, entitlement, customer] = await Promise.all([
    db.subscription.findFirst({
      where: { userId, provider: "PAYTR" },
      orderBy: { createdAt: "desc" },
    }),
    db.billingPayment.findMany({
      where: { userId, provider: "PAYTR" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        merchantOid: true,
        amount: true,
        currency: true,
        status: true,
        paidAt: true,
        createdAt: true,
      },
    }),
    db.userEntitlement.findUnique({
      where: { userId },
    }),
    db.billingCustomer.findUnique({
      where: { userId },
    }),
  ]);

  const readiness = await getEffectiveBillingReadiness();

  return {
    billingReadiness: readiness,
    subscription: sub
      ? {
          id: sub.id,
          planKey: sub.planKey,
          interval: sub.billingInterval,
          status: sub.status,
          currentPeriodStart: sub.currentPeriodStart.toISOString(),
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          gracePeriodEnd: sub.gracePeriodEnd ? sub.gracePeriodEnd.toISOString() : null,
        }
      : null,
    hasSavedCard: Boolean(customer?.encryptedUtoken),
    entitlementSource: entitlement?.source || "MANUAL",
    payments: payments.map((p) => ({
      id: p.id,
      merchantOid: p.merchantOid,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

/**
 * Runs subscription recurring renewal with strict same-period duplicate protection.
 */
export async function runSubscriptionRenewal(subscriptionId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { user: { include: { billingCustomer: true } } },
  });

  if (!sub || sub.status !== "ACTIVE" || !sub.user?.billingCustomer?.encryptedUtoken) {
    return false;
  }

  const periodKey = sub.currentPeriodEnd.toISOString().slice(0, 10);
  const renewalKey = `renewal_${sub.id}_${periodKey}`;

  // Check if renewal for this period was already initiated
  const existingRenewal = await db.billingPayment.findFirst({
    where: { renewalKey },
  });

  if (existingRenewal) {
    return false; // Prevent same-period duplicate charge
  }

  const config = await getPaytrConfig();
  const isMonthly = sub.billingInterval === "MONTHLY";
  const amount = isMonthly ? config.monthlyPrice : config.yearlyPrice;

  if (!amount || amount <= 0) return false;

  const merchantOid = `rn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Create pending renewal payment
  await db.billingPayment.create({
    data: {
      userId: sub.userId,
      subscriptionId: sub.id,
      provider: "PAYTR",
      merchantOid,
      amount,
      currency: config.currency,
      status: "PENDING",
      renewalKey,
      metadata: {
        renewalPeriod: periodKey,
        interval: sub.billingInterval,
      },
    },
  });

  const res = await runPaytrRecurringCharge({
    merchantOid,
    userEmail: sub.user.email || `user_${sub.userId}@sineai.com.tr`,
    paymentAmount: Math.round(amount * 100),
    userIp: "127.0.0.1",
    utoken: sub.user.billingCustomer.encryptedUtoken,
  });

  return res.status === "success";
}