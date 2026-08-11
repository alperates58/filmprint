export const GROUP_MATCH_ENGINE_VERSION = 1;

export const MIN_MEMBERS = 2;
export const MAX_MEMBERS = 6;
export const SESSION_EXPIRATION_HOURS = 24;

export const GROUP_MATCH_WEIGHTS = {
  AVERAGE: 0.55,
  MINIMUM: 0.35,
};

export const PENALTIES = {
  VERY_LOW_MINIMUM: -25, // If any member has score < 45
  LOW_MINIMUM: -12,      // If any member has score < 60
  SPREAD_FACTOR: 0.25,  // Spread penalty multiplier
};

export const BONUS = {
  STRONG_CONSENSUS: 10,  // All members >= 80
  MILD_CONSENSUS: 5,     // All members >= 70
};

export function getGroupMatchLabel(score: number): string {
  if (score >= 90) return "Hepiniz İçin Olağanüstü Eşleşme";
  if (score >= 80) return "Hepiniz İçin Güçlü Eşleşme";
  if (score >= 70) return "Uyumlu Ortak Seçim";
  if (score >= 60) return "Orta Derece Ortak Uyum";
  return "Düşük Ortak Uyum";
}
