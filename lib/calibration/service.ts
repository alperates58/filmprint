import { db } from "@/lib/db/client";
import { getSystemSettings } from "@/lib/config/service";
import { tmdbClient } from "@/lib/tmdb/client";
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
  limit: number = 5
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

  const answeredMovieIds = new Set(answeredInteractions.map((i) => i.movieId));
  const answeredCount = answeredMovieIds.size;

  // Recent history pattern for repetition penalty
  const recentWindow = settings.recentHistoryWindow || 10;
  const recentInteractions: RecentInteractionPattern[] = answeredInteractions
    .slice(0, recentWindow)
    .map((i) => {
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

  // 3. Query DB candidate pool (Fetch up to 150 candidate movies not answered by user)
  let rawCandidates = await db.movie.findMany({
    where: {
      id: { notIn: Array.from(answeredMovieIds) },
    },
    orderBy: [{ popularity: "desc" }, { voteAverage: "desc" }],
    take: 150,
  });

  // Seeding guardrail if candidate pool has fewer movies than requested limit
  if (rawCandidates.length < limit) {
    await tmdbClient.seedAndFetchMovies();
    rawCandidates = await db.movie.findMany({
      where: {
        id: { notIn: Array.from(answeredMovieIds) },
      },
      orderBy: [{ popularity: "desc" }, { voteAverage: "desc" }],
      take: 150,
    });
  }

  // Format raw candidate movies
  const candidatePool: CandidateMovie[] = rawCandidates.map((m) => {
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
    };
  });

  // 4. Rank candidates using Active Learning or Fallback
  let selectedMovies: QueueMovieResponseItem[] = [];

  if (settings.aiEnabled && settings.activeLearningEnabled !== false) {
    const rankedResults = rankCandidateMovies(candidatePool, profileInput, recentInteractions);
    selectedMovies = rankedResults.slice(0, limit).map((r) => ({
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
