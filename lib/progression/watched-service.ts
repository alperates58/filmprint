import { db } from "@/lib/db/client";

export interface CanonicalWatchedStats {
  movieWatchedCount: number;
  tvWatchedCount: number;
  totalWatchedCount: number;
  movieEvaluationCount: number;
  tvEvaluationCount: number;
  totalEvaluationCount: number;
  movieTasteEvidenceCount: number;
  tvTasteEvidenceCount: number;
}

/**
 * Calculates distinct watched counts and evaluation counts for a user.
 * Rank is strictly computed from distinct watched content (status === "WATCHED").
 * NOT_WATCHED, UNSURE, and TV PARTIALLY_WATCHED give 0 rank.
 */
export async function getCanonicalWatchedCounts(userId: string): Promise<CanonicalWatchedStats> {
  const [
    movieInteractions,
    tvInteractions,
    movieLibrary,
    tvLibrary,
  ] = await Promise.all([
    db.movieInteraction.findMany({
      where: { userId },
      select: { movieId: true, status: true, rating: true },
    }),
    db.tvInteraction.findMany({
      where: { userId },
      select: { tvShowId: true, status: true, rating: true },
    }),
    db.userContentLibrary.findMany({
      where: { userId, mediaType: "FILM", state: "WATCHED" },
      select: { movieId: true },
    }),
    db.userContentLibrary.findMany({
      where: { userId, mediaType: "TV", state: "WATCHED" },
      select: { tvShowId: true },
    }),
  ]);

  // Unique watched movies (status === "WATCHED" or library state === "WATCHED")
  const watchedMovieIds = new Set<string>();
  movieInteractions.forEach((i) => {
    if (i.status === "WATCHED") watchedMovieIds.add(i.movieId);
  });
  movieLibrary.forEach((l) => {
    if (l.movieId) watchedMovieIds.add(l.movieId);
  });

  // Unique watched TV shows (status === "WATCHED" or library state === "WATCHED")
  // Note: PARTIALLY_WATCHED does NOT give rank.
  const watchedTvShowIds = new Set<string>();
  tvInteractions.forEach((i) => {
    if (i.status === "WATCHED") watchedTvShowIds.add(i.tvShowId);
  });
  tvLibrary.forEach((l) => {
    if (l.tvShowId) watchedTvShowIds.add(l.tvShowId);
  });

  // Taste Evidence (WATCHED with rating)
  const movieTasteEvidenceIds = new Set(
    movieInteractions.filter((i) => i.status === "WATCHED" && i.rating !== null).map((i) => i.movieId)
  );
  const tvTasteEvidenceIds = new Set(
    tvInteractions.filter((i) => i.status === "WATCHED" && i.rating !== null).map((i) => i.tvShowId)
  );

  const movieEvaluationCount = movieInteractions.length;
  const tvEvaluationCount = tvInteractions.length;

  return {
    movieWatchedCount: watchedMovieIds.size,
    tvWatchedCount: watchedTvShowIds.size,
    totalWatchedCount: watchedMovieIds.size + watchedTvShowIds.size,
    movieEvaluationCount,
    tvEvaluationCount,
    totalEvaluationCount: movieEvaluationCount + tvEvaluationCount,
    movieTasteEvidenceCount: movieTasteEvidenceIds.size,
    tvTasteEvidenceCount: tvTasteEvidenceIds.size,
  };
}
