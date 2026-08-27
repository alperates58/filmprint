import { db } from "@/lib/db/client";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";
import {
  PaytrConfig,
  MaskedPaytrConfig,
  PaytrProviderLifecycle,
  PaytrIframeTokenRequest,
  PaytrIframeTokenResponse,
  PaytrRecurringChargeRequest,
  PaytrRecurringChargeResponse,
  PaytrRefundRequest,
  PaytrRefundResponse,
} from "./types";
import { generatePaytrIframeToken } from "./crypto";

const PAYTR_API_TOKEN_URL = "https://www.paytr.com/odeme/api/get-token";
const PAYTR_API_RECURRING_URL = "https://www.paytr.com/odeme/api/non3d";
const PAYTR_API_REFUND_URL = "https://www.paytr.com/odeme/api/refund";

/**
 * Resolves full decrypted PayTR config from database.
 * Server-only execution. Never leak raw secrets.
 */
export async function getPaytrConfig(): Promise<PaytrConfig> {
  const [secretRecord, settings] = await Promise.all([
    db.integrationSecret.findUnique({
      where: { provider: "paytr" },
    }).catch(() => null),
    db.systemSetting.findMany({
      where: {
        key: {
          in: [
            "paytr_enabled",
            "admin_billing_enabled",
            "paytr_test_mode",
            "paytr_monthly_price",
            "paytr_yearly_price",
            "paytr_currency",
            "paytr_grace_period_days",
            "paytr_recurring_enabled",
            "paytr_non3d_enabled",
            "paytr_last_tested_at",
            "paytr_last_successful_callback",
            "paytr_last_callback_error",
            "paytr_last_provider_error",
          ],
        },
      },
    }).catch(() => []),
  ]);

  const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

  let merchantId: string | null = null;
  let merchantKey: string | null = null;
  let merchantSalt: string | null = null;

  if (secretRecord && secretRecord.encryptedValue) {
    try {
      const decrypted = decryptSecret(secretRecord.encryptedValue);
      // Format stored: merchant_key:merchant_salt
      const [key, salt] = decrypted.split(":");
      merchantKey = key || null;
      merchantSalt = salt || null;

      const meta = (secretRecord.metadata as Record<string, any>) || {};
      merchantId = meta.merchantId || null;
    } catch (err) {
      console.error("[PaytrClient] Failed to decrypt PayTR secrets:", err);
    }
  }

  // Fallback to environment variables if present
  if (!merchantId && process.env.PAYTR_MERCHANT_ID) {
    merchantId = process.env.PAYTR_MERCHANT_ID;
  }
  if (!merchantKey && process.env.PAYTR_MERCHANT_KEY) {
    merchantKey = process.env.PAYTR_MERCHANT_KEY;
  }
  if (!merchantSalt && process.env.PAYTR_MERCHANT_SALT) {
    merchantSalt = process.env.PAYTR_MERCHANT_SALT;
  }

  const enabled = settingsMap.get("paytr_enabled") === "true";
  const billingEnabled = settingsMap.get("admin_billing_enabled") === "true";
  const testMode = settingsMap.get("paytr_test_mode") !== "false"; // Default testMode: true

  const monthlyStr = settingsMap.get("paytr_monthly_price");
  const rawMonthly = monthlyStr ? parseFloat(monthlyStr) : null;
  const monthlyPrice = rawMonthly !== null && !isNaN(rawMonthly) && rawMonthly > 0 ? rawMonthly : null;

  const yearlyStr = settingsMap.get("paytr_yearly_price");
  const rawYearly = yearlyStr ? parseFloat(yearlyStr) : null;
  const yearlyPrice = rawYearly !== null && !isNaN(rawYearly) && rawYearly > 0 ? rawYearly : null;

  const currency = settingsMap.get("paytr_currency") || "TRY";
  const rawGrace = parseInt(settingsMap.get("paytr_grace_period_days") || "3", 10);
  const gracePeriodDays = isNaN(rawGrace) ? 3 : Math.max(1, Math.min(30, rawGrace));

  const recurringEnabled = settingsMap.get("paytr_recurring_enabled") === "true";
  const non3dEnabled = settingsMap.get("paytr_non3d_enabled") === "true";

  const rawLastTested = settingsMap.get("paytr_last_tested_at");
  const lastTestedAt = rawLastTested ? new Date(rawLastTested) : null;

  const rawLastCallback = settingsMap.get("paytr_last_successful_callback");
  const lastSuccessfulCallback = rawLastCallback ? new Date(rawLastCallback) : null;

  const lastCallbackError = settingsMap.get("paytr_last_callback_error") || null;
  const lastProviderError = settingsMap.get("paytr_last_provider_error") || null;

  return {
    merchantId,
    merchantKey,
    merchantSalt,
    testMode,
    enabled,
    billingEnabled,
    monthlyPrice,
    yearlyPrice,
    currency,
    gracePeriodDays,
    recurringEnabled,
    non3dEnabled,
    lastTestedAt,
    lastSuccessfulCallback,
    lastCallbackError,
    lastProviderError,
  };
}

