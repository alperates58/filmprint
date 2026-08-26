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
  console.log("--> Starting Phase P1 Premium Hardening Test Suite...");

  const testUserIdFree = `test_user_free_${Date.now()}`;
  const testUserIdPremium = `test_user_prem_${Date.now()}`;
  const testUserIdExpired = `test_user_exp_${Date.now()}`;
  const testUserIdOverride = `test_user_override_${Date.now()}`;
  const testUserIdQuota = `test_user_quota_${Date.now()}`;
  const testUserConcurrent1 = `test_conc1_${Date.now()}`;
  const testUserConcurrent2 = `test_conc2_${Date.now()}`;
  const testUserStale = `test_stale_${Date.now()}`;

  try {
    // -------------------------------------------------------------
    // 1. FEATURE REGISTRY & ENUM STATES
    // -------------------------------------------------------------
    // - FREE AI_DISCOVER active
    // - FREE MOVIE_NIGHT_ADVANCED denied
    // - FREE AD_FREE denied
    const freeEnt = await getUserEntitlement(testUserIdFree);
    assert.strictEqual(freeEnt.tier, "FREE");
    assert.strictEqual(freeEnt.isPremium, false);
    assert.strictEqual(freeEnt.features.AI_DISCOVER, true, "FREE AI_DISCOVER must be active");
    assert.strictEqual(freeEnt.features.MOVIE_NIGHT_ADVANCED, false, "FREE MOVIE_NIGHT_ADVANCED must be denied");
    assert.strictEqual(freeEnt.features.AD_FREE, false, "FREE AD_FREE must be strictly false");

    // - PREMIUM MOVIE_NIGHT_ADVANCED active
    // - PREMIUM AD_FREE active
    await adminGrantUserEntitlement(testUserIdPremium, "PREMIUM", null);
    const premEnt = await getUserEntitlement(testUserIdPremium);
    assert.strictEqual(premEnt.tier, "PREMIUM");
    assert.strictEqual(premEnt.isPremium, true);
    assert.strictEqual(premEnt.features.MOVIE_NIGHT_ADVANCED, true, "PREMIUM MOVIE_NIGHT_ADVANCED must be active");
    assert.strictEqual(premEnt.features.AD_FREE, true, "PREMIUM AD_FREE must be active");

    // - PREMIUM PROFILE_COMPARE denied as FEATURE_NOT_AVAILABLE
    // - all other COMING_SOON features denied
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
      assert.strictEqual(premEnt.features[feature], false, `PREMIUM user must NOT have ${feature} active`);

      const dec = await evaluateFeatureEntitlement(testUserIdPremium, feature);
      assert.strictEqual(dec.allowed, false, `${feature} evaluation must be disallowed`);
      assert.strictEqual(dec.reason, "FEATURE_NOT_AVAILABLE", `${feature} must return FEATURE_NOT_AVAILABLE`);
    }

    // - explicit supported feature override works
    await adminGrantUserEntitlement(testUserIdOverride, "FREE", null, {
      featureOverrides: {
        MOVIE_NIGHT_ADVANCED: true,
        AD_FREE: true,
      },
      dailyLimits: {
        AI_DISCOVER: 20,
      },
    });
    const overrideEnt = await getUserEntitlement(testUserIdOverride);
    assert.strictEqual(overrideEnt.tier, "FREE");
    assert.strictEqual(overrideEnt.features.MOVIE_NIGHT_ADVANCED, true, "Explicit override must grant MOVIE_NIGHT_ADVANCED to FREE user");
    assert.strictEqual(overrideEnt.features.AD_FREE, true, "Explicit override must grant AD_FREE to FREE user");

    const overrideDecision = await evaluateFeatureEntitlement(testUserIdOverride, "MOVIE_NIGHT_ADVANCED");
    assert.strictEqual(overrideDecision.allowed, true, "evaluateFeatureEntitlement must honor explicit feature override");

    // - expiry wins correctly
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24);
    await adminGrantUserEntitlement(testUserIdExpired, "PREMIUM", pastDate);
    const expEnt = await getUserEntitlement(testUserIdExpired);
    assert.strictEqual(expEnt.tier, "FREE", "Expired user must fall back to FREE tier");
    assert.strictEqual(expEnt.isPremium, false);
    assert.strictEqual(expEnt.features.MOVIE_NIGHT_ADVANCED, false);
    assert.strictEqual(expEnt.features.AD_FREE, false);
    console.log("✓ Test Suite 1 Passed: Feature Registry, Enum States & Overrides");

    // -------------------------------------------------------------
    // 2. IDEMPOTENT QUOTA RESERVATION & REFUND
    // -------------------------------------------------------------
    // - FREE successful chargeable request consumes exactly 1
    const res1 = await reserveDailyQuota(testUserIdQuota, "AI_DISCOVER");
    assert.strictEqual(res1.allowed, true);
    assert.strictEqual(res1.consumed, 1);
    assert.strictEqual(typeof res1.reservationId, "string");
    const commit1 = await commitDailyQuotaReservation(res1.reservationId!);
    assert.strictEqual(commit1, true);

    const statusAfter1 = await getDailyQuotaStatus(testUserIdQuota, "AI_DISCOVER");
    assert.strictEqual(statusAfter1.consumed, 1);

    // - request reservation commit is idempotent
    const commit1Again = await commitDailyQuotaReservation(res1.reservationId!);
    assert.strictEqual(commit1Again, true, "Repeated commit must be idempotent");

    // - provider failure + deterministic fallback consumes 0 net (reserve + refund)
    const res2 = await reserveDailyQuota(testUserIdQuota, "AI_DISCOVER");
    assert.strictEqual(res2.allowed, true);
    assert.strictEqual(res2.consumed, 2);
    // Refund due to fallback
    const refund2 = await refundDailyQuotaReservation(res2.reservationId!);
    assert.strictEqual(refund2, true);

    const statusAfterRefund = await getDailyQuotaStatus(testUserIdQuota, "AI_DISCOVER");
    assert.strictEqual(statusAfterRefund.consumed, 1, "After refund, net consumed must return to 1");

    // - request reservation refund is idempotent (duplicate refund cannot decrement another request's usage)
    const refund2Again = await refundDailyQuotaReservation(res2.reservationId!);
    assert.strictEqual(refund2Again, true);
    const statusAfter2ndRefund = await getDailyQuotaStatus(testUserIdQuota, "AI_DISCOVER");
    assert.strictEqual(statusAfter2ndRefund.consumed, 1, "Duplicate refund must NOT decrement usage a second time");

    // - counter never becomes negative
    const dummyRes = `res_dummy_${Date.now()}`;
    await refundDailyQuotaReservation(dummyRes);
    const zeroUser = `test_zero_${Date.now()}`;
    const zeroStatus = await getDailyQuotaStatus(zeroUser, "AI_DISCOVER");
    assert.strictEqual(zeroStatus.consumed, 0);
    assert.ok(zeroStatus.remaining >= 0);

    // - Quota exhaustion for Free user
    // User testUserIdQuota already consumed 1 of 5. Reserve remaining 4.
    const r3 = await reserveDailyQuota(testUserIdQuota, "AI_DISCOVER");
    await commitDailyQuotaReservation(r3.reservationId!);
    const r4 = await reserveDailyQuota(testUserIdQuota, "AI_DISCOVER");
    await commitDailyQuotaReservation(r4.reservationId!);
    const r5 = await reserveDailyQuota(testUserIdQuota, "AI_DISCOVER");
    await commitDailyQuotaReservation(r5.reservationId!);
    const r6 = await reserveDailyQuota(testUserIdQuota, "AI_DISCOVER");
    await commitDailyQuotaReservation(r6.reservationId!);

    const statusFull = await getDailyQuotaStatus(testUserIdQuota, "AI_DISCOVER");
    assert.strictEqual(statusFull.consumed, 5);
    assert.strictEqual(statusFull.remaining, 0);

    // 6th attempt must be rejected before execution (consumes 0)
    const r7 = await reserveDailyQuota(testUserIdQuota, "AI_DISCOVER");
    assert.strictEqual(r7.allowed, false);
    assert.strictEqual(r7.reservationId, null);
    assert.strictEqual(r7.reason, "QUOTA_EXHAUSTED");

    const statusStillFull = await getDailyQuotaStatus(testUserIdQuota, "AI_DISCOVER");
    assert.strictEqual(statusStillFull.consumed, 5, "Rejected quota attempt must consume 0");
    console.log("✓ Test Suite 2 Passed: Truly Idempotent Quota Reservations & Safe Refunds");

    // -------------------------------------------------------------
    // 2B. REAL CONCURRENCY & TERMINAL STATE MACHINE INVARIANTS
    // -------------------------------------------------------------
    // 1. 4 simultaneous refund calls on one reservation -> usage decrements exactly once
    const resConc1 = await reserveDailyQuota(testUserConcurrent1, "AI_DISCOVER");
    assert.strictEqual(resConc1.allowed, true);
    assert.strictEqual(resConc1.consumed, 1);

    const concurrentRefunds = await Promise.all([
      refundDailyQuotaReservation(resConc1.reservationId!),
      refundDailyQuotaReservation(resConc1.reservationId!),
      refundDailyQuotaReservation(resConc1.reservationId!),
      refundDailyQuotaReservation(resConc1.reservationId!),
    ]);

    // All return true (first commits refund, rest are idempotent true)
    assert.ok(concurrentRefunds.every((r) => r === true), "All concurrent refunds must resolve true");
    const statusConc1 = await getDailyQuotaStatus(testUserConcurrent1, "AI_DISCOVER");
    assert.strictEqual(statusConc1.consumed, 0, "4 simultaneous refunds must decrement aggregate usage exactly once to 0");

    // Repeated refund later must not decrement count below 0
    await refundDailyQuotaReservation(resConc1.reservationId!);
    const statusConc1Repeat = await getDailyQuotaStatus(testUserConcurrent1, "AI_DISCOVER");
    assert.strictEqual(statusConc1Repeat.consumed, 0, "Repeated refund must not change count");

    // 2. Concurrent Commit vs Refund: Exactly ONE terminal state must win
    const resConc2 = await reserveDailyQuota(testUserConcurrent2, "AI_DISCOVER");
    assert.strictEqual(resConc2.allowed, true);
    assert.strictEqual(resConc2.consumed, 1);

    const [commitWon, refundWon] = await Promise.all([
      commitDailyQuotaReservation(resConc2.reservationId!),
      refundDailyQuotaReservation(resConc2.reservationId!),
    ]);

    // Exactly one operation wins the state transition
    assert.ok(
      (commitWon && !refundWon) || (!commitWon && refundWon),
      "Exactly one terminal state must win between concurrent commit and refund"
    );

    const statusConc2 = await getDailyQuotaStatus(testUserConcurrent2, "AI_DISCOVER");
    if (commitWon) {
      assert.strictEqual(statusConc2.consumed, 1, "If commit won, usage remains 1");
      // COMMITTED reservation cannot later be refunded
      const lateRefund = await refundDailyQuotaReservation(resConc2.reservationId!);
      assert.strictEqual(lateRefund, false, "COMMITTED reservation cannot later refund");
      const statusAfterLateRefund = await getDailyQuotaStatus(testUserConcurrent2, "AI_DISCOVER");
      assert.strictEqual(statusAfterLateRefund.consumed, 1, "Failed late refund must not decrement usage");
    } else {
      assert.strictEqual(statusConc2.consumed, 0, "If refund won, usage drops to 0");
      // REFUNDED reservation cannot later be committed
      const lateCommit = await commitDailyQuotaReservation(resConc2.reservationId!);
      assert.strictEqual(lateCommit, false, "REFUNDED reservation cannot later commit");
    }

    // 3. Stale Reservation Recovery
    const resStale = await reserveDailyQuota(testUserStale, "AI_DISCOVER");
    assert.strictEqual(resStale.allowed, true);
    assert.strictEqual(resStale.consumed, 1);

    const { recovered } = await recoverStaleQuotaReservations(0, 10);
    assert.ok(recovered >= 1, "recoverStaleQuotaReservations must recover pending reservation");

    const statusStale = await getDailyQuotaStatus(testUserStale, "AI_DISCOVER");
    assert.strictEqual(statusStale.consumed, 0, "Recovered stale reservation must refund consumed usage to 0");
    console.log("✓ Test Suite 2B Passed: Concurrency Safety, Terminal State Guarantees & Stale Recovery");

    // -------------------------------------------------------------
    // 3. CANONICAL AD_FREE & BILLING READINESS
    // -------------------------------------------------------------
    const freeSummary = await getUserEntitlementSummary(testUserIdFree);
    assert.strictEqual(freeSummary.isAdFree, false, "Free user summary must have isAdFree=false");

    const premSummary = await getUserEntitlementSummary(testUserIdPremium);
    assert.strictEqual(premSummary.isAdFree, true, "Premium user summary must have isAdFree=true");

    const provider = getBillingProvider();
    assert.strictEqual(provider.name, "unconfigured_provider");
    assert.strictEqual(provider.isReady(), false);

    const billingReadiness = await getEffectiveBillingReadiness();
    assert.strictEqual(billingReadiness.isReady, false);
    assert.strictEqual(billingReadiness.providerReady, false);

    assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.premiumMonthlyPrice, null);
    assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.premiumAnnualPrice, null);
    assert.strictEqual(DEFAULT_SYSTEM_SETTINGS.adminBillingEnabled, false);
    console.log("✓ Test Suite 3 Passed: Canonical AD_FREE, Truthful Pricing & Billing Gate");

    console.log("\n✅ ALL Hardened Phase P1 Production Invariants Verified Successfully!");
  } finally {
    // Cleanup test users
    try {
      await db.userEntitlement.deleteMany({
        where: {
          userId: {
            in: [
              testUserIdFree,
              testUserIdPremium,
              testUserIdExpired,
              testUserIdOverride,
              testUserIdQuota,
              testUserConcurrent1,
              testUserConcurrent2,
              testUserStale,
            ],
          },
        },
      });
    } catch {
      // Non-fatal
    }
  }
}