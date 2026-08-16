export const TV_CALIBRATION_TARGET = 15;

export const TV_CALIBRATION_RESERVE_THRESHOLD = 30;
export const TV_CALIBRATION_CANDIDATE_TARGET_POOL = 100;
export const TV_CALIBRATION_CANDIDATE_PAGE_SIZE = 250;
export const TV_CALIBRATION_CANDIDATE_MAX_PAGES = 8;

export const TV_ACTIVE_LEARNING_WEIGHTS = {
  GENRE_UNCERTAINTY: 1.2,
  QUALITY_FLOOR: 1.0,
  REPETITION_PENALTY: 1.5,
  FORMAT_BALANCE: 0.4,
  INTERNATIONAL_DIVERSITY: 0.3,
};

export const TV_MAJOR_GENRES = [
  "Dram",
  "Komedi",
  "Suç",
  "Bilim Kurgu & Fantezi",
  "Gizem",
  "Aksiyon & Macera",
  "Animasyon",
  "Belgesel",
];
