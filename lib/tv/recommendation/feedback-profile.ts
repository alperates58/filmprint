import { db } from "@/lib/db/client";
import { RecommendationAction, RatingStatus } from "@prisma/client";
import type { CandidateTvShow } from "./types";
import { TV_FEEDBACK_ADJUSTMENT_BOUNDS } from "./constants";

export interface TvFeedbackProfile {
  userId: string;
  likedShowIds: Set<string>;
  dislikedShowIds: Set<string>;
  hiddenShowIds: Set<string>;
  watchlistShowIds: Set<string>;
  watchedShowIds: Set<string>;
  notInterestedShowIds: Set<string>; // Alias for backward compatibility
  watchLaterShowIds: Set<string>;    // Alias for backward compatibility
  alreadyWatchedShowIds: Set<string>;// Alias for backward compatibility
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
  const [feedbacks, interactions] = await Promise.all([
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
  ]);

  if (feedbacks.length === 0) {
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
  const notInterestedGenres = new Map<string, number>();

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

  for (const f of feedbacks) {
    const meta = (f.tvShow.metadata as Record<string, any>) || {};
    const rawGenres = meta.genres || [];
    const genres: string[] = Array.isArray(rawGenres)
      ? rawGenres.map((g: any) => (typeof g === "string" ? g : g.name || "")).filter(Boolean)
      : [];

    const rawCreators = meta.created_by || meta.createdBy || [];
    const creators: string[] = Array.isArray(rawCreators)
      ? rawCreators.map((c: any) => (typeof c === "string" ? c : c.name || "")).filter(Boolean)
      : [];

    const rawNetworks = meta.networks || [];
    const networks: string[] = Array.isArray(rawNetworks)
      ? rawNetworks.map((n: any) => (typeof n === "string" ? n : n.name || "")).filter(Boolean)
      : [];

    const airYear = f.tvShow.firstAirDate ? new Date(f.tvShow.firstAirDate).getFullYear() : null;

    const daysAgo = Math.max(
      0,
      Math.floor((nowDate.getTime() - new Date(f.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    );
    const recencyMultiplier = daysAgo <= 30 ? 1.0 : daysAgo <= 90 ? 0.75 : 0.5;

    const action = f.action;

    // Track ID sets
    if (action === RecommendationAction.LIKE) {
      likedShowIds.add(f.tvShowId);
      if (recentLikes.length < 5) recentLikes.push(f.tvShow.name);
    } else if (action === RecommendationAction.DISLIKE || action === RecommendationAction.NOT_INTERESTED) {
      dislikedShowIds.add(f.tvShowId);
      if (recentDislikes.length < 5) recentDislikes.push(f.tvShow.name);
    } else if (action === RecommendationAction.HIDE) {
      hiddenShowIds.add(f.tvShowId);
    } else if (action === RecommendationAction.WATCHLIST || action === RecommendationAction.WATCH_LATER) {
      watchlistShowIds.add(f.tvShowId);
      if (recentWatchlist.length < 5) recentWatchlist.push(f.tvShow.name);
    } else if (
      action === RecommendationAction.WATCHED_FROM_RECOMMENDATION ||
      action === RecommendationAction.ALREADY_WATCHED
    ) {
      watchedShowIds.add(f.tvShowId);
    }

    // Similarity feature weights
    let genreDelta = 0;
    let creatorDelta = 0;
    let networkDelta = 0;
    let eraDelta = 0;

    if (action === RecommendationAction.LIKE) {
      genreDelta = 1.5 * recencyMultiplier;
      creatorDelta = 3.0 * recencyMultiplier;
      networkDelta = 1.5 * recencyMultiplier;
      eraDelta = 1.0 * recencyMultiplier;
      positiveCount++;
    } else if (action === RecommendationAction.WATCHLIST || action === RecommendationAction.WATCH_LATER) {
      genreDelta = 2.0 * recencyMultiplier;
      creatorDelta = 4.0 * recencyMultiplier;
      networkDelta = 2.0 * recencyMultiplier;
      eraDelta = 1.5 * recencyMultiplier;
      positiveCount++;
      watchlistCount++;
    } else if (action === RecommendationAction.DISLIKE || action === RecommendationAction.NOT_INTERESTED) {
      genreDelta = -2.0 * recencyMultiplier;
      creatorDelta = -4.0 * recencyMultiplier;
      networkDelta = -2.0 * recencyMultiplier;
      eraDelta = -1.0 * recencyMultiplier;
      negativeCount++;

      // Backward compatible notInterestedGenres map
      for (const g of genres) {
        notInterestedGenres.set(g, (notInterestedGenres.get(g) || 0) + 1);
      }
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
        networkDelta = -1.5 * recencyMultiplier;
        eraDelta = -0.8 * recencyMultiplier;
        negativeCount++;
      }
    }

    // Accumulate Genre Signals
    for (const g of genres) {
      if (g) {
        rawGenreScores[g] = (rawGenreScores[g] || 0) + genreDelta;
        genreSampleCounts[g] = (genreSampleCounts[g] || 0) + 1;
      }
    }

    // Accumulate Creator Signals
    for (const c of creators) {
      if (c) {
        rawCreatorScores[c] = (rawCreatorScores[c] || 0) + creatorDelta;
        creatorSampleCounts[c] = (creatorSampleCounts[c] || 0) + 1;
      }
    }

    // Accumulate Network Signals
    for (const n of networks) {
      if (n) {
        rawNetworkScores[n] = (rawNetworkScores[n] || 0) + networkDelta;
        networkSampleCounts[n] = (networkSampleCounts[n] || 0) + 1;
      }
    }

    // Accumulate Era Signals
    if (airYear) {
      const eraDecade = `${Math.floor(airYear / 10) * 10}s`;
      rawEraScores[eraDecade] = (rawEraScores[eraDecade] || 0) + eraDelta;
      eraSampleCounts[eraDecade] = (eraSampleCounts[eraDecade] || 0) + 1;
    }
  }

  // Damping & Normalization
  const genreSignals: Record<string, number> = {};
  for (const [genre, rawScore] of Object.entries(rawGenreScores)) {
    const count = genreSampleCounts[genre] || 1;
    const shrinkage = count === 1 ? 0.6 : 1.0;
    genreSignals[genre] = Number((rawScore * shrinkage).toFixed(2));
  }

  const creatorSignals: Record<string, number> = {};
  for (const [c, rawScore] of Object.entries(rawCreatorScores)) {
    const count = creatorSampleCounts[c] || 1;
    const shrinkage = count === 1 ? 0.7 : 1.0;
    creatorSignals[c] = Number((rawScore * shrinkage).toFixed(2));
  }

  const networkSignals: Record<string, number> = {};
  for (const [n, rawScore] of Object.entries(rawNetworkScores)) {
    const count = networkSampleCounts[n] || 1;
    const shrinkage = count === 1 ? 0.6 : 1.0;
    networkSignals[n] = Number((rawScore * shrinkage).toFixed(2));
  }

  const eraSignals: Record<string, number> = {};
  for (const [era, rawScore] of Object.entries(rawEraScores)) {
    const count = eraSampleCounts[era] || 1;
    const shrinkage = count === 1 ? 0.6 : 1.0;
    eraSignals[era] = Number((rawScore * shrinkage).toFixed(2));
  }

  return {
    userId,
    likedShowIds,
    dislikedShowIds,
    hiddenShowIds,
    watchlistShowIds,
    watchedShowIds,
    notInterestedShowIds: dislikedShowIds,
    watchLaterShowIds: watchlistShowIds,
    alreadyWatchedShowIds: watchedShowIds,
    notInterestedGenres,
    genreSignals,
    creatorSignals,
    networkSignals,
    eraSignals,
    positiveCount,
    negativeCount,
    watchlistCount,
    totalFeedbacks: feedbacks.length,
    recentFeedbackWeight: Math.min(1.0, feedbacks.length / 10),
    feedbackSummary: {
      recentLikes,
      recentDislikes,
      recentWatchlist,
    },
  };
}

/**
 * Calculates bounded TV feedback score adjustment for a candidate.
 */
export function calculateTvFeedbackAdjustment(
  show: CandidateTvShow,
  feedback: TvFeedbackProfile
): number {
  if (feedback.totalFeedbacks === 0) return 0;

  // 1. Direct Content-Level Signals
  if (feedback.dislikedShowIds.has(show.id)) {
    return TV_FEEDBACK_ADJUSTMENT_BOUNDS.min; // -15
  }
  if (feedback.watchlistShowIds.has(show.id)) {
    return TV_FEEDBACK_ADJUSTMENT_BOUNDS.max; // +10
  }
  if (feedback.likedShowIds.has(show.id)) {
    return 6;
  }

  // 2. Feature Similarity Aggregation
  let similarityAdjustment = 0;

  // Genre signals
  const showGenres = show.metadata?.genres || [];
  let genreSum = 0;
  for (const g of showGenres) {
    if (g && feedback.genreSignals[g]) {
      genreSum += feedback.genreSignals[g];
    }
  }
  similarityAdjustment += Math.max(-6, Math.min(5, genreSum));

  // Creator signals
  const rawCreators = show.metadata?.created_by || show.metadata?.createdBy || [];
  const creators: string[] = Array.isArray(rawCreators)
    ? rawCreators.map((c: any) => (typeof c === "string" ? c : c.name || "")).filter(Boolean)
    : [];
  for (const c of creators) {
    if (c && feedback.creatorSignals[c]) {
      similarityAdjustment += Math.max(-5, Math.min(4, feedback.creatorSignals[c]));
    }
  }

  // Network signals
  const rawNetworks = show.metadata?.networks || [];
  const networks: string[] = Array.isArray(rawNetworks)
    ? rawNetworks.map((n: any) => (typeof n === "string" ? n : n.name || "")).filter(Boolean)
    : [];
  for (const n of networks) {
    if (n && feedback.networkSignals[n]) {
      similarityAdjustment += Math.max(-3, Math.min(3, feedback.networkSignals[n]));
    }
  }

  // Era signals
  if (show.firstAirDate) {
    const airYear = new Date(show.firstAirDate).getFullYear();
    const eraDecade = `${Math.floor(airYear / 10) * 10}s`;
    if (feedback.eraSignals[eraDecade]) {
      similarityAdjustment += Math.max(-2, Math.min(2, feedback.eraSignals[eraDecade]));
    }
  }

  // Clamp within TV_FEEDBACK_ADJUSTMENT_BOUNDS [-15, +10]
  return Math.max(
    TV_FEEDBACK_ADJUSTMENT_BOUNDS.min,
    Math.min(TV_FEEDBACK_ADJUSTMENT_BOUNDS.max, Math.round(similarityAdjustment))
  );
}
