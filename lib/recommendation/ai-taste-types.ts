/**
 * TypeScript Interfaces for AI Taste Profile & Hybrid Semantic Reranker (Phase 9.5).
 */

import type { CandidateMovie } from "../calibration/types";
import type { CandidateEvidence, CandidateSource, MatchComponents } from "./types";

export type MediaDomain = "FILM" | "TV";

export interface AiTasteStoryPreferences {
  slowBurn: number;         // 0.0 to 1.0
  complexNarrative: number; // 0.0 to 1.0
  characterDriven: number;  // 0.0 to 1.0
  spectacle: number;        // 0.0 to 1.0
  moralAmbiguity: number;   // 0.0 to 1.0
  nonlinearNarrative: number; // 0.0 to 1.0
}

export interface AiTasteProfile {
  schemaVersion: number;
  corePreferences: string[];
  strongDislikes: string[];
  storyPreferences: AiTasteStoryPreferences;
  discoveryTolerance: number; // 0.0 to 1.0
  preferredCharacteristics: string[];
  avoidCharacteristics: string[];
  confidence: number;         // 0.0 to 1.0
}

export interface AiRerankCandidateItem {
  candidateId: string;
  tmdbId: number;
  title: string;
  genres: string[];
  year: number | null;
  qualityScore: number;
  deterministicMatch: number;
  tasteFit: number;
  candidateSource: CandidateSource;
  director?: string;
  keywords?: string[];
}

export interface AiRerankRankingItem {
  candidateId: string;
  affinity: number;    // 0 to 100
  confidence: number;  // 0.0 to 1.0
  signals: string[];
}

export interface AiRerankResult {
  rankings: AiRerankRankingItem[];
  modelUsed: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface HybridScoreBreakdown {
  rawHybridScore: number;
  displayHybridScore: number;
  deterministicMatchScore: number;
  aiAffinityScore: number;
  effectiveMatchWeight: number;
  effectiveAiWeight: number;
  aiSignals: string[];
  isAiPromoted: boolean;
}

export interface AiTasteTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheHitTokens?: number;
  cacheMissTokens?: number;
}
