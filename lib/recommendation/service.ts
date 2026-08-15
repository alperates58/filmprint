import { db } from "../db/client";
import { getSystemSettings } from "../config/service";
import { getOrCalculateUserProfile } from "../profile/service";
import { tmdbClient } from "../tmdb/client";
import { calculateMovieMatch, calibrateMatchScore } from "./matcher";
import {
  generateRecommendationExplanation,
} from "./explanation";
import { buildUserFeedbackProfile } from "./feedback-profile";
import {
  buildTasteEvidenceProfile,
  getEvidenceForRecommendation,
  calculateDislikePenalty,
} from "./evidence";
import { calculateQualityScore } from "./quality";
import { filterEligibleMovies } from "../movies/eligibility";
import type { CandidateMovie } from "../calibration/types";
import type { FilmDnaResult } from "../profile/types";
import type {
  PersonalizedRecommendationItem,
  RecommendationResponse,
  CandidateEvidence,
  CandidateSource,
} from "./types";
import { CANDIDATE_MIX_RATIOS } from "./constants";

export const ENGINE_V3_MATCH_VERSION = 31; // Phase 7B.1 Match Engine v3.1

export interface ScoredCandidate {
  movie: CandidateMovie;
  rawMatchScore: number;
  displayMatchScore: number;
  qualityScore: number;
  matchLabel: string;
  feedbackAdjustment: number;
  dislikePenalty: number;
  components: any;
  reasons: string[];
  candidateSource: CandidateSource;
  evidence: CandidateEvidence;
}

