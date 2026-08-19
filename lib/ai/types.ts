export type AiIntent = "discover" | "similar_to_title" | "person_search";
export type AiMediaType = "movie" | "tv" | "any";
export type AiQualityProfile = "mainstream" | "hidden_gems" | "new" | "classic" | "family";
export type AiSafetyLevel = "none" | "family" | "no_adult" | "low_violence";
export type AiSortBy = "relevance" | "popularity" | "vote_average" | "release_date";

export interface AiRecommendedTitle {
  title: string;
  year?: number | null;
  type?: "movie" | "tv" | "any";
  relevance_score?: number;
  reason?: string;
  match_tags?: string[];
}

export interface NormalizedAiQuery {
  request_summary_tr: string;
  intent: AiIntent;
  reference_title: string;
  recommended_titles: AiRecommendedTitle[];
  type: AiMediaType;
  genres: string[];
  explicit_genres?: string[];
  mood: string;
  year_min: number | null;
  year_max: number | null;
  language: string;
  country: string;
  keywords: string[];
  semantic_topics: string[];
  must_have: string[];
  nice_to_have: string[];
  exclude: string[];
  actors: string[];
  directors: string[];
  min_vote_average: number | null;
  min_vote_count: number | null;
  runtime_min: number | null;
  runtime_max: number | null;
  min_seasons: number | null;
  max_seasons: number | null;
  episode_count_min: number | null;
  episode_count_max: number | null;
  watch_provider: string;
  required_location?: string;
  safety_level: AiSafetyLevel;
  quality_profile: AiQualityProfile;
  sort_by: AiSortBy;
  trailer_required: boolean;
  resolved_must_have?: string[];
  resolved_semantic?: string[];
  _analysis?: {
    provider: string;
    model: string;
    fallback: boolean;
    error?: string;
  };
}

export interface WatchProviderInfo {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
}

export interface EnrichedAiMovieItem {
  id: number;
  type: "movie" | "tv";
  title: string;
  original_title: string;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  release_date: string | null;
  release_year: number | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: string[];
  genre_ids: number[];
  runtime?: number | null;
  director?: string | null;
  cast_names?: string[];
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
  certification?: string;
  keyword_names?: string[];
  providers: WatchProviderInfo[];
  trailer_url: string | null;
  reason: string;
  ai_match_tags?: string[];
  ai_relevance_score?: number;
  base_score?: number;
  strategy?: string;
}

export interface AiRecommendationResponse {
  success: boolean;
  query: string;
  request_summary_tr: string;
  normalized: NormalizedAiQuery;
  results: EnrichedAiMovieItem[];
  warnings: string[];
  total: number;
  _analysis?: {
    provider: string;
    model: string;
    fallback: boolean;
    cached?: boolean;
    latencyMs?: number;
  };
}
