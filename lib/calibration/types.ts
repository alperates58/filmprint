import { GenrePreference, EraPreference } from "@/lib/profile/types";

export interface CandidateMovie {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  releaseYear: number | null;
  popularity: number;
  voteAverage: number;
  posterPath: string | null;
  backdropPath: string | null;
  genres: string[];
  overview: string;
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
