import { db } from "@/lib/db/client";
import { RecommendationAction, RatingStatus, LibraryState, MediaType } from "@prisma/client";
import type { CandidateTvShow } from "./types";
import { TV_FEEDBACK_ADJUSTMENT_BOUNDS } from "./constants";

export interface TvFeedbackProfile {
  userId: string;
  likedShowIds: Set<string>;
  dislikedShowIds: Set<string>;
  hiddenShowIds: Set<string>;
  watchlistShowIds: Set<string>;
  watchedShowIds: Set<string>;
  droppedShowIds: Set<string>;
  favoriteShowIds: Set<string>;
  notInterestedShowIds: Set<string>;
  watchLaterShowIds: Set<string>;
  alreadyWatchedShowIds: Set<string>;
  notInterestedGenres: Map<string, number>;
  genreSignals: Record<string, number>;
  creatorSignals: Record<string, number>;
  networkSignals: Record<string, number>;
  eraSignals: Record<string, number>;
  positiveCount: number;
  negativeCount: number;
  watchlistCount: number;
  totalFeedbacks: number;
  recentFeedbackWeight: number;
  feedbackSummary: {
    recentLikes: string[];
    recentDislikes: string[];
    recentWatchlist: string[];
  };
}

export const EMPTY_TV_FEEDBACK_PROFILE: TvFeedbackProfile = {
  userId: "",
  likedShowIds: new Set<string>(),
  dislikedShowIds: new Set<string>(),
  hiddenShowIds: new Set<string>(),
  watchlistShowIds: new Set<string>(),
  watchedShowIds: new Set<string>(),
  droppedShowIds: new Set<string>(),
  favoriteShowIds: new Set<string>(),
  notInterestedShowIds: new Set<string>(),
  watchLaterShowIds: new Set<string>(),
  alreadyWatchedShowIds: new Set<string>(),
  notInterestedGenres: new Map<string, number>(),
  genreSignals: {},
  creatorSignals: {},
  networkSignals: {},
  eraSignals: {},
  positiveCount: 0,
  negativeCount: 0,
  watchlistCount: 0,
  totalFeedbacks: 0,
  recentFeedbackWeight: 0,
  feedbackSummary: {
    recentLikes: [],
    recentDislikes: [],
    recentWatchlist: [],
  },
};

/**
 * Builds user's TV recommendation feedback profile for short-term adjustments and exclusions.
 * Single bounded database batch query (No N+1 queries).
 */
