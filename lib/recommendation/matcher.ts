import type { CandidateMovie } from "../calibration/types";
import type { FilmDnaResult } from "../profile/types";
import type { MovieMatchResult, MatchComponents, CandidateEvidence } from "./types";
import { MATCH_WEIGHTS, NEGATIVE_GENRE_PENALTY, DISPLAY_MATCH_SCORE_MAX, getMatchLabel } from "./constants";
import { FEEDBACK_ADJUSTMENT_BOUNDS } from "./feedback-constants";
import type { FeedbackProfile } from "./feedback-profile";
import { EMPTY_FEEDBACK_PROFILE } from "./feedback-profile";
import { calculateQualityScore } from "./quality";

/**
 * Calibrates raw match score to user-facing display score (Match Engine v3.1).
 * Capped at DISPLAY_MATCH_SCORE_MAX (97%). Requires strong reference evidence for 90%+ scores.
 */
export function calibrateMatchScore(
  rawScore: number,
  hasStrongEvidence: boolean = false
): number {
  const boundedRaw = Math.max(0, Math.min(100, rawScore));

  // Cap at 97% max
  let calibrated = Math.min(DISPLAY_MATCH_SCORE_MAX, boundedRaw);

  // High score requirement: 90%+ display score requires strong evidence support
  if (calibrated >= 90 && !hasStrongEvidence) {
    calibrated = 89;
  }

  // Smooth upper distribution to eliminate 100% saturation
  if (calibrated >= 90) {
    calibrated = 90 + Math.floor((calibrated - 90) * 0.7);
  }

  return Math.max(0, Math.min(DISPLAY_MATCH_SCORE_MAX, Math.round(calibrated)));
}

/**
 * Calculates deterministic match score between a candidate movie and a user's Film DNA profile
 * with feedback learning adjustments and Bayesian quality weighting (Match Engine v3.1).
 */
export function calculateMovieMatch(
  movie: CandidateMovie,
  profile: FilmDnaResult,
  feedbackProfile: FeedbackProfile = EMPTY_FEEDBACK_PROFILE,
  evidence?: CandidateEvidence
): MovieMatchResult {
  const reasons: string[] = [];

  const genreScoreMap = new Map<string, number>(
    (profile.genres || []).map((g: any) => [g.name, g.score])
  );
  const eraScoreMap = new Map<string, number>(
    (profile.eras || []).map((e: any) => [e.key, e.score])
  );

  // 1. Genre Match Score (0.0 - 1.0)
  let genreScore = 0.5;
  let hasDislikedGenre = false;

  if (movie.genres && movie.genres.length > 0) {
    let genreSum = 0;
    for (const g of movie.genres) {
      const dnaScore = genreScoreMap.get(g) ?? 0.5;
      genreSum += dnaScore;
      if (dnaScore < 0.25) {
        hasDislikedGenre = true;
      }
    }
    genreScore = genreSum / movie.genres.length;
  }

  // 2. Era Match Score (0.0 - 1.0)
  let eraScore = 0.5;
  if (movie.releaseYear) {
    const decade = `${Math.floor(movie.releaseYear / 10) * 10}s`;
    eraScore = eraScoreMap.get(decade) ?? 0.5;
  }

  // 3. Popularity Fit Score (0.0 - 1.0)
  let popularityScore = 0.5;
  const popOrientation = profile.popularity?.orientation || "balanced";
  if (popOrientation === "mainstream") {
    popularityScore = Math.min(1.0, movie.popularity / 100);
  } else if (popOrientation === "niche") {
    popularityScore = Math.max(0.0, 1.0 - movie.popularity / 100);
  } else {
    popularityScore = 0.75;
  }

  // 4. Bayesian Weighted Quality Score (0.0 - 1.0)
  const qualityScoreValue = calculateQualityScore(movie);

  // 5. Discovery Balance Score (0.0 - 1.0)
  let discoveryScore = 0.5;
  const discoveryPref = profile.familiarity?.label || "balanced";
  if (discoveryPref === "discovery_heavy") {
    discoveryScore = Math.max(0.0, 1.0 - movie.popularity / 100);
  } else {
    discoveryScore = Math.min(1.0, movie.popularity / 100);
  }

  // Calculate Base Match Score (0 - 100)
  let rawBaseScore =
    genreScore * MATCH_WEIGHTS.GENRE * 100 +
    eraScore * MATCH_WEIGHTS.ERA * 100 +
    popularityScore * MATCH_WEIGHTS.POPULARITY * 100 +
    qualityScoreValue * MATCH_WEIGHTS.QUALITY * 100 +
    discoveryScore * MATCH_WEIGHTS.DISCOVERY * 100;

  // Apply Negative Disliked Genre Penalty (-25)
  if (hasDislikedGenre) {
    rawBaseScore += NEGATIVE_GENRE_PENALTY;
    reasons.push("Negative genre preference applied");
  }

  // Clamp base score to [0, 100]
  const baseMatchScore = Math.max(0, Math.min(100, rawBaseScore));

  // 6. Feedback Adjustment Calculation (-15 to +10)
  let rawFeedbackAdj = 0;

  if (movie.genres && movie.genres.length > 0) {
    for (const g of movie.genres) {
      const gSignal = feedbackProfile.genreSignals[g];
      if (gSignal !== undefined) {
        rawFeedbackAdj += gSignal;
      }
    }
  }

  if (movie.releaseYear) {
    const eraDecade = `${Math.floor(movie.releaseYear / 10) * 10}s`;
    const eSignal = feedbackProfile.eraSignals[eraDecade];
    if (eSignal !== undefined) {
      rawFeedbackAdj += eSignal;
    }
  }

  // Strictly clamp feedback adjustment to [-15, +10]
  const feedbackAdjustment = Math.max(
    FEEDBACK_ADJUSTMENT_BOUNDS.MIN,
    Math.min(FEEDBACK_ADJUSTMENT_BOUNDS.MAX, Math.round(rawFeedbackAdj))
  );

  // Raw uncalibrated score
  const rawMatchScore = Math.max(0, Math.min(100, Math.round(baseMatchScore + feedbackAdjustment)));

  // Calibrated display score (v3.1)
  const hasStrongEvidence = evidence?.hasStrongReference ?? false;
  const displayMatchScore = calibrateMatchScore(rawMatchScore, hasStrongEvidence);

  const components: MatchComponents = {
    genre: Number(genreScore.toFixed(2)),
    era: Number(eraScore.toFixed(2)),
    popularity: Number(popularityScore.toFixed(2)),
    quality: Number(qualityScoreValue.toFixed(2)),
    discovery: Number(discoveryScore.toFixed(2)),
    feedback: Number((feedbackAdjustment / 10).toFixed(2)),
    tasteFit: Number(genreScore.toFixed(2)),
    evidenceFit: hasStrongEvidence ? (evidence?.positiveReferences[0]?.similarityScore || 0.7) : 0.4,
    qualityFit: Number(qualityScoreValue.toFixed(2)),
  };

  return {
    movie,
    matchScore: displayMatchScore,
    rawMatchScore,
    displayMatchScore,
    qualityScore: qualityScoreValue,
    matchLabel: getMatchLabel(displayMatchScore),
    feedbackAdjustment,
    components,
    reasons,
  };
}

