import type { InteractionStatus, RatingStatus } from "@prisma/client";

export interface RawInteractionData {
  id: string;
  status: InteractionStatus;
  rating: RatingStatus | null;
  answeredAt: Date;
  movie: {
    id: string;
    tmdbId: number;
    title: string;
    originalTitle: string;
    releaseYear: number | null;
    popularity: number;
    voteAverage: number;
    metadata: {
      genres?: string[];
      runtime?: number | null;
      overview?: string;
    };
  };
}

export interface GenrePreference {
  name: string;
  score: number; // 0.0 to 1.0
  ratedCount: number;
  exposureCount: number;
}

export interface EraPreference {
  key: string;
  label: string;
  score: number; // 0.0 to 1.0
  ratedCount: number;
}

export interface PopularityOrientation {
  orientation: "mainstream" | "balanced" | "niche";
  label: string;
  avgPopularityScore: number;
}

export interface FamiliarityPreference {
  score: number; // 0.0 to 1.0
  label: "high" | "balanced" | "discovery_heavy";
  description: string;
}

export interface FilmDnaResult {
  version: number;
  generatedAt: string;
  confidence: number; // 0.0 to 1.0
  confidenceLabel: string; // Very Low, Low, Medium, Good, High, Very High
  sample: {
    totalInteractions: number;
    ratedMovies: number;
    watched: number;
    notWatched: number;
    unsure: number;
  };
  summary: string;
  genres: GenrePreference[];
  eras: EraPreference[];
  popularity: PopularityOrientation;
  familiarity: FamiliarityPreference;
  traits: string[];
}
