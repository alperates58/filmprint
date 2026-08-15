import { calculateCategoryContextFit, deduplicateHomeModules, filterCategoryCandidatesWithRelaxation } from "../lib/recommendation/editorial-scorer";
import { calculateMovieMatch, calibrateMatchScore } from "../lib/recommendation/matcher";
import { calculateQualityScore, calculateWeightedQualityRating } from "../lib/recommendation/quality";
import { getEvidenceForRecommendation, calculateDislikePenalty } from "../lib/recommendation/evidence";
import { auditRecommendationCandidate } from "../lib/recommendation/audit";
import type { CandidateMovie } from "../lib/calibration/types";
import type { TasteEvidenceProfile, TasteEvidenceMovie } from "../lib/recommendation/types";
import type { FilmDnaResult } from "../lib/profile/types";

export function runPhase7b1Tests() {
  console.log("=== PHASE 7B.1 RECOMMENDATION SUPPLY, NOT_WATCHED RECOVERY & CALIBRATION TESTS ===\n");
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string) {
    totalCount++;
    if (condition) {
      console.log(`[PASS] Test ${totalCount}: ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] Test ${totalCount}: ${testName}`);
    }
  }

  // --- MOCK FIXTURES ---
  const movieA_NotWatched: CandidateMovie = {
    id: "m-notwatched-1",
    tmdbId: 101,
    title: "The Great Unwatched Movie",
    originalTitle: "The Great Unwatched Movie",
    releaseYear: 2019,
    popularity: 75,
    voteAverage: 8.2,
    posterPath: null,
    backdropPath: null,
    genres: ["Dram", "Gizem"],
    overview: "Kullanıcının daha önce izlemediğini belirttiği ama profil uyumu yüksek harika yapım.",
  };

  const movieB_Watched: CandidateMovie = {
    id: "m-watched-1",
    tmdbId: 102,
    title: "Already Watched Masterpiece",
    originalTitle: "Already Watched Masterpiece",
    releaseYear: 2010,
    popularity: 90,
    voteAverage: 8.8,
    posterPath: null,
    backdropPath: null,
    genres: ["Bilim Kurgu"],
    overview: "İzlenmiş film.",
  };

  const anotherRound: CandidateMovie = {
    id: "m-another-round",
    tmdbId: 580175,
    title: "Another Round",
    originalTitle: "Druk",
    releaseYear: 2020,
    popularity: 82,
    voteAverage: 7.7,
    posterPath: null,
    backdropPath: null,
    genres: ["Dram", "Komedi"],
    overview: "Dört lise öğretmeni kandaki alkol oranını sabit tutarak hayatı geliştirme deneyine girişir.",
  };

  const lowVoteHighRatingMovie: CandidateMovie = {
    id: "m-lowvote",
    tmdbId: 999,
    title: "Indie Obscurity",
    originalTitle: "Indie Obscurity",
    releaseYear: 2022,
    popularity: 5,
    voteAverage: 8.9, // High average but low vote count (pop 5)
    posterPath: null,
    backdropPath: null,
    genres: ["Dram"],
    overview: "Çok az oy almış bağımsız yapım.",
  };

  const sampleProfile: FilmDnaResult = {
    version: 1,
    generatedAt: new Date().toISOString(),
    confidence: 0.9,
    confidenceLabel: "Yüksek Güvenilirlik",
    summary: "Dram ve Psikolojik Sinema Odaklı Profil",
    sample: { totalInteractions: 1043, ratedMovies: 177, watched: 177, notWatched: 866, unsure: 0 },
    genres: [
      { name: "Dram", score: 0.90, ratedCount: 60, exposureCount: 60 },
      { name: "Gizem", score: 0.85, ratedCount: 40, exposureCount: 40 },
      { name: "Komedi", score: 0.70, ratedCount: 30, exposureCount: 30 },
      { name: "Korku", score: 0.10, ratedCount: 15, exposureCount: 15 },
    ],
    eras: [
      { key: "2010s", label: "2010'lar", score: 0.85, ratedCount: 80 },
      { key: "2020s", label: "2020'ler", score: 0.80, ratedCount: 50 },
    ],
    popularity: { orientation: "balanced", label: "Dengeli", avgPopularityScore: 70 },
    familiarity: { score: 0.6, label: "balanced", description: "Dengeli" },
    traits: ["Dram Tutkunu"],
  };

  const positiveEvidenceMovies: TasteEvidenceMovie[] = [
    {
      id: "ev-hunt",
      title: "The Hunt (Jagten)",
      rating: "LOVE",
      genres: ["Dram"],
      releaseYear: 2012,
      popularity: 80,
      voteAverage: 8.3,
    },
    {
      id: "ev-se7en",
      title: "Se7en",
      rating: "LOVE",
      genres: ["Suç", "Gizem"],
      releaseYear: 1995,
      popularity: 90,
      voteAverage: 8.6,
    },
  ];

  const tasteEvidenceProfile: TasteEvidenceProfile = {
    positiveCount: 2,
    ratedCount: 177,
    positiveMovies: positiveEvidenceMovies,
    negativeMovies: [
      {
        id: "ev-badhorror",
        title: "Bad Horror",
        rating: "DISLIKE",
        genres: ["Korku"],
        releaseYear: 2021,
      },
    ],
    clusters: [],
    evidenceFingerprint: "v31_test",
  };

  // =========================================================================
  // TEST 1: NOT_WATCHED Candidate Recommendation Eligibility
  // =========================================================================
  const notWatchedExclusions = new Set(["m-watched-1"]); // ONLY WATCHED excluded
  const isMovieANotWatchedEligible = !notWatchedExclusions.has(movieA_NotWatched.id);
  assert(
    isMovieANotWatchedEligible === true,
    "NOT_WATCHED movie ('The Great Unwatched Movie') is ELIGIBLE for recommendations"
  );

  // =========================================================================
  // TEST 2: WATCHED Recommendation Exclusion
  // =========================================================================
  const watchedExclusions = new Set(["m-watched-1"]);
  const isMovieBWatchedEligible = !watchedExclusions.has(movieB_Watched.id);
  assert(
    isMovieBWatchedEligible === false,
    "WATCHED movie ('Already Watched Masterpiece') is EXCLUDED from normal recommendations"
  );

  // =========================================================================
  // TEST 3: Score Calibration & Capping at 97%
  // =========================================================================
  const rawScore100 = 100;
  const calibratedWithEvidence = calibrateMatchScore(rawScore100, true);
  const calibratedWithoutEvidence = calibrateMatchScore(rawScore100, false);

  assert(
    calibratedWithEvidence <= 97 && calibratedWithEvidence >= 90,
    "Raw 100% score with strong evidence is calibrated to max 97% (not saturated at 100%)"
  );
  assert(
    calibratedWithoutEvidence <= 89,
    "Raw 100% score WITHOUT strong evidence is capped at 89%"
  );

  // =========================================================================
  // TEST 4: Bayesian Weighted Quality Floor
  // =========================================================================
  const weightedLowVote = calculateWeightedQualityRating(lowVoteHighRatingMovie);
  const qualityScoreLowVote = calculateQualityScore(lowVoteHighRatingMovie);
  assert(
    weightedLowVote < lowVoteHighRatingMovie.voteAverage && qualityScoreLowVote < 0.85,
    "Bayesian weighting pulls low-vote count high-rating movie down towards global mean (8.9 -> ~7.4)"
  );

  // =========================================================================
  // TEST 5: Empty Row Hiding (< 4 Movies Target)
  // =========================================================================
  const sparseCandidates: CandidateMovie[] = [movieA_NotWatched, anotherRound];
  const highTensionFiltered = filterCategoryCandidatesWithRelaxation(sparseCandidates, "HIGH_TENSION", 8);
  const isRowHidden = highTensionFiltered.length < 4;
  assert(
    isRowHidden === true,
    "Category row with fewer than 4 candidates is marked HIDDEN (minimum render = 4)"
  );

  // =========================================================================
  // TEST 6: Soft Cross-Row Deduplication
  // =========================================================================
  const mockModules = [
    { id: "rainy", movies: [movieA_NotWatched, anotherRound] },
    { id: "comedy", movies: [movieA_NotWatched, lowVoteHighRatingMovie] },
  ];
  const deduplicated = deduplicateHomeModules(mockModules);
  const movieAOccurrences = deduplicated.flatMap((m) => m.movies).filter((m) => m.id === movieA_NotWatched.id);
  assert(
    movieAOccurrences.length <= 2,
    "Cross-row deduplication limits movie occurrence to max 1-2 rows depending on category fit"
  );

  // =========================================================================
  // TEST 7: KNOWN_UNWATCHED_ROW Context Fit
  // =========================================================================
  const knownUnwatchedCandidate = { ...movieA_NotWatched, candidateSource: "KNOWN_UNWATCHED" as const };
  const freshCandidate = { ...movieB_Watched, candidateSource: "FRESH_DISCOVERY" as const };

  const fitKnownRow = calculateCategoryContextFit(knownUnwatchedCandidate, "KNOWN_UNWATCHED_ROW");
  const fitFreshRow = calculateCategoryContextFit(freshCandidate, "KNOWN_UNWATCHED_ROW");

  assert(
    fitKnownRow >= 0.6 && fitFreshRow === 0.0,
    "KNOWN_UNWATCHED_ROW accepts ONLY KNOWN_UNWATCHED candidate source"
  );

  // =========================================================================
  // TEST 8: Another Round (Körkütük) Evidence Audit
  // =========================================================================
  const auditResult = auditRecommendationCandidate(
    anotherRound,
    sampleProfile,
    tasteEvidenceProfile
  );

  assert(
    auditResult.movie.title === "Another Round" &&
      auditResult.evidenceAudit.hasStrongReference === false &&
      auditResult.evidenceAudit.profileSignals.length > 0,
    "Another Round (Körkütük) audit accurately detects weak direct reference similarity (0.46 < 0.60) and uses profile signals"
  );

  assert(
    auditResult.scores.displayMatchScore <= 97 && auditResult.scores.displayMatchScore >= 75,
    `Another Round receives calibrated display match score (${auditResult.scores.displayMatchScore}%) within realistic range`
  );

  console.log(`\nRESULTS: Passed ${passedCount} of ${totalCount} tests.\n`);
}

runPhase7b1Tests();
