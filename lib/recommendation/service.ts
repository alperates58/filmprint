import { db } from "@/lib/db/client";
import { getSystemSettings } from "@/lib/config/service";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { tmdbClient } from "@/lib/tmdb/client";
import { calculateMovieMatch } from "./matcher";
import {
  generateRecommendationExplanation,
  EXPLANATION_ENGINE_VERSION,
} from "./explanation";
import { buildUserFeedbackProfile } from "./feedback-profile";
import {
  buildTasteEvidenceProfile,
  getEvidenceForRecommendation,
  calculateDislikePenalty,
} from "./evidence";
import { CandidateMovie } from "@/lib/calibration/types";
import { FilmDnaResult } from "@/lib/profile/types";
import {
  PersonalizedRecommendationItem,
  RecommendationResponse,
  CandidateEvidence,
} from "./types";
import { MATCH_ENGINE_VERSION } from "./constants";

export const ENGINE_V3_MATCH_VERSION = 3;

/**
 * Resolves personalized movie recommendations for a user (Match Engine v3.0).
 * Dynamic candidate pool scaling based on user evidence size.
 * Candidate-specific evidence selection with repetition penalty & dislike scoring.
 */
export async function getPersonalizedRecommendations(
  userId: string,
  limit: number = 24,
  page: number = 0,
  debugMode: boolean = false
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

  // 2. Build Taste Evidence Profile & fetch feedback profile
  const [tasteEvidenceProfile, feedbacks, feedbackProfile, answeredInteractions] =
    await Promise.all([
      buildTasteEvidenceProfile(userId),
      db.recommendationFeedback.findMany({
        where: { userId },
        select: { movieId: true },
      }),
      buildUserFeedbackProfile(userId),
      db.movieInteraction.findMany({
        where: { userId },
        select: { movieId: true },
      }),
    ]);

  const answeredMovieCount = answeredInteractions.length;

  // Scale candidate pool take limit based on user interaction volume
  let candidatePoolSize = 300;
  if (answeredMovieCount >= 1000) candidatePoolSize = 1000;
  else if (answeredMovieCount >= 500) candidatePoolSize = 600;
  else if (answeredMovieCount >= 250) candidatePoolSize = 450;

  const excludedMovieIds = new Set([
    ...answeredInteractions.map((i: any) => i.movieId),
    ...feedbacks.map((f: any) => f.movieId),
  ]);

  // 3. Query DB candidate movies
  let rawCandidates = await db.movie.findMany({
    where: {
      id: { notIn: Array.from(excludedMovieIds) },
    },
    orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
    take: candidatePoolSize,
  });

  if (rawCandidates.length < limit) {
    await tmdbClient.seedAndFetchMovies();
    rawCandidates = await db.movie.findMany({
      where: {
        id: { notIn: Array.from(excludedMovieIds) },
      },
      orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
      take: candidatePoolSize,
    });
  }

  if (rawCandidates.length === 0) {
    rawCandidates = await db.movie.findMany({
      orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
      take: candidatePoolSize,
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

  // 4. Calculate Match Engine V3 score with Dislike Penalties
  const matchedList = candidates.map((m) => {
    const baseResult = calculateMovieMatch(m, profile, feedbackProfile);
    const dislikePenalty = calculateDislikePenalty(m, tasteEvidenceProfile);

    const adjustedScore = Math.max(
      0,
      Math.min(100, baseResult.matchScore + dislikePenalty)
    );

    return {
      ...baseResult,
      matchScore: adjustedScore,
      dislikePenalty,
    };
  });

  // Sort descending by final match score
  const sortedMatches = matchedList.sort(
    (a, b) => b.matchScore - a.matchScore || b.movie.popularity - a.movie.popularity
  );

  const totalCandidates = sortedMatches.length;
  const totalPages = Math.max(1, Math.ceil(totalCandidates / limit));
  const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));
  const startIndex = safePage * limit;
  const pageMatches = sortedMatches.slice(startIndex, startIndex + limit);

  // Track reference movie usage count across recommendation set for soft repetition penalty
  const referenceUsageMap = new Map<string, number>();

  // 5. Resolve candidate-specific evidence & explanations V3
  const recommendations: PersonalizedRecommendationItem[] = await Promise.all(
    pageMatches.map(async (item) => {
      // Resolve candidate-specific evidence
      const evidence: CandidateEvidence = getEvidenceForRecommendation(
        tasteEvidenceProfile,
        item.movie,
        referenceUsageMap
      );

      // Track reference movie usage
      if (evidence.hasStrongReference && evidence.positiveReferences[0]) {
        const refId = evidence.positiveReferences[0].movieId;
        referenceUsageMap.set(refId, (referenceUsageMap.get(refId) || 0) + 1);
      }

      // Check Explanation V3 Cache
      const cached = await db.recommendationExplanation.findUnique({
        where: {
          userId_movieId_profileVersion_matchVersion: {
            userId,
            movieId: item.movie.id,
            profileVersion: profile.version,
            matchVersion: ENGINE_V3_MATCH_VERSION,
          },
        },
      });

      if (cached) {
        let cachedReasons: string[] = [];
        try {
          const parsed = JSON.parse(cached.explanation);
          cachedReasons = Array.isArray(parsed) ? parsed.map((r: any) => String(r)) : [String(cached.explanation)];
        } catch {
          cachedReasons = [cached.explanation];
        }

        return {
          movie: item.movie,
          match: item.matchScore,
          matchLabel: item.matchLabel,
          headline: cached.headline,
          reasons: cachedReasons,
          isAiGenerated: cached.isAiGenerated,
          components: item.components,
          evidence,
          ...(debugMode
            ? {
                debugInfo: {
                  candidateScore: item.matchScore,
                  tasteScore: item.matchScore,
                  contextScore: 1.0,
                  feedbackAdjustment: item.feedbackAdjustment || 0,
                  dislikePenalty: item.dislikePenalty || 0,
                  diversityPenalty: 0,
                  referenceEvidence: evidence.positiveReferences.map((r) => r.title),
                  referenceSimilarity: evidence.positiveReferences[0]?.similarityScore || 0,
                  finalScore: item.matchScore,
                  explanationSource: "deterministic_cache",
                },
              }
            : {}),
        };
      }

      // Generate fresh grounded explanation V3
      const explanationResult = await generateRecommendationExplanation(
        item.movie,
        item,
        profile,
        evidence
      );

      // Cache V3 explanation
      try {
        await db.recommendationExplanation.upsert({
          where: {
            userId_movieId_profileVersion_matchVersion: {
              userId,
              movieId: item.movie.id,
              profileVersion: profile.version,
              matchVersion: ENGINE_V3_MATCH_VERSION,
            },
          },
          update: {
            headline: explanationResult.headline,
            explanation: JSON.stringify(explanationResult.reasons),
            isAiGenerated: explanationResult.isAiGenerated,
          },
          create: {
            userId,
            movieId: item.movie.id,
            profileVersion: profile.version,
            matchVersion: ENGINE_V3_MATCH_VERSION,
            headline: explanationResult.headline,
            explanation: JSON.stringify(explanationResult.reasons),
            isAiGenerated: explanationResult.isAiGenerated,
          },
        });
      } catch (e) {
        console.error("[RecommendationService V3] Failed to cache explanation:", e);
      }

      return {
        movie: item.movie,
        match: item.matchScore,
        matchLabel: item.matchLabel,
        headline: explanationResult.headline,
        reasons: explanationResult.reasons,
        isAiGenerated: explanationResult.isAiGenerated,
        components: item.components,
        evidence,
        ...(debugMode
          ? {
              debugInfo: {
                candidateScore: item.matchScore,
                tasteScore: item.matchScore,
                contextScore: 1.0,
                feedbackAdjustment: item.feedbackAdjustment || 0,
                dislikePenalty: item.dislikePenalty || 0,
                diversityPenalty: 0,
                referenceEvidence: evidence.positiveReferences.map((r) => r.title),
                referenceSimilarity: evidence.positiveReferences[0]?.similarityScore || 0,
                finalScore: item.matchScore,
                explanationSource: explanationResult.isAiGenerated ? "ai" : "deterministic_fallback",
              },
            }
          : {}),
      };
    })
  );

  return {
    ready: true,
    required: targetCount,
    current: answeredMovieCount,
    profileConfidence: profile.confidence,
    recommendations,
    page: safePage,
    totalPages,
    hasMore: safePage < totalPages - 1,
  };
}
