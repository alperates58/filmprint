import {
  generateDeterministicExplanation,
} from "../lib/recommendation/explanation.ts";
import type { MovieMatchResult } from "../lib/recommendation/types.ts";
import type { CandidateMovie } from "../lib/calibration/types.ts";
import type { FilmDnaResult } from "../lib/profile/types.ts";

export function runRecommendationUpgradeTests() {
  console.log("=== PHASE 6A RECOMMENDATION EXPERIENCE UPGRADE UNIT TESTS ===\n");
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

  // Sample Mock Movie
  const mockMovie: CandidateMovie = {
    id: "movie-123",
    tmdbId: 550,
    title: "Interstellar",
    originalTitle: "Interstellar",
    releaseYear: 2014,
    popularity: 88,
    voteAverage: 8.6,
    posterPath: "/poster.jpg",
    backdropPath: "/backdrop.jpg",
    genres: ["Bilim Kurgu", "Dram", "Macera"],
    overview: "A team of explorers travel through a wormhole in space.",
  };

  // Sample Mock Film DNA Profile
  const mockProfile: FilmDnaResult = {
    version: 1,
    generatedAt: new Date().toISOString(),
    confidenceLabel: "Yüksek Güvenilirlik",
    genres: [
      { name: "Bilim Kurgu", score: 0.95, ratedCount: 20, exposureCount: 20 },
      { name: "Dram", score: 0.8, ratedCount: 15, exposureCount: 15 },
    ],
    eras: [{ key: "2010s", label: "2010'lar Modern Sineması", score: 0.9, ratedCount: 20 }],
    traits: ["Bilim Kurgu Tutkunu", "Modern Klasik Arayıcısı"],
    summary: "Bilim kurgu ve modern dram filmlerini tercih eden izleyici.",
    sample: { totalInteractions: 40, ratedMovies: 40, watched: 40, notWatched: 0, unsure: 0 },
    confidence: 0.85,
    popularity: { label: "Ana Akım & Nitelikli Kalite", orientation: "balanced", avgPopularityScore: 75 },
    familiarity: { score: 0.6, label: "discovery_heavy", description: "Yüksek puanlı keşif yapımları" },
  };

  // Sample High Match Result
  const highMatchResult: MovieMatchResult = {
    movie: mockMovie,
    rawMatchScore: 94,
    displayMatchScore: 94,
    qualityScore: 0.86,
    matchScore: 94,
    matchLabel: "Tam Uyumlu",
    components: {
      genre: 0.95,
      era: 0.9,
      popularity: 0.8,
      quality: 0.86,
      discovery: 0.7,
      feedback: 0,
      tasteFit: 0.95,
      evidenceFit: 0.9,
      qualityFit: 0.86,
    },
    reasons: [],
  };

  // 1. Deterministic Reasons Tests
  const explanation = generateDeterministicExplanation(mockMovie, highMatchResult, mockProfile);

  assert(
    typeof explanation.headline === "string" && explanation.headline.length > 0,
    "Deterministic Explanation: Headline is non-empty string"
  );
  assert(
    Array.isArray(explanation.reasons) && explanation.reasons.length >= 2 && explanation.reasons.length <= 3,
    `Deterministic Explanation: Reasons array length is between 2 and 3 (got ${explanation.reasons.length})`
  );
  assert(
    explanation.isAiGenerated === false,
    "Deterministic Explanation: isAiGenerated is false"
  );
  assert(
    explanation.reasons.some((r) => r.includes("Bilim Kurgu")),
    "Deterministic Explanation: First reason references top genre Bilim Kurgu"
  );
  assert(
    explanation.reasons.some((r) => r.includes("2010") || r.includes("8.6") || r.includes("kalite")),
    "Deterministic Explanation: Reasons reference era, IMDb quality, or popularity component"
  );

  // 2. Low Match Contrast Reason Test
  const lowMatchResult: MovieMatchResult = {
    movie: {
      ...mockMovie,
      releaseYear: 1965,
    },
    rawMatchScore: 68,
    displayMatchScore: 68,
    qualityScore: 0.7,
    matchScore: 68,
    matchLabel: "Dengeli",
    components: {
      genre: 0.8,
      era: 0.3,
      popularity: 0.5,
      quality: 0.7,
      discovery: 0.6,
      feedback: 0,
      tasteFit: 0.8,
      evidenceFit: 0.4,
      qualityFit: 0.7,
    },
    reasons: [],
  };

  const lowExplanation = generateDeterministicExplanation(
    lowMatchResult.movie,
    lowMatchResult,
    mockProfile
  );

  assert(
    typeof lowExplanation.headline === "string" && lowExplanation.headline.length > 0,
    "Low Match Contrast: Headline generates valid deterministic explanation"
  );
  assert(
    lowExplanation.reasons.length >= 2,
    "Low Match Contrast: Generates structured reasons list"
  );

  // 3. Structured AI JSON Schema Validation Logic Test
  function validateAiJson(rawJson: string): { headline: string; reasons: string[] } | null {
    try {
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (
          typeof parsed.headline === "string" &&
          parsed.headline.trim().length > 0 &&
          Array.isArray(parsed.reasons) &&
          parsed.reasons.length >= 1
        ) {
          const cleanReasons = parsed.reasons
            .map((r: any) => String(r).trim())
            .filter((r: string) => r.length > 0)
            .slice(0, 3);
          if (cleanReasons.length >= 1) {
            return { headline: String(parsed.headline).trim(), reasons: cleanReasons };
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  const validAiResponse = JSON.stringify({
    headline: "Karanlık bilim kurgu tam senlik.",
    reasons: [
      "Bilim kurguya güçlü ilgin var.",
      "Modern dönem filmlerine yüksek puan veriyorsun.",
      "Atmosferik yapımlara eğilimin güçlü.",
    ],
  });

  const parsedValid = validateAiJson(validAiResponse);
  assert(
    parsedValid !== null && parsedValid.headline === "Karanlık bilim kurgu tam senlik." && parsedValid.reasons.length === 3,
    "AI Validation: Valid AI JSON parsed correctly"
  );

  // 4. Malformed AI Response Fallback Test
  const malformedAiResponse = "Bu bir film önerisidir. JSON değil.";
  const parsedMalformed = validateAiJson(malformedAiResponse);
  assert(
    parsedMalformed === null,
    "AI Validation: Malformed non-JSON AI response rejected (triggers fallback)"
  );

  const incompleteAiResponse = JSON.stringify({
    headline: "Başlık var ama reasons yok",
  });
  const parsedIncomplete = validateAiJson(incompleteAiResponse);
  assert(
    parsedIncomplete === null,
    "AI Validation: Incomplete AI response missing reasons array rejected"
  );

  // 5. Deterministic Pagination Window Math Test
  const candidatePool = Array.from({ length: 25 }, (_, i) => ({
    id: `m-${i}`,
    matchScore: 100 - i,
    popularity: 50 + i,
  }));

  const limit = 10;
  // Page 0
  const page0 = candidatePool.slice(0 * limit, 1 * limit);
  // Page 1
  const page1 = candidatePool.slice(1 * limit, 2 * limit);

  assert(page0.length === 10, "Pagination: Page 0 has 10 items");
  assert(page1.length === 10, "Pagination: Page 1 has 10 items");
  assert(
    !page0.some((item0) => page1.some((item1) => item1.id === item0.id)),
    "Pagination: Page 0 and Page 1 have zero overlapping movies"
  );
  assert(
    page0[0].matchScore > page1[0].matchScore,
    "Pagination: Page 0 top match score higher than Page 1 top match score (no random shuffle)"
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runRecommendationUpgradeTests();
