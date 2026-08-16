import { db } from "../db/client";
import { RecommendationAction, RatingStatus } from "@prisma/client";
import {
  ACTION_WEIGHTS,
  FEEDBACK_ADJUSTMENT_BOUNDS,
  SIMILARITY_FEATURE_WEIGHTS,
  getRecencyWeight,
} from "./feedback-constants";

export interface FeedbackProfile {
  userId: string;
  likedMovieIds: Set<string>;
  dislikedMovieIds: Set<string>;
  hiddenMovieIds: Set<string>;
  watchlistMovieIds: Set<string>;
  watchedMovieIds: Set<string>;
  genreSignals: Record<string, number>;
  keywordSignals: Record<string, number>;
  directorSignals: Record<string, number>;
  eraSignals: Record<string, number>;
  positiveCount: number;
  negativeCount: number;
  watchlistCount: number;
  totalFeedbacks: number;
  feedbackSummary: {
    recentLikes: string[];
    recentDislikes: string[];
    recentWatchlist: string[];
  };
}

export const EMPTY_FEEDBACK_PROFILE: FeedbackProfile = {
  userId: "",
  likedMovieIds: new Set<string>(),
  dislikedMovieIds: new Set<string>(),
  hiddenMovieIds: new Set<string>(),
  watchlistMovieIds: new Set<string>(),
  watchedMovieIds: new Set<string>(),
  genreSignals: {},
  keywordSignals: {},
  directorSignals: {},
  eraSignals: {},
  positiveCount: 0,
  negativeCount: 0,
  watchlistCount: 0,
  totalFeedbacks: 0,
  feedbackSummary: {
    recentLikes: [],
    recentDislikes: [],
    recentWatchlist: [],
  },
};

/**
 * Builds a comprehensive feedback profile for a user in a SINGLE bounded database batch query.
 * Eliminates N+1 queries by pre-aggregating feature affinities with shrinkage damping.
 */
