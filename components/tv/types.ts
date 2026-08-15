export type TvInteractionStatusType =
  | "WATCHED"
  | "PARTIALLY_WATCHED"
  | "NOT_WATCHED"
  | "UNSURE";

export type TvRatingStatusType =
  | "LOVE"
  | "LIKE"
  | "NEUTRAL"
  | "DISLIKE";

export interface TvShowItem {
  id: string; // Database UUID
  tmdbId: number;
  name: string;
  originalName: string | null;
  firstAirDate: string | null;
  lastAirDate: string | null;
  status: string | null;
  originalLanguage: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  overview: string;
  genres: string[];
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
}
