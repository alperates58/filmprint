import {
  calculateTvMatch,
  calibrateTvMatchScore,
} from "../lib/tv/recommendation/matcher";
import {
  calculateTvQualityScore,
  calculateTvWeightedQualityRating,
} from "../lib/tv/recommendation/quality";
import {
  findGroundedTvEvidence,
  calculateTvSimilarity,
  calculateTvDislikePenalty,
} from "../lib/tv/recommendation/evidence";
import {
  applyTvDiversityRerank,
  normalizeDbTvShowToCandidate,
} from "../lib/tv/recommendation/service";
import { calculateTvTasteProfile } from "../lib/tv/profile/calculator";
import type {
  CandidateTvShow,
  TvTasteEvidenceShow,
  TvTasteEvidenceProfile,
  PersonalizedTvRecommendationItem,
} from "../lib/tv/recommendation/types";
import type { TvInteractionData } from "../lib/tv/profile/types";

// Helper to create mock candidate
function createMockCandidate(overrides: Partial<CandidateTvShow> = {}): CandidateTvShow {
  const id = overrides.id || `cand-${Math.random().toString(36).substring(7)}`;
  return {
    id,
    tmdbId: overrides.tmdbId || 101,
    name: overrides.name || "Test Candidate Show",
    originalName: overrides.originalName || "Test Candidate Show",
    overview: overrides.overview || "A great candidate series",
    posterPath: overrides.posterPath || "/poster.jpg",
    backdropPath: overrides.backdropPath || "/backdrop.jpg",
    firstAirDate: overrides.firstAirDate !== undefined ? overrides.firstAirDate : "2021-04-10",
    lastAirDate: overrides.lastAirDate !== undefined ? overrides.lastAirDate : "2023-05-15",
    status: overrides.status !== undefined ? overrides.status : "Ended",
    originalLanguage: overrides.originalLanguage !== undefined ? overrides.originalLanguage : "en",
    popularity: overrides.popularity !== undefined ? overrides.popularity : 65.0,
    voteAverage: overrides.voteAverage !== undefined ? overrides.voteAverage : 8.3,
    voteCount: overrides.voteCount !== undefined ? overrides.voteCount : 2500,
    metadata: {
      genres: ["Dram", "Suç"],
      numberOfSeasons: 2,
      numberOfEpisodes: 20,
      episodeRunTime: [48],
      networks: [{ id: 49, name: "HBO" }],
      originCountry: ["US"],
      ...overrides.metadata,
    },
  };
}

// Helper to create mock interaction for profile calculation
function createMockInteraction(overrides: Partial<TvInteractionData> = {}): TvInteractionData {
  const id = overrides.id || `inter-${Math.random().toString(36).substring(7)}`;
  return {
    id,
    tvShowId: overrides.tvShowId || `show-${id}`,
    status: overrides.status || "WATCHED",
    rating: overrides.rating !== undefined ? overrides.rating : "LOVE",
    answeredAt: overrides.answeredAt || new Date("2026-08-01T12:00:00Z"),
    updatedAt: overrides.updatedAt || new Date("2026-08-01T12:00:00Z"),
    tvShow: {
      id: overrides.tvShow?.id || `show-${id}`,
      tmdbId: overrides.tvShow?.tmdbId || 1001,
      name: overrides.tvShow?.name || "Test Show",
      originalName: overrides.tvShow?.originalName || "Test Show",
      firstAirDate: overrides.tvShow?.firstAirDate !== undefined ? overrides.tvShow.firstAirDate : "2019-01-01",
      lastAirDate: overrides.tvShow?.lastAirDate !== undefined ? overrides.tvShow.lastAirDate : "2022-01-01",
      status: overrides.tvShow?.status !== undefined ? overrides.tvShow.status : "Ended",
      originalLanguage: overrides.tvShow?.originalLanguage !== undefined ? overrides.tvShow.originalLanguage : "en",
      popularity: overrides.tvShow?.popularity !== undefined ? overrides.tvShow.popularity : 50.0,
      voteAverage: overrides.tvShow?.voteAverage !== undefined ? overrides.tvShow.voteAverage : 8.0,
      metadata: {
        genres: ["Dram", "Suç"],
        numberOfSeasons: 3,
        episodeRunTime: [50],
        ...overrides.tvShow?.metadata,
      },
    },
  };
}