/**
 * Computes PayTR provider lifecycle state.
 */
export function computePaytrLifecycle(config: PaytrConfig): PaytrProviderLifecycle {
  const hasCredentials = Boolean(config.merchantId && config.merchantKey && config.merchantSalt);

  if (!hasCredentials) {
    return "NOT_CONFIGURED";
  }
  if (!config.enabled) {
    return "DISABLED";
  }
  if (config.lastProviderError) {
    return "ERROR";
  }

  const hasValidPricing = Boolean(
    config.monthlyPrice && config.monthlyPrice > 0 &&
    config.yearlyPrice && config.yearlyPrice > 0
  );

  // ACTIVE state requires credentials + enabled + explicit billingEnabled + valid pricing
  if (config.billingEnabled && hasValidPricing) {
    return "ACTIVE";
  }

  if (config.lastTestedAt) {
    return "TESTED";
  }

  return "CONFIGURED";
}

/**
 * Resolves masked config safe for Admin panel responses.
 */
export async function getMaskedPaytrConfig(callbackOrigin: string = "https://sineai.com.tr"): Promise<MaskedPaytrConfig> {
  const config = await getPaytrConfig();
  const status = computePaytrLifecycle(config);

  return {
    merchantId: config.merchantId,
    merchantKeyMasked: config.merchantKey ? "••••••••" : null,
    merchantSaltMasked: config.merchantSalt ? "••••••••" : null,
    testMode: config.testMode,
    enabled: config.enabled,
    billingEnabled: config.billingEnabled,
    monthlyPrice: config.monthlyPrice,
    yearlyPrice: config.yearlyPrice,
    currency: config.currency,
    gracePeriodDays: config.gracePeriodDays,
    recurringEnabled: config.recurringEnabled,
    non3dEnabled: config.non3dEnabled,
    status,
    callbackUrl: `${callbackOrigin}/api/billing/paytr/callback`,
    lastTestedAt: config.lastTestedAt ? config.lastTestedAt.toISOString() : null,
    lastSuccessfulCallback: config.lastSuccessfulCallback ? config.lastSuccessfulCallback.toISOString() : null,
    lastCallbackError: config.lastCallbackError || null,
    lastProviderError: config.lastProviderError || null,
  };
}

/**
 * Saves PayTR configuration with AES-256-GCM encrypted secrets.
 */
