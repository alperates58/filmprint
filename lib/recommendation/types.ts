import { CandidateMovie } from "@/lib/calibration/types";

export interface MatchComponents {
  genre: number;
  era: number;
  popularity: number;
  quality: number;
  discovery: number;
  feedback?: number;
}

export interface MovieMatchResult {
  movie: CandidateMovie;
  matchScore: number;
  matchLabel: string;
  feedbackAdjustment?: number;
  components: MatchComponents;
  reasons: string[];
}

export interface ExplanationResult {
  headline: string;
  reasons: string[];
  isAiGenerated: boolean;
}

export interface PersonalizedRecommendationItem {
  movie: CandidateMovie;
  match: number;
  matchLabel: string;
  headline: string;
  reasons: string[];
  isAiGenerated: boolean;
  components: MatchComponents;
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
