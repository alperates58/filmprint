export const TV_AI_TASTE_SCHEMA_VERSION = 1;
export const TV_AI_TASTE_PROMPT_VERSION = 1;
export const TV_AI_TASTE_ALGORITHM_VERSION = 1;

/**
 * Default number of new taste-bearing TV interactions required before triggering TV AI Taste Profile refresh.
 * Only WATCHED + rating and PARTIALLY_WATCHED + rating are taste-bearing (NOT_WATCHED and UNSURE do not count).
 */
export const TV_AI_TASTE_DEFAULT_REFRESH_THRESHOLD = 25;

export const TV_AI_TASTE_MAX_POSITIVE_ANCHORS = 15;
export const TV_AI_TASTE_MAX_NEGATIVE_ANCHORS = 8;
export const TV_AI_TASTE_TIMEOUT_MS = 12000;

export const TV_AI_RERANK_SHORTLIST_DEFAULT_SIZE = 50;
export const TV_AI_RERANK_MIN_DETERMINISTIC_GATE = 65;
export const TV_AI_RERANK_TIMEOUT_MS = 15000;

export const TV_AI_WEIGHT_SAFETY_CEILING = 50; // Hard maximum 50% AI influence
export const DEFAULT_TV_MATCH_WEIGHT = 60;
export const DEFAULT_TV_AI_WEIGHT = 40;
