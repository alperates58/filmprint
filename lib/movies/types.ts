export type MovieEligibilityContext =
  | "CALIBRATION"
  | "RECOMMENDATION"
  | "HOME"
  | "FRESH_DISCOVERY"
  | "MOVIE_NIGHT"
  | "HIDDEN_GEMS";

export type EligibilityRejectionReason =
  | "ADULT_FLAG"
  | "EXPLICIT_ADULT_KEYWORD"
  | "MISSING_TITLE"
  | "MISSING_OVERVIEW"
  | "OVERVIEW_TOO_SHORT"
  | "GENERIC_NO_OVERVIEW"
  | "MISSING_POSTER"
  | "FUTURE_RELEASE"
  | "INVALID_YEAR"
  | "LOW_VOTE_CONFIDENCE"
  | "LOW_POPULARITY";

export interface MovieEligibilityResult {
  isEligible: boolean;
  reason?: EligibilityRejectionReason;
  reasons: EligibilityRejectionReason[];
  context: MovieEligibilityContext;
  details?: Record<string, unknown>;
}

export interface EligibleMovieInput {
  id?: string;
  tmdbId?: number;
  title?: string;
  originalTitle?: string;
  original_title?: string;
  overview?: string;
  posterPath?: string | null;
  poster_path?: string | null;
  backdropPath?: string | null;
  backdrop_path?: string | null;
  releaseYear?: number | null;
  releaseDate?: string | null;
  release_date?: string | null;
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
