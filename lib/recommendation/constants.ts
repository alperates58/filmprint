export { MATCH_ENGINE_VERSION } from "./feedback-constants";

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
  if (score >= 80) return "Çok Güçlü Eşleşme";
  if (score >= 70) return "Güçlü Eşleşme";
  if (score >= 60) return "Orta Derece Uyum";
  return "Düşük Eşleşme";
}
