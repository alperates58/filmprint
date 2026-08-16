import type { TvDnaResult, TvMaturityCode } from "../profile/types";

export type TvCandidateSource = "KNOWN_UNWATCHED" | "FRESH_DISCOVERY" | "ADJACENT_DISCOVERY";

export interface CandidateTvShow {
  id: string;
  tmdbId: number;
  name: string;
  originalName: string | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  firstAirDate: string | null;
  lastAirDate: string | null;
  status: string | null;
  originalLanguage: string | null;
  popularity: number;
  voteAverage: number;
  voteCount?: number | null;
  metadata: {
    genres?: string[];
    numberOfSeasons?: number | null;
    numberOfEpisodes?: number | null;
    episodeRunTime?: number[] | number | null;
    networks?: Array<{ id?: number; name?: string }>;
    productionCompanies?: Array<{ id?: number; name?: string }>;
    originCountry?: string[] | string | null;
    overview?: string | null;
    status?: string | null;
    [key: string]: unknown;
  };
}

export interface TvScoreBreakdown {
  genreFit: number;
  qualityScore: number;
  formatFit: number;
  seriesLengthFit: number;
  runtimeFit: number;
  eraFit: number;
  popularityFit: number;
  statusFit: number;
  internationalFit: number;
  networkStyleFit: number;
  archetypeBonus: number;
  dislikePenalty: number;
  feedbackAdjustment: number;
}

export interface TvReferenceEvidenceShow {
  id: string;
  tmdbId: number;
  name: string;
  posterPath: string | null;
  rating: string;
  similarity: number;
  sharedAttributes: string[];
}

export interface TvMatchResult {
  candidateId: string;
  matchScore: number; // 0 - 97 calibrated display score
  rawScore: number;   // 0 - 100 raw weighted score
  matchLabel: string;
  source: TvCandidateSource;
  scoreBreakdown: TvScoreBreakdown;
  reasonCodes: string[];
  evidenceShows: TvReferenceEvidenceShow[];
  deterministicExplanation: string;
}

export interface PersonalizedTvRecommendationItem {
  tvShow: CandidateTvShow;
  matchScore: number;
  matchLabel: string;
  source: TvCandidateSource;
  scoreBreakdown: TvScoreBreakdown;
  reasonCodes: string[];
  evidenceShows: TvReferenceEvidenceShow[];
  deterministicExplanation: string;
  aiAffinity?: number;
  aiSignals?: string[];
  isHybrid?: boolean;
}

export interface PersonalizedTvRecommendationResponse {
  recommendations: PersonalizedTvRecommendationItem[];
  profileConfidence: number;
  confidenceLabel: string;
  maturity: TvMaturityCode;
  maturityLabel: string;
  totalEligible: number;
  page: number;
  hasMore: boolean;
  version: number;
  isHybrid?: boolean;
  hybridPending?: boolean;
  hybridWeights?: { matchWeight: number; aiWeight: number };
}

export interface TvTasteEvidenceShow {
  id: string;
  tmdbId: number;
  name: string;
  posterPath: string | null;
  rating: "LOVE" | "LIKE" | "DISLIKE" | "NEUTRAL";
  status: "WATCHED" | "PARTIALLY_WATCHED";
  genres: string[];
  seasons: number | null;
  runtime: number | null;
  firstAirYear: number | null;
  originalLanguage: string | null;
  networks: string[];
}

export interface TvTasteEvidenceProfile {
  positiveEvidence: TvTasteEvidenceShow[];
  negativeEvidence: TvTasteEvidenceShow[];
  evidenceCount: number;
}

export interface TvFeedbackProfile {
  userId: string;
  likedShowIds: Set<string>;
  dislikedShowIds: Set<string>;
  hiddenShowIds: Set<string>;
  watchlistShowIds: Set<string>;
  watchedShowIds: Set<string>;
  notInterestedShowIds: Set<string>;
  watchLaterShowIds: Set<string>;
  alreadyWatchedShowIds: Set<string>;
  notInterestedGenres: Map<string, number>;
  genreSignals: Record<string, number>;
  creatorSignals: Record<string, number>;
  networkSignals: Record<string, number>;
  eraSignals: Record<string, number>;
  positiveCount: number;
  negativeCount: number;
  watchlistCount: number;
  totalFeedbacks: number;
  recentFeedbackWeight: number;
  feedbackSummary: {
    recentLikes: string[];
    recentDislikes: string[];
    recentWatchlist: string[];
  };
}

export interface TvHomeModuleItem {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  items: PersonalizedTvRecommendationItem[];
}
