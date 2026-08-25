import { db } from "@/lib/db/client";
import { MediaType, BackfillJobStatus } from "@prisma/client";

export type BackfillReadinessState = "PHASE_H_BACKFILL_IN_PROGRESS" | "PHASE_H_BACKFILL_READY";

export interface BackfillReadinessReport {
  mediaType: MediaType;
  state: BackfillReadinessState;
  processedCoverage: number;
  genreCoverage: number;
  searchCoverage: number;
  failedRatio: number;
  safetyUnknownRatio: number;
  reasonsNotReady: string[];
  jobStatus: BackfillJobStatus | "NOT_STARTED";
  processedCount: number;
  updatedCount: number;
  totalCatalogCount: number;
}

export const COVERAGE_THRESHOLDS = {
  MIN_PROCESSED_COVERAGE: 0.95, // At least 95% of catalog scanned
  MIN_SEARCH_COVERAGE: 0.90,    // At least 90% search normalized titles populated
  MIN_GENRE_COVERAGE: 0.85,     // At least 85% canonical genres resolved
  MAX_FAILED_RATIO: 0.01,       // Maximum 1% error failure rate
};

/** Cached readiness reports with 60s TTL to avoid high-frequency DB count queries */
const readinessCache = new Map<MediaType, { report: BackfillReadinessReport; checkedAt: number }>();
const CACHE_TTL_MS = 60 * 1000;

/**
 * Computes deep physical column backfill readiness for the given MediaType.
 *
 * Requirements for PHASE_H_BACKFILL_READY:
 * 1. CatalogBackfillJob status === COMPLETED without fatal error.
 * 2. Processed coverage >= 95% of total catalog items.
 * 3. Search title coverage >= 90%.
 * 4. Genre coverage >= 85%.
 * 5. Error / failure ratio <= 1%.
 *
 * Safety Invariant:
 * - UNKNOWN safety ratings are NEVER converted to SAFE.
 * - If readiness criteria are NOT met, returns PHASE_H_BACKFILL_IN_PROGRESS, preserving safe transitional fallbacks.
 */
