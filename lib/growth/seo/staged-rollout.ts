import { db } from "@/lib/db/client";
import { getSeoSystemConfig } from "../settings";
import { evaluateMovieSeoEligibility, evaluateTvSeoEligibility } from "./quality-gate";
import { SeoCatalogMetrics } from "../types";
import { MOVIE_GENRES, TV_GENRES } from "./genres";

// In-memory cache for catalog metrics with 60-second TTL
let cachedMetrics: { data: SeoCatalogMetrics; expiresAt: number } | null = null;

export function invalidateSeoCatalogMetricsCache(): void {
  cachedMetrics = null;
}

/**
 * Calculates current catalog SEO eligibility and staged rollout metrics.
 */
export async function getSeoCatalogMetrics(forceRefresh = false): Promise<SeoCatalogMetrics> {
  if (!forceRefresh && cachedMetrics && cachedMetrics.expiresAt > Date.now()) {
    return cachedMetrics.data;
  }

  const config = await getSeoSystemConfig();

  let movies: any[] = [];
  let tvShows: any[] = [];
  let totalMoviesCount = 0;
  let totalTvShowsCount = 0;

  const movieSampleSize = Math.min(Math.max(config.movieMaxIndexed * 3, 1000), 15000);
  const tvSampleSize = Math.min(Math.max(config.tvMaxIndexed * 3, 1000), 7500);

  try {
    if (db?.movie?.findMany && db?.tvShow?.findMany) {
      const [totalM, totalT, m, t] = await Promise.all([
        db.movie.count().catch(() => 0),
        db.tvShow.count().catch(() => 0),
        db.movie.findMany({
          orderBy: [
            { popularity: "desc" },
            { voteAverage: "desc" },
          ],
          take: movieSampleSize,
          select: {
            id: true,
            tmdbId: true,
            title: true,
            originalTitle: true,
            posterPath: true,
            backdropPath: true,
            releaseYear: true,
            voteAverage: true,
            popularity: true,
            metadata: true,
          },
        }),
        db.tvShow.findMany({
          orderBy: [
            { popularity: "desc" },
            { voteAverage: "desc" },
          ],
          take: tvSampleSize,
          select: {
            id: true,
            tmdbId: true,
            name: true,
            originalName: true,
            overview: true,
            posterPath: true,
            backdropPath: true,
            firstAirDate: true,
            voteAverage: true,
            voteCount: true,
            popularity: true,
            metadata: true,
          },
        }),
      ]);
      totalMoviesCount = totalM;
      totalTvShowsCount = totalT;
      movies = m;
      tvShows = t;
    }
  } catch (err) {
    console.error("[SEO Staged Rollout] Failed to fetch catalog metrics:", err);
  }

  let eligibleMovies = 0;
  let lowQualityMovies = 0;
  for (const m of movies) {
    const res = evaluateMovieSeoEligibility(m as any);
    if (res.isEligible) {
      eligibleMovies++;
    } else {
      lowQualityMovies++;
    }
  }

  let eligibleTvShows = 0;
  let lowQualityTvShows = 0;
  for (const s of tvShows) {
    const res = evaluateTvSeoEligibility(s as any);
    if (res.isEligible) {
      eligibleTvShows++;
    } else {
      lowQualityTvShows++;
    }
  }

  const indexedMoviesCount = Math.min(eligibleMovies, config.movieMaxIndexed);
  const indexedTvShowsCount = Math.min(eligibleTvShows, config.tvMaxIndexed);

  // Static routes + genre hub routes + indexed movies & TV shows
  const staticUrlsCount = 4; // Home, How it works, Film Calibrate, TV Calibrate
  const genreUrlsCount = MOVIE_GENRES.length + TV_GENRES.length;
  const totalSitemapUrls = staticUrlsCount + genreUrlsCount + indexedMoviesCount + indexedTvShowsCount;

  const result: SeoCatalogMetrics = {
    totalMovies: totalMoviesCount || movies.length,
    eligibleMovies,
    lowQualityMovies,
    indexedMoviesCount,
    totalTvShows: totalTvShowsCount || tvShows.length,
    eligibleTvShows,
    lowQualityTvShows,
    indexedTvShowsCount,
    movieRolloutLimit: config.movieMaxIndexed,
    tvRolloutLimit: config.tvMaxIndexed,
    totalSitemapUrls,
  };

  cachedMetrics = {
    data: result,
    expiresAt: Date.now() + 60 * 1000, // 60 seconds TTL cache
  };

  return result;
}

/**
 * Returns eligible movies bounded strictly by the configured rollout limit.
 */
export async function getStagedEligibleMovies(): Promise<any[]> {
  const config = await getSeoSystemConfig();
  if (!config.seoMasterEnabled || !config.movieIndexingEnabled) {
    return [];
  }

  let movies: any[] = [];
  const boundedTake = Math.min(Math.max(config.movieMaxIndexed * 3, 1000), 15000);

  try {
    if (db?.movie?.findMany) {
      movies = await db.movie.findMany({
        where: {
          posterPath: { not: null },
        },
        orderBy: [
          { popularity: "desc" },
          { voteAverage: "desc" },
        ],
        take: boundedTake,
        select: {
          id: true,
          tmdbId: true,
          title: true,
          originalTitle: true,
          posterPath: true,
          backdropPath: true,
          releaseYear: true,
          voteAverage: true,
          popularity: true,
          metadata: true,
          updatedAt: true,
        },
      });
    }
  } catch (err) {
    console.error("[SEO Staged Rollout] Failed to fetch movies for sitemap:", err);
  }

  const eligible: any[] = [];
  for (const m of movies) {
    if (evaluateMovieSeoEligibility(m as any).isEligible) {
      eligible.push(m);
      if (eligible.length >= config.movieMaxIndexed) {
        break;
      }
    }
  }

  return eligible;
}

/**
 * Returns eligible TV shows bounded strictly by the configured rollout limit.
 */
export async function getStagedEligibleTvShows(): Promise<any[]> {
  const config = await getSeoSystemConfig();
  if (!config.seoMasterEnabled || !config.tvIndexingEnabled) {
    return [];
  }

  let shows: any[] = [];
  const boundedTake = Math.min(Math.max(config.tvMaxIndexed * 3, 1000), 7500);

  try {
    if (db?.tvShow?.findMany) {
      shows = await db.tvShow.findMany({
        where: {
          posterPath: { not: null },
        },
        orderBy: [
          { popularity: "desc" },
          { voteAverage: "desc" },
        ],
        take: boundedTake,
        select: {
          id: true,
          tmdbId: true,
          name: true,
          originalName: true,
          overview: true,
          posterPath: true,
          backdropPath: true,
          firstAirDate: true,
          voteAverage: true,
          voteCount: true,
          popularity: true,
          metadata: true,
          updatedAt: true,
        },
      });
    }
  } catch (err) {
    console.error("[SEO Staged Rollout] Failed to fetch tv shows for sitemap:", err);
  }

  const eligible: any[] = [];
  for (const s of shows) {
    if (evaluateTvSeoEligibility(s as any).isEligible) {
      eligible.push(s);
      if (eligible.length >= config.tvMaxIndexed) {
        break;
      }
    }
  }

  return eligible;
}
