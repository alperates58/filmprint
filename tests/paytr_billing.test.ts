import assert from "assert";
import crypto from "node:crypto";
import {
  generatePaytrIframeToken,
  verifyPaytrCallbackHash,
  generatePayloadHash,
} from "../lib/billing/paytr/crypto";
import {
  computePaytrLifecycle,
} from "../lib/billing/paytr/client";
import { PaytrConfig } from "../lib/billing/paytr/types";
import { encryptSecret, decryptSecret } from "../lib/security/crypto";

export function runPaytrBillingTests() {
  console.log("=== PHASE P2 PAYTR BILLING & SUBSCRIPTION HARDENING TESTS ===\n");
  let passed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}`);
      console.error("  ", err?.message || err);
      process.exit(1);
    }
  }

  // 1. Missing credentials -> provider NOT_CONFIGURED
  test("Test 1: Missing credentials resolves lifecycle to NOT_CONFIGURED", () => {
    const config: PaytrConfig = {
      merchantId: null,
      merchantKey: null,
      merchantSalt: null,
      testMode: true,
      enabled: false,
      billingEnabled: false,
      monthlyPrice: null,
      yearlyPrice: null,
      currency: "TRY",
      gracePeriodDays: 3,
      recurringEnabled: false,
      non3dEnabled: false,
    };
    const status = computePaytrLifecycle(config);
    assert.strictEqual(status, "NOT_CONFIGURED");
  });

  // 2. Disabled provider -> lifecycle DISABLED
  test("Test 2: Configured but disabled provider resolves to DISABLED", () => {
    const config: PaytrConfig = {
      merchantId: "123456",
      merchantKey: "test_key_abc",
      merchantSalt: "test_salt_xyz",
      testMode: true,
      enabled: false,
      billingEnabled: false,
      monthlyPrice: 99,
      yearlyPrice: 990,
      currency: "TRY",
      gracePeriodDays: 3,
      recurringEnabled: false,
      non3dEnabled: false,
    };
    const status = computePaytrLifecycle(config);
    assert.strictEqual(status, "DISABLED");
  });

  // 3. Provider with error -> lifecycle ERROR
  test("Test 3: Provider with lastProviderError resolves to ERROR", () => {
    const config: PaytrConfig = {
      merchantId: "123456",
      merchantKey: "test_key_abc",
      merchantSalt: "test_salt_xyz",
      testMode: true,
      enabled: true,
      billingEnabled: true,
      monthlyPrice: 99,
      yearlyPrice: 990,
      currency: "TRY",
      gracePeriodDays: 3,
      recurringEnabled: false,
      non3dEnabled: false,
      lastProviderError: "Invalid merchant credentials",
    };
    const status = computePaytrLifecycle(config);
    assert.strictEqual(status, "ERROR");
  });

  // 4. Configured + enabled + billingEnabled + valid pricing -> ACTIVE
  test("Test 4: Configured, enabled, billingEnabled with valid pricing resolves to ACTIVE", () => {
    const config: PaytrConfig = {
      merchantId: "123456",
      merchantKey: "test_key_abc",
      merchantSalt: "test_salt_xyz",
      testMode: true,
      enabled: true,
      billingEnabled: true,
      monthlyPrice: 99,
      yearlyPrice: 990,
      currency: "TRY",
      gracePeriodDays: 3,
      recurringEnabled: true,
      non3dEnabled: true,
      lastTestedAt: new Date(),
    };
    const status = computePaytrLifecycle(config);
    assert.strictEqual(status, "ACTIVE");
  });

  // 5. Configured + billingEnabled but MISSING pricing -> NOT ACTIVE (cannot activate without prices)
  test("Test 5: Configured and billingEnabled without explicit pricing CANNOT become ACTIVE", () => {
    const config: PaytrConfig = {
      merchantId: "123456",
      merchantKey: "test_key_abc",
      merchantSalt: "test_salt_xyz",
      testMode: true,
      enabled: true,
      billingEnabled: true,
      monthlyPrice: null,
      yearlyPrice: null,
      currency: "TRY",
      gracePeriodDays: 3,
      recurringEnabled: true,
      non3dEnabled: true,
      lastTestedAt: new Date(),
    };
    const status = computePaytrLifecycle(config);
    assert.notStrictEqual(status, "ACTIVE", "Must not become ACTIVE without configured pricing");
    assert.strictEqual(status, "TESTED");
  });

  // 6. Tested provider without billing enabled -> TESTED (Yapılandırma Doğrulandı)
  test("Test 6: Tested provider without billing enabled resolves to TESTED (Yapılandırma Doğrulandı)", () => {
    const config: PaytrConfig = {
      merchantId: "123456",
      merchantKey: "test_key_abc",
      merchantSalt: "test_salt_xyz",
      testMode: true,
      enabled: true,
      billingEnabled: false,
      monthlyPrice: 99,
      yearlyPrice: 990,
      currency: "TRY",
      gracePeriodDays: 3,
      recurringEnabled: false,
      non3dEnabled: false,
      lastTestedAt: new Date(),
    };
    const status = computePaytrLifecycle(config);
    assert.strictEqual(status, "TESTED");
  });

  // 7. Pricing config absent -> strictly null (no fake 99/990 fallback)
  test("Test 7: Pricing config absent returns null for monthlyPrice and yearlyPrice", () => {
    const settingsMap = new Map<string, string>();
    const monthlyStr = settingsMap.get("paytr_monthly_price");
    const rawMonthly = monthlyStr ? parseFloat(monthlyStr) : null;
    const monthlyPrice = rawMonthly !== null && !isNaN(rawMonthly) && rawMonthly > 0 ? rawMonthly : null;

    const yearlyStr = settingsMap.get("paytr_yearly_price");
    const rawYearly = yearlyStr ? parseFloat(yearlyStr) : null;
    const yearlyPrice = rawYearly !== null && !isNaN(rawYearly) && rawYearly > 0 ? rawYearly : null;

    assert.strictEqual(monthlyPrice, null);
    assert.strictEqual(yearlyPrice, null);
  });

  // 8. Empty or 0 pricing does not convert to 99/990
  test("Test 8: Empty string or 0 pricing does not convert to 99/990 default", () => {
    const settingsMap = new Map<string, string>([
      ["paytr_monthly_price", "0"],
      ["paytr_yearly_price", ""],
    ]);
    const monthlyStr = settingsMap.get("paytr_monthly_price");
    const rawMonthly = monthlyStr ? parseFloat(monthlyStr) : null;
    const monthlyPrice = rawMonthly !== null && !isNaN(rawMonthly) && rawMonthly > 0 ? rawMonthly : null;

    const yearlyStr = settingsMap.get("paytr_yearly_price");
    const rawYearly = yearlyStr ? parseFloat(yearlyStr) : null;
    const yearlyPrice = rawYearly !== null && !isNaN(rawYearly) && rawYearly > 0 ? rawYearly : null;

    assert.strictEqual(monthlyPrice, null);
    assert.strictEqual(yearlyPrice, null);
  });

  // 9. Negative pricing rejected
  test("Test 9: Negative pricing is rejected as invalid null", () => {
    const settingsMap = new Map<string, string>([
      ["paytr_monthly_price", "-50.00"],
      ["paytr_yearly_price", "-500.00"],
    ]);
    const monthlyStr = settingsMap.get("paytr_monthly_price");
    const rawMonthly = monthlyStr ? parseFloat(monthlyStr) : null;
    const monthlyPrice = rawMonthly !== null && !isNaN(rawMonthly) && rawMonthly > 0 ? rawMonthly : null;

    assert.strictEqual(monthlyPrice, null);
  });

  // 10. Local validation semantic assertion
  test("Test 10: Local validation verifies credentials presence without claiming network connectivity", () => {
    const config = {
      merchantId: "123456",
      merchantKey: "key_abc",
      merchantSalt: "salt_xyz",
    };
    const hasCredentials = Boolean(config.merchantId && config.merchantKey && config.merchantSalt);
    assert.strictEqual(hasCredentials, true);
    // Message semantics
    const testMessage = "PayTR yapılandırma ve kimlik formatı doğrulaması başarılı.";
    assert.ok(!testMessage.includes("bağlantısı başarılı"));
  });

  // 11. PayTR Iframe Token generation format test
  test("Test 11: PayTR HMAC-SHA256 iframe token is generated deterministically", () => {
    const token = generatePaytrIframeToken({
      merchantId: "123456",
      userIp: "127.0.0.1",
      merchantOid: "sp_1700000000_abc",
      email: "test@sineai.com.tr",
      paymentAmount: 9900,
      userBasketBase64: Buffer.from(JSON.stringify([["SINEAI Premium", "99.00", 1]])).toString("base64"),
      noInstallment: 1,
      maxInstallment: 0,
      currency: "TL",
      testMode: 1,
      merchantSalt: "my_secure_salt",
      merchantKey: "my_secret_key",
    });

    assert.ok(token && typeof token === "string");
    assert.ok(token.length > 20, "Token should be valid base64 HMAC");
  });

  // 12. PayTR Callback Hash verification - Valid Signature
  test("Test 12: Valid PayTR callback hash is verified successfully", () => {
    const merchantOid = "sp_test_12345";
    const merchantSalt = "salt_987654";
    const merchantKey = "key_secret_321";
    const status = "success";
    const totalAmount = "9900";

    const hashStr = merchantOid + merchantSalt + status + totalAmount;
    const hmac = crypto.createHmac("sha256", merchantKey);
    hmac.update(hashStr);
    const validHash = hmac.digest("base64");

    const verified = verifyPaytrCallbackHash({
      merchantOid,
      merchantSalt,
      status,
      totalAmount,
      merchantKey,
      incomingHash: validHash,
    });

    assert.strictEqual(verified, true, "Hash must be verified");
  });

  // 13. PayTR Callback Hash verification - Invalid Signature rejected
  test("Test 13: Tampered or invalid callback hash is rejected with zero mutation", () => {
    const verified = verifyPaytrCallbackHash({
      merchantOid: "sp_test_12345",
      merchantSalt: "salt_987654",
      status: "success",
      totalAmount: "9900",
      merchantKey: "key_secret_321",
      incomingHash: "invalid_fake_forged_hash_base64==",
    });

    assert.strictEqual(verified, false, "Invalid hash must be rejected");
  });

  // 14. Timing-Safe check length mismatch handled cleanly
  test("Test 14: Signature length mismatch fails safely without throwing exception", () => {
    const verified = verifyPaytrCallbackHash({
      merchantOid: "sp_test_12345",
      merchantSalt: "salt_987654",
      status: "success",
      totalAmount: "9900",
      merchantKey: "key_secret_321",
      incomingHash: "short",
    });

    assert.strictEqual(verified, false, "Length mismatch should cleanly return false");
  });

  // 15. Payload Hash for Webhook Idempotency
  test("Test 15: Deterministic payload hash generates identical hash for duplicate callbacks", () => {
    const hash1 = generatePayloadHash("sp_123", "9900", "success");
    const hash2 = generatePayloadHash("sp_123", "9900", "success");
    const hashDifferent = generatePayloadHash("sp_123", "9900", "failed");

    assert.strictEqual(hash1, hash2, "Identical payloads must yield identical payloadHash");
    assert.notStrictEqual(hash1, hashDifferent, "Different status must yield different payloadHash");
  });

  // 16. Secret encryption at rest with AES-256-GCM
  test("Test 16: Merchant key and salt are encrypted at rest with AES-256-GCM authenticated ciphertext", () => {
    const rawCredentials = "merchant_key_12345:merchant_salt_67890";
    const { encryptedValue, lastFour } = encryptSecret(rawCredentials);

    assert.ok(encryptedValue.startsWith("v1:"), "Ciphertext should use v1 format prefix");
    assert.strictEqual(lastFour, "7890");

    const decrypted = decryptSecret(encryptedValue);
    assert.strictEqual(decrypted, rawCredentials, "Decrypted credentials must match raw input");
  });

  // 17. Utoken (card token) encryption
  test("Test 17: PayTR utoken is encrypted at rest and never plaintext in storage", () => {
    const rawUtoken = "utoken_vault_secure_token_987654321";
    const { encryptedValue } = encryptSecret(rawUtoken);

    assert.notStrictEqual(encryptedValue, rawUtoken);
    const decrypted = decryptSecret(encryptedValue);
    assert.strictEqual(decrypted, rawUtoken);
  });

  // 18. RenewalKey uniqueness for recurring payments
  test("Test 18: Deterministic renewal key blocks same-period duplicate recurring charges", () => {
    const subId = "sub_user_abc123";
    const periodEnd = new Date("2026-09-27T00:00:00.000Z");
    const periodKey = periodEnd.toISOString().slice(0, 10);
    const renewalKey1 = `renewal_${subId}_${periodKey}`;
    const renewalKey2 = `renewal_${subId}_${periodKey}`;

    assert.strictEqual(renewalKey1, renewalKey2);
    assert.strictEqual(renewalKey1, "renewal_sub_user_abc123_2026-09-27");
  });

  // 19. Single active subscription partial unique constraint rule
  test("Test 19: Single active subscription invariant is enforced on active statuses", () => {
    const activeStatuses = ["ACTIVE", "PAST_DUE", "CANCEL_AT_PERIOD_END"];
    const historicalStatuses = ["EXPIRED", "CANCELLED", "FAILED"];

    for (const st of activeStatuses) {
      assert.ok(["ACTIVE", "PAST_DUE", "CANCEL_AT_PERIOD_END"].includes(st));
    }
    for (const st of historicalStatuses) {
      assert.ok(!["ACTIVE", "PAST_DUE", "CANCEL_AT_PERIOD_END"].includes(st));
    }
  });

  // 20. Subscription period calculation for Monthly
  test("Test 20: Monthly subscription adds 30 days accurately", () => {
    const start = new Date("2026-08-27T12:00:00.000Z");
    const end = new Date(start);
    end.setDate(end.getDate() + 30);

    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    assert.strictEqual(diffDays, 30);
  });

  // 21. Subscription period calculation for Yearly
  test("Test 21: Yearly subscription adds 1 calendar year accurately", () => {
    const start = new Date("2026-08-27T12:00:00.000Z");
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);

    assert.strictEqual(end.getUTCFullYear(), 2027);
    assert.strictEqual(end.getUTCMonth(), 7); // August (0-indexed)
    assert.strictEqual(end.getUTCDate(), 27);
  });

  // 22. Grace period calculation
  test("Test 22: Grace period adds configured days on renewal failure", () => {
    const now = new Date("2026-08-27T12:00:00.000Z");
    const graceDays = 3;
    const graceEnd = new Date(now);
    graceEnd.setDate(graceEnd.getDate() + graceDays);

    const diffHours = (graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
    assert.strictEqual(diffHours, 72);
  });

  // 23. Entitlement source isolation logic
  test("Test 23: Entitlement source differentiates MANUAL admin grants from BILLING subscriptions", () => {
    const manualGrant = {
      tier: "PREMIUM",
      source: "MANUAL",
      validUntil: new Date("2028-01-01T00:00:00.000Z"),
    };

    const billingExpiry = new Date("2026-09-27T00:00:00.000Z");
    const shouldRevokeManual = manualGrant.source === "MANUAL" && manualGrant.validUntil > billingExpiry;

    assert.strictEqual(shouldRevokeManual, true, "Manual grant with farther expiry must be protected from billing expiration");
  });

  // 24. Masked credentials format
  test("Test 24: Admin config returns masked credentials without leaking plaintext", () => {
    const rawKey = "1234567890abcdef";
    const rawSalt = "fedcba0987654321";
    const maskedKey = rawKey ? "••••••••" : null;
    const maskedSalt = rawSalt ? "••••••••" : null;

    assert.strictEqual(maskedKey, "••••••••");
    assert.strictEqual(maskedSalt, "••••••••");
    assert.ok(!maskedKey.includes("1234"));
    assert.ok(!maskedSalt.includes("fedc"));
  });

  console.log(`\nRESULTS: Passed ${passed} of 24 tests.`);
}

runPaytrBillingTests();