import {
  BillingProvider,
  BillingPlan,
  CheckoutSessionResult,
  WebhookEventResult,
  SubscriptionStatusResult,
} from "../types";
import { getPaytrConfig, computePaytrLifecycle, createPaytrIframeToken } from "./client";
import { db } from "@/lib/db/client";

export class PaytrBillingProvider implements BillingProvider {
  readonly name = "PAYTR";

  async isReady(): Promise<boolean> {
    const config = await getPaytrConfig();
    const lifecycle = computePaytrLifecycle(config);
    return (lifecycle === "ACTIVE" || lifecycle === "TESTED") && config.billingEnabled;
  }

  async createCheckoutSession(userId: string, plan: BillingPlan): Promise<CheckoutSessionResult> {
    const isReady = await this.isReady();
    if (!isReady) {
      throw new Error("BILLING_NOT_READY: PayTR ödeme sağlayıcısı henüz aktif değildir.");
    }

    const config = await getPaytrConfig();
    const isMonthly = plan === "monthly";
    const amount = isMonthly ? config.monthlyPrice : config.yearlyPrice;

    if (!amount || amount <= 0) {
      throw new Error("PRICING_NOT_CONFIGURED: Fiyatlandırma henüz yapılandırılmamıştır.");
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("USER_NOT_FOUND: Kullanıcı bulunamadı.");
    }

    const merchantOid = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const paymentAmountKurus = Math.round(amount * 100);

    // Create pending payment record
    await db.billingPayment.create({
      data: {
        userId,
        provider: "PAYTR",
        merchantOid,
        amount,
        currency: config.currency,
        status: "PENDING",
        metadata: {
          planKey: "SINEAI_PREMIUM",
          interval: isMonthly ? "MONTHLY" : "YEARLY",
        },
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr";
    const tokenRes = await createPaytrIframeToken({
      merchantOid,
      userEmail: user.email || `user_${userId}@sineai.com.tr`,
      userName: user.name || "SINEAI Kullanıcısı",
      userAddress: "Türkiye",
      userPhone: "05555555555",
      paymentAmount: paymentAmountKurus,
      userIp: "127.0.0.1",
      userBasket: [
        {
          name: isMonthly ? "SINEAI Premium (Aylık)" : "SINEAI Premium (Yıllık)",
          price: amount.toFixed(2),
          quantity: 1,
        },
      ],
      okUrl: `${appUrl}/billing/success?oid=${merchantOid}`,
      failUrl: `${appUrl}/billing/failed?oid=${merchantOid}`,
      currency: config.currency === "TRY" ? "TL" : config.currency,
    });

    if (tokenRes.status !== "success" || !tokenRes.iframeUrl) {
      throw new Error(`PAYTR_TOKEN_ERROR: ${tokenRes.reason || "Token alınamadı"}`);
    }

    return {
      checkoutUrl: tokenRes.iframeUrl,
      sessionId: merchantOid,
    };
  }

  async handleWebhook(payload: any): Promise<WebhookEventResult> {
    return { event: "paytr_callback", handled: true };
  }

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatusResult> {
    const sub = await db.subscription.findFirst({
      where: {
        userId,
        provider: "PAYTR",
        status: { in: ["ACTIVE", "CANCEL_AT_PERIOD_END"] },
      },
      orderBy: { currentPeriodEnd: "desc" },
    });

    if (!sub) {
      return { active: false, tier: "FREE", expiresAt: null };
    }

    const now = new Date();
    const isActive = sub.currentPeriodEnd > now;

    return {
      active: isActive,
      tier: isActive ? "PREMIUM" : "FREE",
      expiresAt: sub.currentPeriodEnd,
    };
  }

  async cancelSubscription(userId: string): Promise<boolean> {
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
}