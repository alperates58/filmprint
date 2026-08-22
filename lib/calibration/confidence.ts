export type CalibrationConfidenceLevel =
  | "STARTER"
  | "DEVELOPING"
  | "ESTABLISHED"
  | "STRONG"
  | "VERY_STRONG";

export interface ConfidenceLevelInfo {
  level: CalibrationConfidenceLevel;
  minEvidence: number;
  maxEvidence: number;
  labelTr: string;
  badge: string;
  guidanceTr: string;
}

export const FILM_CONFIDENCE_LEVELS: Record<CalibrationConfidenceLevel, ConfidenceLevelInfo> = {
  STARTER: {
    level: "STARTER",
    minEvidence: 0,
    maxEvidence: 7,
    labelTr: "Başlangıç",
    badge: "🌱",
    guidanceTr: "Film DNA kilidini açmak için en az 8 film değerlendir.",
  },
  DEVELOPING: {
    level: "DEVELOPING",
    minEvidence: 8,
    maxEvidence: 14,
    labelTr: "Gelişiyor",
    badge: "🔍",
    guidanceTr: "Tavsiye doğruluğunu artırmak için 15 filme ulaş.",
  },
  ESTABLISHED: {
    level: "ESTABLISHED",
    minEvidence: 15,
    maxEvidence: 24,
    labelTr: "Yerleşmiş",
    badge: "🎬",
    guidanceTr: "Öneri motoru zevkini iyi tanıyor. Daha keskin eşleşmeler için devam edebilirsin.",
  },
  STRONG: {
    level: "STRONG",
    minEvidence: 25,
    maxEvidence: 39,
    labelTr: "Güçlü",
    badge: "🍿",
    guidanceTr: "Güçlü ve oturmuş bir zevk haritası oluşturdun.",
  },
  VERY_STRONG: {
    level: "VERY_STRONG",
    minEvidence: 40,
    maxEvidence: Infinity,
    labelTr: "Çok Güçlü",
    badge: "👑",
    guidanceTr: "Kristalleşmiş, derin bir sinema DNA profili.",
  },
};

export const TV_CONFIDENCE_LEVELS: Record<CalibrationConfidenceLevel, ConfidenceLevelInfo> = {
  STARTER: {
    level: "STARTER",
    minEvidence: 0,
    maxEvidence: 4,
    labelTr: "Başlangıç",
    badge: "🌱",
    guidanceTr: "Dizi DNA kilidini açmak için en az 5 dizi değerlendir.",
  },
  DEVELOPING: {
    level: "DEVELOPING",
    minEvidence: 5,
    maxEvidence: 9,
    labelTr: "Gelişiyor",
    badge: "🔍",
    guidanceTr: "Tavsiye doğruluğunu artırmak için 10 diziye ulaş.",
  },
  ESTABLISHED: {
    level: "ESTABLISHED",
    minEvidence: 10,
    maxEvidence: 14,
    labelTr: "Yerleşmiş",
    badge: "🎬",
    guidanceTr: "Öneri motoru dizi zevkini tanıyor.",
  },
  STRONG: {
    level: "STRONG",
    minEvidence: 15,
    maxEvidence: 24,
    labelTr: "Güçlü",
    badge: "🍿",
    guidanceTr: "Güçlü bir dizi zevk profili oluşturdun.",
  },
  VERY_STRONG: {
    level: "VERY_STRONG",
    minEvidence: 25,
    maxEvidence: Infinity,
    labelTr: "Çok Güçlü",
    badge: "👑",
    guidanceTr: "Kapsamlı ve derin bir dizi DNA profili.",
  },
};

export const CALIBRATION_THRESHOLDS = {
  FILM: {
    MIN_UNLOCK: 8,
    RECOMMENDED: 15,
    STRONG: 25,
    VERY_STRONG: 40,
    MAX_EXPOSURE_CAP: 100,
  },
  TV: {
    MIN_UNLOCK: 5,
    RECOMMENDED: 10,
    STRONG: 15,
    VERY_STRONG: 25,
    MAX_EXPOSURE_CAP: 80,
  },
} as const;

/**
 * Resolves canonical confidence level for Movie taste evidence count.
 */
export function getMovieConfidenceLevel(tasteEvidenceCount: number): ConfidenceLevelInfo {
  const count = Math.max(0, tasteEvidenceCount);
  if (count <= 7) return FILM_CONFIDENCE_LEVELS.STARTER;
  if (count <= 14) return FILM_CONFIDENCE_LEVELS.DEVELOPING;
  if (count <= 24) return FILM_CONFIDENCE_LEVELS.ESTABLISHED;
  if (count <= 39) return FILM_CONFIDENCE_LEVELS.STRONG;
  return FILM_CONFIDENCE_LEVELS.VERY_STRONG;
}

/**
 * Resolves canonical confidence level for TV taste evidence count.
 */
export function getTvConfidenceLevel(tasteEvidenceCount: number): ConfidenceLevelInfo {
  const count = Math.max(0, tasteEvidenceCount);
  if (count <= 4) return TV_CONFIDENCE_LEVELS.STARTER;
  if (count <= 9) return TV_CONFIDENCE_LEVELS.DEVELOPING;
  if (count <= 14) return TV_CONFIDENCE_LEVELS.ESTABLISHED;
  if (count <= 24) return TV_CONFIDENCE_LEVELS.STRONG;
  return TV_CONFIDENCE_LEVELS.VERY_STRONG;
}
