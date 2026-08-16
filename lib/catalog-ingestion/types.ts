import type { MediaType, CatalogIngestionMode, CatalogCandidateStatus } from "@prisma/client";

export type { MediaType, CatalogIngestionMode, CatalogCandidateStatus };

export interface DiscoveryCandidate {
  tmdbId: number;
  mediaType: MediaType;
  popularity: number;
  adult?: boolean;
  title?: string;
  originalTitle?: string;
  name?: string;
  originalName?: string;
}

export interface DiscoveryBatchResult {
  candidates: DiscoveryCandidate[];
  nextCursor: number;
  sourceDate: string;
  hasMore: boolean;
  totalAvailable?: number;
}

export interface CatalogDiscoveryProvider {
  name: string;
  fetchCandidateBatch(
    mediaType: MediaType,
    cursor: number,
    batchSize: number,
    date?: Date
  ): Promise<DiscoveryBatchResult>;
}

export interface CatalogIngestionGlobalConfig {
  masterEnabled: boolean;
  globalMaxRps: number;
  staleDays: number;
  circuitThreshold: number;
  circuitCooldownMs: number;
}

export interface CatalogMediaConfigInput {
  enabled?: boolean;
  mode?: CatalogIngestionMode;
  targetDailyItems?: number;
  requestsPerSecond?: number;
  concurrency?: number;
  initialTarget?: number;
}

export interface CatalogIngestionFullConfig {
  masterEnabled: boolean;
  globalMaxRps: number;
  staleDays: number;
  circuitThreshold: number;
  circuitCooldownMs: number;
  film: {
    enabled: boolean;
    mode: CatalogIngestionMode;
    targetDailyItems: number;
    requestsPerSecond: number;
    concurrency: number;
    initialTarget: number;
  };
  tv: {
    enabled: boolean;
    mode: CatalogIngestionMode;
    targetDailyItems: number;
    requestsPerSecond: number;
    concurrency: number;
    initialTarget: number;
  };
}

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CatalogMediaStatusView {
  mediaType: MediaType;
  enabled: boolean;
  mode: CatalogIngestionMode;
  effectiveRunning: boolean;
  sourceDate: string | null;
  sourceCursor: number;
  targetDailyItems: number;
  requestsPerSecond: number;
  concurrency: number;
  initialTarget: number;
  processedToday: number;
  insertedToday: number;
  updatedToday: number;
  rejectedToday: number;
  rateLimitedToday: number;
  failedToday: number;
  catalogTotal: number;
  eligibleTotal: number;
  progressPercent: number;
  circuitState: CircuitBreakerState;
  circuitOpenUntil: Date | null;
  lastRunAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
}

export interface CatalogIngestionOverviewStatus {
  masterEnabled: boolean;
  globalMaxRps: number;
  staleDays: number;
  circuitThreshold: number;
  circuitCooldownMs: number;
  film: CatalogMediaStatusView;
  movie: CatalogMediaStatusView;
  tv: CatalogMediaStatusView;
}

export type CandidateProcessingOutcome =
  | "IMPORTED"
  | "UPDATED"
  | "SKIPPED_ALREADY_IMPORTED"
  | "SKIPPED_PERMANENT_REJECTION"
  | "SKIPPED_RETRY_LOCKED"
  | "REJECTED_ADULT"
  | "REJECTED_UNSAFE"
  | "REJECTED_NO_USABLE_TITLE"
  | "REJECTED_NO_OVERVIEW"
  | "REJECTED_LOW_QUALITY"
  | "NOT_FOUND"
  | "FAILED_RETRYABLE";

export interface CandidateProcessingResult {
  tmdbId: number;
  mediaType: MediaType;
  outcome: CandidateProcessingOutcome;
  title?: string;
  reason?: string;
  durationMs: number;
  httpAttempts: number;
  rateLimited: boolean;
}

export interface CatalogIngestionBatchResult {
  mediaType: MediaType;
  dryRun: boolean;
  processed: number;
  inserted: number;
  updated: number;
  rejected: number;
  failed: number;
  skipped: number;
  rateLimited: number;
  sourceDate: string;
  startCursor: number;
  nextCursor: number;
  hasMore: boolean;
  durationMs: number;
  details: CandidateProcessingResult[];
  circuitState: CircuitBreakerState;
}

export type CatalogAdminActionType =
  | "MASTER_START"
  | "MASTER_PAUSE"
  | "START_MOVIE"
  | "PAUSE_MOVIE"
  | "START_TV"
  | "PAUSE_TV"
  | "RESET_DAILY_COUNTERS"
  | "RESET_CIRCUIT_BREAKER"
  | "RUN_BATCH"
  | "RESET_CURSOR";
