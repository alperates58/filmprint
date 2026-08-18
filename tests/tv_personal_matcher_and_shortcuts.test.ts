import assert from "node:assert";
import { generateDeterministicTvReasons } from "../lib/tv/recommendation/universal-matcher";
import type { CandidateTvShow } from "../lib/tv/recommendation/types";
import type { TvDnaResult } from "../lib/tv/profile/types";

export async function runTvPersonalMatcherAndShortcutsTests() {
  console.log("[Test] Running TV Personal Matcher and Shortcut Mapping Tests...");

  // 1. Test generateDeterministicTvReasons with evidence show
  const mockCandidate: CandidateTvShow = {
    id: "show-123",
    tmdbId: 101,
    name: "Severance",
    originalName: "Severance",
    firstAirDate: "2022-02-18",
    lastAirDate: "2022-04-08",
    status: "Returning Series",
    originalLanguage: "en",
    popularity: 95.5,
    voteAverage: 8.7,
    voteCount: 1500,
    posterPath: "/poster.jpg",
    backdropPath: "/backdrop.jpg",
    overview: "Mark leads a team of office workers whose memories have been surgically divided.",
    metadata: {
      genres: ["Drama", "Sci-Fi & Fantasy", "Mystery"],
      numberOfSeasons: 2,
    },
  };

  const mockTvProfile: TvDnaResult = {
    schemaVersion: 1,
    algorithmVersion: 1,
    generatedAt: new Date().toISOString(),
    evaluatedCount: 15,
    evidenceCount: 10,
    confidence: 0.9,
    confidenceLabel: "Yüksek Güven",
    maturity: "ESTABLISHED",
    maturityLabel: "Oturmuş",
    genres: [
      { genreId: 10765, name: "Sci-Fi & Fantasy", state: "POSITIVE", score: 0.9, exposure: 5, ratedCount: 4, confidence: 0.9 },
      { genreId: 9648, name: "Mystery", state: "POSITIVE", score: 0.85, exposure: 4, ratedCount: 3, confidence: 0.85 },
      { genreId: 18, name: "Drama", state: "POSITIVE", score: 0.8, exposure: 6, ratedCount: 5, confidence: 0.8 },
    ],
    eras: [],
    popularityOrientation: { orientation: "BALANCED", score: 0.5, label: "Dengeli", description: "" },
    formatPreference: { preference: "FLEXIBLE", miniseriesScore: 0.5, multiSeasonScore: 0.8, longRunningScore: 0.4, description: "" },
    seriesLengthPreference: { preference: "BALANCED", avgSeasons: 3, description: "" },
    episodeRuntimePreference: { preference: "STANDARD", avgMinutes: 50, description: "" },
    statusPreference: { preference: "FLEXIBLE", endedScore: 0.5, returningScore: 0.5, description: "" },
    internationalOrientation: { orientation: "GLOBAL_EXPLORER", nonEnglishRatio: 0.3, topLanguages: ["en", "de"], topCountries: ["US", "DE"], description: "" },
    networkStyleOrientation: { hasSufficientEvidence: true, dominantStyle: "Prestige Cable", description: "" },
    archetypes: [],
    humanInsights: [],
  };

  const mockMatchResult = {
    rawScore: 0.91,
    matchScore: 94,
    matchLabel: "Kusursuz Uyum",
    deterministicExplanation: "Daha önce beğendiğin Dark ile benzer temalarda.",
    reasonCodes: ["EVIDENCE_MATCH", "GENRE_MATCH"],
    evidenceShows: [{ id: "evidence-1", name: "Dark", similarity: 0.88 }],
    scoreBreakdown: {
      genreScore: 0.95,
      themeScore: 0.85,
      paceScore: 0.9,
      formatScore: 0.95,
      qualityScore: 0.92,
      penaltyTotal: 0,
    },
  };

  const result = generateDeterministicTvReasons(mockCandidate, mockMatchResult as any, mockTvProfile);

  assert.ok(result.headline.includes("Dark"), "Headline should mention the evidence show");
  assert.ok(result.reasons.length > 0, "Reasons array should not be empty");
  assert.ok(
    result.reasons.some((r) => r.includes("Dark")),
    "Should include evidence show reference in reasons"
  );
  assert.ok(
    result.reasons.some((r) => r.includes("Sci-Fi & Fantasy") || r.includes("Drama")),
    "Should include positive genre affinity reason"
  );

  console.log("  ✓ All TV Personal Matcher and Shortcut Mapping Tests passed!");
}
