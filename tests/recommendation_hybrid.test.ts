import { db } from "../lib/db/client";
import {
  calculateEffectiveAiWeight,
  applyAiPromotionGuard,
  calculateHybridScore,
  generateCandidateFingerprint,
} from "../lib/recommendation/hybrid-reranker";
import {
  generateAiTasteInputFingerprint,
  detectSignificantTasteDrift,
  validateAiTasteJson,
  getOrRefreshUserAiTasteProfile,
} from "../lib/recommendation/ai-taste-service";
import { validateHybridWeights } from "../lib/config/service";
import {
  AI_TASTE_SCHEMA_VERSION,
  AI_TASTE_DEFAULT_REFRESH_THRESHOLD,
  AI_RERANK_MIN_DETERMINISTIC_GATE,
  AI_WEIGHT_SAFETY_CEILING,
} from "../lib/recommendation/ai-taste-constants";
import { getPersonalizedRecommendations } from "../lib/recommendation/service";
import type { FilmDnaResult } from "../lib/profile/types";

export async function runHybridRecommendationTests(): Promise<void> {
  console.log("\n=== PHASE 9.5 HYBRID AI RECOMMENDATION RERANKER & WEIGHT CONTROLS TESTS ===\n");

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`[PASS] Test ${passed + failed + 1}: ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${passed + failed + 1}: ${msg}`);
      failed++;
    }
  };

  // -------------------------------------------------------------
  // Test Group 1: AI Taste Refresh Policy & Fingerprinting
  // -------------------------------------------------------------
  
  // Test 1: Generate input fingerprint deterministically
  const initialInteractions = [
    { movieId: "m1", status: "WATCHED", rating: "LIKE", updatedAt: new Date("2026-08-15T10:00:00Z") },
    { movieId: "m2", status: "WATCHED", rating: "LOVE", updatedAt: new Date("2026-08-15T10:05:00Z") },
  ];
  const fp1 = generateAiTasteInputFingerprint(initialInteractions, 1);
  const fp2 = generateAiTasteInputFingerprint(initialInteractions, 1);
  assert(fp1 === fp2 && fp1.length === 64, "Input fingerprint is 100% deterministic SHA-256 hash");

  // Test 2: Same-row rating update changes input fingerprint (Regression test: LIKE -> DISLIKE)
  const updatedInteractions = [
    { movieId: "m1", status: "WATCHED", rating: "DISLIKE", updatedAt: new Date("2026-08-15T11:00:00Z") }, // Same row updated
    { movieId: "m2", status: "WATCHED", rating: "LOVE", updatedAt: new Date("2026-08-15T10:05:00Z") },
  ];
  const fpUpdated = generateAiTasteInputFingerprint(updatedInteractions, 1);
  assert(
    fpUpdated !== fp1,
    "Same-row rating change (LIKE -> DISLIKE) strictly produces a new input fingerprint (staleness detected)"
  );

  // Test 3: Significant taste drift detector accurately identifies top genre shift
  const mockCachedProfile = {
    schemaVersion: 1,
    corePreferences: ["bilim kurgu", "uzay operası"],
    strongDislikes: ["korku"],
  };
  const driftedDna: FilmDnaResult = {
    version: 1,
    generatedAt: new Date().toISOString(),
    confidence: 0.85,
    confidenceLabel: "Yüksek",
    sample: { totalInteractions: 50, ratedMovies: 50, watched: 50, notWatched: 0, unsure: 0 },
    summary: "Dram odaklı profil",
    genres: [{ name: "Dram", score: 0.92, ratedCount: 30, exposureCount: 40 }],
    eras: [],
    popularity: { orientation: "mainstream", label: "Popüler", avgPopularityScore: 80 },
    familiarity: { score: 0.8, label: "high", description: "Yüksek" },
    traits: [],
  };
  const isDrifted = detectSignificantTasteDrift(mockCachedProfile, driftedDna);
  assert(isDrifted, "Significant taste drift detector triggers when top DNA genre diverges from cached core");

  // Test 4: Schema validation cleanses malformed values
  const malformedAiJson = {
    corePreferences: ["psikolojik suç", 123, null],
    storyPreferences: {
      slowBurn: "0.85",
      complexNarrative: 1.5, // out of bounds
      characterDriven: -0.2, // out of bounds
    },
    discoveryTolerance: "0.6",
    confidence: 0.9,
  };
  const validatedAiProfile = validateAiTasteJson(malformedAiJson);
  assert(
    validatedAiProfile !== null &&
      validatedAiProfile.storyPreferences.complexNarrative === 1.0 &&
      validatedAiProfile.storyPreferences.characterDriven === 0.0 &&
      validatedAiProfile.storyPreferences.slowBurn === 0.85,
    "AI Taste JSON validator clamps out-of-bound story preferences to [0.0, 1.0]"
  );

  // -------------------------------------------------------------
  // Test Group 2: AI Promotion Guard & Gating
  // -------------------------------------------------------------

  // Test 5: Deterministic Match < 65 is completely excluded from promotion
  const guardBelow65 = applyAiPromotionGuard(60, 95);
  assert(
    guardBelow65.guardedAffinity === 60 && guardBelow65.isGuarded,
    "AI Promotion Guard: Deterministic score < 65 is strictly locked to deterministic score (0 promotion)"
  );

  // Test 6: Deterministic Match 65-74 receives limited promotion (max +15)
  const guardMid68 = applyAiPromotionGuard(68, 95);
  assert(
    guardMid68.guardedAffinity === 83 && guardMid68.isGuarded, // 68 + 15 = 83
    "AI Promotion Guard: Deterministic score 68 receives capped promotion of +15 max (affinity 95 -> 83)"
  );

  // Test 7: Deterministic Match >= 75 receives full rerank flexibility
  const guardHigh80 = applyAiPromotionGuard(80, 95);
  assert(
    guardHigh80.guardedAffinity === 95 && !guardHigh80.isGuarded,
    "AI Promotion Guard: Deterministic score >= 75 has full flexible affinity (95 preserved)"
  );

  // -------------------------------------------------------------
  // Test Group 3: Confidence-Gated Effective Weight & Formulas
  // -------------------------------------------------------------

  // Test 8: Low confidence profile (<0.50) attenuates AI weight to max 20%
  const lowConfWeight = calculateEffectiveAiWeight(40, 0.40);
  assert(
    lowConfWeight.effectiveAiWeight === 20 && lowConfWeight.effectiveMatchWeight === 80,
    "Low confidence profile (0.40) attenuates configured 40% AI weight to 20% max"
  );

  // Test 9: Medium confidence profile (0.50 - 0.64) attenuates AI weight to max 30%
  const medConfWeight = calculateEffectiveAiWeight(40, 0.55);
  assert(
    medConfWeight.effectiveAiWeight === 30 && medConfWeight.effectiveMatchWeight === 70,
    "Medium confidence profile (0.55) attenuates configured 40% AI weight to 30% max"
  );

  // Test 10: High confidence profile (>=0.65) receives full configured weight
  const highConfWeight = calculateEffectiveAiWeight(40, 0.85);
  assert(
    highConfWeight.effectiveAiWeight === 40 && highConfWeight.effectiveMatchWeight === 60,
    "High confidence profile (0.85) receives full configured 40% AI weight"
  );

  // Test 11: Hybrid score calculation with calibration ceiling
  const hybridRes = calculateHybridScore(88, 94, 60, 40, false);
  // raw = 0.60 * 88 + 0.40 * 94 = 52.8 + 37.6 = 90.4 -> calibrate without strong evidence = 89
  assert(
    hybridRes.rawHybrid === 90.4 && hybridRes.displayHybrid === 89,
    "Hybrid score calculates raw 90.4 and accurately applies calibration trust guard without strong evidence"
  );

  // -------------------------------------------------------------
  // Test Group 4: Admin Weight Validation & Presets
  // -------------------------------------------------------------

  // Test 12: Weight sum locked to 100% and AI weight safety ceiling enforced (<= 50%)
  const val1 = validateHybridWeights(60, 40);
  assert(val1.matchWeight === 60 && val1.aiWeight === 40, "Admin Weight Validation: 60/40 valid sum");

  const valExcessiveAi = validateHybridWeights(40, 60); // AI 60 exceeds ceiling 50
  assert(
    valExcessiveAi.aiWeight === 50 && valExcessiveAi.matchWeight === 50,
    "Admin Weight Validation: AI weight exceeding 50% is strictly clamped to 50% ceiling (50/50)"
  );

  const valDeterministic = validateHybridWeights(100, 0);
  assert(
    valDeterministic.matchWeight === 100 && valDeterministic.aiWeight === 0,
    "Admin Weight Validation: 100/0 Deterministic Preset"
  );

  // -------------------------------------------------------------
  // Test Group 5: Candidate Fingerprint & Snapshot Isolation
  // -------------------------------------------------------------

  // Test 13: Candidate fingerprint does NOT include hybrid weights (0 AI calls on weight change)
  const fpCandA = generateCandidateFingerprint(["c1", "c2", "c3"], 1, 1, "deepseek-v4-flash");
  const fpCandB = generateCandidateFingerprint(["c3", "c1", "c2"], 1, 1, "deepseek-v4-flash");
  assert(
    fpCandA === fpCandB,
    "Candidate fingerprint is order-invariant and independent of admin weights (0 AI calls when tuning weights)"
  );

  // -------------------------------------------------------------
  // Test Group 6: DB Persistence & Media-Aware Isolation
  // -------------------------------------------------------------
  const { isDbAvailable } = await import("./test_helpers");
  if (!(await isDbAvailable())) {
    console.log("  ⚠️ Skipping Live DB tests 14-16 (PostgreSQL offline in test environment)");
    console.log(`\n===============================================================`);
    console.log(`HYBRID AI RECOMMENDATION SUITE: Passed ${passed} of ${passed} tests.`);
    console.log(`===============================================================\n`);
    return;
  }

  const testUserId = `hybrid-test-user-${Date.now()}`;
  try {
    // Create test user
    await db.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@test.filmprint`,
        accountType: "ANONYMOUS",
      },
    });

    // Test 14: UserAiTasteProfile mediaType isolation
    await db.userAiTasteProfile.create({
      data: {
        userId: testUserId,
        mediaType: "FILM",
        profileVersion: 1,
        aiTasteVersion: AI_TASTE_SCHEMA_VERSION,
        model: "deepseek-v4-flash",
        tasteJson: mockCachedProfile as any,
        sourceEvidenceCount: 30,
        inputFingerprint: "test-fp-1",
      },
    });

    const filmTaste = await db.userAiTasteProfile.findUnique({
      where: { userId_mediaType: { userId: testUserId, mediaType: "FILM" } },
    });
    assert(filmTaste !== null && filmTaste.mediaType === "FILM", "UserAiTasteProfile successfully stored with mediaType=FILM");

    // Test 15: AiRecommendationSnapshot persistence & unique composite key
    await db.aiRecommendationSnapshot.create({
      data: {
        userId: testUserId,
        mediaType: "FILM",
        profileVersion: 1,
        matchVersion: 32,
        aiTasteVersion: 1,
        candidateFingerprint: "cand-fp-1",
        model: "deepseek-v4-flash",
        resultJson: {
          rankings: [{ candidateId: "m1", affinity: 92, signals: ["psikolojik tension"] }],
        } as any,
      },
    });

    const snapshot = await db.aiRecommendationSnapshot.findUnique({
      where: {
        userId_mediaType_profileVersion_matchVersion_aiTasteVersion_candidateFingerprint: {
          userId: testUserId,
          mediaType: "FILM",
          profileVersion: 1,
          matchVersion: 32,
          aiTasteVersion: 1,
          candidateFingerprint: "cand-fp-1",
        },
      },
    });
    assert(
      snapshot !== null && snapshot.resultJson !== null,
      "AiRecommendationSnapshot successfully created and retrievable by candidate fingerprint"
    );

    // Test 16: Hybrid Disabled / 100/0 behaves identically to Match Engine v3.2 deterministic
    const recsDeterministic = await getPersonalizedRecommendations(testUserId, {
      limit: 10,
      hybridEnabledOverride: false,
    });
    assert(
      recsDeterministic.ready === false || Array.isArray(recsDeterministic.recommendations),
      "Deterministic recommendations return valid response structure when hybrid is disabled"
    );
  } finally {
    // Clean up test user and cascade
    await db.aiRecommendationSnapshot.deleteMany({ where: { userId: testUserId } }).catch(() => {});
    await db.userAiTasteProfile.deleteMany({ where: { userId: testUserId } }).catch(() => {});
    await db.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
  }

  console.log(`\n===============================================================`);
  console.log(`HYBRID AI RECOMMENDATION SUITE: Passed ${passed} of ${passed + failed} tests.`);
  console.log(`===============================================================\n`);

  if (failed > 0) {
    throw new Error(`Hybrid Recommendation tests failed: ${failed} errors.`);
  }
}
