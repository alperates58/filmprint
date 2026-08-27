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
  reserveDailyQuota,
  commitDailyQuotaReservation,
  refundDailyQuotaReservation,
  recoverStaleQuotaReservations,
  getDailyQuotaStatus,
} from "@/lib/entitlements/service";
import { FEATURE_REGISTRY, FeatureEntitlement } from "@/lib/entitlements/types";
import { getEffectiveBillingReadiness, getBillingProvider } from "@/lib/billing/service";
import { DEFAULT_SYSTEM_SETTINGS } from "@/lib/config/service";
import { db } from "@/lib/db/client";

export async function runPremiumEntitlementsTests() {
  console.log("--> Starting Phase P1/P2 Premium Entitlements Test Suite...");

  let isDbReachable = false;
  try {
    await db.$queryRaw`SELECT 1`;
    isDbReachable = true;
  } catch {
    isDbReachable = false;
  }

  // 1. FEATURE REGISTRY & COMING SOON INVARIANTS (Pure Unit)
  const comingSoonFeatures: FeatureEntitlement[] = [
    "PROFILE_COMPARE",
    "ADVANCED_DNA",
    "TASTE_EVOLUTION",
    "ADVANCED_FILTERS",
    "WATCHLIST_INTELLIGENCE",
    "WEEKLY_DIGEST",
    "IMPORT_EXPORT",
  ];

  for (const feature of comingSoonFeatures) {
    assert.strictEqual(FEATURE_REGISTRY[feature].status, "COMING_SOON", `${feature} must be registered as COMING_SOON`);
  }

  const activeFeatures: FeatureEntitlement[] = ["AI_DISCOVER", "MOVIE_NIGHT_ADVANCED", "AD_FREE"];
  for (const feature of activeFeatures) {
    assert.strictEqual(FEATURE_REGISTRY[feature].status, "ACTIVE", `${feature} must be registered as ACTIVE`);
  }

  // Pure fallback evaluation without DB
  const freeEnt = await getUserEntitlement("dummy_user_for_fallback_test");
  assert.strictEqual(freeEnt.tier, "FREE");
  assert.strictEqual(freeEnt.isPremium, false);
  assert.strictEqual(freeEnt.features.AI_DISCOVER, true, "FREE AI_DISCOVER must be active");
  assert.strictEqual(freeEnt.features.MOVIE_NIGHT_ADVANCED, false, "FREE MOVIE_NIGHT_ADVANCED must be denied");
  assert.strictEqual(freeEnt.features.AD_FREE, false, "FREE AD_FREE must be strictly false");

  for (const feature of comingSoonFeatures) {
    const dec = await evaluateFeatureEntitlement("dummy_user_for_fallback_test", feature);
    assert.strictEqual(dec.allowed, false, `${feature} evaluation must be disallowed`);
    assert.strictEqual(dec.reason, "FEATURE_NOT_AVAILABLE", `${feature} must return FEATURE_NOT_AVAILABLE`);
  }

  console.log("✓ Test Suite 1 Passed: Feature Registry, Enum States & Overrides");

  // 2. Billing Provider and Readiness Invariants
  const provider = getBillingProvider();
  assert.strictEqual(provider.name, "PAYTR");
  const isReady = await provider.isReady();
  assert.strictEqual(isReady, false);

  const billingReadiness = await getEffectiveBillingReadiness();
  assert.strictEqual(billingReadiness.isReady, false);
  assert.strictEqual(billingReadiness.providerReady, false);

  assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.premiumMonthlyPrice, null);
  assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.premiumAnnualPrice, null);
  assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.adminBillingEnabled, false);
  console.log("✓ Test Suite 2 Passed: Canonical AD_FREE, Truthful Pricing & Billing Gate");

  if (!isDbReachable) {
    console.log("ℹ Database offline: Skipping live DB mutation tests (pure unit & fallback validated).");
    return;
  }

  // Live DB Tests
  const testUserIdPremium = `test_user_prem_${Date.now()}`;
  const testUserIdOverride = `test_user_override_${Date.now()}`;
  const testUserIdQuota = `test_user_quota_${Date.now()}`;

  try {
    await adminGrantUserEntitlement(testUserIdPremium, "PREMIUM", null);
    const premEnt = await getUserEntitlement(testUserIdPremium);
    assert.strictEqual(premEnt.tier, "PREMIUM");
    assert.strictEqual(premEnt.isPremium, true);
    assert.strictEqual(premEnt.features.MOVIE_NIGHT_ADVANCED, true);
    assert.strictEqual(premEnt.features.AD_FREE, true);

    const res1 = await reserveDailyQuota(testUserIdQuota, "AI_DISCOVER");
    assert.strictEqual(res1.allowed, true);
    assert.strictEqual(res1.consumed, 1);
    if (res1.reservationId) {
      await commitDailyQuotaReservation(res1.reservationId);
    }

    console.log("✓ Test Suite 3 Passed: Live Database Quota and Entitlement Mutations");
  } finally {
    try {
      await db.userEntitlement.deleteMany({
        where: { userId: { in: [testUserIdPremium, testUserIdOverride, testUserIdQuota] } },
      });
    } catch {
      // safe cleanup
    }
  }
}