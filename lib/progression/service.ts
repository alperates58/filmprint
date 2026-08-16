import { RANK_DEFINITIONS, TV_RANK_DEFINITIONS } from "./constants";
import type { RankDefinition, TvRankKey, UserProgression } from "./types";

/**
 * Deterministically returns the current rank definition for a given evaluated count and rank ladder.
 */
export function resolveRankFromLadder<K extends string = string>(
  evaluatedCount: number,
  ranks: RankDefinition<K>[]
): RankDefinition<K> {
  const count = Math.max(0, evaluatedCount);
  let currentRank = ranks[0];

  for (let i = 0; i < ranks.length; i++) {
    if (count >= ranks[i].minimum) {
      currentRank = ranks[i];
    } else {
      break;
    }
  }

  return currentRank;
}

/**
 * Generic progression calculator for any rank ladder.
 */
export function getProgressionState<K extends string = string>(
  evaluatedCount: number,
  ranks: RankDefinition<K>[]
): UserProgression<K> {
  const count = Math.max(0, evaluatedCount);
  const currentRank = resolveRankFromLadder(count, ranks);
  const currentIndex = ranks.findIndex((r) => r.key === currentRank.key);

  const previousRank = currentIndex > 0 ? ranks[currentIndex - 1] : null;
  const nextRank = currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : null;
  const upcomingRanks = nextRank ? ranks.slice(currentIndex + 1, currentIndex + 4) : [];

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

/**
 * Deterministically returns the current rank definition for a given evaluated movie count.
 */
export function getRankForCount(evaluatedCount: number): RankDefinition {
  return resolveRankFromLadder(evaluatedCount, RANK_DEFINITIONS);
}

/**
 * Deterministically calculates full user progression for a given evaluated movie count.
 * Never crashes on arbitrarily large interaction counts (e.g. 30,000, 100,000+).
 */
export function getProgressionForCount(evaluatedCount: number): UserProgression {
  return getProgressionState(evaluatedCount, RANK_DEFINITIONS);
}

/**
 * Deterministically returns the current rank definition for a given evaluated TV show count.
 */
export function getTvRankForCount(evaluatedCount: number): RankDefinition<TvRankKey> {
  return resolveRankFromLadder(evaluatedCount, TV_RANK_DEFINITIONS);
}

/**
 * Deterministically calculates full user progression for a given evaluated TV show count.
 * Never crashes on arbitrarily large interaction counts (e.g. 10,000, 100,000+).
 */
export function getTvProgressionForCount(evaluatedCount: number): UserProgression<TvRankKey> {
  return getProgressionState(evaluatedCount, TV_RANK_DEFINITIONS);
}

