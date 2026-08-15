export type RankKey =
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

export interface RankDefinition {
  key: RankKey;
  label: string;
  minimum: number;
  description: string;
  badgeIcon: string;
}

export interface UserProgression {
  currentRank: RankDefinition;
  nextRank: RankDefinition | null;
  previousRank: RankDefinition | null;
  upcomingRanks: RankDefinition[];
  evaluatedCount: number;
  remaining: number;
  progress: number;
  isMaxRank: boolean;
}
