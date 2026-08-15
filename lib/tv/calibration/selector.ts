import { scoreCandidateTvShow } from "./scoring";
import {
  CandidateTvShow,
  RecentTvInteractionPattern,
  TvCandidateScoringResult,
  TvSelectorUserState,
} from "./types";

/**
 * Ranks candidate TV shows deterministically based on active learning heuristics.
 */
export function rankCandidateTvShows(
  candidates: CandidateTvShow[],
  userState: TvSelectorUserState | null,
  recentHistory: RecentTvInteractionPattern[]
): TvCandidateScoringResult[] {
  const scoredResults = candidates.map((candidate) =>
    scoreCandidateTvShow(candidate, userState, recentHistory)
  );

  return scoredResults.sort((a, b) => {
    // 1. Primary score comparator
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // 2. Secondary tie-breaker: Vote Average
    if (b.tvShow.voteAverage !== a.tvShow.voteAverage) {
      return b.tvShow.voteAverage - a.tvShow.voteAverage;
    }
    // 3. Tertiary tie-breaker: Popularity
    if (b.tvShow.popularity !== a.tvShow.popularity) {
      return b.tvShow.popularity - a.tvShow.popularity;
    }
    // 4. Quaternary deterministic tie-breaker: TMDB ID
    return a.tvShow.tmdbId - b.tvShow.tmdbId;
  });
}
