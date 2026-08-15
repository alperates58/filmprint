export const TV_MATCH_ENGINE_VERSION = 1;
export const TV_DISPLAY_MATCH_SCORE_MAX = 97;
export const TV_DEFAULT_QUALITY_FLOOR = 62;

/**
 * TV Match Engine Component Weights (Sum = 1.00 / 100%)
 * Tuned with Taste-First Gating to prevent generic popularity false-highs.
 */
export const TV_MATCH_WEIGHTS = {
  genre: 0.38,
  quality: 0.18,
  format: 0.08,
  seriesLength: 0.06,
  runtime: 0.06,
  era: 0.05,
  popularity: 0.05,
  status: 0.04,
  international: 0.06,
  networkStyle: 0.04,
} as const;

/**
 * TV Bayesian Quality Parameters derived from episodic TV catalog distribution.
 */
export const TV_BAYESIAN_PRIOR_WEIGHT_M = 40; // Minimum votes parameter for TV
export const TV_GLOBAL_MEAN_RATING_C = 7.0;   // Global mean TMDB rating for TV

/**
 * Short-term feedback adjustment bounds (in score points).
 */
export const TV_FEEDBACK_ADJUSTMENT_BOUNDS = {
  min: -15,
  max: 10,
} as const;

/**
 * High score confidence ceilings for Match Score calibration.
 */
export const TV_CONFIDENCE_MATCH_CEILINGS = {
  LOW: { threshold: 0.60, maxScore: 88 },
  MEDIUM: { threshold: 0.75, maxScore: 93 },
  HIGH: { threshold: 1.00, maxScore: 97 },
} as const;

/**
 * Human-readable match labels based on display score.
 */
export function getTvMatchLabel(displayScore: number): string {
  if (displayScore >= 90) return "Mükemmel Uyum";
  if (displayScore >= 80) return "Çok Yüksek Uyum";
  if (displayScore >= 70) return "Yüksek Uyum";
  if (displayScore >= 60) return "İyi Eşleşme";
  return "Uyumlu";
}
