import { db } from "@/lib/db/client";
import { rankCandidateTvShows } from "./selector";
import {
  CandidateTvShow,
  RecentTvInteractionPattern,
  TvSelectorUserState,
} from "./types";
import { resolveTvCandidateSupply, CalibrationSupplyStatus } from "./supply";
import {
  TV_CALIBRATION_CANDIDATE_PAGE_SIZE,
  TV_CALIBRATION_CANDIDATE_MAX_PAGES,
  TV_CALIBRATION_CANDIDATE_TARGET_POOL,
} from "./constants";
import {
  CALIBRATION_THRESHOLDS,
  getTvConfidenceLevel,
  ConfidenceLevelInfo,
} from "@/lib/calibration/confidence";
import { FamiliarityState } from "@/lib/calibration/scoring";
import { resolveGenreNamesFromIds } from "@/lib/catalog/genres";
import { getPhaseHBackfillReadiness } from "@/lib/calibration/coverage";
import { buildAutomaticTvDiscoveryWhere } from "@/lib/tv/discovery";

export interface QueueTvShowResponseItem {
  id: string;
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

export interface TvCalibrationQueueOptions {
  mode?: "SMART" | "GENRE" | "SEARCH";
  genreIds?: number[];
  excludeIds?: string[];
  limit?: number;
}

export interface TvCalibrationQueueResult {
  tvShows: QueueTvShowResponseItem[];
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
 * Resolves the next candidate TV show queue for a user using TV Calibration V2 Intelligence.
 * 100% Database-First with GIN & pg_trgm indexed querying, Safety V2 hard blocks, and adaptive familiarity.
 */
export async function getTvCalibrationQueue(
  userId: string,
  options: TvCalibrationQueueOptions = {}
): Promise<TvCalibrationQueueResult> {
  const { mode = "SMART", genreIds = [], excludeIds = [], limit = 5 } = options;

  // 1. Fetch all answered TV interaction records for current user
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
          firstAirYear: true,
          genreIds: true,
          metadata: true,
        },
      },
    },
  });

  const answeredTvShowIds = new Set(answeredInteractions.map((i: any) => i.tvShowId));
  const evaluationCount = answeredTvShowIds.size;
  const effectiveExcludedIds = new Set([...Array.from(answeredTvShowIds), ...excludeIds]);

  // Separate watchedCount (distinct fully watched) and tasteEvidenceCount (watched with rating)
  const watchedInteractions = answeredInteractions.filter((i: any) => i.status === "WATCHED");
  const watchedTvShowIds = new Set(watchedInteractions.map((i: any) => i.tvShowId));
  const watchedCount = watchedTvShowIds.size;

  const tasteEvidenceInteractions = answeredInteractions.filter(
    (i: any) => i.status === "WATCHED" && i.rating !== null
  );
  const tasteEvidenceCount = new Set(tasteEvidenceInteractions.map((i: any) => i.tvShowId)).size;

  // Confidence & Milestones
  const confidence = getTvConfidenceLevel(tasteEvidenceCount);
  const canGenerateDna = tasteEvidenceCount >= CALIBRATION_THRESHOLDS.TV.MIN_UNLOCK;
  const recommendedCalibrationComplete =
    tasteEvidenceCount >= CALIBRATION_THRESHOLDS.TV.RECOMMENDED;
  const sessionSafetyCapReached =
    evaluationCount >= CALIBRATION_THRESHOLDS.TV.MAX_EXPOSURE_CAP;

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

  // Build runtime adaptive state from previous interactions
  const genreFrequency: Record<string, number> = {};
  const positiveGenresSet = new Set<string>();
  const negativeGenresSet = new Set<string>();

  answeredInteractions.forEach((i: any) => {
    const meta = (i.tvShow?.metadata as Record<string, unknown>) || {};
    let genres = (meta.genres as string[]) || [];
    if (Array.isArray(i.tvShow?.genreIds) && i.tvShow.genreIds.length > 0) {
      genres = resolveGenreNamesFromIds(i.tvShow.genreIds, "TV");
    }

    genres.forEach((g) => {
      genreFrequency[g] = (genreFrequency[g] || 0) + 1;
      if (i.rating === "LOVE" || i.rating === "LIKE") {
        positiveGenresSet.add(g);
      }
      if (i.rating === "DISLIKE") {
        negativeGenresSet.add(g);
      }
    });
  });

  const recentHistory: RecentTvInteractionPattern[] = recent10.map((i: any) => {
    const meta = (i.tvShow?.metadata as Record<string, unknown>) || {};
    let genres = (meta.genres as string[]) || [];
    if (Array.isArray(i.tvShow?.genreIds) && i.tvShow.genreIds.length > 0) {
      genres = resolveGenreNamesFromIds(i.tvShow.genreIds, "TV");
    }
    const year =
      i.tvShow?.firstAirYear ||
      (i.tvShow?.firstAirDate ? parseInt(i.tvShow.firstAirDate.substring(0, 4), 10) : null);

    return {
      tvShowId: i.tvShowId,
      genres,
      firstAirYear: year && !isNaN(year) ? year : null,
    };
  });

  const userState: TvSelectorUserState = {
    totalAnsweredCount: evaluationCount,
    genreFrequency,
    positiveGenres: Array.from(positiveGenresSet),
    negativeGenres: Array.from(negativeGenresSet),
  };

  // 3. User Genre Preferences for TV
  const userGenrePrefs = await db.userGenrePreference.findMany({
    where: { userId, mediaType: "TV" },
  });

  const excludedGenreIds = new Set(
    userGenrePrefs.filter((p: any) => p.preference === "EXCLUDE").map((p: any) => p.genreId)
  );

  // 4. Query deterministic paged un-interacted TV shows from Database
  async function fetchRawTvCandidatePage({
    skip,
    take,
  }: {
    page: number;
    skip: number;
    take: number;
  }) {
    const baseWhere: any = {
      id: { notIn: Array.from(effectiveExcludedIds) },
    };

    if (mode === "GENRE" && genreIds.length > 0) {
      baseWhere.genreIds = {
        hasSome: genreIds,
      };
    }

    if (excludedGenreIds.size > 0) {
      const excludedArr = Array.from(excludedGenreIds);
      baseWhere.NOT = {
        genreIds: {
          hasSome: excludedArr,
        },
      };
    }

    const whereConditions = buildAutomaticTvDiscoveryWhere(baseWhere);

    let rows = await db.tvShow.findMany({
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
        name: true,
        originalName: true,
        firstAirDate: true,
        firstAirYear: true,
        lastAirDate: true,
        status: true,
        originalLanguage: true,
        posterPath: true,
        backdropPath: true,
        voteAverage: true,
        voteCount: true,
        popularity: true,
        genreIds: true,
        safetyLevel: true,
        normalizedMinimumAge: true,
        adult: true,
        overview: true,
        metadata: true,
      },
    });

    // Transitional fallback for unpopulated genreIds column only while backfill is in progress
    const readiness = await getPhaseHBackfillReadiness("TV");
    if (readiness === "PHASE_H_BACKFILL_IN_PROGRESS" && rows.length === 0 && mode === "GENRE" && genreIds.length > 0) {
      const targetGenreNames = new Set(resolveGenreNamesFromIds(genreIds, "TV"));
      const fallbackConditions = { ...whereConditions };
      delete fallbackConditions.genreIds;

      const fallbackRows = await db.tvShow.findMany({
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
          name: true,
          originalName: true,
          firstAirDate: true,
          firstAirYear: true,
          lastAirDate: true,
          status: true,
          originalLanguage: true,
          posterPath: true,
          backdropPath: true,
          voteAverage: true,
          voteCount: true,
          popularity: true,
          genreIds: true,
          safetyLevel: true,
          normalizedMinimumAge: true,
          adult: true,
          overview: true,
          metadata: true,
        },
      });

      rows = fallbackRows
        .filter((s: any) => {
          const meta = (s.metadata as Record<string, unknown>) || {};
          const gList = Array.isArray(meta.genres) ? (meta.genres as string[]) : [];
          return gList.some((g) => targetGenreNames.has(g));
        })
        .slice(0, take);
    }

    return rows.map((s: any) => {
      const meta = (s.metadata as Record<string, unknown>) || {};
      let genres: string[] = [];
      if (Array.isArray(s.genreIds) && s.genreIds.length > 0) {
        genres = resolveGenreNamesFromIds(s.genreIds, "TV");
      } else if (Array.isArray(meta.genres)) {
        genres = meta.genres as string[];
      }

      return {
        id: s.id,
        tmdbId: s.tmdbId,
        name: s.name,
        originalName: s.originalName,
        englishTitle: (meta.englishTitle as string) || null,
        firstAirDate: s.firstAirDate,
        lastAirDate: s.lastAirDate,
        status: s.status,
        originalLanguage: s.originalLanguage,
        posterPath: s.posterPath,
        backdropPath: s.backdropPath,
        voteAverage: s.voteAverage,
        voteCount: s.voteCount || 0,
        popularity: s.popularity,
        overview: s.overview || (meta.overview as string) || "",
        genres,
        numberOfSeasons: (meta.numberOfSeasons as number | null) || null,
        numberOfEpisodes: (meta.numberOfEpisodes as number | null) || null,
        episodeRunTime: (meta.episodeRunTime as number | null) || null,
        originCountry: (meta.originCountry as string[]) || [],
        adult: s.adult,
        safetyLevel: s.safetyLevel,
        normalizedMinimumAge: s.normalizedMinimumAge,
        metadata: {
          ...meta,
          genreIds: s.genreIds,
        },
      } as CandidateTvShow;
    });
  }

  // 5. Scan eligible TV candidate pool
  const scanResult = await resolveTvCandidateSupply({
    fetchPage: fetchRawTvCandidatePage,
    pageSize: TV_CALIBRATION_CANDIDATE_PAGE_SIZE,
    maxPages: TV_CALIBRATION_CANDIDATE_MAX_PAGES,
    targetPool: TV_CALIBRATION_CANDIDATE_TARGET_POOL,
  });

  // 6. Rank eligible candidates
  const rankedResults = rankCandidateTvShows(
    scanResult.eligibleCandidates,
    userState,
    recentHistory
  );

  // 7. Select Top N Candidates
  const selectedQueue = rankedResults.slice(0, limit).map((r) => ({
    id: r.tvShow.id,
    tmdbId: r.tvShow.tmdbId,
    name: r.tvShow.name,
    originalName: r.tvShow.originalName,
    firstAirDate: r.tvShow.firstAirDate,
    lastAirDate: r.tvShow.lastAirDate,
    status: r.tvShow.status,
    originalLanguage: r.tvShow.originalLanguage,
    posterPath: r.tvShow.posterPath,
    backdropPath: r.tvShow.backdropPath,
    voteAverage: r.tvShow.voteAverage,
    voteCount: r.tvShow.voteCount,
    popularity: r.tvShow.popularity,
    overview: r.tvShow.overview,
    genres: r.tvShow.genres,
    numberOfSeasons: r.tvShow.numberOfSeasons,
    numberOfEpisodes: r.tvShow.numberOfEpisodes,
    selectionScore: r.score,
    reasons: r.reasons,
  }));

  return {
    tvShows: selectedQueue,
    evaluationCount,
    watchedCount,
    tasteEvidenceCount,
    minimumTarget: CALIBRATION_THRESHOLDS.TV.MIN_UNLOCK,
    recommendedTarget: CALIBRATION_THRESHOLDS.TV.RECOMMENDED,
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
