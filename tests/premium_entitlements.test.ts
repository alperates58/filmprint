import assert from "assert";
import {
  getUserEntitlement,
  evaluateFeatureEntitlement,
  hasEntitlement,
  getCanonicalUtcUsageDate,
  getNextUtcMidnightIso,
  adminGrantUserEntitlement,
  adminRevokeUserEntitlement,
  getUserEntitlementSummary,
} from "@/lib/entitlements/service";
import { getEffectiveBillingReadiness, getBillingProvider } from "@/lib/billing/service";
import { DEFAULT_SYSTEM_SETTINGS, getSystemSettings } from "@/lib/config/service";
import { db } from "@/lib/db/client";

export async function runPremiumEntitlementsTests() {
  console.log("--> Starting Phase P1 Premium Product & Entitlements Test Suite...");

  const testUserIdFree = `test_user_free_${Date.now()}`;
  const testUserIdPremium = `test_user_prem_${Date.now()}`;
  const testUserIdExpired = `test_user_exp_${Date.now()}`;

  try {
    // -------------------------------------------------------------
    // Test 1: Date and Canonical Windows
    // -------------------------------------------------------------
    const canonicalDate = getCanonicalUtcUsageDate();
    assert.strictEqual(typeof canonicalDate, "string", "canonicalDate must be string");
    assert.match(canonicalDate, /^\d{4}-\d{2}-\d{2}$/, "canonicalDate must match YYYY-MM-DD");

    const nextMidnight = getNextUtcMidnightIso();
    assert.strictEqual(typeof nextMidnight, "string", "nextMidnight must be string");
    assert.ok(new Date(nextMidnight) > new Date(), "nextMidnight must be in future");
    console.log("✓ Test 1 Passed: UTC Date calculation and window boundary");

    // -------------------------------------------------------------
    // Test 2: Free User Entitlement Baseline
    // -------------------------------------------------------------
    const freeEntitlement = await getUserEntitlement(testUserIdFree);
    assert.strictEqual(freeEntitlement.tier, "FREE", "Unassigned user must default to FREE tier");
    assert.strictEqual(freeEntitlement.isPremium, false, "Free user must not be premium");
    assert.strictEqual(freeEntitlement.features.AI_DISCOVER, true, "Free user has bounded access to AI_DISCOVER");
    assert.strictEqual(freeEntitlement.features.MOVIE_NIGHT_ADVANCED, false, "Free user does not have MOVIE_NIGHT_ADVANCED");
    assert.strictEqual(freeEntitlement.features.PROFILE_COMPARE, false, "Free user does not have PROFILE_COMPARE");
    console.log("✓ Test 2 Passed: Free user entitlement baseline");

    // -------------------------------------------------------------
    // Test 3: Admin Grant & Revoke Entitlements
    // -------------------------------------------------------------
    await adminGrantUserEntitlement(testUserIdPremium, "PREMIUM", null);
    const premEntitlement = await getUserEntitlement(testUserIdPremium);
    assert.strictEqual(premEntitlement.tier, "PREMIUM", "Granted user must have PREMIUM tier");
    assert.strictEqual(premEntitlement.isPremium, true, "Granted user must be premium");
    assert.strictEqual(premEntitlement.features.MOVIE_NIGHT_ADVANCED, true, "Premium user has MOVIE_NIGHT_ADVANCED");
    assert.strictEqual(premEntitlement.features.PROFILE_COMPARE, true, "Premium user has PROFILE_COMPARE");

    // Expired Premium test
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
    await adminGrantUserEntitlement(testUserIdExpired, "PREMIUM", pastDate);
    const expEntitlement = await getUserEntitlement(testUserIdExpired);
    assert.strictEqual(expEntitlement.tier, "FREE", "Expired premium user must fall back to FREE tier");
    assert.strictEqual(expEntitlement.isPremium, false, "Expired premium user must not be premium");
    assert.strictEqual(expEntitlement.features.MOVIE_NIGHT_ADVANCED, false, "Expired user loses advanced features");

    // Revoke test
    await adminRevokeUserEntitlement(testUserIdPremium);
    const revokedEntitlement = await getUserEntitlement(testUserIdPremium);
    assert.strictEqual(revokedEntitlement.tier, "FREE", "Revoked user must be FREE");
    assert.strictEqual(revokedEntitlement.isPremium, false, "Revoked user must not be premium");
    console.log("✓ Test 3 Passed: Admin grant, expiry date enforcement, and revoke");

    // -------------------------------------------------------------
    // Test 4: Canonical evaluateFeatureEntitlement
    // -------------------------------------------------------------
    // Setup test user
    const testUserFeature = `test_feat_user_${Date.now()}`;
    const freeDecision = await evaluateFeatureEntitlement(testUserFeature, "MOVIE_NIGHT_ADVANCED");
    assert.strictEqual(freeDecision.feature, "MOVIE_NIGHT_ADVANCED");
    assert.strictEqual(freeDecision.tier, "FREE");
    assert.strictEqual(freeDecision.allowed, false, "Free user must be rejected for MOVIE_NIGHT_ADVANCED");
    assert.strictEqual(freeDecision.reason, "FEATURE_GATED");

    await adminGrantUserEntitlement(testUserFeature, "PREMIUM", null);
    const premDecision = await evaluateFeatureEntitlement(testUserFeature, "MOVIE_NIGHT_ADVANCED");
    assert.strictEqual(premDecision.feature, "MOVIE_NIGHT_ADVANCED");
    assert.strictEqual(premDecision.tier, "PREMIUM");
    assert.strictEqual(premDecision.allowed, true, "Premium user must be allowed for MOVIE_NIGHT_ADVANCED");
    assert.strictEqual(premDecision.reason, undefined);

    const hasEnt = await hasEntitlement(testUserFeature, "MOVIE_NIGHT_ADVANCED");
    assert.strictEqual(hasEnt, true, "hasEntitlement must return true for entitled user");
    console.log("✓ Test 4 Passed: Canonical evaluateFeatureEntitlement");

    // -------------------------------------------------------------
    // Test 5: Billing Provider Abstraction & Effective Readiness Gate
    // -------------------------------------------------------------
    const provider = getBillingProvider();
    assert.strictEqual(provider.name, "unconfigured_provider", "Provider name must match unconfigured_provider in P1");
    assert.strictEqual(provider.isReady(), false, "Provider isReady() must strictly return false in Phase P1");

    let threwOnCheckout = false;
    try {
      await provider.createCheckoutSession("dummy_user", "monthly");
    } catch (err: any) {
      threwOnCheckout = true;
      assert.ok(err.message.includes("BILLING_NOT_CONFIGURED"));
    }
    assert.strictEqual(threwOnCheckout, true, "createCheckoutSession must throw descriptive error when unconfigured");

    const readiness = await getEffectiveBillingReadiness();
    assert.strictEqual(readiness.isReady, false, "Effective billing readiness must be false when provider is unconfigured");
    assert.strictEqual(readiness.providerReady, false, "providerReady must be false");
    console.log("✓ Test 5 Passed: Billing provider abstraction and effective readiness gate");

    // -------------------------------------------------------------
    // Test 6: Default System Settings & Truthful Pricing Defaults
    // -------------------------------------------------------------
    assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.freeAiDiscoverDailyLimit, 5, "Default free limit must be 5");
    assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.premiumAiDiscoverFairUseLimit, 100, "Default premium limit must be 100");
    assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.premiumEnabled, true, "Default premiumEnabled must be true");
    assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.adminBillingEnabled, false, "Default adminBillingEnabled must be false");
    assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.premiumMonthlyPrice, null, "Default monthly price must be null (no fake prices)");
    assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.premiumAnnualPrice, null, "Default annual price must be null (no fake prices)");
    assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.premiumCurrency, "TRY", "Default currency must be TRY");
    assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.premiumTrialText, null, "Default trial text must be null");
    console.log("✓ Test 6 Passed: Truthful pricing and system settings defaults");

    // -------------------------------------------------------------
    // Test 7: User Entitlement Summary Payload
    // -------------------------------------------------------------
    const summaryUser = `test_summary_${Date.now()}`;
    const summary = await getUserEntitlementSummary(summaryUser);
    assert.strictEqual(summary.tier, "FREE");
    assert.strictEqual(summary.isPremium, false);
    assert.strictEqual(summary.aiDiscoverQuota?.allowed, true);
    assert.strictEqual(typeof summary.features.AI_DISCOVER, "boolean");
    console.log("✓ Test 7 Passed: User entitlement summary resolver");

    console.log("\n✅ ALL Phase P1 Premium Product & Entitlements Tests Passed Successfully!");
  } finally {
    // Cleanup any test entitlement rows
    try {
      await db.userEntitlement.deleteMany({
        where: {
          userId: {
            in: [testUserIdFree, testUserIdPremium, testUserIdExpired],
          },
        },
      });
    } catch {
      // Non-fatal cleanup
    }
  }
}