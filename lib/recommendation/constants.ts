export { MATCH_ENGINE_VERSION } from "./feedback-constants";

export const CANDIDATE_MIX_RATIOS = {
  KNOWN_UNWATCHED: 0.40,
  FRESH_DISCOVERY: 0.40,
  ADJACENT_DISCOVERY: 0.20,
};

export const DISPLAY_MATCH_SCORE_MAX = 97;

export const MATCH_WEIGHTS = {
  GENRE: 0.4,
  ERA: 0.2,
  POPULARITY: 0.15,
  QUALITY: 0.15,
  DISCOVERY: 0.1,
};

export const NEGATIVE_GENRE_PENALTY = -25;

export function getMatchLabel(score: number): string {
  if (score >= 90) return "Olağanüstü Güçlü Eşleşme";
  if (score >= 82) return "Çok Güçlü Eşleşme";
  if (score >= 72) return "Güçlü Eşleşme";
  if (score >= 62) return "Denemeye Değer";
  return "Düşük Eşleşme";
}

