import { db } from "../lib/db/client";
import {
  calculateEffectiveAiWeight,
  calculateHybridScore,
  rerankCandidatesWithAi,
  generateCandidateFingerprint,
} from "../lib/recommendation/hybrid-reranker";
import { getSystemSettings, validateHybridWeights } from "../lib/config/service";
import { getPersonalizedRecommendations, type ScoredCandidate } from "../lib/recommendation/service";
import { getPersonalizedTvRecommendations } from "../lib/tv/recommendation/service";
import type { FilmDnaResult } from "../lib/profile/types";

export async function runHybridIntegrationRuntimeTests(): Promise<void> {
  console.log("\n=== HYBRID AI RUNTIME INTEGRATION & ORDER PERMUTATION TESTS ===\n");

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
  // Test 1: Real Order Permutation with Synthetic Candidate Set (55/45 Film Winner)
  // -------------------------------------------------------------
  const mockDna: FilmDnaResult = {
    version: 1,
    generatedAt: new Date().toISOString(),
    confidence: 1.0, // High confidence to test pure configured 55/45 blend
    confidenceLabel: "Yüksek",
    sample: { totalInteractions: 30, ratedMovies: 30, watched: 30, notWatched: 0, unsure: 0 },
    summary: "Test DNA",
    genres: [{ name: "Dram", score: 0.8, ratedCount: 15, exposureCount: 20 }],
    eras: [],
    popularity: { orientation: "balanced", label: "Dengeli", avgPopularityScore: 60 },
    familiarity: { score: 0.7, label: "balanced", description: "Dengeli" },
    traits: [],
  };

  const syntheticCandidates: ScoredCandidate[] = [
    {
      movie: { id: "movie-A", title: "Film A", tmdbId: 101, popularity: 50, voteAverage: 7.5, genres: ["Dram"], releaseYear: 2020 } as any,
      rawMatchScore: 90,
      displayMatchScore: 90,
      qualityScore: 80,
      matchLabel: "Çok Yüksek",
      dislikePenalty: 0,
      feedbackAdjustment: 0,
      components: { genre: 90, era: 80, popularity: 70, quality: 80, discovery: 70, tasteFit: 0.9 },
      reasons: ["Dram uyumu"],
      evidence: { hasStrongReference: true, positiveReferences: [{ movieId: "ref1", title: "Ref 1", similarityScore: 0.85 }] as any, profileSignals: ["Dram"] },
      candidateSource: "FRESH_DISCOVERY",
    },
    {
      movie: { id: "movie-B", title: "Film B", tmdbId: 102, popularity: 45, voteAverage: 7.2, genres: ["Dram"], releaseYear: 2019 } as any,
      rawMatchScore: 85,
      displayMatchScore: 85,
      qualityScore: 75,
      matchLabel: "Yüksek",
      dislikePenalty: 0,
      feedbackAdjustment: 0,
      components: { genre: 85, era: 80, popularity: 60, quality: 75, discovery: 65, tasteFit: 0.85 },
      reasons: ["Dram uyumu"],
      evidence: { hasStrongReference: false, positiveReferences: [], profileSignals: [] },
      candidateSource: "FRESH_DISCOVERY",
    },
    {
      movie: { id: "movie-C", title: "Film C", tmdbId: 103, popularity: 60, voteAverage: 7.8, genres: ["Bilim Kurgu"], releaseYear: 2022 } as any,
      rawMatchScore: 80,
      displayMatchScore: 80,
      qualityScore: 85,
      matchLabel: "Uyumlu",
      dislikePenalty: 0,
      feedbackAdjustment: 0,
      components: { genre: 80, era: 80, popularity: 75, quality: 85, discovery: 80, tasteFit: 0.8 },
      reasons: ["Bilim Kurgu uyumu"],
      evidence: { hasStrongReference: false, positiveReferences: [], profileSignals: [] },
      candidateSource: "FRESH_DISCOVERY",
    },
  ];

  // In deterministic order: Movie A (90) -> Movie B (85) -> Movie C (80)
  const deterministicOrder = syntheticCandidates.map((c) => c.movie.id);
  assert(
    deterministicOrder[0] === "movie-A" && deterministicOrder[1] === "movie-B" && deterministicOrder[2] === "movie-C",
    "Deterministic Baseline Order: A (90) -> B (85) -> C (80)"
  );

  // Injected AI Affinities: Movie C is heavily favored semantically by AI Taste (95), Movie A is medium (70), Movie B is low (50)
  const frozenAiAffinities = new Map<string, { affinity: number; signals: string[] }>([
    ["movie-A", { affinity: 70, signals: ["orta seviye derinlik"] }],
    ["movie-B", { affinity: 50, signals: ["düşük semantik uyum"] }],
    ["movie-C", { affinity: 95, signals: ["kusursuz atmosfer ve ton"] }],
  ]);

  // Execute Hybrid Reranker with configured 55/45 weights
  const rerankedResult = await rerankCandidatesWithAi(
    "test-user",
    "FILM",
    syntheticCandidates,
    mockDna,
    { schemaVersion: 1, corePreferences: ["bilim kurgu"], storyPreferences: {} } as any,
    {
      matchWeight: 55,
      aiWeight: 45,
      frozenRankingMap: frozenAiAffinities,
    }
  );

  const hybridOrder = rerankedResult.rankedCandidates.map((c) => c.movie.id);
  const hybridScores = rerankedResult.rankedCandidates.map((c) => c.displayMatchScore);

  // Movie C: 0.55*80 + 0.45*95 = 44 + 42.75 = 87
  // Movie A: 0.55*90 + 0.45*70 = 49.5 + 31.5 = 81
  // Movie B: 0.55*85 + 0.45*50 = 46.75 + 22.5 = 69
  assert(
    hybridOrder[0] === "movie-C" && hybridOrder[1] === "movie-A" && hybridOrder[2] === "movie-B",
    `Hybrid 55/45 actively permutes ranking: Movie C (${hybridScores[0]}) promoted to #1, Movie A (${hybridScores[1]}) #2, Movie B (${hybridScores[2]}) #3`
  );

  // -------------------------------------------------------------
  // Test 2: Trust Guard Ceiling Check (H <= 97)
  // -------------------------------------------------------------
  const { displayHybrid } = calculateHybridScore(96, 100, 55, 45, true);
  assert(displayHybrid <= 97, `Trust guard strictly caps display score at <= 97 (computed: ${displayHybrid})`);

  // -------------------------------------------------------------
  // Test 3: Admin Presets & Winner Values
  // -------------------------------------------------------------
  const settings = await getSystemSettings();
  assert(
    settings.hybridMatchWeight === 55 && settings.hybridAiWeight === 45,
    "Film Default Winner Weights configured as 55% Match / 45% AI"
  );
  assert(
    settings.tvHybridMatchWeight === 60 && settings.tvHybridAiWeight === 40,
    "TV Default Winner Weights configured as 60% Match / 40% AI"
  );

  // -------------------------------------------------------------
  // Test 4: Weight Clamp Safety (AI weight max 50%, sum 100%)
  // -------------------------------------------------------------
  const clamped = validateHybridWeights(30, 70);
  assert(
    clamped.matchWeight === 50 && clamped.aiWeight === 50,
    "Weight validation strictly caps AI weight at 50% max and keeps sum at 100%"
  );

  // -------------------------------------------------------------
  // Test 5: Non-Blocking Behavior & Hybrid Pending when Snapshot Missing
  // -------------------------------------------------------------
  const { isDbAvailable } = await import("./test_helpers");
  if (await isDbAvailable()) {
    const testUserId = `hybrid-runtime-user-${Date.now()}`;
    try {
      await db.user.create({
        data: { id: testUserId, email: `${testUserId}@test.filmprint`, accountType: "ANONYMOUS" },
      });

      const sampleMovies = await db.movie.findMany({ take: 30 });
      for (let i = 0; i < sampleMovies.length; i++) {
        await db.movieInteraction.create({
          data: {
            userId: testUserId,
            movieId: sampleMovies[i].id,
            status: "WATCHED",
            rating: i % 2 === 0 ? "LIKE" : "LOVE",
          },
        });
      }

      const nonBlockingResult = await getPersonalizedRecommendations(testUserId, 10, 0, false, {
        hybridEnabledOverride: true,
        forceAiRefresh: false, // Standard non-blocking request
      });

      assert(
        nonBlockingResult.ready === true &&
          nonBlockingResult.hybridEnabled === true &&
          nonBlockingResult.hybridPending === true &&
          nonBlockingResult.hybridApplied === false,
        "When snapshot is missing, recommendations respond immediately with deterministic order and hybridPending=true"
      );
    } finally {
      await db.movieInteraction.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await db.userTasteProfile.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await db.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
    }
  } else {
    console.log("  ⚠️ Skipping Live DB non-blocking integration test (PostgreSQL offline in test environment)");
  }

  console.log(`\n===============================================================`);
  console.log(`HYBRID RUNTIME SUITE: Passed ${passed} of ${passed + failed} tests.`);
  console.log(`===============================================================\n`);

  if (failed > 0) {
    throw new Error(`Hybrid Runtime Integration tests failed: ${failed} errors.`);
  }
}
