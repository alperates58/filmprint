export const CALIBRATION_SELECTOR_VERSION = 1;

export const DEFAULT_RECENT_HISTORY_WINDOW = 10;

export const ACTIVE_LEARNING_WEIGHTS = {
  GENRE_UNCERTAINTY: 3.5,
  ERA_UNCERTAINTY: 2.0,
  REPETITION_PENALTY: 2.5,
  FAMILIARITY_POTENTIAL: 1.5,
  QUALITY_FLOOR: 1.0,
} as const;

export const COLD_START_STAGES = {
  EXPLORATION: "0-9", // Broad distribution, high popularity & familiarity
  TESTING: "10-29",   // Testing uncertain genres
  REFINEMENT: "30+",  // Focusing on lowest confidence areas
} as const;
