import type { CandidateMovie } from "../calibration/types";
import type { FilmDnaResult } from "../profile/types";
import type { TasteEvidenceProfile } from "./types";
import { calculateMovieMatch } from "./matcher";
import { getEvidenceForRecommendation, calculateDislikePenalty } from "./evidence";
import { calculateQualityScore, calculateWeightedQualityRating } from "./quality";
import { calculateCategoryContextFit } from "./editorial-scorer";

export interface MovieAuditResult {
  movie: {
    id: string;
    title: string;
    releaseYear: number | null;
    genres: string[];
    voteAverage: number;
    popularity: number;
  };
  scores: {
    rawMatchScore: number;
    displayMatchScore: number;
    qualityScore: number;
    weightedQualityRating: number;
    dislikePenalty: number;
    contextFitRainy: number;
    contextFitTension: number;
  };
  evidenceAudit: {
    hasStrongReference: boolean;
    referenceMovies: string[];
    topReferenceTitle: string | null;
    topReferenceSimilarity: number;
    profileSignals: string[];
  };
  matchBreakdown: any;
  recommendationDecision: {
    isEligible: boolean;
    reason: string;
  };
}

/**
 * Traces and audits recommendation signals for a given movie (e.g. "Another Round" / Körkütük).
 */
export function auditRecommendationCandidate(
  movie: CandidateMovie,
  profile: FilmDnaResult,
  tasteEvidenceProfile: TasteEvidenceProfile,
  isWatched: boolean = false,
  isBlockedFeedback: boolean = false
): MovieAuditResult {
  const evidence = getEvidenceForRecommendation(tasteEvidenceProfile, movie);
  const matchResult = calculateMovieMatch(movie, profile, undefined, evidence);
  const dislikePenalty = calculateDislikePenalty(movie, tasteEvidenceProfile);
  const qualityScore = calculateQualityScore(movie);
  const weightedQualityRating = calculateWeightedQualityRating(movie);

  const contextFitRainy = calculateCategoryContextFit(movie, "RAINY_COFFEE");
  const contextFitTension = calculateCategoryContextFit(movie, "HIGH_TENSION");

  const isEligible = !isWatched && !isBlockedFeedback && matchResult.displayMatchScore >= 62;

  let decisionReason = "Eligible for main recommendation feed";
  if (isWatched) decisionReason = "Excluded: User has already watched this movie";
  else if (isBlockedFeedback) decisionReason = "Excluded: User marked NOT_INTERESTED or WATCH_LATER";
  else if (matchResult.displayMatchScore < 62) decisionReason = "Excluded: Display match score below 62% quality floor";

  return {
    movie: {
      id: movie.id,
      title: movie.title,
      releaseYear: movie.releaseYear,
      genres: movie.genres,
      voteAverage: movie.voteAverage,
      popularity: movie.popularity,
    },
    scores: {
      rawMatchScore: matchResult.rawMatchScore,
      displayMatchScore: matchResult.displayMatchScore,
      qualityScore,
      weightedQualityRating,
      dislikePenalty,
      contextFitRainy,
      contextFitTension,
    },
    evidenceAudit: {
      hasStrongReference: evidence.hasStrongReference,
      referenceMovies: evidence.positiveReferences.map((r) => r.title),
      topReferenceTitle: evidence.positiveReferences[0]?.title || null,
      topReferenceSimilarity: evidence.positiveReferences[0]?.similarityScore || 0,
      profileSignals: evidence.profileSignals,
    },
    matchBreakdown: matchResult.components,
    recommendationDecision: {
      isEligible,
      reason: decisionReason,
    },
  };
}
