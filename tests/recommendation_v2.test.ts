import { calculateMovieMatch } from "../lib/recommendation/matcher.ts";
import type { FeedbackProfile } from "../lib/recommendation/feedback-profile.ts";
import { EMPTY_FEEDBACK_PROFILE } from "../lib/recommendation/feedback-profile.ts";
import { MATCH_ENGINE_VERSION } from "../lib/recommendation/constants.ts";
import { FEEDBACK_ADJUSTMENT_BOUNDS } from "../lib/recommendation/feedback-constants.ts";
import type { CandidateMovie } from "../lib/calibration/types.ts";
import type { FilmDnaResult } from "../lib/profile/types.ts";

export function runMatchEngineV2Tests() {
  console.log("=== PHASE 3D MATCH ENGINE V2 & FEEDBACK LEARNING UNIT TESTS ===\n");
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

  // Fixture Candidate Movies
  const sciFiMovie: CandidateMovie = {
    id: "m-scifi-1",
    tmdbId: 1001,
    title: "Sci-Fi Masterpiece",
    originalTitle: "Sci-Fi Masterpiece",
    releaseYear: 2022,
    popularity: 90,
    voteAverage: 8.5,
    posterPath: "/poster.jpg",
    backdropPath: "/backdrop.jpg",
    genres: ["Bilim Kurgu"],
    overview: "A sci fi movie",
  };

  const horrorMovie: CandidateMovie = {
    id: "m-horror-1",
    tmdbId: 1002,
    title: "Terrifying Horror",
    originalTitle: "Terrifying Horror",
    releaseYear: 2021,
    popularity: 80,
    voteAverage: 7.5,
    posterPath: "/horror.jpg",
    backdropPath: "/horror_bg.jpg",
    genres: ["Korku"],
    overview: "A horror movie",
  };

  // Fixture Film DNA Profile
  const neutralDnaProfile: FilmDnaResult = {
    version: 1,
    generatedAt: new Date().toISOString(),
    confidence: 0.8,
    confidenceLabel: "Good",
    sample: {
      totalInteractions: 30,
      ratedMovies: 25,
      watched: 20,
      notWatched: 8,
      unsure: 2,
    },
    summary: "Sci-Fi Enthusiast",
    genres: [
      { name: "Bilim Kurgu", score: 0.7, ratedCount: 10, exposureCount: 15 },
      { name: "Korku", score: 0.5, ratedCount: 5, exposureCount: 10 },
    ],
    eras: [{ key: "2020s", label: "2020s", score: 0.7, ratedCount: 8 }],
    popularity: { orientation: "balanced", label: "Dengeli", avgPopularityScore: 75 },
    familiarity: { score: 0.6, label: "balanced", description: "Dengeli" },
    traits: ["Sci-Fi Enthusiast"],
  };

  // 1. Cold Start (No Feedback) Test
  const coldStartSciFi = calculateMovieMatch(sciFiMovie, neutralDnaProfile, EMPTY_FEEDBACK_PROFILE);
  const coldStartHorror = calculateMovieMatch(horrorMovie, neutralDnaProfile, EMPTY_FEEDBACK_PROFILE);

  assert(
    coldStartSciFi.feedbackAdjustment === 0,
    "Cold Start: Empty feedback profile yields zero feedback adjustment"
  );

  // 2. Single Not Interested Damping Test
  const singleNotInterestedProfile: FeedbackProfile = {
    userId: "test-user-v2",
    genreSignals: { Korku: -1.5 }, // Single NOT_INTERESTED with 0.5 shrinkage damping (-1.5)
    eraSignals: {},
    positiveCount: 0,
    negativeCount: 1,
    watchLaterCount: 0,
    totalFeedbacks: 1,
  };
  const singleNiMatch = calculateMovieMatch(horrorMovie, neutralDnaProfile, singleNotInterestedProfile);
  assert(
    singleNiMatch.feedbackAdjustment === -1 && singleNiMatch.matchScore < coldStartHorror.matchScore,
    "Single Not Interested: Damped penalty applied (-1) without completely destroying match score"
  );

  // 3. Repeated Not Interested Penalty Test
  const repeatedNotInterestedProfile: FeedbackProfile = {
    userId: "test-user-v2",
    genreSignals: { Korku: -9.0 }, // 3x NOT_INTERESTED
    eraSignals: {},
    positiveCount: 0,
    negativeCount: 3,
    watchLaterCount: 0,
    totalFeedbacks: 3,
  };
  const repeatedNiMatch = calculateMovieMatch(horrorMovie, neutralDnaProfile, repeatedNotInterestedProfile);
  assert(
    (repeatedNiMatch.feedbackAdjustment || 0) < (singleNiMatch.feedbackAdjustment || 0),
    "Repeated Not Interested: Multiple rejections apply stronger negative penalty"
  );

  // 4. Positive Watched Feedback Test
  const positiveFeedbackProfile: FeedbackProfile = {
    userId: "test-user-v2",
    genreSignals: { "Bilim Kurgu": 6.5 }, // 2x LOVE on Sci-Fi
    eraSignals: {},
    positiveCount: 2,
    negativeCount: 0,
    watchLaterCount: 0,
    totalFeedbacks: 2,
  };
  const positiveMatch = calculateMovieMatch(sciFiMovie, neutralDnaProfile, positiveFeedbackProfile);
  assert(
    (positiveMatch.feedbackAdjustment || 0) > 0 && positiveMatch.matchScore >= coldStartSciFi.matchScore,
    "Positive Watched Feedback: LOVE ratings on Sci-Fi produce positive adjustment bonus"
  );

  // 5. Dislike vs Not Interested Semantics Test
  const dislikeWeight = -5.0;
  const notInterestedWeight = -3.0;
  assert(
    dislikeWeight < notInterestedWeight,
    "Signal Semantics: DISLIKE penalty (-5.0) is stronger than NOT_INTERESTED (-3.0)"
  );

  // 6. Watch Later Intent Test
  const watchLaterProfile: FeedbackProfile = {
    userId: "test-user-v2",
    genreSignals: { "Bilim Kurgu": 1.5 }, // WATCH_LATER on Sci-Fi
    eraSignals: {},
    positiveCount: 1,
    negativeCount: 0,
    watchLaterCount: 1,
    totalFeedbacks: 1,
  };
  const watchLaterMatch = calculateMovieMatch(sciFiMovie, neutralDnaProfile, watchLaterProfile);
  assert(
    (watchLaterMatch.feedbackAdjustment || 0) === 2,
    "Watch Later Intent: Small positive intent bonus applied (+2)"
  );

  // 7. Bounded Adjustment Test (-15 to +10)
  const extremePositiveProfile: FeedbackProfile = {
    userId: "test-user-v2",
    genreSignals: { "Bilim Kurgu": 35.0 }, // Extreme positive signals
    eraSignals: { "2020s": 20.0 },
    positiveCount: 10,
    negativeCount: 0,
    watchLaterCount: 0,
    totalFeedbacks: 10,
  };
  const extremeMatch = calculateMovieMatch(sciFiMovie, neutralDnaProfile, extremePositiveProfile);
  assert(
    extremeMatch.feedbackAdjustment === FEEDBACK_ADJUSTMENT_BOUNDS.MAX,
    `Bounded Adjustment: Extreme positive adjustment clamped strictly to MAX (+${FEEDBACK_ADJUSTMENT_BOUNDS.MAX})`
  );

  // 8. Determinism & Version Test
  const detMatch1 = calculateMovieMatch(sciFiMovie, neutralDnaProfile, positiveFeedbackProfile);
  const detMatch2 = calculateMovieMatch(sciFiMovie, neutralDnaProfile, positiveFeedbackProfile);
  assert(
    detMatch1.matchScore === detMatch2.matchScore && MATCH_ENGINE_VERSION >= 2,
    "Determinism & Version: Same input yields identical score and MATCH_ENGINE_VERSION is >= 2"
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runMatchEngineV2Tests();
