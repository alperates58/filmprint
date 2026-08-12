export type RankKey =
  | "BEGINNER"
  | "VIEWER"
  | "CINEPHILE"
  | "CURATOR"
  | "ARCHIVIST"
  | "MASTER_CINEPHILE"
  | "FILMPRINT_LEGEND";

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
  evaluatedCount: number;
  remaining: number;
  progress: number;
  isMaxRank: boolean;
}
