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
  limit: number = 5,
  options?: { forceReplenish?: boolean }
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
      if (i.rating === "LOVE" || i.rating === "LIKE") {
        positiveGenresSet.add(g);
      }
      // Negative signal: DISLIKE
      if (i.rating === "DISLIKE") {
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

  // 3. Helper to query raw un-interacted TV show candidate pool from DB
  async function fetchRawCandidatePool(): Promise<CandidateTvShow[]> {
    const raw = await db.tvShow.findMany({
      where: {
        interactions: {
          none: { userId },
        },
        id: { notIn: Array.from(answeredTvShowIds) },
        posterPath: { not: null },
      },
      orderBy: [{ popularity: "desc" }, { voteAverage: "desc" }],
      take: 1000,
    });

    return raw.map((s: any) => {
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
  }

  // 4. Resolve candidate pool & calculate true eligible unanswered count
  let rawCandidates = await fetchRawCandidatePool();
  let eligibleCandidates = filterEligibleTvShows(rawCandidates, "CALIBRATION");
  let eligibleUnansweredCount = eligibleCandidates.length;

  // Replenish from TMDB ONLY if true reserve is low (< 30) or forced by manual refresh
  if (eligibleUnansweredCount < 30 || options?.forceReplenish) {
    await tmdbTvClient.seedAndFetchTvShows();
    rawCandidates = await fetchRawCandidatePool();
    eligibleCandidates = filterEligibleTvShows(rawCandidates, "CALIBRATION");
    eligibleUnansweredCount = eligibleCandidates.length;
  }

  // 5. Deterministic Selection with Multi-Level Relaxation Ladder
  let selectedShows: QueueTvShowResponseItem[] = [];
  let appliedStrategyLevel = 1;

  if (eligibleCandidates.length > 0) {
    // LEVEL 1: Full Active Learning (Uncertainty + Quality + Diversity + Recency Repetition Penalty)
    const rankedLevel1 = rankCandidateTvShows(eligibleCandidates, userState, recentInteractions);
    if (rankedLevel1.length > 0) {
      selectedShows = rankedLevel1.slice(0, limit).map((r: any) => ({
        ...r.tvShow,
        selectionScore: r.score,
        reasons: r.reasons,
      }));
      appliedStrategyLevel = 1;
    }

    // LEVEL 2: Relaxed Active Learning (ignore recency repetition penalty)
    if (selectedShows.length === 0) {
      const rankedLevel2 = rankCandidateTvShows(eligibleCandidates, userState, []);
      if (rankedLevel2.length > 0) {
        selectedShows = rankedLevel2.slice(0, limit).map((r: any) => ({
          ...r.tvShow,
          selectionScore: r.score,
          reasons: [...(r.reasons || []), "relaxation_level_2_active_learning"],
        }));
        appliedStrategyLevel = 2;
      }
    }

    // LEVEL 3: Deterministic Quality & Popularity Best Candidates (pure quality fallback on eligible pool)
    if (selectedShows.length === 0) {
      const sortedLevel3 = [...eligibleCandidates].sort((a, b) => {
        if (b.voteAverage !== a.voteAverage) return b.voteAverage - a.voteAverage;
        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
        return a.tmdbId - b.tmdbId;
      });
      selectedShows = sortedLevel3.slice(0, limit).map((show) => ({
        ...show,
        selectionScore: 1.0,
        reasons: ["relaxation_level_3_quality_floor"],
      }));
      appliedStrategyLevel = 3;
    }
  }

  // LEVEL 4 (Emergency Supply Fallback): If strict CALIBRATION eligibility over-constrained,
  // evaluate against GENERAL eligibility (voteCount >= 10, overview >= 25, non-adult, valid poster)
  if (selectedShows.length === 0 && rawCandidates.length > 0) {
    const generalEligible = filterEligibleTvShows(rawCandidates, "RECOMMENDATION");
    if (generalEligible.length > 0) {
      const sortedLevel4 = [...generalEligible].sort((a, b) => {
        if (b.voteAverage !== a.voteAverage) return b.voteAverage - a.voteAverage;
        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
        return a.tmdbId - b.tmdbId;
      });
      selectedShows = sortedLevel4.slice(0, limit).map((show) => ({
        ...show,
        selectionScore: 0.5,
        reasons: ["relaxation_level_4_general_eligibility_fallback"],
      }));
      appliedStrategyLevel = 4;
    }
  }

  return {
    tvShows: selectedShows,
    answeredCount,
    targetCount,
    completed: answeredCount >= targetCount,
    strategy: {
      activeLearningEnabled: appliedStrategyLevel <= 2,
      selectorVersion: appliedStrategyLevel,
    },
  };
}
