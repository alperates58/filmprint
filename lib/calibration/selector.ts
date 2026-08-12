import { scoreCandidateMovie } from "./scoring";
import {
  CandidateMovie,
  RecentInteractionPattern,
  CandidateScoringResult,
  UserTasteProfileInput,
} from "./types";

/**
 * Pure, deterministic Active Learning candidate selector.
 * Ranks candidate movies based on information gain and uncertainty reduction.
 */
export function rankCandidateMovies(
  candidates: CandidateMovie[],
  profile: UserTasteProfileInput | null,
  recentHistory: RecentInteractionPattern[] = []
): CandidateScoringResult[] {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  const scoredCandidates = candidates.map((movie: any) =>
    scoreCandidateMovie(movie, profile, recentHistory)
  );

  // Sort descending by calculated information gain score
  return scoredCandidates.sort((a, b) => b.score - a.score || b.movie.popularity - a.movie.popularity);
}