/**
 * Resolves personalized movie recommendations for a user (Match Engine v3.1).
 * Features: NOT_WATCHED recovery, multi-source candidates (KNOWN_UNWATCHED + FRESH_DISCOVERY + ADJACENT),
 * Bayesian quality floor, score calibration (max 97%, strong evidence for 90%+), and non-degraded quality thresholds.
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

  // 2. Separate User Signals (Taste Evidence vs Availability/Unseen Evidence)
  const [
    tasteEvidenceProfile,
    watchedInteractions,
    notWatchedInteractions,
    feedbacks,
    feedbackProfile,
    allUserInteractionsCount,
  ] = await Promise.all([
    buildTasteEvidenceProfile(userId),
    db.movieInteraction.findMany({
      where: { userId, status: "WATCHED" },
      select: { movieId: true },
    }),
    db.movieInteraction.findMany({
      where: { userId, status: "NOT_WATCHED" },
      select: { movieId: true },
    }),
    db.recommendationFeedback.findMany({
      where: { userId },
      select: { movieId: true, action: true },
    }),
    buildUserFeedbackProfile(userId),
    db.movieInteraction.count({ where: { userId } }),
  ]);

  // Excluded from normal recommendations:
  // - Movies user WATCHED
  // - Recommendation feedback actions (NOT_INTERESTED, WATCH_LATER, ALREADY_WATCHED, WATCHED_FROM_RECOMMENDATION)
  const watchedMovieIds = new Set(watchedInteractions.map((i: any) => i.movieId));
  const blockedFeedbackIds = new Set(feedbacks.map((f: any) => f.movieId));
  const notWatchedMovieIds = new Set(notWatchedInteractions.map((i: any) => i.movieId));

  const excludedMovieIds = new Set([
    ...watchedMovieIds,
    ...blockedFeedbackIds,
  ]);

  // Scale candidate pool size based on user interaction volume
  let candidatePoolSize = 300;
  if (allUserInteractionsCount >= 1000) candidatePoolSize = 1000;
  else if (allUserInteractionsCount >= 500) candidatePoolSize = 750;
  else if (allUserInteractionsCount >= 250) candidatePoolSize = 500;

  // Calculate candidate source quotas
  const knownUnwatchedEligibleIds = Array.from(notWatchedMovieIds).filter(
    (id) => !excludedMovieIds.has(id)
  );

  const targetKnownCount = Math.round(candidatePoolSize * CANDIDATE_MIX_RATIOS.KNOWN_UNWATCHED);
  const actualKnownCount = Math.min(knownUnwatchedEligibleIds.length, targetKnownCount);

  // Deficit redistribution to FRESH_DISCOVERY
  const targetFreshCount =
    Math.round(candidatePoolSize * CANDIDATE_MIX_RATIOS.FRESH_DISCOVERY) +
    (targetKnownCount - actualKnownCount);

  // 3. Fetch Candidates from 3 Sources
  // Source A: KNOWN_UNWATCHED
  let knownUnwatchedRaw: any[] = [];
  if (knownUnwatchedEligibleIds.length > 0) {
    knownUnwatchedRaw = await db.movie.findMany({
      where: {
        id: { in: knownUnwatchedEligibleIds },
      },
      orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
      take: actualKnownCount,
    });
  }

  // Source B: FRESH_DISCOVERY (never interacted with)
  const freshExcludedIds = new Set([
    ...excludedMovieIds,
    ...notWatchedMovieIds,
  ]);

  let freshCandidatesRaw = await db.movie.findMany({
    where: {
      id: { notIn: Array.from(freshExcludedIds) },
    },
    orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
    take: targetFreshCount,
  });

  // Replenish fresh candidates if needed
  if (freshCandidatesRaw.length < limit) {
    try {
      await tmdbClient.seedAndFetchMovies();
      freshCandidatesRaw = await db.movie.findMany({
        where: {
          id: { notIn: Array.from(freshExcludedIds) },
        },
        orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
        take: targetFreshCount,
      });
    } catch (e) {
      console.error("[RecommendationService] TMDB seed error:", e);
    }
  }

  // Source C: ADJACENT_DISCOVERY (genre/cluster aligned)
  const topGenres = (profile.genres || [])
    .filter((g: any) => g.score >= 0.6)
    .map((g: any) => g.name);

  let adjacentCandidatesRaw: any[] = [];
  if (topGenres.length > 0) {
    const fetchedFreshIds = new Set(freshCandidatesRaw.map((m: any) => m.id));
    const adjacentExcludedIds = new Set([
      ...freshExcludedIds,
      ...fetchedFreshIds,
    ]);

    adjacentCandidatesRaw = await db.movie.findMany({
      where: {
        id: { notIn: Array.from(adjacentExcludedIds) },
      },
      orderBy: [{ popularity: "desc" }],
      take: Math.round(candidatePoolSize * CANDIDATE_MIX_RATIOS.ADJACENT_DISCOVERY),
    });
  }

  // Format all candidate movies with source tag
  const formatCandidate = (m: any, source: CandidateSource): CandidateMovie & { candidateSource: CandidateSource; metadata?: any; adult?: boolean; voteCount?: number } => {
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
      candidateSource: source,
      adult: (meta.adult as boolean) || false,
      voteCount: (meta.voteCount as number) || undefined,
      metadata: meta,
    };
  };

  const combinedCandidates = [
    ...knownUnwatchedRaw.map((m: any) => formatCandidate(m, "KNOWN_UNWATCHED")),
    ...freshCandidatesRaw.map((m: any) => formatCandidate(m, "FRESH_DISCOVERY")),
    ...adjacentCandidatesRaw.map((m: any) => formatCandidate(m, "ADJACENT_DISCOVERY")),
  ];

  // Deduplicate combined list by movie ID
  const uniqueCandidatesMap = new Map<string, CandidateMovie & { candidateSource: CandidateSource; metadata?: any; adult?: boolean; voteCount?: number }>();
  for (const c of combinedCandidates) {
    if (!uniqueCandidatesMap.has(c.id)) {
      uniqueCandidatesMap.set(c.id, c);
    }
  }
  const rawPool = Array.from(uniqueCandidatesMap.values());
  const candidatePool = filterEligibleMovies(rawPool, "RECOMMENDATION");

  // 4. Score and Calibrate Candidates (Match Engine v3.1)
  const referenceUsageMap = new Map<string, number>();

  const scoredCandidates: ScoredCandidate[] = candidatePool.map((candidate) => {
    // Resolve candidate evidence first
    const evidence = getEvidenceForRecommendation(
      tasteEvidenceProfile,
      candidate,
      referenceUsageMap
    );

    const baseResult = calculateMovieMatch(
      candidate,
      profile,
      feedbackProfile,
      evidence
    );

    const dislikePenalty = calculateDislikePenalty(candidate, tasteEvidenceProfile);
    const qualityScore = calculateQualityScore(candidate);

    const rawMatchScore = Math.max(
      0,
      Math.min(100, baseResult.rawMatchScore + dislikePenalty)
    );

    const displayMatchScore = calibrateMatchScore(
      rawMatchScore,
      evidence.hasStrongReference
    );

    return {
      movie: candidate,
      rawMatchScore,
      displayMatchScore,
      qualityScore,
      matchLabel: baseResult.matchLabel,
      feedbackAdjustment: baseResult.feedbackAdjustment || 0,
      dislikePenalty,
      components: baseResult.components,
      reasons: baseResult.reasons,
      candidateSource: candidate.candidateSource,
      evidence,
    };
  });

  // 5. Apply Quality Floor & Filter
  // Strict rule: DO NOT lower quality to artificially reach 24 items.
  // Must satisfy minimum display match score (>= 62) and dislike penalty limit (>-20).
  const qualityFilteredCandidates = scoredCandidates.filter((item) => {
    if (item.displayMatchScore < 62) return false;
    if (item.dislikePenalty <= -20) return false;
    return true;
  });

  // Sort descending by display match score, then raw match score, then popularity
  const sortedMatches = qualityFilteredCandidates.sort(
    (a, b) =>
      b.displayMatchScore - a.displayMatchScore ||
      b.rawMatchScore - a.rawMatchScore ||
      b.movie.popularity - a.movie.popularity
  );

  const totalCandidates = sortedMatches.length;
  const totalPages = Math.max(1, Math.ceil(totalCandidates / limit));
  const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));
  const startIndex = safePage * limit;
  const pageMatches = sortedMatches.slice(startIndex, startIndex + limit);

  // 6. Resolve Explanations V3.1
  const recommendations: PersonalizedRecommendationItem[] = await Promise.all(
    pageMatches.map(async (item) => {
      // Track reference movie usage
      if (item.evidence.hasStrongReference && item.evidence.positiveReferences[0]) {
        const refId = item.evidence.positiveReferences[0].movieId;
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
          cachedReasons = Array.isArray(parsed)
            ? parsed.map((r: any) => String(r))
            : [String(cached.explanation)];
        } catch {
          cachedReasons = [cached.explanation];
        }

        return {
          movie: item.movie,
          match: item.displayMatchScore,
          displayMatch: item.displayMatchScore,
          rawMatch: item.rawMatchScore,
          matchLabel: item.matchLabel,
          headline: cached.headline,
          reasons: cachedReasons,
          isAiGenerated: cached.isAiGenerated,
          components: item.components,
          evidence: item.evidence,
          candidateSource: item.candidateSource,
          ...(debugMode
            ? {
                debugInfo: {
                  candidateSource: item.candidateSource,
                  rawMatchScore: item.rawMatchScore,
                  displayMatchScore: item.displayMatchScore,
                  qualityScore: item.qualityScore,
                  voteAverage: item.movie.voteAverage,
                  voteCount: (item.movie as any).voteCount || 0,
                  categoryFit: 1.0,
                  knownUnwatched: item.candidateSource === "KNOWN_UNWATCHED",
                  crossRowDuplicatePenalty: 0,
                  referenceEvidence: item.evidence.positiveReferences.map((r) => r.title),
                  referenceSimilarity: item.evidence.positiveReferences[0]?.similarityScore || 0,
                  finalScore: item.displayMatchScore,
                  explanationSource: "deterministic_cache",
                },
              }
            : {}),
        };
      }

      // Generate fresh grounded explanation V3
      const explanationResult = await generateRecommendationExplanation(
        item.movie,
        { ...item, matchScore: item.displayMatchScore },
        profile,
        item.evidence
      );

      // Cache V3.1 explanation
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
        console.error("[RecommendationService V3.1] Failed to cache explanation:", e);
      }

      return {
        movie: item.movie,
        match: item.displayMatchScore,
        displayMatch: item.displayMatchScore,
        rawMatch: item.rawMatchScore,
        matchLabel: item.matchLabel,
        headline: explanationResult.headline,
        reasons: explanationResult.reasons,
        isAiGenerated: explanationResult.isAiGenerated,
        components: item.components,
        evidence: item.evidence,
        candidateSource: item.candidateSource,
        ...(debugMode
          ? {
              debugInfo: {
                candidateSource: item.candidateSource,
                rawMatchScore: item.rawMatchScore,
                displayMatchScore: item.displayMatchScore,
                qualityScore: item.qualityScore,
                voteAverage: item.movie.voteAverage,
                voteCount: (item.movie as any).voteCount || 0,
                categoryFit: 1.0,
                knownUnwatched: item.candidateSource === "KNOWN_UNWATCHED",
                crossRowDuplicatePenalty: 0,
                referenceEvidence: item.evidence.positiveReferences.map((r) => r.title),
                referenceSimilarity: item.evidence.positiveReferences[0]?.similarityScore || 0,
                finalScore: item.displayMatchScore,
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
    current: allUserInteractionsCount,
    profileConfidence: profile.confidence,
    recommendations,
    page: safePage,
    totalPages,
    hasMore: safePage < totalPages - 1,
  };
}
