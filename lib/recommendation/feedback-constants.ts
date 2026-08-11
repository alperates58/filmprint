import { RecommendationAction, RatingStatus } from "@prisma/client";

export const MATCH_ENGINE_VERSION = 2;

export const FEEDBACK_ADJUSTMENT_BOUNDS = {
  MIN: -15,
  MAX: 10,
};

export const ACTION_WEIGHTS: Record<string, number> = {
  // Watched from recommendation
  [`${RecommendationAction.WATCHED_FROM_RECOMMENDATION}_${RatingStatus.LOVE}`]: 4.0,
  [`${RecommendationAction.WATCHED_FROM_RECOMMENDATION}_${RatingStatus.LIKE}`]: 2.5,
  [`${RecommendationAction.WATCHED_FROM_RECOMMENDATION}_${RatingStatus.NEUTRAL}`]: 0.0,
  [`${RecommendationAction.WATCHED_FROM_RECOMMENDATION}_${RatingStatus.DISLIKE}`]: -5.0,

  // Already watched confirmation
  [`${RecommendationAction.ALREADY_WATCHED}_${RatingStatus.LOVE}`]: 3.0,
  [`${RecommendationAction.ALREADY_WATCHED}_${RatingStatus.LIKE}`]: 1.5,
  [`${RecommendationAction.ALREADY_WATCHED}_${RatingStatus.NEUTRAL}`]: 0.0,
  [`${RecommendationAction.ALREADY_WATCHED}_${RatingStatus.DISLIKE}`]: -4.0,

  // Intent signals
  [RecommendationAction.WATCH_LATER]: 1.5,
  [RecommendationAction.NOT_INTERESTED]: -3.0,
};

export function getRecencyWeight(daysAgo: number): number {
  if (daysAgo <= 30) return 1.0;
  if (daysAgo <= 90) return 0.6;
  return 0.3;
}
