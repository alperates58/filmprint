export const CALIBRATION_SELECTOR_VERSION = 2;

export const DEFAULT_RECENT_HISTORY_WINDOW = 10;

export const MOVIE_CALIBRATION_PAGE_SIZE = 500;
export const MOVIE_CALIBRATION_MAX_PAGES = 10;
export const MOVIE_CALIBRATION_TARGET_POOL = 150;
export const MOVIE_CALIBRATION_RESERVE_THRESHOLD = 30;
export const MOVIE_CALIBRATION_MAX_SCANNED_ROWS = 5000;

export const MOVIE_CALIBRATION_EVIDENCE = {
  MIN_UNLOCK: 8,
  RECOMMENDED_TARGET: 15,
  STRONG_TARGET: 25,
  VERY_STRONG_TARGET: 40,
  MAX_EXPOSURE_CAP: 100,
} as const;

export const ACTIVE_LEARNING_WEIGHTS = {
  GENRE_UNCERTAINTY: 3.5,
  ERA_UNCERTAINTY: 2.0,
  REPETITION_PENALTY: 2.5,
  FAMILIARITY_POTENTIAL: 1.5,
  QUALITY_FLOOR: 1.0,
} as const;

export const COLD_START_STAGES = {
  EXPLORATION: "0-7",   // High-awareness, mainstream discovery
  DEVELOPING: "8-14",   // Expanding genre frontiers
  ESTABLISHED: "15-24", // Solidified baseline
  REFINEMENT: "25+",    // Niche and deep catalog fine-tuning
} as const;
