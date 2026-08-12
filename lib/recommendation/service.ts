import { db } from "@/lib/db/client";
import { getSystemSettings } from "@/lib/config/service";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { tmdbClient } from "@/lib/tmdb/client";
import { calculateMovieMatch } from "./matcher";
import { generateRecommendationExplanation } from "./explanation";
import { buildUserFeedbackProfile } from "./feedback-profile";
import { CandidateMovie } from "@/lib/calibration/types";
import { FilmDnaResult } from "@/lib/profile/types";
import {
  PersonalizedRecommendationItem,
  RecommendationResponse,
} from "./types";
import { MATCH_ENGINE_VERSION } from "./constants";

/**
 * Resolves personalized movie recommendations for a user (Match Engine v2.0).
 * Excludes all movies with prior interactions or recommendation feedback.
 * Incorporates feedback-aware recommendation learning.
 */
export async function getPersonalizedRecommendations(
  userId: string,
  limit: number = 10
): Promise<RecommendationResponse> {
  const settings = await getSystemSettings();
  const targetCount = settings.calibrationTarget;

  // 1. Fetch user's profile
  const profileResponse = await getOrCalculateUserProfile(userId);

  if (!profileResponse.ready || !profileResponse.profile) {
    return {
      ready: false,
      required: profileResponse.required || targetCount,
      current: profileResponse.current || 0,
    };
  }

  const profile = profileResponse.profile as FilmDnaResult;

  // 2. Fetch all excluded movie IDs and user feedback profile in parallel
  const [answeredInteractions, feedbacks, feedbackProfile] = await Promise.all([
    db.movieInteraction.findMany({
      where: { userId },
      select: { movieId: true },
    }),
    db.recommendationFeedback.findMany({
      where: { userId },
      select: { movieId: true },
    }),
    buildUserFeedbackProfile(userId),
  ]);

  const answeredMovieCount = answeredInteractions.length;

  const excludedMovieIds = new Set([
    ...answeredInteractions.map((i: any) => i.movieId),
    ...feedbacks.map((f: any) => f.movieId),
  ]);

  // 3. Query DB candidate movies (300 candidates)
  let rawCandidates = await db.movie.findMany({
    where: {
      id: { notIn: Array.from(excludedMovieIds) },
    },
    orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
    take: 300,
  });

  // Seeding guardrail if fewer candidates exist than limit
  if (rawCandidates.length < limit) {
    await tmdbClient.seedAndFetchMovies();
    rawCandidates = await db.movie.findMany({
      where: {
        id: { notIn: Array.from(excludedMovieIds) },
      },
      orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
      take: 300,
    });
  }

  // Graceful fallback if unrated candidate pool is still empty
  if (rawCandidates.length === 0) {
    rawCandidates = await db.movie.findMany({
      orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
      take: 300,
    });
  }

  // Format candidate movies
  const candidates: CandidateMovie[] = rawCandidates.map((m: any) => {
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

  // 4. Calculate deterministic match score with feedback learning for each candidate
  const matchedList = candidates.map((m: any) =>
    calculateMovieMatch(m, profile, feedbackProfile)
  );

  // Sort descending by match score
  const topMatches = matchedList
    .sort((a, b) => b.matchScore - a.matchScore || b.movie.popularity - a.movie.popularity)
    .slice(0, Math.min(limit, 20));

  // 5. Resolve explanations (DB cache -> AI -> Fallback)
  const recommendations: PersonalizedRecommendationItem[] = await Promise.all(
    topMatches.map(async (item) => {
      // Check cached explanation in DB (uses matchVersion = 2)
      const cached = await db.recommendationExplanation.findUnique({
        where: {
          userId_movieId_profileVersion_matchVersion: {
            userId,
            movieId: item.movie.id,
            profileVersion: profile.version,
            matchVersion: MATCH_ENGINE_VERSION,
          },
        },
      });

      if (cached) {
        return {
          movie: item.movie,
          match: item.matchScore,
          matchLabel: item.matchLabel,
          headline: cached.headline,
          explanation: cached.explanation,
          isAiGenerated: cached.isAiGenerated,
          components: item.components,
          reasons: item.reasons,
        };
      }

      // Generate fresh explanation
      const explanationResult = await generateRecommendationExplanation(
        item.movie,
        item,
        profile
      );

      // Save generated explanation to DB cache
      try {
        await db.recommendationExplanation.upsert({
          where: {
            userId_movieId_profileVersion_matchVersion: {
              userId,
              movieId: item.movie.id,
              profileVersion: profile.version,
              matchVersion: MATCH_ENGINE_VERSION,
            },
          },
          update: {
            headline: explanationResult.headline,
            explanation: explanationResult.explanation,
            isAiGenerated: explanationResult.isAiGenerated,
          },
          create: {
            userId,
            movieId: item.movie.id,
            profileVersion: profile.version,
            matchVersion: MATCH_ENGINE_VERSION,
            headline: explanationResult.headline,
            explanation: explanationResult.explanation,
            isAiGenerated: explanationResult.isAiGenerated,
          },
        });
      } catch (e) {
        console.error("[RecommendationService] Failed to cache explanation:", e);
      }

      return {
        movie: item.movie,
        match: item.matchScore,
        matchLabel: item.matchLabel,
        headline: explanationResult.headline,
        explanation: explanationResult.explanation,
        isAiGenerated: explanationResult.isAiGenerated,
        components: item.components,
        reasons: item.reasons,
      };
    })
  );

  return {
    ready: true,
    required: targetCount,
    current: answeredMovieCount,
    profileConfidence: profile.confidence,
    recommendations,
  };
}
