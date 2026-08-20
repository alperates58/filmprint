import { db } from "@/lib/db/client";
import { tmdbClient } from "@/lib/tmdb/client";

export interface RelatedMovieInput {
  id: string;
  tmdbId: number;
  title: string;
  genres: string[];
  director?: string | null;
  releaseYear?: number | null;
}

export interface RelatedMovieResult {
  id: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
}

/**
 * Calculates a semantic similarity score between two movies based on
 * genre overlap, director match, release year proximity, and general quality.
 */
export function scoreMovieSimilarity(
  source: { genres: string[]; director?: string | null; releaseYear?: number | null },
  candidate: { genres: string[]; director?: string | null; releaseYear?: number | null; voteAverage?: number; popularity?: number }
): number {
  let score = 0;

  // 1. Genre overlap (heavily weighted: +20 per shared genre)
  const sourceGenres = (source.genres || []).map((g) => g.toLowerCase().trim());
  const candidateGenres = (candidate.genres || []).map((g) => g.toLowerCase().trim());

  let genreOverlapCount = 0;
  for (const g of candidateGenres) {
    if (sourceGenres.includes(g)) {
      genreOverlapCount++;
    }
  }

  score += genreOverlapCount * 25;

  // Penalty if source has genres but candidate shares none
  if (sourceGenres.length > 0 && genreOverlapCount === 0) {
    score -= 50;
  }

  // 2. Director match (+30 points)
  if (
    source.director &&
    candidate.director &&
    source.director.trim().toLowerCase() === candidate.director.trim().toLowerCase()
  ) {
    score += 30;
  }

  // 3. Release era proximity (up to +15 points)
  if (source.releaseYear && candidate.releaseYear) {
    const diff = Math.abs(source.releaseYear - candidate.releaseYear);
    if (diff <= 3) score += 15;
    else if (diff <= 7) score += 10;
    else if (diff <= 15) score += 5;
  }

  // 4. Quality & popularity anchor
  const voteAvg = candidate.voteAverage || 0;
  const popularity = candidate.popularity || 0;
  score += voteAvg * 2 + Math.min(popularity / 20, 8);

  return score;
}

/**
 * Fetches high-quality related and similar movies for a movie detail page.
 * Uses TMDB Recommendations & Similar API first, then supplements/falls back
 * to local database similarity matching on genres, directors, and eras.
 */
export async function getRelatedMoviesForMovie(
  currentMovie: RelatedMovieInput,
  limit: number = 6
): Promise<RelatedMovieResult[]> {
  const results: RelatedMovieResult[] = [];
  const seenTmdbIds = new Set<number>([currentMovie.tmdbId]);
  const seenDbIds = new Set<string>([currentMovie.id]);

  // 1. Try fetching from TMDB Recommendations & Similar API
  try {
    const tmdbRecommendations = await tmdbClient.getSimilarAndRecommendedMovies(
      currentMovie.tmdbId,
      limit * 2
    );

    if (tmdbRecommendations && tmdbRecommendations.length > 0) {
      for (const rec of tmdbRecommendations) {
        if (!rec.id || seenTmdbIds.has(rec.id) || !rec.poster_path || rec.adult) continue;

        // Check if exists in DB or sync it
        let dbMovie = await db.movie.findUnique({
          where: { tmdbId: rec.id },
          select: { id: true, tmdbId: true, title: true, posterPath: true, releaseYear: true },
        });

        if (!dbMovie) {
          const synced = await tmdbClient.syncMovieToDatabase(rec);
          if (synced && synced.posterPath) {
            dbMovie = {
              id: synced.id,
              tmdbId: synced.tmdbId,
              title: synced.title,
              posterPath: synced.posterPath,
              releaseYear: synced.releaseYear,
            };
          }
        }

        if (dbMovie && dbMovie.posterPath && !seenDbIds.has(dbMovie.id)) {
          seenTmdbIds.add(dbMovie.tmdbId);
          seenDbIds.add(dbMovie.id);
          results.push(dbMovie);
          if (results.length >= limit) break;
        }
      }
    }
  } catch (error) {
    console.error("[Related Movies] TMDB fetch error; using local DB fallback:", error);
  }

  // 2. If we still need more movies to reach limit, perform smart local DB matching
  if (results.length < limit) {
    try {
      const remainingNeeded = limit - results.length;
      const localCandidates = await db.movie.findMany({
        where: {
          id: { notIn: Array.from(seenDbIds) },
          tmdbId: { notIn: Array.from(seenTmdbIds) },
          posterPath: { not: null },
        },
        select: {
          id: true,
          tmdbId: true,
          title: true,
          posterPath: true,
          releaseYear: true,
          voteAverage: true,
          popularity: true,
          metadata: true,
        },
        take: 100,
      });

      const scored = localCandidates.map((candidate) => {
        const meta = (candidate.metadata as Record<string, any>) || {};
        const genres = Array.isArray(meta.genres) ? meta.genres : [];
        const director = meta.director || null;

        const similarity = scoreMovieSimilarity(
          {
            genres: currentMovie.genres,
            director: currentMovie.director,
            releaseYear: currentMovie.releaseYear,
          },
          {
            genres,
            director,
            releaseYear: candidate.releaseYear,
            voteAverage: candidate.voteAverage,
            popularity: candidate.popularity,
          }
        );

        return {
          movie: {
            id: candidate.id,
            tmdbId: candidate.tmdbId,
            title: candidate.title,
            posterPath: candidate.posterPath,
            releaseYear: candidate.releaseYear,
          },
          similarity,
        };
      });

      // Sort by similarity descending
      scored.sort((a, b) => b.similarity - a.similarity);

      for (const item of scored) {
        if (results.length >= limit) break;
        results.push(item.movie);
        seenDbIds.add(item.movie.id);
        seenTmdbIds.add(item.movie.tmdbId);
      }
    } catch (error) {
      console.error("[Related Movies] Local DB matching error:", error);
    }
  }

  return results.slice(0, limit);
}
