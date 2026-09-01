import { db } from "@/lib/db/client";
import { getSystemSettings } from "@/lib/config/service";
import { rankCandidateMovies } from "./selector";
import {
  CandidateMovie,
  RecentInteractionPattern,
  UserTasteProfileInput,
} from "./types";
import { FilmDnaResult } from "@/lib/profile/types";
import { resolveMovieCandidateSupply, CalibrationSupplyStatus } from "./supply";
import {
  MOVIE_CALIBRATION_PAGE_SIZE,
  MOVIE_CALIBRATION_MAX_PAGES,
  MOVIE_CALIBRATION_TARGET_POOL,
} from "./constants";
import {
  CALIBRATION_THRESHOLDS,
  getMovieConfidenceLevel,
  ConfidenceLevelInfo,
} from "./confidence";
import { FamiliarityState, GenrePreferenceScoreMap } from "./scoring";
import { resolveGenreNamesFromIds } from "@/lib/catalog/genres";
import { getPhaseHBackfillReadiness } from "./coverage";

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

export interface CalibrationQueueOptions {
  mode?: "SMART" | "GENRE" | "SEARCH";
  genreIds?: number[];
  excludeIds?: string[];
  limit?: number;
}

export interface CalibrationQueueResult {
  movies: QueueMovieResponseItem[];
  evaluationCount: number;
  watchedCount: number;
  tasteEvidenceCount: number;
  minimumTarget: number;
  recommendedTarget: number;
  confidence: ConfidenceLevelInfo;
  canGenerateDna: boolean;
  recommendedCalibrationComplete: boolean;
  sessionSafetyCapReached: boolean;
  familiarityState: FamiliarityState;
  mode: "SMART" | "GENRE" | "SEARCH";
  selectedGenreIds: number[];
  supply: {
    status: CalibrationSupplyStatus;
    rawScanned: number;
    pagesScanned: number;
    eligibleCount: number;
    exhausted: boolean;
  };
}

/**
 * Resolves the next candidate movie queue for a user using Calibration V2 Intelligence.
 * 100% Database-First, with pg_trgm & GIN indexed safety/priority filtering, adaptive familiarity, and mode support.
 */