export async function runTvRecommendationMatcherTests() {
  console.log("=== TV PHASE 3: DETERMINISTIC TV RECOMMENDATION ENGINE TESTS ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // Setup user profiles
  // User 1: Crime & Mystery Lover (High Confidence)
  const crimeMysteryInteractions: TvInteractionData[] = Array.from({ length: 35 }, (_, idx) =>
    createMockInteraction({
      id: `cm-${idx}`,
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: `s-cm-${idx}`,
        tmdbId: 100 + idx,
        name: `Crime Series ${idx}`,
        originalName: `Crime Series ${idx}`,
        firstAirDate: "2018-01-01",
        lastAirDate: "2021-01-01",
        status: "Ended",
        originalLanguage: "en",
        popularity: 70,
        voteAverage: 8.4,
        metadata: { genres: ["Suç", "Gizem", "Dram"], numberOfSeasons: 3, episodeRunTime: [50] },
      },
    })
  );
  const profileCrimeMystery = calculateTvTasteProfile(crimeMysteryInteractions);

  // User 2: Miniseries & Short Runtime Lover
  const miniseriesInteractions: TvInteractionData[] = Array.from({ length: 20 }, (_, idx) =>
    createMockInteraction({
      id: `mini-${idx}`,
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: `s-mini-${idx}`,
        tmdbId: 200 + idx,
        name: `Mini Series ${idx}`,
        originalName: `Mini Series ${idx}`,
        firstAirDate: "2020-01-01",
        lastAirDate: "2020-02-01",
        status: "Ended",
        originalLanguage: "en",
        popularity: 60,
        voteAverage: 8.5,
        metadata: { genres: ["Dram"], numberOfSeasons: 1, episodeRunTime: [25] },
      },
    })
  );
  const profileMiniseries = calculateTvTasteProfile(miniseriesInteractions);

  // User 3: Global Explorer (Non-English Lover)
  const globalInteractions: TvInteractionData[] = Array.from({ length: 25 }, (_, idx) =>
    createMockInteraction({
      id: `glob-${idx}`,
      status: "WATCHED",
      rating: "LOVE",
      tvShow: {
        id: `s-glob-${idx}`,
        tmdbId: 300 + idx,
        name: `International Series ${idx}`,
        originalName: `International Series ${idx}`,
        firstAirDate: "2021-01-01",
        lastAirDate: "2022-01-01",
        status: "Ended",
        originalLanguage: idx % 2 === 0 ? "de" : "ko",
        popularity: 80,
        voteAverage: 8.6,
        metadata: { genres: ["Gizem", "Dram"], numberOfSeasons: 2, episodeRunTime: [55] },
      },
    })
  );
  const profileGlobal = calculateTvTasteProfile(globalInteractions);

  // 1. Crime/Mystery Candidate gets high match score for Crime/Mystery lover
  const candCrime = createMockCandidate({
    name: "Mindhunter",
    voteAverage: 8.6,
    voteCount: 3500,
    metadata: { genres: ["Suç", "Dram", "Gizem"], numberOfSeasons: 2, episodeRunTime: [50] },
  });
  const resCrime = calculateTvMatch(candCrime, profileCrimeMystery);
  assert(resCrime.matchScore >= 80, "Crime/Mystery candidate receives high match score (>= 80) for Crime/Mystery lover");

  // 2. Comedy Candidate gets lower match score for Crime/Mystery lover
  const candComedy = createMockCandidate({
    name: "Modern Family",
    voteAverage: 8.5,
    voteCount: 4000,
    metadata: { genres: ["Komedi"], numberOfSeasons: 11, episodeRunTime: [22] },
  });
  const resComedy = calculateTvMatch(candComedy, profileCrimeMystery);
  assert(resCrime.matchScore > resComedy.matchScore + 10, "Crime candidate scores significantly higher than unrelated Comedy candidate");

  // 3. Miniseries lover gets format boost for 1-season show
  const candMini = createMockCandidate({
    name: "Chernobyl",
    status: "Ended",
    metadata: { genres: ["Dram"], numberOfSeasons: 1, episodeRunTime: [25] },
  });
  const resMini = calculateTvMatch(candMini, profileMiniseries);
  assert(resMini.scoreBreakdown.formatFit >= 0.70, "Miniseries lover receives format boost (>= 0.70) for 1-season show");

  // 4. Global explorer gets international boost for non-English candidate
  const candGerman = createMockCandidate({
    name: "Dark",
    originalLanguage: "de",
    metadata: { genres: ["Gizem", "Dram"], numberOfSeasons: 3 },
  });
  const resGerman = calculateTvMatch(candGerman, profileGlobal);
  assert(resGerman.scoreBreakdown.internationalFit >= 0.85, "Global Explorer receives strong international fit (>= 0.85) for German show");

  // 5. Bayesian Quality Scorer: High rating + low votes is pulled towards global mean
  const candLowVotes = createMockCandidate({
    voteAverage: 9.5,
    voteCount: 5,
  });
  const qualityLowVotes = calculateTvWeightedQualityRating(candLowVotes);
  assert(qualityLowVotes < 8.0, "High vote average (9.5) with only 5 votes is pulled down towards global mean (< 8.0)");

  // 6. Bayesian Quality Scorer: High rating + high votes produces strong quality
  const candHighVotes = createMockCandidate({
    voteAverage: 8.8,
    voteCount: 30000,
  });
  const qualityHighVotes = calculateTvWeightedQualityRating(candHighVotes);
  assert(qualityHighVotes >= 8.6, "High vote average (8.8) with 30,000 votes produces strong quality rating (>= 8.6)");

  // 7. Match Score Calibration: Maximum ceiling is 97% (no 100%)
  const scoreCalibratedMax = calibrateTvMatchScore(100, 0.95, true);
  assert(scoreCalibratedMax <= 97, "Calibrated match score is strictly capped at 97% (never 100%)");

  // 8. Confidence Gating: Low confidence profile (< 0.60) suppresses score to max 88
  const scoreLowConf = calibrateTvMatchScore(98, 0.40, true);
  assert(scoreLowConf <= 88, "Low confidence profile (< 0.60) suppresses match score to max 88");

  // 9. Confidence Gating: Medium confidence profile (0.60 - 0.74) suppresses score to max 93
  const scoreMedConf = calibrateTvMatchScore(98, 0.68, true);
  assert(scoreMedConf <= 93, "Medium confidence profile (0.60 - 0.74) suppresses match score to max 93");

  // 10. Evidence requirement: High confidence profile without grounded evidence is capped at 89
  const scoreNoEvidence = calibrateTvMatchScore(95, 0.85, false);
  assert(scoreNoEvidence <= 89, "High confidence profile without strong grounded evidence is capped at 89");

  // 11. Grounded positive evidence finds matching reference show
  const positiveEvidence: TvTasteEvidenceShow[] = [
    {
      id: "ev-1",
      tmdbId: 88101,
      name: "Breaking Bad",
      posterPath: "/bb.jpg",
      rating: "LOVE",
      status: "WATCHED",
      genres: ["Dram", "Suç"],
      seasons: 5,
      runtime: 48,
      firstAirYear: 2008,
      originalLanguage: "en",
      networks: ["amc"],
    },
  ];
  const candBetterCallSaul = createMockCandidate({
    name: "Better Call Saul",
    metadata: { genres: ["Dram", "Suç"], numberOfSeasons: 6, episodeRunTime: [50], networks: [{ name: "amc" }] },
  });
  const refs = findGroundedTvEvidence(candBetterCallSaul, positiveEvidence);
  assert(refs.length >= 1 && refs[0].name === "Breaking Bad", "Grounded reference engine successfully links Better Call Saul to Breaking Bad");

  // 12. Dislike Penalty: Candidate strongly similar to a disliked show receives mild penalty
  const negativeEvidence: TvTasteEvidenceShow[] = [
    {
      id: "dis-1",
      tmdbId: 991,
      name: "Terrible Copycat Show",
      posterPath: "/bad.jpg",
      rating: "DISLIKE",
      status: "WATCHED",
      genres: ["Pembe Dizi", "Dram"],
      seasons: 12,
      runtime: 120,
      firstAirYear: 2015,
      originalLanguage: "tr",
      networks: ["soap_channel"],
    },
  ];
  const candSimilarToDisliked = createMockCandidate({
    name: "Another Copycat Soap",
    metadata: { genres: ["Pembe Dizi", "Dram"], numberOfSeasons: 12, episodeRunTime: [120] },
    originalLanguage: "tr",
  });
  const dislikePen = calculateTvDislikePenalty(candSimilarToDisliked, negativeEvidence);
  assert(dislikePen >= 6, "Candidate strongly similar to a disliked series receives a dislike penalty (>= 6 points)");

  // 13. Dislike Penalty: Dissimilar candidate receives 0 dislike penalty
  const dislikePenClean = calculateTvDislikePenalty(candCrime, negativeEvidence);
  assert(dislikePenClean === 0, "Unrelated candidate receives 0 dislike penalty");

  // 14. Diversity Reranker: Interleaves candidates to prevent genre dominance in Top 10
  const candidateItems: PersonalizedTvRecommendationItem[] = Array.from({ length: 15 }, (_, idx) => {
    const isCrime = idx < 10;
    return {
      tvShow: createMockCandidate({
        id: `rec-${idx}`,
        name: isCrime ? `Crime Show ${idx}` : `SciFi Show ${idx}`,
        metadata: {
          genres: isCrime ? ["Suç", "Gizem"] : ["Bilim Kurgu & Fantezi"],
          numberOfSeasons: isCrime ? 3 : 2,
        },
      }),
      matchScore: 90 - idx,
      matchLabel: "Yüksek Uyum",
      source: "FRESH_DISCOVERY",
      scoreBreakdown: {} as any,
      reasonCodes: [],
      evidenceShows: [],
      deterministicExplanation: "Uyumlu",
    };
  });

  const diversified = applyTvDiversityRerank(candidateItems);
  const top5Genres = diversified.slice(0, 5).map((d) => d.tvShow.metadata.genres?.[0]);
  const hasSciFiInTop5 = top5Genres.includes("Bilim Kurgu & Fantezi");
  assert(hasSciFiInTop5, "Diversity reranker promotes high-quality alternate genres into top positions");

  console.log(`\n===============================================================`);
  console.log(`TV RECOMMENDATION MATCHER SUITE: Passed ${passed} of ${total} tests.`);
  console.log(`===============================================================\n`);
}
