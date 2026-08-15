import { db } from "@/lib/db/client";
import { getSystemSettings } from "@/lib/config/service";
import { tmdbClient } from "@/lib/tmdb/client";
import { filterEligibleMovies } from "@/lib/movies/eligibility";
import { rankCandidateMovies } from "./selector";
import { CandidateMovie, RecentInteractionPattern, UserTasteProfileInput } from "./types";
import { FilmDnaResult } from "@/lib/profile/types";

export interface QueueMovieResponseItem {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  releaseYear: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  overview: string;
  genres: string[];
  selectionScore?: number;
  reasons?: string[];
}

export interface CalibrationQueueResult {
  movies: QueueMovieResponseItem[];
  answeredCount: number;
  targetCount: number;
  completed: boolean;
  strategy: {
    activeLearningEnabled: boolean;
    selectorVersion: number;
  };
}

/**
 * Resolves the next candidate movie queue for a user using Active Learning / Intelligent Calibration.
 */
export async function getIntelligentCalibrationQueue(
  userId: string,
  limit: number = 5,
  options?: { forceReplenish?: boolean }
): Promise<CalibrationQueueResult> {
  const settings = await getSystemSettings();
  const targetCount = settings.calibrationTarget;

  // 1. Fetch answered movie IDs for current user
  const answeredInteractions = await db.movieInteraction.findMany({
    where: { userId },
    orderBy: { answeredAt: "desc" },
    select: {
      movieId: true,
      answeredAt: true,
      movie: {
        select: {
          releaseYear: true,
          metadata: true,
        },
      },
    },
  });

  const answeredMovieIds = new Set(answeredInteractions.map((i: any) => i.movieId));
  const answeredCount = answeredMovieIds.size;

  // Recent history pattern for repetition penalty
  const recentWindow = settings.recentHistoryWindow || 10;
  const recentInteractions: RecentInteractionPattern[] = answeredInteractions
    .slice(0, recentWindow)
    .map((i: any) => {
      const meta = (i.movie.metadata as Record<string, unknown>) || {};
      return {
        movieId: i.movieId,
        genres: (meta.genres as string[]) || [],
        releaseYear: i.movie.releaseYear,
      };
    });

  // 2. Fetch User Taste Profile if available
  const existingProfileRecord = await db.userTasteProfile.findUnique({
    where: { userId },
  });

  let profileInput: UserTasteProfileInput | null = null;
  if (existingProfileRecord && existingProfileRecord.profileJson) {
    const parsed = existingProfileRecord.profileJson as unknown as FilmDnaResult;
    profileInput = {
      totalRatedCount: parsed.sample?.ratedMovies || 0,
      genres: parsed.genres || [],
      eras: parsed.eras || [],
    };
  }

  // 3. Query DB candidate pool and evaluate post-eligibility replenishment
  const fetchEligibleCandidatePool = async (): Promise<CandidateMovie[]> => {
    const raw = await db.movie.findMany({
      where: {
        id: { notIn: Array.from(answeredMovieIds) },
      },
      orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
      take: 250,
    });

    const formatted: (CandidateMovie & { metadata?: any })[] = raw.map((m: any) => {
      const meta = (m.metadata as Record<string, unknown>) || {};
      return {
        id: m.id,
        tmdbId: m.tmdbId,
        title: m.title,
        originalTitle: m.originalTitle,
        releaseYear: m.releaseYear,
        popularity: m.popularity,
        voteAverage: m.voteAverage,
        posterPath: m.posterPath,
        backdropPath: m.backdropPath,
        genres: (meta.genres as string[]) || [],
        overview: (meta.overview as string) || "",
        adult: (meta.adult as boolean) || false,
        voteCount: (meta.voteCount as number) || undefined,
        metadata: meta,
      };
    });

    return filterEligibleMovies(formatted, "CALIBRATION");
  };

  let candidatePool = await fetchEligibleCandidatePool();

  // Replenish seeding guardrail dynamically if eligible unanswered candidate pool drops below 30 movies
  if (candidatePool.length < 30 || options?.forceReplenish) {
    await tmdbClient.seedAndFetchMovies();
    candidatePool = await fetchEligibleCandidatePool();
  }

  // 4. Rank candidates using Active Learning or Fallback
  let selectedMovies: QueueMovieResponseItem[] = [];

  if (settings.aiEnabled && settings.activeLearningEnabled !== false) {
    const rankedResults = rankCandidateMovies(candidatePool, profileInput, recentInteractions);
    selectedMovies = rankedResults.slice(0, limit).map((r: any) => ({
      ...r.movie,
      selectionScore: r.score,
      reasons: r.reasons,
    }));
  } else {
    // Fallback: standard balanced selection
    selectedMovies = candidatePool.slice(0, limit);
  }

  return {
    movies: selectedMovies,
    answeredCount,
    targetCount,
    completed: answeredCount >= targetCount,
    strategy: {
      activeLearningEnabled: settings.aiEnabled && settings.activeLearningEnabled !== false,
      selectorVersion: 1,
    },
  };
}
