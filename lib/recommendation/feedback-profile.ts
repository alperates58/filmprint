import { db } from "@/lib/db/client";
import { RecommendationAction, RatingStatus } from "@prisma/client";
import { ACTION_WEIGHTS, getRecencyWeight } from "./feedback-constants";

export interface FeedbackProfile {
  userId: string;
  genreSignals: Record<string, number>;
  eraSignals: Record<string, number>;
  positiveCount: number;
  negativeCount: number;
  watchLaterCount: number;
  totalFeedbacks: number;
}

export const EMPTY_FEEDBACK_PROFILE: FeedbackProfile = {
  userId: "",
  genreSignals: {},
  eraSignals: {},
  positiveCount: 0,
  negativeCount: 0,
  watchLaterCount: 0,
  totalFeedbacks: 0,
};

/**
 * Builds a lightweight feedback profile for a user in a SINGLE database batch query.
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
      },
    }),
  ]);

  if (feedbacks.length === 0) {
    return { ...EMPTY_FEEDBACK_PROFILE, userId };
  }

  const interactionRatingMap = new Map<string, RatingStatus | null>(
    interactions.map((i) => [i.movieId, i.rating])
  );

  const rawGenreScores: Record<string, number> = {};
  const genreSampleCounts: Record<string, number> = {};
  const rawEraScores: Record<string, number> = {};
  const eraSampleCounts: Record<string, number> = {};

  let positiveCount = 0;
  let negativeCount = 0;
  let watchLaterCount = 0;

  for (const f of feedbacks) {
    const movieMeta = (f.movie.metadata as Record<string, unknown>) || {};
    const genres = (movieMeta.genres as string[]) || [];
    const releaseYear = f.movie.releaseYear;

    const daysAgo = Math.max(
      0,
      Math.floor((nowDate.getTime() - new Date(f.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    );
    const recencyMultiplier = getRecencyWeight(daysAgo);

    const rating = interactionRatingMap.get(f.movieId) || null;

    let actionKey: string = f.action;
    if (
      (f.action === RecommendationAction.WATCHED_FROM_RECOMMENDATION ||
        f.action === RecommendationAction.ALREADY_WATCHED) &&
      rating
    ) {
      actionKey = `${f.action}_${rating}`;
    }

    const baseWeight = ACTION_WEIGHTS[actionKey] ?? 0;
    const finalWeight = baseWeight * recencyMultiplier;

    if (finalWeight > 0) positiveCount++;
    if (finalWeight < 0) negativeCount++;
    if (f.action === RecommendationAction.WATCH_LATER) watchLaterCount++;

    // Accumulate genre signals
    for (const genre of genres) {
      rawGenreScores[genre] = (rawGenreScores[genre] || 0) + finalWeight;
      genreSampleCounts[genre] = (genreSampleCounts[genre] || 0) + 1;
    }

    // Accumulate era signals
    if (releaseYear) {
      const eraDecade = `${Math.floor(releaseYear / 10) * 10}s`;
      rawEraScores[eraDecade] = (rawEraScores[eraDecade] || 0) + finalWeight;
      eraSampleCounts[eraDecade] = (eraSampleCounts[eraDecade] || 0) + 1;
    }
  }

  // Apply sample damping / shrinkage so 1 NOT_INTERESTED doesn't destroy a genre
  const genreSignals: Record<string, number> = {};
  for (const [genre, rawScore] of Object.entries(rawGenreScores)) {
    const count = genreSampleCounts[genre] || 1;
    // Shrinkage factor: Damps single sample impact by 50%
    const shrinkageDamping = count === 1 ? 0.5 : 1.0;
    genreSignals[genre] = Number((rawScore * shrinkageDamping).toFixed(2));
  }

  const eraSignals: Record<string, number> = {};
  for (const [era, rawScore] of Object.entries(rawEraScores)) {
    const count = eraSampleCounts[era] || 1;
    const shrinkageDamping = count === 1 ? 0.5 : 1.0;
    eraSignals[era] = Number((rawScore * shrinkageDamping).toFixed(2));
  }

  return {
    userId,
    genreSignals,
    eraSignals,
    positiveCount,
    negativeCount,
    watchLaterCount,
    totalFeedbacks: feedbacks.length,
  };
}
