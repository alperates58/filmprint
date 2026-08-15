import { db } from "@/lib/db/client";
import { getOrRecalculateTvTasteProfile } from "../profile/service";
import { evaluateTvEligibility } from "../eligibility";
import { buildTvTasteEvidenceProfile } from "./evidence";
import { buildTvFeedbackProfile } from "./feedback-profile";
import { calculateTvMatch } from "./matcher";
import { buildTvHomeEditorialModules } from "./editorial-scorer";
import {
  TV_MATCH_ENGINE_VERSION,
  TV_DEFAULT_QUALITY_FLOOR,
} from "./constants";
import type {
  CandidateTvShow,
  PersonalizedTvRecommendationItem,
  PersonalizedTvRecommendationResponse,
  TvCandidateSource,
  TvHomeModuleItem,
} from "./types";

export interface TvRecommendationOptions {
  limit?: number;
  page?: number;
  qualityFloor?: number;
  includeKnownUnwatched?: boolean;
}

/**
 * Normalizes DB TvShow record into structured CandidateTvShow.
 */
export function normalizeDbTvShowToCandidate(tvShow: any): CandidateTvShow {
  const meta = (tvShow.metadata as Record<string, unknown>) || {};
  const rawGenres = meta.genres || [];
  const genres: string[] = Array.isArray(rawGenres)
    ? rawGenres.map((g: any) => (typeof g === "string" ? g : g.name || "")).filter(Boolean)
    : [];

  return {
    id: tvShow.id,
    tmdbId: tvShow.tmdbId,
    name: tvShow.name,
    originalName: tvShow.originalName,
    overview: tvShow.overview || (meta.overview as string) || "",
    posterPath: tvShow.posterPath,
    backdropPath: tvShow.backdropPath,
    firstAirDate: tvShow.firstAirDate,
    lastAirDate: tvShow.lastAirDate,
    status: tvShow.status,
    originalLanguage: tvShow.originalLanguage,
    popularity: tvShow.popularity || 0.0,
    voteAverage: tvShow.voteAverage || 0.0,
    voteCount: tvShow.voteCount ?? (meta.voteCount as number | null) ?? null,
    metadata: {
      ...meta,
      genres,
      numberOfSeasons: (meta.numberOfSeasons as number | null) ?? (meta.number_of_seasons as number | null) ?? null,
      numberOfEpisodes: (meta.numberOfEpisodes as number | null) ?? (meta.number_of_episodes as number | null) ?? null,
      episodeRunTime: (meta.episodeRunTime as number[] | number | null) ?? (meta.episode_run_time as number[] | number | null) ?? null,
      networks: (meta.networks as Array<{ id?: number; name?: string }>) || [],
      productionCompanies:
        (meta.productionCompanies as Array<{ id?: number; name?: string }>) ||
        (meta.production_companies as Array<{ id?: number; name?: string }>) ||
        [],
      originCountry: (meta.originCountry as string[] | string | null) ?? (meta.origin_country as string[] | string | null) ?? null,
    },
  };
}

/**
 * Re-ranks candidates to prevent single-genre or single-format over-saturation in Top 10.
 */
export function applyTvDiversityRerank(
  items: PersonalizedTvRecommendationItem[]
): PersonalizedTvRecommendationItem[] {
  if (items.length <= 5) return items;

  const result: PersonalizedTvRecommendationItem[] = [];
  const remaining = [...items];
  const genreFrequency = new Map<string, number>();
  const formatFrequency = new Map<string, number>();

  while (remaining.length > 0 && result.length < items.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < Math.min(10, remaining.length); i++) {
      const candidate = remaining[i];
      const genres = candidate.tvShow.metadata?.genres || [];
      const seasons = candidate.tvShow.metadata?.numberOfSeasons;
      const format = seasons === 1 ? "MINI" : seasons && seasons >= 5 ? "LONG" : "MULTI";

      let penalty = 0;
      for (const g of genres) {
        const count = genreFrequency.get(g) || 0;
        if (count >= 2) penalty += 6 * (count - 1);
      }

      const fCount = formatFrequency.get(format) || 0;
      if (fCount >= 3) penalty += 4 * (fCount - 2);

      const adjustedScore = candidate.matchScore - penalty;
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestIdx = i;
      }
    }

    const [selected] = remaining.splice(bestIdx, 1);
    result.push(selected);

    // Update frequencies
    for (const g of selected.tvShow.metadata?.genres || []) {
      genreFrequency.set(g, (genreFrequency.get(g) || 0) + 1);
    }
    const selSeasons = selected.tvShow.metadata?.numberOfSeasons;
    const selFormat = selSeasons === 1 ? "MINI" : selSeasons && selSeasons >= 5 ? "LONG" : "MULTI";
    formatFrequency.set(selFormat, (formatFrequency.get(selFormat) || 0) + 1);
  }

  return result;
}

/**
 * Generates personalized TV recommendations for a user.
 */
