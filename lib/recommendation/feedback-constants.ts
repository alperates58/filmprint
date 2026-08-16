import { RecommendationAction, RatingStatus } from "@prisma/client";

export const MATCH_ENGINE_VERSION = 3;

export const FEEDBACK_ADJUSTMENT_BOUNDS = {
  MIN: -15,
  MAX: 10,
};

export const ACTION_WEIGHTS: Record<string, number> = {
  // Direct Action Weights
  [RecommendationAction.LIKE]: 6.0,
  [RecommendationAction.WATCHLIST]: 10.0,
  [RecommendationAction.DISLIKE]: -15.0,
  [RecommendationAction.WATCH_LATER]: 8.0,
  [RecommendationAction.NOT_INTERESTED]: -12.0,

  // Watched from recommendation with Rating
  [`${RecommendationAction.WATCHED_FROM_RECOMMENDATION}_${RatingStatus.LOVE}`]: 5.0,
  [`${RecommendationAction.WATCHED_FROM_RECOMMENDATION}_${RatingStatus.LIKE}`]: 3.0,
  [`${RecommendationAction.WATCHED_FROM_RECOMMENDATION}_${RatingStatus.NEUTRAL}`]: 0.0,
  [`${RecommendationAction.WATCHED_FROM_RECOMMENDATION}_${RatingStatus.DISLIKE}`]: -6.0,

  // Already watched confirmation with Rating
  [`${RecommendationAction.ALREADY_WATCHED}_${RatingStatus.LOVE}`]: 4.0,
  [`${RecommendationAction.ALREADY_WATCHED}_${RatingStatus.LIKE}`]: 2.0,
  [`${RecommendationAction.ALREADY_WATCHED}_${RatingStatus.NEUTRAL}`]: 0.0,
  [`${RecommendationAction.ALREADY_WATCHED}_${RatingStatus.DISLIKE}`]: -5.0,
};

// Feature Affinity Similarity Increments
export const SIMILARITY_FEATURE_WEIGHTS = {
  LIKE: {
    GENRE: 1.5,
    KEYWORD: 1.0,
    DIRECTOR: 3.0,
    ERA: 1.0,
  },
  WATCHLIST: {
    GENRE: 2.0,
    KEYWORD: 1.5,
    DIRECTOR: 4.0,
    ERA: 1.5,
  },
  DISLIKE: {
    GENRE: -2.0,
    KEYWORD: -1.5,
    DIRECTOR: -4.0,
    ERA: -1.0,
  },
};

export function getRecencyWeight(daysAgo: number): number {
  if (daysAgo <= 30) return 1.0;
  if (daysAgo <= 90) return 0.75;
  return 0.5;
}