export async function getIntelligentCalibrationQueue(
  userId: string,
  options: CalibrationQueueOptions = {}
): Promise<CalibrationQueueResult> {
  const { mode = "SMART", genreIds = [], excludeIds = [], limit = 5 } = options;

  // 1. Fetch answered interactions for current user
  const answeredInteractions = await db.movieInteraction.findMany({
    where: { userId },
    orderBy: { answeredAt: "desc" },
    select: {
      movieId: true,
      status: true,
      rating: true,
      answeredAt: true,
      movie: {
        select: {
          releaseYear: true,
          genreIds: true,
          metadata: true,
        },
      },
    },
  });

  const answeredMovieIds = new Set(answeredInteractions.map((i: any) => i.movieId));
  const evaluationCount = answeredMovieIds.size;
  const effectiveExcludedIds = new Set([...Array.from(answeredMovieIds), ...excludeIds]);

  // Separate watchedCount (distinct watched) and tasteEvidenceCount (watched with valid rating)
  const watchedInteractions = answeredInteractions.filter((i: any) => i.status === "WATCHED");
  const watchedMovieIds = new Set(watchedInteractions.map((i: any) => i.movieId));
  const watchedCount = watchedMovieIds.size;

  const tasteEvidenceInteractions = answeredInteractions.filter(
    (i: any) => i.status === "WATCHED" && i.rating !== null
  );
  const tasteEvidenceCount = new Set(tasteEvidenceInteractions.map((i: any) => i.movieId)).size;

  // Confidence & Milestones
  const confidence = getMovieConfidenceLevel(tasteEvidenceCount);
  const canGenerateDna = tasteEvidenceCount >= CALIBRATION_THRESHOLDS.FILM.MIN_UNLOCK;
  const recommendedCalibrationComplete =
    tasteEvidenceCount >= CALIBRATION_THRESHOLDS.FILM.RECOMMENDED;
  const sessionSafetyCapReached =
    evaluationCount >= CALIBRATION_THRESHOLDS.FILM.MAX_EXPOSURE_CAP;

  // 2. Adaptive Familiarity: Rolling window of last 10 interactions (min 3 answers)
  const recent10 = answeredInteractions.slice(0, 10);
  const actualWindowSize = recent10.length;
  let familiarityState: FamiliarityState = "BALANCED";

  if (actualWindowSize >= 3) {
    const watchedInWindow = recent10.filter((i: any) => i.status === "WATCHED").length;
    const ratio = watchedInWindow / actualWindowSize;
    if (ratio < 0.30) {
      familiarityState = "FAMILIARITY_RECOVERY";
    } else if (ratio >= 0.70) {
      familiarityState = "DEEPENING";
    } else {
      familiarityState = "BALANCED";
    }
  }

  // Recent history pattern for repetition penalty
  const recentInteractions: RecentInteractionPattern[] = recent10.map((i: any) => {
    const meta = (i.movie?.metadata as Record<string, unknown>) || {};
    let genres = (meta.genres as string[]) || [];
    if (Array.isArray(i.movie?.genreIds) && i.movie.genreIds.length > 0) {
      genres = resolveGenreNamesFromIds(i.movie.genreIds, "FILM");
    }
    return {
      movieId: i.movieId,
      genres,
      releaseYear: i.movie?.releaseYear || null,
    };
  });

  // 3. User Genre Preferences
  const userGenrePrefs = await db.userGenrePreference.findMany({
    where: { userId, mediaType: "FILM" },
  });

  const preferenceMap: GenrePreferenceScoreMap = {
    preferredGenreIds: new Set(
      userGenrePrefs.filter((p: any) => p.preference === "PREFER").map((p: any) => p.genreId)
    ),
    avoidedGenreIds: new Set(
      userGenrePrefs.filter((p: any) => p.preference === "AVOID").map((p: any) => p.genreId)
    ),
    excludedGenreIds: new Set(
      userGenrePrefs.filter((p: any) => p.preference === "EXCLUDE").map((p: any) => p.genreId)
    ),
  };

  // 4. Fetch User Taste Profile if available
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

  // 5. Query deterministic paged un-interacted movies from Database
  async function fetchRawCandidatePage({
    skip,
    take,
  }: {
    page: number;
    skip: number;
    take: number;
  }) {
    const whereConditions: any = {
      id: { notIn: Array.from(effectiveExcludedIds) },
      posterPath: { not: null },
      safetyLevel: {
        notIn: ["ADULT", "EROTIC", "SEXUAL_CONTENT"],
      },
      OR: [
        { normalizedMinimumAge: null },
        { normalizedMinimumAge: { lt: 18 } },
      ],
    };

    // Genre mode filtering
    if (mode === "GENRE" && genreIds.length > 0) {
      whereConditions.genreIds = {
        hasSome: genreIds,
      };
    }

    // Excluded genres filtering
    if (preferenceMap.excludedGenreIds.size > 0) {
      const excludedArr = Array.from(preferenceMap.excludedGenreIds);
      whereConditions.NOT = {
        genreIds: {
          hasSome: excludedArr,
        },
      };
    }

    let rows = await db.movie.findMany({
      where: whereConditions,
      orderBy: [
        { calibrationPriorityScore: "desc" },
        { popularity: "desc" },
        { voteAverage: "desc" },
        { id: "asc" },
      ],
      skip,
      take,
      select: {
        id: true,
        tmdbId: true,
        title: true,
        originalTitle: true,
        releaseYear: true,
        posterPath: true,
        backdropPath: true,
        voteAverage: true,
        popularity: true,
        voteCount: true,
        genreIds: true,
        safetyLevel: true,
        normalizedMinimumAge: true,
        adult: true,
        metadata: true,
      },
    });

    // Transitional fallback for unpopulated genreIds column only while backfill is in progress
    const readiness = await getPhaseHBackfillReadiness("FILM");
    if (readiness === "PHASE_H_BACKFILL_IN_PROGRESS" && rows.length === 0 && mode === "GENRE" && genreIds.length > 0) {
      const targetGenreNames = new Set(resolveGenreNamesFromIds(genreIds, "FILM"));
      const fallbackConditions = { ...whereConditions };
      delete fallbackConditions.genreIds;

      const fallbackRows = await db.movie.findMany({
        where: fallbackConditions,
        orderBy: [
          { popularity: "desc" },
          { voteAverage: "desc" },
          { id: "asc" },
        ],
        skip,
        take: take * 3,
        select: {
          id: true,
          tmdbId: true,
          title: true,
          originalTitle: true,
          releaseYear: true,
          posterPath: true,
          backdropPath: true,
          voteAverage: true,
          popularity: true,
          voteCount: true,
          genreIds: true,
          safetyLevel: true,
          normalizedMinimumAge: true,
          adult: true,
          metadata: true,
        },
      });

      rows = fallbackRows
        .filter((m: any) => {
          const meta = (m.metadata as Record<string, unknown>) || {};
          const gList = Array.isArray(meta.genres) ? (meta.genres as string[]) : [];
          return gList.some((g) => targetGenreNames.has(g));
        })
        .slice(0, take);
    }

    return rows.map((m: any) => {
      const meta = (m.metadata as Record<string, unknown>) || {};
      let genres: string[] = [];
      if (Array.isArray(m.genreIds) && m.genreIds.length > 0) {
        genres = resolveGenreNamesFromIds(m.genreIds, "FILM");
      } else if (Array.isArray(meta.genres)) {
        genres = meta.genres as string[];
      }

      return {
        id: m.id,
        tmdbId: m.tmdbId,
        title: m.title,
        originalTitle: m.originalTitle,
        englishTitle: (meta.englishTitle as string) || null,
        releaseYear: m.releaseYear,
        posterPath: m.posterPath,
        backdropPath: m.backdropPath,
        voteAverage: m.voteAverage,
        popularity: m.popularity,
        voteCount: m.voteCount,
        overview: (meta.overview as string) || "",
        genres,
        adult: m.adult,
        safetyLevel: m.safetyLevel,
        normalizedMinimumAge: m.normalizedMinimumAge,
        metadata: {
          ...meta,
          genreIds: m.genreIds,
        },
      } as CandidateMovie;
    });
  }

  // 6. Scan eligible candidate pool
  const scanResult = await resolveMovieCandidateSupply({
    fetchPage: fetchRawCandidatePage,
    pageSize: MOVIE_CALIBRATION_PAGE_SIZE,
    maxPages: MOVIE_CALIBRATION_MAX_PAGES,
    targetPool: MOVIE_CALIBRATION_TARGET_POOL,
  });

  // 7. Active Learning Selector: Rank eligible candidates
  const rankedResults = rankCandidateMovies(
    scanResult.eligibleCandidates,
    profileInput,
    recentInteractions,
    familiarityState,
    preferenceMap
  );

  // 8. Select Top N Candidates
  const selectedQueue = rankedResults.slice(0, limit).map((r) => ({
    id: r.movie.id,
    tmdbId: r.movie.tmdbId,
    title: r.movie.title,
    originalTitle: r.movie.originalTitle,
    releaseYear: r.movie.releaseYear,
    posterPath: r.movie.posterPath,
    backdropPath: r.movie.backdropPath,
    voteAverage: r.movie.voteAverage,
    overview: r.movie.overview,
    genres: r.movie.genres,
    selectionScore: r.score,
    reasons: r.reasons,
  }));

  return {
    movies: selectedQueue,
    evaluationCount,
    watchedCount,
    tasteEvidenceCount,
    minimumTarget: CALIBRATION_THRESHOLDS.FILM.MIN_UNLOCK,
    recommendedTarget: CALIBRATION_THRESHOLDS.FILM.RECOMMENDED,
    confidence,
    canGenerateDna,
    recommendedCalibrationComplete,
    sessionSafetyCapReached,
    familiarityState,
    mode,
    selectedGenreIds: genreIds,
    supply: {
      status: scanResult.status,
      rawScanned: scanResult.rawScanned,
      pagesScanned: scanResult.pagesScanned,
      eligibleCount: scanResult.eligibleCandidates.length,
      exhausted: scanResult.exhausted,
    },
  };
}
