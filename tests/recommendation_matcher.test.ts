import { calculateMovieMatch } from "../lib/recommendation/matcher.ts";
import {
  generateRecommendationExplanation,
  generateDeterministicExplanation,
} from "../lib/recommendation/explanation.ts";
import type { CandidateMovie } from "../lib/calibration/types.ts";
import type { FilmDnaResult } from "../lib/profile/types.ts";

function makeCandidateMovie(
  id: string,
  title: string,
  genres: string[],
  releaseYear: number,
  popularity = 75,
  voteAverage = 8.2
): CandidateMovie {
  return {
    id: `m-${id}`,
    tmdbId: 200 + parseInt(id, 10),
    title,
    originalTitle: title,
    releaseYear,
    popularity,
    voteAverage,
    posterPath: "/poster.jpg",
    backdropPath: "/backdrop.jpg",
    genres,
    overview: "Sample synopsis text for testing recommendation engine.",
  };
}

function makeSampleProfile(): FilmDnaResult {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    confidence: 0.85,
    confidenceLabel: "Yüksek Güvenilirlik",
    summary: "Bilim Kurgu ve Modern Sinema odaklı sinema profili",
    sample: { totalInteractions: 35, ratedMovies: 35, watched: 35, notWatched: 0, unsure: 0 },
    genres: [
      { name: "Bilim Kurgu", score: 0.95, ratedCount: 12, exposureCount: 12 },
      { name: "Dram", score: 0.80, ratedCount: 10, exposureCount: 10 },
      { name: "Macera", score: 0.70, ratedCount: 8, exposureCount: 8 },
      { name: "Korku", score: 0.10, ratedCount: 5, exposureCount: 5 }, // Disliked genre!
    ],
    eras: [
      { key: "2010s", label: "2010'lar Modern Sinema", score: 0.90, ratedCount: 15 },
      { key: "1990s", label: "1990'lar Kült Dönem", score: 0.60, ratedCount: 8 },
    ],
    popularity: { orientation: "balanced", label: "Dengeli Popülerlik", avgPopularityScore: 70 },
    familiarity: { score: 0.65, label: "balanced", description: "Dengeli keşif oranı" },
    traits: ["Bilim Kurgu Tutkunu", "Modern Sinema Meraklısı"],
  };
}

export async function runRecommendationMatcherTests() {
  console.log("=== PHASE 3B RECOMMENDATION MATCHER UNIT TESTS ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${message}`);
    }
  }

  const profile = makeSampleProfile();

  // 1. Strong Genre Match Test
  const sciFiMovie = makeCandidateMovie("1", "Interstellar", ["Bilim Kurgu", "Dram"], 2014);
  const sciFiMatch = calculateMovieMatch(sciFiMovie, profile);
  assert(
    sciFiMatch.matchScore >= 80,
    `Strong Genre Match: Sci-Fi lover gets high match score (%${sciFiMatch.matchScore})`
  );

  // 2. Genre Mismatch / Negative Penalty Test
  const horrorMovie = makeCandidateMovie("2", "The Conjuring", ["Korku"], 2013);
  const horrorMatch = calculateMovieMatch(horrorMovie, profile);
  assert(
    horrorMatch.matchScore < 60 && horrorMatch.reasons.some((r) => r.toLowerCase().includes("negative") || r.toLowerCase().includes("disliked")),
    `Genre Mismatch: Disliked horror genre gets negative penalty (%${horrorMatch.matchScore})`
  );

  // 3. Era Match Test
  const modernMovie = makeCandidateMovie("3", "Inception", ["Bilim Kurgu"], 2010);
  const oldMovie = makeCandidateMovie("4", "Metropolis", ["Bilim Kurgu"], 1927);
  const modernMatch = calculateMovieMatch(modernMovie, profile);
  const oldMatch = calculateMovieMatch(oldMovie, profile);
  assert(
    modernMatch.matchScore > oldMatch.matchScore,
    `Era Match: Preferred 2010s era movie scores higher (%${modernMatch.matchScore} vs %${oldMatch.matchScore})`
  );

  // 4. Determinism Test
  const detMatch1 = calculateMovieMatch(sciFiMovie, profile);
  const detMatch2 = calculateMovieMatch(sciFiMovie, profile);
  assert(
    detMatch1.matchScore === detMatch2.matchScore &&
      JSON.stringify(detMatch1.components) === JSON.stringify(detMatch2.components),
    "Determinism: Same candidate + profile produces exact identical match score and breakdown"
  );

  // 5. Score Bounds Test
  assert(
    sciFiMatch.matchScore >= 0 &&
      sciFiMatch.matchScore <= 100 &&
      horrorMatch.matchScore >= 0 &&
      horrorMatch.matchScore <= 100,
    "Score Bounds: All match scores strictly stay within [0, 100]"
  );

  // 6. DeepSeek Fallback Test (Safe Fallback)
  const explanation = await generateRecommendationExplanation(sciFiMovie, sciFiMatch, profile);
  assert(
    !!explanation.headline && Array.isArray(explanation.reasons) && explanation.reasons.length > 0,
    "DeepSeek Fallback: Explanation engine safely returns structured Turkish explanation"
  );

  // 7. Fast Deterministic Baseline Test (On-demand Lazy architecture)
  const baseline = generateDeterministicExplanation(sciFiMovie, sciFiMatch, profile);
  assert(
    !!baseline.headline && Array.isArray(baseline.reasons) && baseline.reasons.length > 0 && baseline.isAiGenerated === false,
    "Fast Baseline: Deterministic explanation generates instant reasons with zero AI cost"
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}