export async function buildTvFeedbackProfile(
  userId: string,
  nowDate: Date = new Date()
): Promise<TvFeedbackProfile> {
  const [feedbacks, interactions, libraryEntries] = await Promise.all([
    db.tvRecommendationFeedback.findMany({
      where: { userId },
      include: { tvShow: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.tvInteraction.findMany({
      where: { userId },
      select: {
        tvShowId: true,
        rating: true,
        status: true,
      },
    }),
    db.userContentLibrary.findMany({
      where: { userId, mediaType: MediaType.TV },
      include: { tvShow: true },
    }),
  ]);

  if (feedbacks.length === 0 && libraryEntries.length === 0) {
    return { ...EMPTY_TV_FEEDBACK_PROFILE, userId };
  }

  const interactionRatingMap = new Map<string, RatingStatus | null>(
    interactions.map((i: any) => [i.tvShowId, i.rating])
  );

  const likedShowIds = new Set<string>();
  const dislikedShowIds = new Set<string>();
  const hiddenShowIds = new Set<string>();
  const watchlistShowIds = new Set<string>();
  const watchedShowIds = new Set<string>();
  const droppedShowIds = new Set<string>();
  const favoriteShowIds = new Set<string>();

  const rawGenreScores: Record<string, number> = {};
  const genreSampleCounts: Record<string, number> = {};

  const rawCreatorScores: Record<string, number> = {};
  const creatorSampleCounts: Record<string, number> = {};

  const rawNetworkScores: Record<string, number> = {};
  const networkSampleCounts: Record<string, number> = {};

  const rawEraScores: Record<string, number> = {};
  const eraSampleCounts: Record<string, number> = {};

  let positiveCount = 0;
  let negativeCount = 0;
  let watchlistCount = 0;

  const recentLikes: string[] = [];
  const recentDislikes: string[] = [];
  const recentWatchlist: string[] = [];

  // 1. Process Canonical Library Entries
  const processedLibraryTvIds = new Set<string>();
  for (const lib of libraryEntries) {
    if (!lib.tvShow) continue;
    const tvShowId = lib.tvShowId || lib.tvShow.id;
    processedLibraryTvIds.add(tvShowId);

    const tvMeta = (lib.tvShow.metadata as Record<string, unknown>) || {};
    const rawGenres = (tvMeta.genres as any[]) || [];
    const genres = rawGenres.map((g) => (typeof g === "string" ? g : g.name || "")).filter(Boolean);
    const creators = Array.isArray(tvMeta.created_by)
      ? (tvMeta.created_by as any[]).map((c) => (typeof c === "string" ? c : c.name || "")).filter(Boolean)
      : [];
    const networks = Array.isArray(tvMeta.networks)
      ? (tvMeta.networks as any[]).map((n) => (typeof n === "string" ? n : n.name || "")).filter(Boolean)
      : [];
    const firstAirYear = lib.tvShow.firstAirDate ? parseInt(lib.tvShow.firstAirDate.slice(0, 4), 10) : null;

    let genreDelta = 0;
    let creatorDelta = 0;
    let networkDelta = 0;
    let eraDelta = 0;

    if (lib.isFavorite) {
      favoriteShowIds.add(tvShowId);
      genreDelta += 3.0;
      creatorDelta += 4.0;
      networkDelta += 2.0;
      eraDelta += 1.5;
      positiveCount++;
      if (recentLikes.length < 5) recentLikes.push(lib.tvShow.name);
    }

    if (lib.state === LibraryState.WATCHLIST) {
      watchlistShowIds.add(tvShowId);
      genreDelta += 2.0;
      creatorDelta += 4.0;
      networkDelta += 1.5;
      eraDelta += 1.5;
      watchlistCount++;
      if (recentWatchlist.length < 5) recentWatchlist.push(lib.tvShow.name);
    } else if (lib.state === LibraryState.DROPPED) {
      droppedShowIds.add(tvShowId);
      genreDelta -= 2.0;
      creatorDelta -= 3.0;
      networkDelta -= 1.5;
      eraDelta -= 1.0;
      negativeCount++;
      if (recentDislikes.length < 5) recentDislikes.push(lib.tvShow.name);
    } else if (lib.state === LibraryState.WATCHED) {
      watchedShowIds.add(tvShowId);
    }

    for (const g of genres) {
      rawGenreScores[g] = (rawGenreScores[g] || 0) + genreDelta;
      genreSampleCounts[g] = (genreSampleCounts[g] || 0) + 1;
    }
    for (const c of creators) {
      rawCreatorScores[c] = (rawCreatorScores[c] || 0) + creatorDelta;
      creatorSampleCounts[c] = (creatorSampleCounts[c] || 0) + 1;
    }
    for (const n of networks) {
      rawNetworkScores[n] = (rawNetworkScores[n] || 0) + networkDelta;
      networkSampleCounts[n] = (networkSampleCounts[n] || 0) + 1;
    }
    if (firstAirYear) {
      const eraDecade = `${Math.floor(firstAirYear / 10) * 10}s`;
      rawEraScores[eraDecade] = (rawEraScores[eraDecade] || 0) + eraDelta;
      eraSampleCounts[eraDecade] = (eraSampleCounts[eraDecade] || 0) + 1;
    }
  }

  // 2. Process Feedback items
  for (const f of feedbacks) {
    if (processedLibraryTvIds.has(f.tvShowId)) continue;

    const tvMeta = (f.tvShow.metadata as Record<string, unknown>) || {};
    const rawGenres = (tvMeta.genres as any[]) || [];
    const genres = rawGenres.map((g) => (typeof g === "string" ? g : g.name || "")).filter(Boolean);
    const creators = Array.isArray(tvMeta.created_by)
      ? (tvMeta.created_by as any[]).map((c) => (typeof c === "string" ? c : c.name || "")).filter(Boolean)
      : [];
    const networks = Array.isArray(tvMeta.networks)
      ? (tvMeta.networks as any[]).map((n) => (typeof n === "string" ? n : n.name || "")).filter(Boolean)
      : [];
    const firstAirYear = f.tvShow.firstAirDate ? parseInt(f.tvShow.firstAirDate.slice(0, 4), 10) : null;

    const daysAgo = Math.max(
      0,
      Math.floor((nowDate.getTime() - new Date(f.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    );
    const recencyMultiplier = daysAgo <= 30 ? 1.0 : daysAgo <= 90 ? 0.75 : 0.5;
    const action = f.action;

    if (action === RecommendationAction.LIKE) {
      likedShowIds.add(f.tvShowId);
      if (recentLikes.length < 5 && !recentLikes.includes(f.tvShow.name)) recentLikes.push(f.tvShow.name);
    } else if (action === RecommendationAction.DISLIKE || action === RecommendationAction.NOT_INTERESTED) {
      dislikedShowIds.add(f.tvShowId);
      if (recentDislikes.length < 5 && !recentDislikes.includes(f.tvShow.name)) recentDislikes.push(f.tvShow.name);
    } else if (action === RecommendationAction.HIDE) {
      hiddenShowIds.add(f.tvShowId);
    } else if (action === RecommendationAction.WATCHLIST || action === RecommendationAction.WATCH_LATER) {
      watchlistShowIds.add(f.tvShowId);
      if (recentWatchlist.length < 5 && !recentWatchlist.includes(f.tvShow.name)) recentWatchlist.push(f.tvShow.name);
    } else if (
      action === RecommendationAction.WATCHED_FROM_RECOMMENDATION ||
      action === RecommendationAction.ALREADY_WATCHED
    ) {
      watchedShowIds.add(f.tvShowId);
    }

    let genreDelta = 0;
    let creatorDelta = 0;
    let networkDelta = 0;
    let eraDelta = 0;

    if (action === RecommendationAction.LIKE) {
      genreDelta = 1.5 * recencyMultiplier;
      creatorDelta = 3.0 * recencyMultiplier;
      networkDelta = 1.0 * recencyMultiplier;
      eraDelta = 1.0 * recencyMultiplier;
      positiveCount++;
    } else if (action === RecommendationAction.WATCHLIST || action === RecommendationAction.WATCH_LATER) {
      genreDelta = 2.0 * recencyMultiplier;
      creatorDelta = 4.0 * recencyMultiplier;
      networkDelta = 1.5 * recencyMultiplier;
      eraDelta = 1.5 * recencyMultiplier;
      positiveCount++;
      watchlistCount++;
    } else if (action === RecommendationAction.DISLIKE || action === RecommendationAction.NOT_INTERESTED) {
      genreDelta = -2.0 * recencyMultiplier;
      creatorDelta = -4.0 * recencyMultiplier;
      networkDelta = -1.5 * recencyMultiplier;
      eraDelta = -1.0 * recencyMultiplier;
      negativeCount++;
    } else if (
      action === RecommendationAction.WATCHED_FROM_RECOMMENDATION ||
      action === RecommendationAction.ALREADY_WATCHED
    ) {
      const rating = interactionRatingMap.get(f.tvShowId) || null;
      if (rating === RatingStatus.LOVE || rating === RatingStatus.LIKE) {
        genreDelta = 1.0 * recencyMultiplier;
        creatorDelta = 2.0 * recencyMultiplier;
        networkDelta = 1.0 * recencyMultiplier;
        eraDelta = 0.8 * recencyMultiplier;
        positiveCount++;
      } else if (rating === RatingStatus.DISLIKE) {
        genreDelta = -1.5 * recencyMultiplier;
        creatorDelta = -2.5 * recencyMultiplier;
        networkDelta = -1.0 * recencyMultiplier;
        eraDelta = -0.8 * recencyMultiplier;
        negativeCount++;
      }
    }

    for (const g of genres) {
      rawGenreScores[g] = (rawGenreScores[g] || 0) + genreDelta;
      genreSampleCounts[g] = (genreSampleCounts[g] || 0) + 1;
    }
    for (const c of creators) {
      rawCreatorScores[c] = (rawCreatorScores[c] || 0) + creatorDelta;
      creatorSampleCounts[c] = (creatorSampleCounts[c] || 0) + 1;
    }
    for (const n of networks) {
      rawNetworkScores[n] = (rawNetworkScores[n] || 0) + networkDelta;
      networkSampleCounts[n] = (networkSampleCounts[n] || 0) + 1;
    }
    if (firstAirYear) {
      const eraDecade = `${Math.floor(firstAirYear / 10) * 10}s`;
      rawEraScores[eraDecade] = (rawEraScores[eraDecade] || 0) + eraDelta;
      eraSampleCounts[eraDecade] = (eraSampleCounts[eraDecade] || 0) + 1;
    }
  }

  const applyDamping = (
    rawScores: Record<string, number>,
    sampleCounts: Record<string, number>,
    maxCap: number,
    minCap: number
  ): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const [key, rawVal] of Object.entries(rawScores)) {
      const count = sampleCounts[key] || 1;
      const shrinkage = count === 1 ? 0.55 : count === 2 ? 0.75 : 1.0;
      const damped = rawVal * shrinkage;
      result[key] = Math.max(minCap, Math.min(maxCap, Number(damped.toFixed(2))));
    }
    return result;
  };

  const genreSignals = applyDamping(rawGenreScores, genreSampleCounts, 5.0, -6.0);
  const creatorSignals = applyDamping(rawCreatorScores, creatorSampleCounts, 4.0, -5.0);
  const networkSignals = applyDamping(rawNetworkScores, networkSampleCounts, 3.0, -4.0);
  const eraSignals = applyDamping(rawEraScores, eraSampleCounts, 2.0, -2.0);

  return {
    userId,
    likedShowIds,
    dislikedShowIds,
    hiddenShowIds,
    watchlistShowIds,
    watchedShowIds,
    droppedShowIds,
    favoriteShowIds,
    notInterestedShowIds: dislikedShowIds,
    watchLaterShowIds: watchlistShowIds,
    alreadyWatchedShowIds: watchedShowIds,
    notInterestedGenres: new Map<string, number>(),
    genreSignals,
    creatorSignals,
    networkSignals,
    eraSignals,
    positiveCount,
    negativeCount,
    watchlistCount,
    totalFeedbacks: feedbacks.length + libraryEntries.length,
    recentFeedbackWeight: positiveCount > negativeCount ? 1.0 : 0.8,
    feedbackSummary: {
      recentLikes,
      recentDislikes,
      recentWatchlist,
    },
  };
}

/**
 * Calculates score adjustment for a TV candidate based on user feedback & library states.
 */
export function calculateTvFeedbackAdjustment(
  candidate: CandidateTvShow,
  profile: TvFeedbackProfile
): number {
  if (profile.totalFeedbacks === 0) return 0;

  // 1. Direct Content-Level Signals
  if (profile.droppedShowIds.has(candidate.id)) {
    return TV_FEEDBACK_ADJUSTMENT_BOUNDS.min; // -15.0
  }
  if (profile.dislikedShowIds.has(candidate.id)) {
    return TV_FEEDBACK_ADJUSTMENT_BOUNDS.min; // -15.0
  }
  if (profile.favoriteShowIds.has(candidate.id)) {
    return TV_FEEDBACK_ADJUSTMENT_BOUNDS.max; // +10.0
  }
  if (profile.watchlistShowIds.has(candidate.id)) {
    return TV_FEEDBACK_ADJUSTMENT_BOUNDS.max; // +10.0
  }
  if (profile.likedShowIds.has(candidate.id)) {
    return 6.0;
  }

  // 2. Feature Similarity Aggregation
  let similarityAdjustment = 0;

  // Genre signals
  const rawGenres = (candidate.metadata as any)?.genres || [];
  const genres: string[] = Array.isArray(rawGenres)
    ? rawGenres.map((g: any) => (typeof g === "string" ? g : g.name || "")).filter(Boolean)
    : [];

  let genreSum = 0;
  for (const g of genres) {
    if (g && profile.genreSignals[g]) {
      genreSum += profile.genreSignals[g];
    }
  }
  similarityAdjustment += Math.max(-6, Math.min(5, genreSum));

  // Creator signals
  const creators = Array.isArray((candidate.metadata as any)?.created_by)
    ? ((candidate.metadata as any).created_by as any[]).map((c) => (typeof c === "string" ? c : c.name || "")).filter(Boolean)
    : [];

  for (const c of creators) {
    if (c && profile.creatorSignals[c]) {
      similarityAdjustment += Math.max(-5, Math.min(4, profile.creatorSignals[c]));
    }
  }

  // Network signals
  const networks = Array.isArray((candidate.metadata as any)?.networks)
    ? ((candidate.metadata as any).networks as any[]).map((n) => (typeof n === "string" ? n : n.name || "")).filter(Boolean)
    : [];

  for (const n of networks) {
    if (n && profile.networkSignals[n]) {
      similarityAdjustment += Math.max(-4, Math.min(3, profile.networkSignals[n]));
    }
  }

  // Era signals
  if (candidate.firstAirDate) {
    const year = parseInt(candidate.firstAirDate.slice(0, 4), 10);
    if (!isNaN(year)) {
      const eraDecade = `${Math.floor(year / 10) * 10}s`;
      if (profile.eraSignals[eraDecade]) {
        similarityAdjustment += Math.max(-2, Math.min(2, profile.eraSignals[eraDecade]));
      }
    }
  }

  // Clamp within bounds
  return Math.max(
    TV_FEEDBACK_ADJUSTMENT_BOUNDS.min,
    Math.min(TV_FEEDBACK_ADJUSTMENT_BOUNDS.max, Math.round(similarityAdjustment))
  );
}