export async function getPhaseHBackfillReadinessReport(mediaType: MediaType): Promise<BackfillReadinessReport> {
  const cached = readinessCache.get(mediaType);
  const now = Date.now();

  if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
    return cached.report;
  }

  const reasonsNotReady: string[] = [];

  try {
    const [job, totalCatalogCount] = await Promise.all([
      db.catalogBackfillJob.findUnique({
        where: {
          jobType_mediaType: {
            jobType: "SAFETY_PRIORITY_GENRE_V1",
            mediaType,
          },
        },
      }),
      mediaType === "FILM" ? db.movie.count() : db.tvShow.count(),
    ]);

    if (!job) {
      const defaultReport: BackfillReadinessReport = {
        mediaType,
        state: "PHASE_H_BACKFILL_IN_PROGRESS",
        processedCoverage: 0,
        genreCoverage: 0,
        searchCoverage: 0,
        failedRatio: 0,
        safetyUnknownRatio: 1.0,
        reasonsNotReady: ["CatalogBackfillJob has not been initialized or started."],
        jobStatus: "NOT_STARTED",
        processedCount: 0,
        updatedCount: 0,
        totalCatalogCount,
      };
      readinessCache.set(mediaType, { report: defaultReport, checkedAt: now });
      return defaultReport;
    }

    const jobMeta = (job.metadata as Record<string, any>) || {};
    const processedCount = job.processedCount || 0;
    const errorCount = job.errorCount || 0;
    const unknownCount = job.unknownCount || 0;

    // Coverage calculations
    const processedCoverage = totalCatalogCount > 0 ? processedCount / totalCatalogCount : 0;
    const failedRatio = processedCount > 0 ? errorCount / processedCount : 0;
    const safetyUnknownRatio = processedCount > 0 ? unknownCount / processedCount : 1.0;

    // Read fine-grained coverage from job metadata if tracked, else fallback to updated ratio
    const searchCoverage = typeof jobMeta.searchCoverage === "number"
      ? jobMeta.searchCoverage
      : (totalCatalogCount > 0 ? (job.updatedCount || 0) / totalCatalogCount : 0);

    const genreCoverage = typeof jobMeta.genreCoverage === "number"
      ? jobMeta.genreCoverage
      : (totalCatalogCount > 0 ? (job.updatedCount || 0) / totalCatalogCount : 0);

    // Evaluate readiness criteria
    if (job.status !== BackfillJobStatus.COMPLETED) {
      reasonsNotReady.push(`Job status is ${job.status} (must be COMPLETED).`);
    }

    if (processedCoverage < COVERAGE_THRESHOLDS.MIN_PROCESSED_COVERAGE) {
      reasonsNotReady.push(
        `Processed coverage (${(processedCoverage * 100).toFixed(1)}%) is below ${(COVERAGE_THRESHOLDS.MIN_PROCESSED_COVERAGE * 100)}% threshold.`
      );
    }

    if (searchCoverage < COVERAGE_THRESHOLDS.MIN_SEARCH_COVERAGE) {
      reasonsNotReady.push(
        `Searchable title coverage (${(searchCoverage * 100).toFixed(1)}%) is below ${(COVERAGE_THRESHOLDS.MIN_SEARCH_COVERAGE * 100)}% threshold.`
      );
    }

    if (genreCoverage < COVERAGE_THRESHOLDS.MIN_GENRE_COVERAGE) {
      reasonsNotReady.push(
        `Canonical genre coverage (${(genreCoverage * 100).toFixed(1)}%) is below ${(COVERAGE_THRESHOLDS.MIN_GENRE_COVERAGE * 100)}% threshold.`
      );
    }

    if (failedRatio > COVERAGE_THRESHOLDS.MAX_FAILED_RATIO) {
      reasonsNotReady.push(
        `Error ratio (${(failedRatio * 100).toFixed(2)}%) exceeds maximum ${(COVERAGE_THRESHOLDS.MAX_FAILED_RATIO * 100)}% threshold.`
      );
    }

    const state: BackfillReadinessState =
      reasonsNotReady.length === 0 ? "PHASE_H_BACKFILL_READY" : "PHASE_H_BACKFILL_IN_PROGRESS";

    const report: BackfillReadinessReport = {
      mediaType,
      state,
      processedCoverage: Math.round(processedCoverage * 10000) / 10000,
      genreCoverage: Math.round(genreCoverage * 10000) / 10000,
      searchCoverage: Math.round(searchCoverage * 10000) / 10000,
      failedRatio: Math.round(failedRatio * 10000) / 10000,
      safetyUnknownRatio: Math.round(safetyUnknownRatio * 10000) / 10000,
      reasonsNotReady,
      jobStatus: job.status,
      processedCount,
      updatedCount: job.updatedCount || 0,
      totalCatalogCount,
    };

    readinessCache.set(mediaType, { report, checkedAt: now });
    return report;
  } catch (error: any) {
    const errorReport: BackfillReadinessReport = {
      mediaType,
      state: "PHASE_H_BACKFILL_IN_PROGRESS",
      processedCoverage: 0,
      genreCoverage: 0,
      searchCoverage: 0,
      failedRatio: 1.0,
      safetyUnknownRatio: 1.0,
      reasonsNotReady: [`Database query exception: ${error?.message || "Unknown error"}`],
      jobStatus: "NOT_STARTED",
      processedCount: 0,
      updatedCount: 0,
      totalCatalogCount: 0,
    };
    return errorReport;
  }
}

/** Convenience shortcut to get just the readiness state enum */
export async function getPhaseHBackfillReadiness(mediaType: MediaType): Promise<BackfillReadinessState> {
  const report = await getPhaseHBackfillReadinessReport(mediaType);
  return report.state;
}
