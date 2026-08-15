import type { RatingStatus, TvInteractionStatus } from "@prisma/client";

export type TvGenreState = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "UNOBSERVED";

export type TvMaturityCode =
  | "INSUFFICIENT"
  | "EARLY"
  | "FORMING"
  | "ESTABLISHED"
  | "STRONG"
  | "VERY_STRONG";

export interface TvGenreSignature {
  genreId: number;
  name: string;
  score: number; // 0.0 to 1.0 (or -1 if unobserved)
  exposure: number; // count of interacted items with this genre
  ratedCount: number; // count of taste-bearing rated items with this genre
  confidence: number; // 0.0 to 1.0
  state: TvGenreState;
}

export interface TvEraSignature {
  key: string;
  label: string;
  score: number;
  exposure: number;
  ratedCount: number;
  confidence: number;
}

export interface TvPopularityOrientation {
  orientation: "MAINSTREAM" | "BALANCED" | "DISCOVERY_ORIENTED";
  score: number;
  label: string;
  description: string;
}

export interface TvFormatPreference {
  preference: "MINISERIES" | "MULTI_SEASON" | "LONG_RUNNING" | "FLEXIBLE";
  miniseriesScore: number;
  multiSeasonScore: number;
  longRunningScore: number;
  description: string;
}

export interface TvSeriesLengthPreference {
  preference: "SHORT" | "MEDIUM" | "LONG" | "VERY_LONG" | "BALANCED";
  avgSeasons: number;
  description: string;
}

export interface TvEpisodeRuntimePreference {
  preference: "SHORT" | "STANDARD" | "LONG" | "EXTRA_LONG" | "FLEXIBLE";
  avgMinutes: number | null;
  description: string;
}

export interface TvStatusPreference {
  preference: "ENDED" | "RETURNING" | "LIMITED" | "FLEXIBLE";
  endedScore: number;
  returningScore: number;
  description: string;
}

export interface TvInternationalOrientation {
  orientation: "LOCAL_LANGUAGE" | "ENGLISH_LANGUAGE" | "INTERNATIONAL_NON_ENGLISH" | "GLOBAL_EXPLORER";
  nonEnglishRatio: number;
  topLanguages: string[];
  topCountries: string[];
  description: string;
}

export interface TvNetworkStyleOrientation {
  hasSufficientEvidence: boolean;
  dominantStyle: string | null;
  description: string;
}

export interface TvArchetypeResult {
  id: string;
  name: string;
  score: number;
  evidenceCount: number;
  confidence: number;
  description: string;
  icon: string;
  isPrimary: boolean;
}

export interface TvShowMetadataInput {
  genres?: string[] | { id?: number; name?: string }[];
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
  episodeRunTime?: number[] | number | null;
  episode_run_time?: number[] | number | null;
  networks?: Array<{ id?: number; name?: string }>;
  productionCompanies?: Array<{ id?: number; name?: string }>;
  production_companies?: Array<{ id?: number; name?: string }>;
  originCountry?: string[] | string | null;
  origin_country?: string[] | string | null;
  overview?: string | null;
  status?: string | null;
}

export interface TvInteractionData {
  id: string;
  tvShowId: string;
  status: TvInteractionStatus;
  rating: RatingStatus | null;
  answeredAt: Date;
  updatedAt: Date;
  tvShow: {
    id: string;
    tmdbId: number;
    name: string;
    originalName: string | null;
    firstAirDate: string | null;
    lastAirDate: string | null;
    status: string | null;
    originalLanguage: string | null;
    popularity: number;
    voteAverage: number;
    voteCount?: number | null;
    metadata: TvShowMetadataInput;
  };
}

export interface TvDnaResult {
  schemaVersion: number;
  algorithmVersion: number;
  generatedAt: string;

  evaluatedCount: number;
  evidenceCount: number;

  confidence: number;
  confidenceLabel: string;

  maturity: TvMaturityCode;
  maturityLabel: string;

  genres: TvGenreSignature[];
  eras: TvEraSignature[];
  popularityOrientation: TvPopularityOrientation;
  formatPreference: TvFormatPreference;
  seriesLengthPreference: TvSeriesLengthPreference;
  episodeRuntimePreference: TvEpisodeRuntimePreference;
  statusPreference: TvStatusPreference;
  internationalOrientation: TvInternationalOrientation;
  networkStyleOrientation: TvNetworkStyleOrientation;

  archetypes: TvArchetypeResult[];
  humanInsights: string[];

  sourceFingerprint?: string;
}

export interface TvProfileServiceResponse {
  ready: boolean;
  required: number;
  current: number;
  evaluatedCount: number;
  evidenceCount: number;
  confidence: number;
  maturity: TvMaturityCode;
  maturityLabel: string;
  profile?: TvDnaResult;
  lastUpdated?: string;
}
