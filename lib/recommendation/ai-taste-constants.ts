/**
 * Centralized Constants for AI Taste Profile & Hybrid Recommendation Reranker (Phase 9.5).
 */

// Versioning Constants
export const AI_TASTE_SCHEMA_VERSION = 1;
export const AI_TASTE_PROMPT_VERSION = 1;
export const AI_TASTE_ALGORITHM_VERSION = 1;
export const AI_RERANK_PROMPT_VERSION = 1;

// Refresh Thresholds
export const AI_TASTE_DEFAULT_REFRESH_THRESHOLD = 25; // 25 new taste-bearing interactions
export const AI_TASTE_MIN_REFRESH_THRESHOLD = 10;
export const AI_TASTE_MAX_REFRESH_THRESHOLD = 100;

// Candidate Shortlist & Gating Thresholds
export const AI_RERANK_SHORTLIST_DEFAULT_SIZE = 50;
export const AI_RERANK_MIN_SHORTLIST_SIZE = 40;
export const AI_RERANK_MAX_SHORTLIST_SIZE = 60;
export const AI_RERANK_MIN_DETERMINISTIC_GATE = 65; // Candidates with deterministic match < 65 are excluded from AI reranking

// Weight Ceilings & Defaults
export const AI_WEIGHT_SAFETY_CEILING = 50; // Maximum allowed AI semantic weight is 50%
export const DEFAULT_MATCH_WEIGHT = 60;     // 60% Deterministic Match Engine v3.2
export const DEFAULT_AI_WEIGHT = 40;        // 40% DeepSeek AI Semantic Reranker

// Anchor Limits for AI Taste Prompt
export const AI_TASTE_MAX_POSITIVE_ANCHORS = 15;
export const AI_TASTE_MAX_NEGATIVE_ANCHORS = 8;

// DeepSeek Request Timeouts (ms)
export const AI_TASTE_TIMEOUT_MS = 4000;
export const AI_RERANK_TIMEOUT_MS = 3500;
