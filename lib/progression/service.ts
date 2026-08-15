import { RANK_DEFINITIONS } from "./constants";
import type { RankDefinition, UserProgression } from "./types";

/**
 * Deterministically returns the current rank definition for a given evaluated movie count.
 */
export function getRankForCount(evaluatedCount: number): RankDefinition {
  const count = Math.max(0, evaluatedCount);
  let currentRank = RANK_DEFINITIONS[0];

  for (let i = 0; i < RANK_DEFINITIONS.length; i++) {
    if (count >= RANK_DEFINITIONS[i].minimum) {
      currentRank = RANK_DEFINITIONS[i];
    } else {
      break;
    }
  }

  return currentRank;
}

/**
 * Deterministically calculates full user progression for a given evaluated movie count.
 * Never crashes on arbitrarily large interaction counts (e.g. 30,000, 100,000+).
 */
export function getProgressionForCount(evaluatedCount: number): UserProgression {
  const count = Math.max(0, evaluatedCount);
  const currentRank = getRankForCount(count);
  const currentIndex = RANK_DEFINITIONS.findIndex((r) => r.key === currentRank.key);

  const previousRank = currentIndex > 0 ? RANK_DEFINITIONS[currentIndex - 1] : null;
  const nextRank = currentIndex < RANK_DEFINITIONS.length - 1 ? RANK_DEFINITIONS[currentIndex + 1] : null;
  const upcomingRanks = nextRank ? RANK_DEFINITIONS.slice(currentIndex + 1, currentIndex + 4) : [];

  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      previousRank,
      upcomingRanks: [],
      evaluatedCount: count,
      remaining: 0,
      progress: 1.0,
      isMaxRank: true,
    };
  }

  const rangeTotal = nextRank.minimum - currentRank.minimum;
  const currentProgressCount = count - currentRank.minimum;
  const remaining = Math.max(0, nextRank.minimum - count);
  const rawProgress = rangeTotal > 0 ? currentProgressCount / rangeTotal : 1.0;
  const progress = Math.min(1.0, Math.max(0.0, Math.round(rawProgress * 100) / 100));

  return {
    currentRank,
    nextRank,
    previousRank,
    upcomingRanks,
    evaluatedCount: count,
    remaining,
    progress,
    isMaxRank: false,
  };
}
