import { db } from "../../lib/db/client";
import { FixtureArchetypeSpec, GroundTruthMovieLabel } from "./types";
import { getOrCalculateUserProfile } from "../../lib/profile/service";
import { CandidateMovie } from "../../lib/calibration/types";
import { RatingStatus, InteractionStatus } from "@prisma/client";

export interface FixtureSetupResult {
  userId: string;
  user: any;
  interactionCount: number;
  watchedCount: number;
  notWatchedCount: number;
  holdoutTmdbIds: Set<number>;
  holdoutMovieIds: Set<string>;
}

/**
 * Deterministically sets up an isolated fixture user in local PostgreSQL.
 */
export async function setupFixtureUser(
  spec: FixtureArchetypeSpec
): Promise<FixtureSetupResult> {
  const userId = `test-fixture-${spec.id.toLowerCase()}`;

  // 1. Clean up any previous fixture records for this ID
  await cleanupFixtureUser(userId);

  // 2. Create synthetic test User
  const user = await db.user.create({
    data: {
      id: userId,
      name: `Fixture ${spec.name}`,
      email: `${userId}@filmprint.test`,
      accountType: "ANONYMOUS",
      provider: "ANONYMOUS",
    },
  });

  // 3. Fetch all candidate movies from local PostgreSQL
  const allMovies = await db.movie.findMany({
    select: {
      id: true,
      tmdbId: true,
      title: true,
      releaseYear: true,
      popularity: true,
      voteAverage: true,
      metadata: true,
    },
    orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
  });

  const movieByTmdbId = new Map<number, any>();
  for (const m of allMovies) {
    movieByTmdbId.set(m.tmdbId, m);
  }

  const holdoutTmdbIds = new Set(spec.holdoutPositiveTmdbIds);
  const holdoutMovieIds = new Set<string>();

  for (const tid of spec.holdoutPositiveTmdbIds) {
    const m = movieByTmdbId.get(tid);
    if (m) holdoutMovieIds.add(m.id);
  }

  // Used movie IDs for this fixture user to prevent duplicates
  const usedMovieIds = new Set<string>();
  const interactionsToCreate: {
    userId: string;
    movieId: string;
    status: InteractionStatus;
    rating: RatingStatus | null;
  }[] = [];

  // Helper to safely add interaction
  const addInteraction = (
    movie: any,
    status: InteractionStatus,
    rating: RatingStatus | null
  ) => {
    if (!movie || usedMovieIds.has(movie.id) || holdoutMovieIds.has(movie.id)) {
      return false;
    }
    usedMovieIds.add(movie.id);
    interactionsToCreate.push({
      userId,
      movieId: movie.id,
      status,
      rating,
    });
    return true;
  };

  // 4. Insert Anchor Movies first (LOVE, LIKE, DISLIKE)
  for (const tmdbId of spec.anchorLoveTmdbIds) {
    const m = movieByTmdbId.get(tmdbId);
    if (m) addInteraction(m, "WATCHED", "LOVE");
  }

  for (const tmdbId of spec.anchorLikeTmdbIds) {
    const m = movieByTmdbId.get(tmdbId);
    if (m) addInteraction(m, "WATCHED", "LIKE");
  }

  for (const tmdbId of spec.anchorDislikeTmdbIds) {
    const m = movieByTmdbId.get(tmdbId);
    if (m) addInteraction(m, "WATCHED", "DISLIKE");
  }

  // 5. Fill remaining WATCHED interactions based on taste intent
  let watchedFilled = interactionsToCreate.length;

  for (const movie of allMovies) {
    if (watchedFilled >= spec.targetWatchedCount) break;
    if (usedMovieIds.has(movie.id) || holdoutMovieIds.has(movie.id)) continue;

    const meta = (movie.metadata as Record<string, any>) || {};
    const genres: string[] = Array.isArray(meta.genres) ? meta.genres : [];
    const decade = movie.releaseYear ? `${Math.floor(movie.releaseYear / 10) * 10}s` : null;
    const lang = (meta.originalLanguage as string) || "en";

    const hasDislikedGenre = spec.dislikedGenres.some((g) => genres.includes(g));
    const hasPrimaryGenre = spec.primaryGenres.some((g) => genres.includes(g));
    const hasSecondaryGenre = spec.secondaryGenres.some((g) => genres.includes(g));
    const hasPreferredEra = decade ? spec.preferredEras.includes(decade) : false;
    const hasPreferredLang = spec.preferredLanguages ? spec.preferredLanguages.includes(lang) : true;

    if (hasDislikedGenre) {
      // 10% chance to record explicit DISLIKE if disliked genres defined
      if (spec.dislikedGenres.length > 0 && Math.random() < 0.2) {
        if (addInteraction(movie, "WATCHED", "DISLIKE")) {
          watchedFilled++;
        }
      }
    } else if (hasPrimaryGenre && hasPreferredEra && hasPreferredLang) {
      const rating: RatingStatus = movie.voteAverage >= 8.0 ? "LOVE" : "LIKE";
      if (addInteraction(movie, "WATCHED", rating)) {
        watchedFilled++;
      }
    } else if (hasPrimaryGenre || (hasSecondaryGenre && hasPreferredEra)) {
      const rating: RatingStatus = movie.voteAverage >= 7.5 ? "LIKE" : "NEUTRAL";
      if (addInteraction(movie, "WATCHED", rating)) {
        watchedFilled++;
      }
    } else if (hasSecondaryGenre) {
      if (addInteraction(movie, "WATCHED", "LIKE")) {
        watchedFilled++;
      }
    }
  }

  // If still need more watched to hit targetWatchedCount, add neutral/diverse watched
  if (watchedFilled < spec.targetWatchedCount) {
    for (const movie of allMovies) {
      if (watchedFilled >= spec.targetWatchedCount) break;
      if (usedMovieIds.has(movie.id) || holdoutMovieIds.has(movie.id)) continue;
      const meta = (movie.metadata as Record<string, any>) || {};
      const genres: string[] = Array.isArray(meta.genres) ? meta.genres : [];
      if (!spec.dislikedGenres.some((g) => genres.includes(g))) {
        if (addInteraction(movie, "WATCHED", "NEUTRAL")) {
          watchedFilled++;
        }
      }
    }
  }

  // 6. Fill NOT_WATCHED interactions (Candidate Supply, Non-Negative)
  let notWatchedFilled = 0;
  for (const movie of allMovies) {
    if (notWatchedFilled >= spec.targetNotWatchedCount) break;
    if (usedMovieIds.has(movie.id) || holdoutMovieIds.has(movie.id)) continue;

    if (addInteraction(movie, "NOT_WATCHED", null)) {
      notWatchedFilled++;
    }
  }

  // 7. Bulk Insert interactions
  console.log(`[Fixture ${spec.id}] Inserting ${interactionsToCreate.length} interactions (${watchedFilled} WATCHED, ${notWatchedFilled} NOT_WATCHED)...`);
  
  const CHUNK_SIZE = 250;
  for (let i = 0; i < interactionsToCreate.length; i += CHUNK_SIZE) {
    const chunk = interactionsToCreate.slice(i, i + CHUNK_SIZE);
    await db.movieInteraction.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  // 8. Apply Optional Recommendation Feedbacks
  if (spec.feedbackSignals && spec.feedbackSignals.length > 0) {
    for (const fb of spec.feedbackSignals) {
      const m = movieByTmdbId.get(fb.tmdbId);
      if (m) {
        await db.recommendationFeedback.upsert({
          where: { userId_movieId: { userId, movieId: m.id } },
          update: { action: fb.action, matchScore: 80 },
          create: { userId, movieId: m.id, action: fb.action, matchScore: 80 },
        });
      }
    }
  }

  // 9. Calculate and cache Film DNA Profile
  await getOrCalculateUserProfile(userId);

  return {
    userId,
    user,
    interactionCount: interactionsToCreate.length,
    watchedCount: watchedFilled,
    notWatchedCount: notWatchedFilled,
    holdoutTmdbIds,
    holdoutMovieIds,
  };
}

/**
 * Generates independent Ground-Truth relevance labels (0, 1, 2, 3) for candidate movies
 * without referencing or relying on the recommendation engine's internal scores.
 */
export function generateIndependentGroundTruth(
  spec: FixtureArchetypeSpec,
  candidate: CandidateMovie,
  isHoldout: boolean
): GroundTruthMovieLabel {
  const reasons: string[] = [];
  const genres = candidate.genres || [];
  const meta = (candidate as any).metadata || {};
  const lang = (meta.originalLanguage as string) || "en";
  const decade = candidate.releaseYear ? `${Math.floor(candidate.releaseYear / 10) * 10}s` : null;

  // Rule 1: Explicit Holdout Positives are always 3 (Highly Relevant)
  if (isHoldout || spec.holdoutPositiveTmdbIds.includes(candidate.tmdbId)) {
    reasons.push("Explicit curated holdout positive anchor");
    return {
      movieId: candidate.id,
      tmdbId: candidate.tmdbId,
      title: candidate.title,
      expectedRelevance: 3,
      relevanceReasons: reasons,
      isHoldout: true,
    };
  }

  // Rule 2: Check for Disliked Genre or Extreme Orientation Mismatch
  const hasDislikedGenre = spec.dislikedGenres.some((g) => genres.includes(g));
  if (hasDislikedGenre) {
    reasons.push(`Contains disliked genre: ${spec.dislikedGenres.filter((g) => genres.includes(g)).join(", ")}`);
    return {
      movieId: candidate.id,
      tmdbId: candidate.tmdbId,
      title: candidate.title,
      expectedRelevance: 0,
      relevanceReasons: reasons,
      isHoldout: false,
    };
  }

  // Count overlaps
  const primaryOverlap = genres.filter((g) => spec.primaryGenres.includes(g));
  const secondaryOverlap = genres.filter((g) => spec.secondaryGenres.includes(g));
  const eraMatch = decade ? spec.preferredEras.includes(decade) : false;
  const langMatch = spec.preferredLanguages ? spec.preferredLanguages.includes(lang) : true;

  // Rule 3: Highly Relevant (3)
  // Strong genre alignment (2+ primary or 1 primary + 1 secondary) + era match + language match + voteAverage >= 7.2
  if (
    ((primaryOverlap.length >= 2) || (primaryOverlap.length >= 1 && (secondaryOverlap.length >= 1 || eraMatch))) &&
    langMatch &&
    (candidate.voteAverage || 7.0) >= 7.0
  ) {
    reasons.push(`Strong taste alignment in ${primaryOverlap.join(", ")}`);
    if (eraMatch && decade) reasons.push(`Matches preferred era ${decade}`);
    return {
      movieId: candidate.id,
      tmdbId: candidate.tmdbId,
      title: candidate.title,
      expectedRelevance: 3,
      relevanceReasons: reasons,
      isHoldout: false,
    };
  }

  // Rule 4: Relevant (2)
  // At least 1 primary genre or 2 secondary genres
  if (primaryOverlap.length >= 1 || secondaryOverlap.length >= 2) {
    reasons.push(`Moderate taste alignment in ${[...primaryOverlap, ...secondaryOverlap].join(", ")}`);
    return {
      movieId: candidate.id,
      tmdbId: candidate.tmdbId,
      title: candidate.title,
      expectedRelevance: 2,
      relevanceReasons: reasons,
      isHoldout: false,
    };
  }

  // Rule 5: Weakly Relevant (1)
  // 1 secondary genre or general high quality neutral movie (vote >= 7.8)
  if (secondaryOverlap.length >= 1 || (candidate.voteAverage && candidate.voteAverage >= 7.8)) {
    reasons.push("Weak secondary genre or general high-quality cinephile alignment");
    return {
      movieId: candidate.id,
      tmdbId: candidate.tmdbId,
      title: candidate.title,
      expectedRelevance: 1,
      relevanceReasons: reasons,
      isHoldout: false,
    };
  }

  // Rule 6: Irrelevant (0)
  reasons.push("No genre or thematic alignment with fixture intent");
  return {
    movieId: candidate.id,
    tmdbId: candidate.tmdbId,
    title: candidate.title,
    expectedRelevance: 0,
    relevanceReasons: reasons,
    isHoldout: false,
  };
}

/**
 * Completely cleans up fixture user and all related records from DB.
 */
export async function cleanupFixtureUser(userId: string): Promise<void> {
  await db.recommendationExplanation.deleteMany({ where: { userId } });
  await db.recommendationFeedback.deleteMany({ where: { userId } });
  await db.movieInteraction.deleteMany({ where: { userId } });
  await db.userTasteProfile.deleteMany({ where: { userId } });
  await db.user.deleteMany({ where: { id: userId } });
}
