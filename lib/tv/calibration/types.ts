export interface CandidateTvShow {
  id: string; // Database UUID
  tmdbId: number;
  name: string;
  originalName: string | null;
  firstAirDate: string | null;
  lastAirDate: string | null;
  status: string | null;
  originalLanguage: string | null;
  popularity: number;
  voteAverage: number;
  voteCount?: number;
  posterPath: string | null;
  backdropPath: string | null;
  genres: string[];
  overview: string;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  adult?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RecentTvInteractionPattern {
  tvShowId: string;
  genres: string[];
  firstAirYear: number | null;
}

export interface TvCandidateScoringResult {
  tvShow: CandidateTvShow;
  score: number;
  breakdown: {
    genreUncertainty: number;
    repetitionPenalty: number;
    qualityBonus: number;
    formatBonus: number;
    internationalBonus: number;
  };
  reasons: string[];
}

export interface TvSelectorUserState {
  totalAnsweredCount: number;
  genreFrequency: Record<string, number>;
  positiveGenres: string[];
  negativeGenres: string[];
}
