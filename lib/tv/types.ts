export type TvEligibilityContext =
  | "CALIBRATION"
  | "RECOMMENDATION"
  | "HOME"
  | "FRESH_DISCOVERY"
  | "LIBRARY";

export type TvEligibilityRejectionReason =
  | "ADULT_FLAG"
  | "EXPLICIT_ADULT_KEYWORD"
  | "MISSING_TITLE"
  | "MISSING_OVERVIEW"
  | "OVERVIEW_TOO_SHORT"
  | "GENERIC_NO_OVERVIEW"
  | "MISSING_POSTER"
  | "FUTURE_RELEASE"
  | "LOW_VOTE_CONFIDENCE"
  | "LOW_POPULARITY";

export interface TvEligibilityResult {
  isEligible: boolean;
  reason?: TvEligibilityRejectionReason;
  reasons: TvEligibilityRejectionReason[];
  context: TvEligibilityContext;
  details?: Record<string, unknown>;
}

export interface EligibleTvShowInput {
  id?: string;
  tmdbId?: number;
  name?: string;
  originalName?: string | null;
  original_name?: string | null;
  overview?: string;
  posterPath?: string | null;
  poster_path?: string | null;
  backdropPath?: string | null;
  backdrop_path?: string | null;
  firstAirDate?: string | null;
  first_air_date?: string | null;
  lastAirDate?: string | null;
  last_air_date?: string | null;
  status?: string | null;
  originalLanguage?: string | null;
  original_language?: string | null;
  voteAverage?: number;
  vote_average?: number;
  popularity?: number;
  voteCount?: number;
  vote_count?: number;
  genres?: string[] | { id?: number; name?: string }[];
  genre_ids?: number[];
  adult?: boolean;
  metadata?: Record<string, unknown> | null;
}
