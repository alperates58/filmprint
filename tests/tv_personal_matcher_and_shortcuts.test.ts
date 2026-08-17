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
    archetype: { primary: "Mind-Bender", confidence: 0.9, secondary: "Thriller" },
    genres: [
      { name: "Sci-Fi & Fantasy", state: "POSITIVE", weight: 0.9 },
      { name: "Mystery", state: "POSITIVE", weight: 0.85 },
      { name: "Drama", state: "POSITIVE", weight: 0.8 },
    ],
    themes: [],
    moods: [],
    eras: [],
    maturityLevel: "MATURE",
    pacePreference: "MODERATE",
    formatPreference: "BALANCED_SERIES",
    diversityIndex: 0.8,
    antiGenres: [],
    directors: [],
    actors: [],
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
