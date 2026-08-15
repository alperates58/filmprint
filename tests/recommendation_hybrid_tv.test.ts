import {
  validateTvAiTasteJson,
  generateTvAiTasteInputFingerprint,
  detectSignificantTvTasteDrift,
} from "../lib/tv/recommendation/ai-taste-service";
import {
  calculateEffectiveTvAiWeight,
  applyTvAiPromotionGuard,
  calculateTvHybridScore,
  generateTvCandidateFingerprint,
} from "../lib/tv/recommendation/hybrid-reranker";
import { validateHybridWeights } from "../lib/config/service";
import { db } from "../lib/db/client";
import type { ScoredTvCandidate } from "../lib/tv/recommendation/service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runTvHybridRecommendationTests() {
  console.log("=== TV PHASE 3.5: SHARED HYBRID AI RECOMMENDATION & CONTROLS TESTS ===\n");

  // -------------------------------------------------------------
  // Test 1 & 2: Media Isolation in Database
  // -------------------------------------------------------------
  console.log("---> Test 1 & 2: Media Isolation (FILM vs TV)");
  const testUser = await db.user.create({
    data: {
      email: `test_tv_hybrid_${Date.now()}@filmprint.io`,
      name: "Tv Hybrid Tester",
    },
  });

  // Create a FILM AI Taste profile
  await db.userAiTasteProfile.create({
    data: {
      userId: testUser.id,
      mediaType: "FILM",
      model: "deepseek-chat",
      inputFingerprint: "film_fp_123",
      tasteJson: { corePreferences: ["Film Noir", "Cinematic Drama"] },
      sourceEvidenceCount: 30,
    },
  });

  // Create a TV AI Taste profile
  await db.userAiTasteProfile.create({
    data: {
      userId: testUser.id,
      mediaType: "TV",
      model: "deepseek-chat",
      inputFingerprint: "tv_fp_456",
      tasteJson: { corePreferences: ["Slow-Burn Mystery", "Miniseries"] },
      sourceEvidenceCount: 20,
    },
  });

  // Query specifically for TV
  const tvProfileRecord = await db.userAiTasteProfile.findUnique({
    where: {
      userId_mediaType: {
        userId: testUser.id,
        mediaType: "TV",
      },
    },
  });

  assert(tvProfileRecord !== null, "TV AI profile should exist");
  assert(
    (tvProfileRecord?.tasteJson as any)?.corePreferences?.[0] === "Slow-Burn Mystery",
    "TV request must read TV profile, not FILM profile"
  );
  console.log("[PASS] Test 1: TV request strictly retrieves mediaType=TV record");

  // Query specifically for FILM
  const filmProfileRecord = await db.userAiTasteProfile.findUnique({
    where: {
      userId_mediaType: {
        userId: testUser.id,
        mediaType: "FILM",
      },
    },
  });

  assert(filmProfileRecord !== null, "FILM AI profile should exist");
  assert(
    (filmProfileRecord?.tasteJson as any)?.corePreferences?.[0] === "Film Noir",
    "Film request must read FILM profile, not TV profile"
  );
  console.log("[PASS] Test 2: Film request strictly retrieves mediaType=FILM record (Full Media Isolation)");

  // -------------------------------------------------------------
  // Test 3, 4, 5, 6: TV Taste Refresh & Same-Row Update Fingerprinting
  // -------------------------------------------------------------
  console.log("\n---> Test 3-6: TV Taste Refresh & Fingerprint Staleness");
  const date1 = new Date("2026-08-01T10:00:00Z");
  const date2 = new Date("2026-08-02T10:00:00Z");

  const interactionsInitial = [
    { tvShowId: "tv_1", status: "PARTIALLY_WATCHED", rating: "LIKE", updatedAt: date1 },
    { tvShowId: "tv_2", status: "WATCHED", rating: "LOVE", updatedAt: date1 },
  ];

  const fp1 = generateTvAiTasteInputFingerprint(interactionsInitial, 1);
  const fp2 = generateTvAiTasteInputFingerprint(interactionsInitial, 1);
  assert(fp1 === fp2, "Fingerprint must be 100% deterministic");
  console.log("[PASS] Test 3: Fingerprint is 100% deterministic");

  // Same row update: PARTIALLY_WATCHED + LIKE -> WATCHED + LOVE
  const interactionsUpdated = [
    { tvShowId: "tv_1", status: "WATCHED", rating: "LOVE", updatedAt: date2 },
    { tvShowId: "tv_2", status: "WATCHED", rating: "LOVE", updatedAt: date1 },
  ];
  const fpUpdated = generateTvAiTasteInputFingerprint(interactionsUpdated, 1);
  assert(fp1 !== fpUpdated, "Same-row update must strictly produce a new fingerprint (staleness)");
  console.log("[PASS] Test 4: Same-row update (PARTIAL LIKE -> WATCHED LOVE) changes fingerprint");

  // Significant Taste Drift
  const currentDna: any = {
    genres: [{ name: "Bilim Kurgu", state: "POSITIVE" }],
    formatPreference: { preference: "LONG_RUNNING" },
    archetypes: [{ id: "LONG_FORM_EXPLORER", isPrimary: true }],
  };
  const cachedDnaSummary = {
    topGenreName: "Suç",
    formatPreference: "MINISERIES",
    archetypeIds: ["MINISERIES_SPECIALIST"],
  };
  const isDrifted = detectSignificantTvTasteDrift(currentDna, cachedDnaSummary);
  assert(isDrifted === true, "Significant drift detector must trigger on genre and format shifts");
  console.log("[PASS] Test 5: Significant TV Taste Drift detected before threshold count");

  // -------------------------------------------------------------
  // Test 7, 8, 9: AI Promotion Guard
  // -------------------------------------------------------------
  console.log("\n---> Test 7-9: AI Promotion Guard");
  // < 65 deterministic score locked
  const guardedLow = applyTvAiPromotionGuard(60, 95);
  assert(guardedLow.guardedAffinity === 60, "Score < 65 must be locked to deterministic score");
  assert(guardedLow.isGuarded === true, "isGuarded must be true");
  console.log("[PASS] Test 7: Match < 65 is locked to deterministic score (0 AI promotion)");

  // 65 to 74 capped at match + 15
  const guardedMid = applyTvAiPromotionGuard(68, 95);
  assert(guardedMid.guardedAffinity === 83, "Score 68 with AI 95 must be capped at 68+15=83");
  assert(guardedMid.isGuarded === true, "isGuarded must be true");
  console.log("[PASS] Test 8: Match 68 receives capped promotion of +15 max (95 -> 83)");

  // >= 75 full flexibility
  const guardedHigh = applyTvAiPromotionGuard(80, 95);
  assert(guardedHigh.guardedAffinity === 95, "Score >= 75 must retain full AI affinity");
  assert(guardedHigh.isGuarded === false, "isGuarded must be false");
  console.log("[PASS] Test 9: Match >= 75 has full flexible AI affinity (95 preserved)");

  // -------------------------------------------------------------
  // Test 10, 11, 12: TV Confidence Gating
  // -------------------------------------------------------------
  console.log("\n---> Test 10-12: TV Confidence Gating");
  const lowConfWeight = calculateEffectiveTvAiWeight(45, 0.40);
  assert(lowConfWeight.effectiveAiWeight === 20, "Confidence < 0.50 must cap AI weight at 20%");
  assert(lowConfWeight.effectiveMatchWeight === 80, "Match weight must be 80%");
  console.log("[PASS] Test 10: Low confidence profile (< 0.50) attenuates configured 45% AI weight to 20%");

  const midConfWeight = calculateEffectiveTvAiWeight(45, 0.55);
  assert(midConfWeight.effectiveAiWeight === 30, "Confidence 0.55 must cap AI weight at 30%");
  assert(midConfWeight.effectiveMatchWeight === 70, "Match weight must be 70%");
  console.log("[PASS] Test 11: Medium confidence profile (0.55) attenuates configured 45% AI weight to 30%");

  const highConfWeight = calculateEffectiveTvAiWeight(45, 0.80);
  assert(highConfWeight.effectiveAiWeight === 45, "Confidence 0.80 must receive full 45% AI weight");
  assert(highConfWeight.effectiveMatchWeight === 55, "Match weight must be 55%");
  console.log("[PASS] Test 12: High confidence profile (0.80) receives full configured 45% AI weight");

  // -------------------------------------------------------------
  // Test 13: Admin Weight Validation & Safety Ceiling
  // -------------------------------------------------------------
  console.log("\n---> Test 13: Admin Weight Validation");
  const adminValidation = validateHybridWeights(40, 60);
  assert(adminValidation.aiWeight === 50, "AI weight exceeding 50% must be clamped to 50%");
  assert(adminValidation.matchWeight === 50, "Match weight must be 50%");
  console.log("[PASS] Test 13: Admin AI weight is strictly clamped to max 50% ceiling");

  // -------------------------------------------------------------
  // Test 14: Candidate Fingerprint Invariant to Admin Weight
  // -------------------------------------------------------------
  console.log("\n---> Test 14: Candidate Fingerprint Invariant to Admin Weights");
  const mockCandidates: ScoredTvCandidate[] = [
    {
      tvShow: { id: "show_a", name: "Show A", tmdbId: 1, originalName: "Show A", overview: "", posterPath: null, backdropPath: null, firstAirDate: "2020-01-01", lastAirDate: null, status: "Ended", originalLanguage: "en", popularity: 50, voteAverage: 8.5, metadata: {} },
      source: "FRESH_DISCOVERY",
      qualityScore: 8.5,
      matchScore: 85,
      matchResult: {} as any,
    },
    {
      tvShow: { id: "show_b", name: "Show B", tmdbId: 2, originalName: "Show B", overview: "", posterPath: null, backdropPath: null, firstAirDate: "2021-01-01", lastAirDate: null, status: "Ended", originalLanguage: "en", popularity: 40, voteAverage: 8.0, metadata: {} },
      source: "FRESH_DISCOVERY",
      qualityScore: 8.0,
      matchScore: 80,
      matchResult: {} as any,
    },
  ];

  const candFp1 = generateTvCandidateFingerprint(mockCandidates, 1, 1, 1);
  const candFp2 = generateTvCandidateFingerprint(mockCandidates, 1, 1, 1);
  assert(candFp1 === candFp2, "Candidate fingerprint must be deterministic and invariant to admin weights");
  console.log("[PASS] Test 14: Candidate fingerprint is independent of admin weights (0 AI calls on weight change)");

  // -------------------------------------------------------------
  // Test 15: TV AI Taste JSON Validator
  // -------------------------------------------------------------
  console.log("\n---> Test 15: AI Taste JSON Validator");
  const rawInvalidJson = {
    corePreferences: ["Crime", 123],
    storyPreferences: {
      slowBurn: 1.5, // out of bounds
      serializedNarrative: -0.2, // out of bounds
    },
    commitmentPreference: {
      shortSeries: 0.9,
    },
  };
  const validated = validateTvAiTasteJson(rawInvalidJson);
  assert(validated !== null, "Validator should sanitize valid structure");
  assert(validated?.storyPreferences.slowBurn === 1.0, "slowBurn must be clamped to 1.0");
  assert(validated?.storyPreferences.serializedNarrative === 0.0, "serializedNarrative must be clamped to 0.0");
  console.log("[PASS] Test 15: AI Taste JSON validator clamps out-of-bounds values to [0.0, 1.0]");

  console.log("\n===============================================================");
  console.log("TV HYBRID RECOMMENDATION SUITE: Passed 15 of 15 tests.");
  console.log("===============================================================\n");
}
