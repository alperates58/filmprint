import { db } from "@/lib/db/client";
import { getSystemSettings } from "@/lib/config/service";
import { rankCandidateMovies } from "./selector";
import { CandidateMovie, RecentInteractionPattern, UserTasteProfileInput } from "./types";
import { FilmDnaResult } from "@/lib/profile/types";
import { resolveMovieCandidateSupply, CalibrationSupplyStatus } from "./supply";

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
  supply: {
    status: CalibrationSupplyStatus;
    rawScanned: number;
    pagesScanned: number;
    eligibleCount: number;
    exhausted: boolean;
  };
}

/**
 * Resolves the next candidate movie queue for a user using Active Learning / Intelligent Calibration.
 * Operates 100% DATABASE-FIRST with bounded paged DB retrieval and zero external TMDB network calls.
 */
export async function getIntelligentCalibrationQueue(
  userId: string,
  limit: number = 5
): Promise<CalibrationQueueResult> {
  const settings = await getSystemSettings();
  const targetCount = settings.calibrationTarget;

  // 1. Fetch answered interactions for current user
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
      const meta = (i.movie?.metadata as Record<string, unknown>) || {};
      return {
        movieId: i.movieId,
        genres: (meta.genres as string[]) || [],
        releaseYear: i.movie?.releaseYear || null,
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

  // 3. Query deterministic paged un-interacted movies from Database
  async function fetchRawCandidatePage({
    skip,
    take,
  }: {
    skip: number;
    take: number;
  }): Promise<CandidateMovie[]> {
    const raw = await db.movie.findMany({
      where: {
        interactions: {
          none: { userId },
        },
        posterPath: { not: null },
      },
      orderBy: [
        { popularity: "desc" },
        { voteAverage: "desc" },
        { id: "asc" },
      ],
      skip,
      take,
    });

    return raw.map((m: any) => {
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
  }

  // 4. Resolve candidate supply strictly from Database pages
  const supply = await resolveMovieCandidateSupply<CandidateMovie>({
    fetchPage: fetchRawCandidatePage,
  });
  const eligibleCandidates = supply.eligibleCandidates;

  if (supply.status !== "AVAILABLE") {
    console.info("[Movie Calibration Supply]", {
      userId,
      rawScanned: supply.rawScanned,
      pagesScanned: supply.pagesScanned,
      eligibleFound: eligibleCandidates.length,
      status: supply.status,
      exhausted: supply.exhausted,
    });
  }

  // 5. Rank candidates using Active Learning or Fallback
  let selectedMovies: QueueMovieResponseItem[] = [];

  if (eligibleCandidates.length > 0) {
    if (settings.aiEnabled && settings.activeLearningEnabled !== false) {
      const rankedResults = rankCandidateMovies(eligibleCandidates, profileInput, recentInteractions);
      if (rankedResults.length > 0) {
        selectedMovies = rankedResults.slice(0, limit).map((r: any) => ({
          ...r.movie,
          selectionScore: r.score,
          reasons: r.reasons,
        }));
      } else {
        // Fallback: If repetition penalty was too strict, rank without recent history penalty
        const fallbackRanked = rankCandidateMovies(eligibleCandidates, profileInput, []);
        selectedMovies = fallbackRanked.slice(0, limit).map((r: any) => ({
          ...r.movie,
          selectionScore: r.score,
          reasons: [...(r.reasons || []), "relaxed_repetition_penalty"],
        }));
      }
    } else {
      // Standard balanced selection on eligible pool
      selectedMovies = eligibleCandidates.slice(0, limit).map((m: any) => ({
        ...m,
        selectionScore: 1.0,
        reasons: ["standard_selection"],
      }));
    }
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
    supply: {
      status: supply.status,
      rawScanned: supply.rawScanned,
      pagesScanned: supply.pagesScanned,
      eligibleCount: eligibleCandidates.length,
      exhausted: supply.exhausted,
    },
  };
}

