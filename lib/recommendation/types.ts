import type { CandidateMovie } from "../calibration/types";

export type CandidateSource = "KNOWN_UNWATCHED" | "FRESH_DISCOVERY" | "ADJACENT_DISCOVERY";

export interface MatchComponents {
  genre: number;
  era: number;
  popularity: number;
  quality: number;
  discovery: number;
  feedback?: number;
  dislikePenalty?: number;
  tasteFit?: number;
  evidenceFit?: number;
  contextFit?: number;
  qualityFit?: number;
}

export interface MovieMatchResult {
  movie: CandidateMovie;
  matchScore: number;
  rawMatchScore: number;
  displayMatchScore: number;
  qualityScore: number;
  matchLabel: string;
  feedbackAdjustment?: number;
  components: MatchComponents;
  reasons: string[];
  candidateSource?: CandidateSource;
}

export interface ExplanationResult {
  headline: string;
  reasons: string[];
  referenceMovies?: string[];
  isAiGenerated: boolean;
}

import type { HybridScoreBreakdown } from "./ai-taste-types";

export interface PersonalizedRecommendationItem {
  movie: CandidateMovie;
  match: number;
  displayMatch?: number;
  rawMatch?: number;
  matchLabel: string;
  headline: string;
  reasons: string[];
  isAiGenerated: boolean;
  components: MatchComponents;
  evidence?: CandidateEvidence;
  candidateSource?: CandidateSource;
  hybridBreakdown?: HybridScoreBreakdown;
  debugInfo?: DebugDiagnosticInfo;
}

export interface RecommendationResponse {
  ready: boolean;
  required?: number;
  current?: number;
  profileConfidence?: number;
  recommendations?: PersonalizedRecommendationItem[];
  page?: number;
  totalPages?: number;
  hasMore?: boolean;
}

export interface TasteEvidenceMovie {
  id: string;
  title: string;
  rating: "LOVE" | "LIKE" | "DISLIKE" | "NEUTRAL";
  genres: string[];
  releaseYear: number | null;
  director?: string;
  cast?: string[];
  popularity?: number;
  voteAverage?: number;
  keywords?: string[];
}

export interface TasteCluster {
  id: string;
  name: string;
  genres: string[];
  movieTitles: string[];
  weight: number;
}

export interface TasteEvidenceProfile {
  positiveCount: number;
  ratedCount: number;
  positiveMovies: TasteEvidenceMovie[];
  negativeMovies: TasteEvidenceMovie[];
  clusters: TasteCluster[];
  evidenceFingerprint: string;
}

export interface ReferenceEvidenceItem {
  movieId: string;
  title: string;
  userRating: "LOVE" | "LIKE";
  similarityScore: number;
  evidenceReasons: string[];
  overlaps: string[];
}

export interface CandidateEvidence {
  positiveReferences: ReferenceEvidenceItem[];
  profileSignals: string[];
  hasStrongReference: boolean;
}

export type EditorialCategoryMode =
  | "RAINY_COFFEE"
  | "FAMILY_COMEDY"
  | "HIGH_TENSION"
  | "MIND_BENDING"
  | "LIGHT_BUT_GOOD"
  | "SOLO_NIGHT"
  | "BRAINY"
  | "CLASSIC"
  | "SHORT"
  | "HIDDEN_GEMS"
  | "KNOWN_UNWATCHED_ROW";

export interface DebugDiagnosticInfo {
  candidateSource: CandidateSource;
  rawMatchScore: number;
  displayMatchScore: number;
  qualityScore: number;
  voteAverage: number;
  voteCount: number;
  categoryFit: number;
  knownUnwatched: boolean;
  crossRowDuplicatePenalty: number;
  selectedRow?: string;
  candidateScore?: number;
  tasteScore?: number;
  contextScore?: number;
  feedbackAdjustment?: number;
  dislikePenalty?: number;
  diversityPenalty?: number;
  referenceEvidence?: string[];
  referenceSimilarity?: number;
  finalScore?: number;
  explanationSource?: "ai" | "deterministic_cache" | "deterministic_fallback";
}