export async function savePaytrConfig(input: {
  merchantId?: string;
  merchantKey?: string;
  merchantSalt?: string;
  testMode?: boolean;
  enabled?: boolean;
  billingEnabled?: boolean;
  monthlyPrice?: number | null;
  yearlyPrice?: number | null;
  currency?: string;
  gracePeriodDays?: number;
  recurringEnabled?: boolean;
  non3dEnabled?: boolean;
}): Promise<void> {
  const current = await getPaytrConfig();

  const newMerchantId = input.merchantId !== undefined ? (input.merchantId.trim() || null) : current.merchantId;
  const newMerchantKey = input.merchantKey !== undefined && input.merchantKey.trim() !== "" ? input.merchantKey.trim() : current.merchantKey;
  const newMerchantSalt = input.merchantSalt !== undefined && input.merchantSalt.trim() !== "" ? input.merchantSalt.trim() : current.merchantSalt;

  if (newMerchantKey && newMerchantSalt) {
    const rawSecret = `${newMerchantKey}:${newMerchantSalt}`;
    const { encryptedValue, lastFour } = encryptSecret(rawSecret);

    await db.integrationSecret.upsert({
      where: { provider: "paytr" },
      update: {
        encryptedValue,
        lastFour,
        metadata: {
          merchantId: newMerchantId,
        },
      },
      create: {
        provider: "paytr",
        encryptedValue,
        lastFour,
        metadata: {
          merchantId: newMerchantId,
        },
      },
    });
  } else if (newMerchantId) {
    // Update merchant ID even if keys unchanged
    const existing = await db.integrationSecret.findUnique({ where: { provider: "paytr" } });
    if (existing) {
      await db.integrationSecret.update({
        where: { provider: "paytr" },
        data: {
          metadata: {
            ...((existing.metadata as Record<string, any>) || {}),
            merchantId: newMerchantId,
          },
        },
      });
    }
  }

  // Update System Settings
  const settingsToUpsert: [string, string][] = [];

  if (typeof input.testMode === "boolean") {
    settingsToUpsert.push(["paytr_test_mode", input.testMode ? "true" : "false"]);
  }
  if (typeof input.enabled === "boolean") {
    settingsToUpsert.push(["paytr_enabled", input.enabled ? "true" : "false"]);
  }
  if (typeof input.billingEnabled === "boolean") {
    settingsToUpsert.push(["admin_billing_enabled", input.billingEnabled ? "true" : "false"]);
  }
  if (input.monthlyPrice !== undefined) {
    if (input.monthlyPrice === null || isNaN(input.monthlyPrice) || input.monthlyPrice <= 0) {
      await db.systemSetting.deleteMany({
        where: { key: { in: ["paytr_monthly_price", "premium_monthly_price"] } },
      }).catch(() => {});
    } else {
      settingsToUpsert.push(["paytr_monthly_price", input.monthlyPrice.toFixed(2)]);
      settingsToUpsert.push(["premium_monthly_price", input.monthlyPrice.toFixed(2)]);
    }
  }
  if (input.yearlyPrice !== undefined) {
    if (input.yearlyPrice === null || isNaN(input.yearlyPrice) || input.yearlyPrice <= 0) {
      await db.systemSetting.deleteMany({
        where: { key: { in: ["paytr_yearly_price", "premium_annual_price"] } },
      }).catch(() => {});
    } else {
      settingsToUpsert.push(["paytr_yearly_price", input.yearlyPrice.toFixed(2)]);
      settingsToUpsert.push(["premium_annual_price", input.yearlyPrice.toFixed(2)]);
    }
  }
  if (input.currency) {
    settingsToUpsert.push(["paytr_currency", input.currency.trim().toUpperCase()]);
    settingsToUpsert.push(["premium_currency", input.currency.trim().toUpperCase()]);
  }
  if (typeof input.gracePeriodDays === "number") {
    settingsToUpsert.push(["paytr_grace_period_days", input.gracePeriodDays.toString()]);
  }
  if (typeof input.recurringEnabled === "boolean") {
    settingsToUpsert.push(["paytr_recurring_enabled", input.recurringEnabled ? "true" : "false"]);
  }
  if (typeof input.non3dEnabled === "boolean") {
    settingsToUpsert.push(["paytr_non3d_enabled", input.non3dEnabled ? "true" : "false"]);
  }

  for (const [key, value] of settingsToUpsert) {
    await db.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

/**
 * Creates PayTR hosted iframe token for user checkout.
 */
export async function createPaytrIframeToken(
  request: PaytrIframeTokenRequest
): Promise<PaytrIframeTokenResponse> {
  const config = await getPaytrConfig();
  const lifecycle = computePaytrLifecycle(config);

  if (lifecycle === "NOT_CONFIGURED" || !config.merchantId || !config.merchantKey || !config.merchantSalt) {
    return {
      status: "failed",
      reason: "BILLING_NOT_CONFIGURED: PayTR kimlik bilgileri henüz girilmemiştir.",
      errorCode: "NOT_CONFIGURED",
    };
  }

  if (lifecycle === "DISABLED") {
    return {
      status: "failed",
      reason: "BILLING_DISABLED: PayTR ödeme sağlayıcısı devre dışı bırakılmıştır.",
      errorCode: "DISABLED",
    };
  }

  const userBasketJson = JSON.stringify(
    request.userBasket.map((item) => [item.name, item.price, item.quantity])
  );
  const userBasketBase64 = Buffer.from(userBasketJson, "utf8").toString("base64");
  const currencyStr = request.currency || config.currency || "TL";
  const testModeNum = (request.testMode ?? config.testMode) ? 1 : 0;

  const paytrToken = generatePaytrIframeToken({
    merchantId: config.merchantId,
    userIp: request.userIp,
    merchantOid: request.merchantOid,
    email: request.userEmail,
    paymentAmount: request.paymentAmount,
    userBasketBase64,
    noInstallment: 1,
    maxInstallment: 0,
    currency: currencyStr,
    testMode: testModeNum,
    merchantSalt: config.merchantSalt,
    merchantKey: config.merchantKey,
  });

  const formData = new URLSearchParams();
  formData.append("merchant_id", config.merchantId);
  formData.append("user_ip", request.userIp);
  formData.append("merchant_oid", request.merchantOid);
  formData.append("email", request.userEmail);
  formData.append("payment_amount", request.paymentAmount.toString());
  formData.append("paytr_token", paytrToken);
  formData.append("user_basket", userBasketBase64);
  formData.append("debug_on", "0");
  formData.append("no_installment", "1");
  formData.append("max_installment", "0");
  formData.append("user_name", request.userName);
  formData.append("user_address", request.userAddress);
  formData.append("user_phone", request.userPhone);
  formData.append("merchant_ok_url", request.okUrl);
  formData.append("merchant_fail_url", request.failUrl);
  formData.append("timeout_limit", "30");
  formData.append("currency", currencyStr);
  formData.append("test_mode", testModeNum.toString());

  if (request.utoken) {
    formData.append("utoken", request.utoken);
  }

  try {
    const res = await fetch(PAYTR_API_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const data = await res.json();
    if (data.status === "success" && data.token) {
      return {
        status: "success",
        token: data.token,
        iframeUrl: `https://www.paytr.com/odeme/guvenli/${data.token}`,
      };
    }

    const failureReason = data.reason || "PayTR token alma başarısız oldu.";
    // Update last provider error
    await db.systemSetting.upsert({
      where: { key: "paytr_last_provider_error" },
      update: { value: failureReason },
      create: { key: "paytr_last_provider_error", value: failureReason },
    });

    return {
      status: "failed",
      reason: failureReason,
      errorCode: data.error_code || "TOKEN_ERROR",
    };
  } catch (err: any) {
    const errMsg = err?.message || "PayTR API bağlantı hatası";
    return {
      status: "failed",
      reason: errMsg,
      errorCode: "NETWORK_ERROR",
    };
  }
}

/**
 * Runs subscription recurring renewal charge against PayTR.
 */
export async function runPaytrRecurringCharge(
  request: PaytrRecurringChargeRequest
): Promise<PaytrRecurringChargeResponse> {
  const config = await getPaytrConfig();
  if (!config.merchantId || !config.merchantKey || !config.merchantSalt || !config.recurringEnabled) {
    return {
      status: "failed",
      merchantOid: request.merchantOid,
      reason: "RECURRING_NOT_ENABLED",
    };
  }

  return {
    status: "failed",
    merchantOid: request.merchantOid,
    reason: "RECURRING_GATEWAY_PENDING_ACTIVATION",
  };
}

/**
 * Runs payment refund against PayTR.
 */
export async function runPaytrRefund(
  request: PaytrRefundRequest
): Promise<PaytrRefundResponse> {
  const config = await getPaytrConfig();
  if (!config.merchantId || !config.merchantKey || !config.merchantSalt) {
    return {
      status: "failed",
      merchantOid: request.merchantOid,
      returnAmount: request.returnAmount,
      reason: "REFUND_NOT_CONFIGURED",
    };
  }

  return {
    status: "failed",
    merchantOid: request.merchantOid,
    returnAmount: request.returnAmount,
    reason: "REFUND_GATEWAY_PENDING_ACTIVATION",
  };
}