export async function buildUserFeedbackProfile(
  userId: string,
  nowDate: Date = new Date()
): Promise<FeedbackProfile> {
  const [feedbacks, interactions] = await Promise.all([
    db.recommendationFeedback.findMany({
      where: { userId },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            releaseYear: true,
            metadata: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.movieInteraction.findMany({
      where: { userId },
      select: {
        movieId: true,
        rating: true,
        status: true,
      },
    }),
  ]);

  if (feedbacks.length === 0) {
    return { ...EMPTY_FEEDBACK_PROFILE, userId };
  }

  const interactionRatingMap = new Map<string, RatingStatus | null>(
    interactions.map((i: any) => [i.movieId, i.rating])
  );

  const likedMovieIds = new Set<string>();
  const dislikedMovieIds = new Set<string>();
  const hiddenMovieIds = new Set<string>();
  const watchlistMovieIds = new Set<string>();
  const watchedMovieIds = new Set<string>();

  const rawGenreScores: Record<string, number> = {};
  const genreSampleCounts: Record<string, number> = {};

  const rawKeywordScores: Record<string, number> = {};
  const keywordSampleCounts: Record<string, number> = {};

  const rawDirectorScores: Record<string, number> = {};
  const directorSampleCounts: Record<string, number> = {};

  const rawEraScores: Record<string, number> = {};
  const eraSampleCounts: Record<string, number> = {};

  let positiveCount = 0;
  let negativeCount = 0;
  let watchlistCount = 0;

  const recentLikes: string[] = [];
  const recentDislikes: string[] = [];
  const recentWatchlist: string[] = [];

  for (const f of feedbacks) {
    const movieMeta = (f.movie.metadata as Record<string, unknown>) || {};
    const genres = Array.isArray(movieMeta.genres) ? (movieMeta.genres as string[]) : [];
    const keywords = Array.isArray(movieMeta.keywords) ? (movieMeta.keywords as string[]) : [];
    const director = typeof movieMeta.director === "string" ? movieMeta.director.trim() : null;
    const releaseYear = f.movie.releaseYear;

    const daysAgo = Math.max(
      0,
      Math.floor((nowDate.getTime() - new Date(f.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    );
    const recencyMultiplier = getRecencyWeight(daysAgo);

    const action = f.action;

    // Track ID sets
    if (action === RecommendationAction.LIKE) {
      likedMovieIds.add(f.movieId);
      if (recentLikes.length < 5) recentLikes.push(f.movie.title);
    } else if (action === RecommendationAction.DISLIKE || action === RecommendationAction.NOT_INTERESTED) {
      dislikedMovieIds.add(f.movieId);
      if (recentDislikes.length < 5) recentDislikes.push(f.movie.title);
    } else if (action === RecommendationAction.HIDE) {
      hiddenMovieIds.add(f.movieId);
    } else if (action === RecommendationAction.WATCHLIST || action === RecommendationAction.WATCH_LATER) {
      watchlistMovieIds.add(f.movieId);
      if (recentWatchlist.length < 5) recentWatchlist.push(f.movie.title);
    } else if (
      action === RecommendationAction.WATCHED_FROM_RECOMMENDATION ||
      action === RecommendationAction.ALREADY_WATCHED
    ) {
      watchedMovieIds.add(f.movieId);
    }

    // Determine feature similarity delta
    let genreDelta = 0;
    let keywordDelta = 0;
    let directorDelta = 0;
    let eraDelta = 0;

    if (action === RecommendationAction.LIKE) {
      genreDelta = SIMILARITY_FEATURE_WEIGHTS.LIKE.GENRE * recencyMultiplier;
      keywordDelta = SIMILARITY_FEATURE_WEIGHTS.LIKE.KEYWORD * recencyMultiplier;
      directorDelta = SIMILARITY_FEATURE_WEIGHTS.LIKE.DIRECTOR * recencyMultiplier;
      eraDelta = SIMILARITY_FEATURE_WEIGHTS.LIKE.ERA * recencyMultiplier;
      positiveCount++;
    } else if (action === RecommendationAction.WATCHLIST || action === RecommendationAction.WATCH_LATER) {
      genreDelta = SIMILARITY_FEATURE_WEIGHTS.WATCHLIST.GENRE * recencyMultiplier;
      keywordDelta = SIMILARITY_FEATURE_WEIGHTS.WATCHLIST.KEYWORD * recencyMultiplier;
      directorDelta = SIMILARITY_FEATURE_WEIGHTS.WATCHLIST.DIRECTOR * recencyMultiplier;
      eraDelta = SIMILARITY_FEATURE_WEIGHTS.WATCHLIST.ERA * recencyMultiplier;
      positiveCount++;
      watchlistCount++;
    } else if (action === RecommendationAction.DISLIKE || action === RecommendationAction.NOT_INTERESTED) {
      genreDelta = SIMILARITY_FEATURE_WEIGHTS.DISLIKE.GENRE * recencyMultiplier;
      keywordDelta = SIMILARITY_FEATURE_WEIGHTS.DISLIKE.KEYWORD * recencyMultiplier;
      directorDelta = SIMILARITY_FEATURE_WEIGHTS.DISLIKE.DIRECTOR * recencyMultiplier;
      eraDelta = SIMILARITY_FEATURE_WEIGHTS.DISLIKE.ERA * recencyMultiplier;
      negativeCount++;
    } else if (
      action === RecommendationAction.WATCHED_FROM_RECOMMENDATION ||
      action === RecommendationAction.ALREADY_WATCHED
    ) {
      const rating = interactionRatingMap.get(f.movieId) || null;
      if (rating === RatingStatus.LOVE || rating === RatingStatus.LIKE) {
        genreDelta = 1.0 * recencyMultiplier;
        keywordDelta = 0.8 * recencyMultiplier;
        directorDelta = 2.0 * recencyMultiplier;
        eraDelta = 0.8 * recencyMultiplier;
        positiveCount++;
      } else if (rating === RatingStatus.DISLIKE) {
        genreDelta = -1.5 * recencyMultiplier;
        keywordDelta = -1.0 * recencyMultiplier;
        directorDelta = -2.5 * recencyMultiplier;
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

    // Accumulate Keyword Signals (take top 6 per movie)
    for (const kw of keywords.slice(0, 6)) {
      if (kw) {
        const normKw = kw.toLowerCase().trim();
        rawKeywordScores[normKw] = (rawKeywordScores[normKw] || 0) + keywordDelta;
        keywordSampleCounts[normKw] = (keywordSampleCounts[normKw] || 0) + 1;
      }
    }

    // Accumulate Director Signals
    if (director) {
      rawDirectorScores[director] = (rawDirectorScores[director] || 0) + directorDelta;
      directorSampleCounts[director] = (directorSampleCounts[director] || 0) + 1;
    }

    // Accumulate Era Signals
    if (releaseYear) {
      const eraDecade = `${Math.floor(releaseYear / 10) * 10}s`;
      rawEraScores[eraDecade] = (rawEraScores[eraDecade] || 0) + eraDelta;
      eraSampleCounts[eraDecade] = (eraSampleCounts[eraDecade] || 0) + 1;
    }
  }

  // Apply sample damping / shrinkage so single extreme actions don't over-saturate
  const genreSignals: Record<string, number> = {};
  for (const [genre, rawScore] of Object.entries(rawGenreScores)) {
    const count = genreSampleCounts[genre] || 1;
    const shrinkageDamping = count === 1 ? 0.6 : 1.0;
    genreSignals[genre] = Number((rawScore * shrinkageDamping).toFixed(2));
  }

  const keywordSignals: Record<string, number> = {};
  for (const [kw, rawScore] of Object.entries(rawKeywordScores)) {
    const count = keywordSampleCounts[kw] || 1;
    const shrinkageDamping = count === 1 ? 0.6 : 1.0;
    keywordSignals[kw] = Number((rawScore * shrinkageDamping).toFixed(2));
  }

  const directorSignals: Record<string, number> = {};
  for (const [dir, rawScore] of Object.entries(rawDirectorScores)) {
    const count = directorSampleCounts[dir] || 1;
    const shrinkageDamping = count === 1 ? 0.7 : 1.0;
    directorSignals[dir] = Number((rawScore * shrinkageDamping).toFixed(2));
  }

  const eraSignals: Record<string, number> = {};
  for (const [era, rawScore] of Object.entries(rawEraScores)) {
    const count = eraSampleCounts[era] || 1;
    const shrinkageDamping = count === 1 ? 0.6 : 1.0;
    eraSignals[era] = Number((rawScore * shrinkageDamping).toFixed(2));
  }

  return {
    userId,
    likedMovieIds,
    dislikedMovieIds,
    hiddenMovieIds,
    watchlistMovieIds,
    watchedMovieIds,
    genreSignals,
    keywordSignals,
    directorSignals,
    eraSignals,
    positiveCount,
    negativeCount,
    watchlistCount,
    totalFeedbacks: feedbacks.length,
    feedbackSummary: {
      recentLikes,
      recentDislikes,
      recentWatchlist,
    },
  };
}

/**
 * Calculates deterministic score adjustment for a movie candidate based on user feedback.
 * Clamped strictly between FEEDBACK_ADJUSTMENT_BOUNDS.MIN (-15) and FEEDBACK_ADJUSTMENT_BOUNDS.MAX (+10).
 */
export function calculateMovieFeedbackAdjustment(
  movieId: string,
  genres: string[] = [],
  releaseYear: number | null = null,
  metadata: Record<string, any> = {},
  profile: FeedbackProfile
): number {
  if (profile.totalFeedbacks === 0) return 0;

  // 1. Direct Content-Level Signals
  if (profile.dislikedMovieIds.has(movieId)) {
    return FEEDBACK_ADJUSTMENT_BOUNDS.MIN; // -15.0
  }
  if (profile.watchlistMovieIds.has(movieId)) {
    return FEEDBACK_ADJUSTMENT_BOUNDS.MAX; // +10.0
  }
  if (profile.likedMovieIds.has(movieId)) {
    return 6.0;
  }

  // 2. Feature Similarity Aggregation
  let similarityAdjustment = 0;

  // Genre signals (capped at +5 / -6)
  let genreSum = 0;
  for (const g of genres) {
    if (g && profile.genreSignals[g]) {
      genreSum += profile.genreSignals[g];
    }
  }
  similarityAdjustment += Math.max(-6, Math.min(5, genreSum));

  // Keyword signals (capped at +3 / -4)
  const candidateKeywords = Array.isArray(metadata.keywords) ? (metadata.keywords as string[]) : [];
  let keywordSum = 0;
  for (const kw of candidateKeywords.slice(0, 6)) {
    const normKw = typeof kw === "string" ? kw.toLowerCase().trim() : "";
    if (normKw && profile.keywordSignals[normKw]) {
      keywordSum += profile.keywordSignals[normKw];
    }
  }
  similarityAdjustment += Math.max(-4, Math.min(3, keywordSum));

  // Director signal (capped at +4 / -5)
  const director = typeof metadata.director === "string" ? metadata.director.trim() : null;
  if (director && profile.directorSignals[director]) {
    similarityAdjustment += Math.max(-5, Math.min(4, profile.directorSignals[director]));
  }

  // Era signal (capped at +2 / -2)
  if (releaseYear) {
    const eraDecade = `${Math.floor(releaseYear / 10) * 10}s`;
    if (profile.eraSignals[eraDecade]) {
      similarityAdjustment += Math.max(-2, Math.min(2, profile.eraSignals[eraDecade]));
    }
  }

  // Clamp within bounds
  return Math.max(
    FEEDBACK_ADJUSTMENT_BOUNDS.MIN,
    Math.min(FEEDBACK_ADJUSTMENT_BOUNDS.MAX, Math.round(similarityAdjustment))
  );
}
