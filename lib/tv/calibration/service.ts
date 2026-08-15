import { db } from "@/lib/db/client";
import { tmdbTvClient } from "@/lib/tmdb/tv/client";
import { filterEligibleTvShows } from "@/lib/tv/eligibility";
import { rankCandidateTvShows } from "./selector";
import {
  CandidateTvShow,
  RecentTvInteractionPattern,
  TvSelectorUserState,
} from "./types";
import { TV_CALIBRATION_TARGET } from "./constants";
import { RatingStatus } from "@prisma/client";

export interface QueueTvShowResponseItem {
  id: string; // Database UUID
  tmdbId: number;
  name: string;
  originalName: string | null;
  firstAirDate: string | null;
  lastAirDate: string | null;
  status: string | null;
  originalLanguage: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  voteCount?: number;
  popularity: number;
  overview: string;
  genres: string[];
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  selectionScore?: number;
  reasons?: string[];
}

export interface TvCalibrationQueueResult {
  tvShows: QueueTvShowResponseItem[];
  answeredCount: number;
  targetCount: number;
  completed: boolean;
  strategy: {
    activeLearningEnabled: boolean;
    selectorVersion: number;
  };
}

/**
 * Resolves the next candidate TV show queue for a user using deterministic active learning heuristics.
 * Guarantees bounded cache-first resolution and zero re-asking of previously answered shows.
 */
export async function getTvCalibrationQueue(
  userId: string,
  limit: number = 5
): Promise<TvCalibrationQueueResult> {
  const targetCount = TV_CALIBRATION_TARGET;

  // 1. Fetch all answered TV interaction records for current user (single batch query)
  const answeredInteractions = await db.tvInteraction.findMany({
    where: { userId },
    orderBy: { answeredAt: "desc" },
    select: {
      tvShowId: true,
      status: true,
      rating: true,
      answeredAt: true,
      tvShow: {
        select: {
          firstAirDate: true,
          metadata: true,
        },
      },
    },
  });

  const answeredTvShowIds = new Set(answeredInteractions.map((i: any) => i.tvShowId));
  const answeredCount = answeredTvShowIds.size;

  // 2. Build runtime adaptive state from previous interactions
  const genreFrequency: Record<string, number> = {};
  const positiveGenresSet = new Set<string>();
  const negativeGenresSet = new Set<string>();

  answeredInteractions.forEach((i: any) => {
    const meta = (i.tvShow?.metadata as Record<string, unknown>) || {};
    const genres = (meta.genres as string[]) || [];

    genres.forEach((g) => {
      genreFrequency[g] = (genreFrequency[g] || 0) + 1;

      // Positive signal: LOVE or LIKE
      if (i.rating === RatingStatus.LOVE || i.rating === RatingStatus.LIKE) {
        positiveGenresSet.add(g);
      }
      // Negative signal: DISLIKE
      if (i.rating === RatingStatus.DISLIKE) {
        negativeGenresSet.add(g);
      }
    });
  });

  const userState: TvSelectorUserState = {
    totalAnsweredCount: answeredCount,
    genreFrequency,
    positiveGenres: Array.from(positiveGenresSet),
    negativeGenres: Array.from(negativeGenresSet),
  };

  // Recent interaction history pattern for repetition penalty (last 8 items)
  const recentInteractions: RecentTvInteractionPattern[] = answeredInteractions
    .slice(0, 8)
    .map((i: any) => {
      const meta = (i.tvShow?.metadata as Record<string, unknown>) || {};
      const firstAirDate = i.tvShow?.firstAirDate || "";
      const year = firstAirDate ? parseInt(firstAirDate.substring(0, 4), 10) : null;
      return {
        tvShowId: i.tvShowId,
        genres: (meta.genres as string[]) || [],
        firstAirYear: !isNaN(year as number) ? year : null,
      };
    });

  // 3. Cache-First Candidate Query from local PostgreSQL TvShow table
  let rawCandidates = await db.tvShow.findMany({
    where: {
      id: { notIn: Array.from(answeredTvShowIds) },
    },
    orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
    take: 150,
  });

  // Bounded Dynamic Replenishment: only execute TMDB fetch if local candidate supply is critically low (< 20)
  if (rawCandidates.length < 20) {
    await tmdbTvClient.seedAndFetchTvShows();
    rawCandidates = await db.tvShow.findMany({
      where: {
        id: { notIn: Array.from(answeredTvShowIds) },
      },
      orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
      take: 150,
    });
  }

  // Format raw candidate TV shows
  const candidatePoolRaw: CandidateTvShow[] = rawCandidates.map((s: any) => {
    const meta = (s.metadata as Record<string, unknown>) || {};
    return {
      id: s.id,
      tmdbId: s.tmdbId,
      name: s.name,
      originalName: s.originalName,
      firstAirDate: s.firstAirDate,
      lastAirDate: s.lastAirDate,
      status: s.status,
      originalLanguage: s.originalLanguage,
      popularity: s.popularity,
      voteAverage: s.voteAverage,
      voteCount: s.voteCount || (meta.voteCount as number) || undefined,
      posterPath: s.posterPath,
      backdropPath: s.backdropPath,
      genres: (meta.genres as string[]) || [],
      overview: s.overview || (meta.overview as string) || "",
      numberOfSeasons: (meta.numberOfSeasons as number | null) || null,
      numberOfEpisodes: (meta.numberOfEpisodes as number | null) || null,
      adult: (meta.adult as boolean) || false,
      metadata: meta,
    };
  });

  // 4. Apply Global TV Eligibility Filter for CALIBRATION
  const candidatePool: CandidateTvShow[] = filterEligibleTvShows(candidatePoolRaw, "CALIBRATION");

  // 5. Rank candidate shows deterministically
  const rankedResults = rankCandidateTvShows(candidatePool, userState, recentInteractions);

  const selectedShows: QueueTvShowResponseItem[] = rankedResults
    .slice(0, limit)
    .map((r: any) => ({
      ...r.tvShow,
      selectionScore: r.score,
      reasons: r.reasons,
    }));

  return {
    tvShows: selectedShows,
    answeredCount,
    targetCount,
    completed: answeredCount >= targetCount,
    strategy: {
      activeLearningEnabled: true,
      selectorVersion: 1,
    },
  };
}
