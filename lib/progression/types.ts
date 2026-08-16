export type FilmRankKey =
  | "BEGINNER"
  | "VIEWER"
  | "CINEPHILE"
  | "CURATOR"
  | "ARCHIVIST"
  | "DISTINGUISHED_VIEWER"
  | "MASTER_CINEPHILE"
  | "CINEMA_SAGE"
  | "CHIEF_CURATOR"
  | "FILM_ARCHAEOLOGIST"
  | "CINEMA_MASTER"
  | "FILMPRINT_LEGEND"
  | "CINEMA_MEMORY"
  | "GRAND_ARCHIVIST"
  | "CINEMA_ENCYCLOPEDIA"
  | "CINEMA_VIRTUOSO"
  | "FILMPRINT_ICON"
  | "GRAND_CINEPHILE"
  | "LIVING_FILM_ARCHIVE";

export type RankKey = FilmRankKey;

export type TvRankKey =
  | "TV_PASSENGER"
  | "TV_EXPLORER"
  | "TV_ENTHUSIAST"
  | "TV_PASSIONATE"
  | "TV_HUNTER"
  | "TV_CURATOR"
  | "TV_EXPERT"
  | "TV_ARCHIVIST"
  | "TV_CRITIC"
  | "TV_MASTER"
  | "TV_ARCHAEOLOGIST"
  | "TV_ENCYCLOPEDIA"
  | "GRAND_TV_ARCHIVIST"
  | "TV_VIRTUOSO"
  | "TV_LEGEND"
  | "LIVING_TV_ARCHIVE";

export type AnyRankKey = FilmRankKey | TvRankKey;

export interface RankDefinition<K extends string = string> {
  key: K;
  label: string;
  minimum: number;
  description: string;
  badgeIcon: string;
}

export interface UserProgression<K extends string = string> {
  currentRank: RankDefinition<K>;
  nextRank: RankDefinition<K> | null;
  previousRank: RankDefinition<K> | null;
  upcomingRanks: RankDefinition<K>[];
  evaluatedCount: number;
  remaining: number;
  progress: number;
  isMaxRank: boolean;
}

