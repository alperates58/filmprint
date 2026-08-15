import type { CandidateTvShow } from "./types";
import { TV_BAYESIAN_PRIOR_WEIGHT_M, TV_GLOBAL_MEAN_RATING_C } from "./constants";

/**
 * Calculates Bayesian weighted quality rating (0.0 to 10.0) for a TV show.
 * Prevents high-rating / low-vote count series from inflating quality scores.
 */
export function calculateTvWeightedQualityRating(show: CandidateTvShow): number {
  const voteAverage = show.voteAverage || 0;

  // Extract vote count from model or metadata, otherwise estimate based on popularity
  let voteCount = 0;
  if (typeof show.voteCount === "number" && show.voteCount > 0) {
    voteCount = show.voteCount;
  } else if (show.metadata && typeof (show.metadata as any).voteCount === "number") {
    voteCount = (show.metadata as any).voteCount;
  } else {
    const pop = show.popularity || 10;
    voteCount = Math.round(pop * 15);
  }

  // Bayesian Weighted Average Formula: (v * R + m * C) / (v + m)
  const weighted =
    (voteCount * voteAverage + TV_BAYESIAN_PRIOR_WEIGHT_M * TV_GLOBAL_MEAN_RATING_C) /
    (voteCount + TV_BAYESIAN_PRIOR_WEIGHT_M);

  return Number(weighted.toFixed(2));
}

/**
 * Normalizes TV quality score between 0.0 and 1.0 for the Match Engine.
 */
export function calculateTvQualityScore(show: CandidateTvShow): number {
  const weightedRating = calculateTvWeightedQualityRating(show);
  return Number(Math.max(0.0, Math.min(1.0, weightedRating / 10.0)).toFixed(3));
}
