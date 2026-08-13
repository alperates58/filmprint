import type { CandidateMovie } from "../calibration/types";

export const BAYESIAN_PRIOR_WEIGHT_M = 50; // Minimum votes parameter
export const GLOBAL_MEAN_RATING_C = 6.8;   // Global mean TMDB rating

/**
 * Calculates Bayesian weighted quality rating (0.0 to 10.0) for a movie.
 * Prevents high-rating / low-vote count movies from inflating quality scores.
 */
export function calculateWeightedQualityRating(movie: CandidateMovie): number {
  const voteAverage = movie.voteAverage || 0;
  
  // Extract vote count from metadata if available, otherwise estimate based on popularity
  let voteCount = 0;
  if ((movie as any).voteCount !== undefined && typeof (movie as any).voteCount === "number") {
    voteCount = (movie as any).voteCount;
  } else if ((movie as any).metadata && typeof (movie as any).metadata.voteCount === "number") {
    voteCount = (movie as any).metadata.voteCount;
  } else {
    // Estimate voteCount from popularity signal if missing
    const pop = movie.popularity || 10;
    voteCount = Math.round(pop * 12);
  }

  // Bayesian Weighted Average Formula: (v * R + m * C) / (v + m)
  const weighted =
    (voteCount * voteAverage + BAYESIAN_PRIOR_WEIGHT_M * GLOBAL_MEAN_RATING_C) /
    (voteCount + BAYESIAN_PRIOR_WEIGHT_M);

  return Number(weighted.toFixed(2));
}

/**
 * Normalizes quality score between 0.0 and 1.0 for match engines.
 */
export function calculateQualityScore(movie: CandidateMovie): number {
  const weightedRating = calculateWeightedQualityRating(movie);
  return Number((weightedRating / 10).toFixed(3));
}
