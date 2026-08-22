import type { GenrePreference, EraPreference } from "@/lib/profile/types";

export interface CandidateMovie {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  englishTitle?: string | null;
  releaseYear: number | null;
  popularity: number;
  voteAverage: number;
  voteCount?: number;
  posterPath: string | null;
  backdropPath: string | null;
  genres: string[];
  genreIds?: number[];
  overview: string;
  adult?: boolean;
  metadata?: any;
}

export interface RecentInteractionPattern {
  movieId: string;
  genres: string[];
  releaseYear: number | null;
}

export interface CandidateScoringResult {
  movie: CandidateMovie;
  score: number;
  breakdown: {
    genreUncertainty: number;
    eraUncertainty: number;
    repetitionPenalty: number;
    qualityBonus: number;
  };
  reasons: string[];
}

export interface UserTasteProfileInput {
  totalRatedCount: number;
  genres: GenrePreference[];
  eras: EraPreference[];
}