export async function getPersonalizedTvRecommendations(
  userId: string,
  options: TvRecommendationOptions = {}
): Promise<PersonalizedTvRecommendationResponse> {
  const {
    limit = 24,
    page = 1,
    qualityFloor = TV_DEFAULT_QUALITY_FLOOR,
    includeKnownUnwatched = true,
  } = options;

  // 1. Resolve TV Profile, Evidence Profile & Feedback Profile in parallel
  const [profileData, evidenceProfile, feedbackProfile] = await Promise.all([
    getOrRecalculateTvTasteProfile(userId),
    buildTvTasteEvidenceProfile(userId),
    buildTvFeedbackProfile(userId),
  ]);

  const profile = profileData.profile;
  if (!profile) {
    return {
      recommendations: [],
      profileConfidence: profileData.confidence,
      confidenceLabel: profileData.maturityLabel,
      maturity: profileData.maturity,
      maturityLabel: profileData.maturityLabel,
      totalEligible: 0,
      page,
      hasMore: false,
      version: TV_MATCH_ENGINE_VERSION,
    };
  }

  // 2. Collect Excluded TV Show IDs
  const [watchedInteractions, partialInteractions, unsureInteractions] = await Promise.all([
    db.tvInteraction.findMany({
      where: { userId, status: "WATCHED" },
      select: { tvShowId: true },
    }),
    db.tvInteraction.findMany({
      where: { userId, status: "PARTIALLY_WATCHED" },
      select: { tvShowId: true },
    }),
    db.tvInteraction.findMany({
      where: { userId, status: "UNSURE" },
      select: { tvShowId: true },
    }),
  ]);

  const excludedShowIds = new Set<string>([
    ...watchedInteractions.map((i) => i.tvShowId),
    ...partialInteractions.map((i) => i.tvShowId),
    ...unsureInteractions.map((i) => i.tvShowId),
    ...feedbackProfile.watchLaterShowIds,
    ...feedbackProfile.alreadyWatchedShowIds,
    ...feedbackProfile.notInterestedShowIds,
  ]);

  const candidateList: Array<{ candidate: CandidateTvShow; source: TvCandidateSource }> = [];
  const candidateIdSet = new Set<string>();

  // 3. Source A: KNOWN_UNWATCHED (NOT_WATCHED interactions)
  if (includeKnownUnwatched) {
    const notWatchedInteractions = await db.tvInteraction.findMany({
      where: { userId, status: "NOT_WATCHED" },
      include: { tvShow: true },
      take: 40,
    });

    for (const item of notWatchedInteractions) {
      if (!excludedShowIds.has(item.tvShowId) && !candidateIdSet.has(item.tvShowId)) {
        candidateList.push({
          candidate: normalizeDbTvShowToCandidate(item.tvShow),
          source: "KNOWN_UNWATCHED",
        });
        candidateIdSet.add(item.tvShowId);
      }
    }
  }

  // 4. Source B & C: FRESH_DISCOVERY & ADJACENT_DISCOVERY from DB
  const freshShows = await db.tvShow.findMany({
    where: {
      id: { notIn: Array.from(new Set([...excludedShowIds, ...candidateIdSet])) },
    },
    take: 100,
    orderBy: { popularity: "desc" },
  });

  for (const show of freshShows) {
    if (!candidateIdSet.has(show.id)) {
      candidateList.push({
        candidate: normalizeDbTvShowToCandidate(show),
        source: "FRESH_DISCOVERY",
      });
      candidateIdSet.add(show.id);
    }
  }

  // 5. Evaluate Eligibility & Score Candidates
  const scoredItems: PersonalizedTvRecommendationItem[] = [];

  for (const { candidate, source } of candidateList) {
    const eligibility = evaluateTvEligibility(candidate, "RECOMMENDATION");
    if (!eligibility.isEligible) {
      continue;
    }

    const matchResult = calculateTvMatch(
      candidate,
      profile,
      feedbackProfile,
      evidenceProfile
    );

    if (matchResult.matchScore >= qualityFloor) {
      scoredItems.push({
        tvShow: candidate,
        matchScore: matchResult.matchScore,
        matchLabel: matchResult.matchLabel,
        source,
        scoreBreakdown: matchResult.scoreBreakdown,
        reasonCodes: matchResult.reasonCodes,
        evidenceShows: matchResult.evidenceShows,
        deterministicExplanation: matchResult.deterministicExplanation,
      });
    }
  }

  // 6. Sort & Diversity Re-rank
  scoredItems.sort((a, b) => b.matchScore - a.matchScore);
  const diversifiedItems = applyTvDiversityRerank(scoredItems);

  // 7. Paginate
  const pageSize = Math.min(Math.max(1, limit), 50);
  const startIndex = (page - 1) * pageSize;
  const paginated = diversifiedItems.slice(startIndex, startIndex + pageSize);

  return {
    recommendations: paginated,
    profileConfidence: profileData.confidence,
    confidenceLabel: profileData.profile?.confidenceLabel || "Orta",
    maturity: profileData.maturity,
    maturityLabel: profileData.maturityLabel,
    totalEligible: diversifiedItems.length,
    page,
    hasMore: startIndex + pageSize < diversifiedItems.length,
    version: TV_MATCH_ENGINE_VERSION,
  };
}

/**
 * Generates editorial TV home modules for the /tv page.
 */
export async function getTvHomeModules(userId: string): Promise<TvHomeModuleItem[]> {
  const result = await getPersonalizedTvRecommendations(userId, {
    limit: 60,
    includeKnownUnwatched: true,
  });

  return buildTvHomeEditorialModules(result.recommendations);
}
