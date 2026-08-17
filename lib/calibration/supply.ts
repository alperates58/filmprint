import { filterEligibleMovies } from "@/lib/movies/eligibility";
import type { EligibleMovieInput } from "@/lib/movies/types";
import {
  MOVIE_CALIBRATION_MAX_PAGES,
  MOVIE_CALIBRATION_PAGE_SIZE,
  MOVIE_CALIBRATION_TARGET_POOL,
  MOVIE_CALIBRATION_RESERVE_THRESHOLD,
} from "./constants";

export interface MovieCandidatePageRequest {
  page: number;
  skip: number;
  take: number;
}

export type CalibrationSupplyStatus = "AVAILABLE" | "LOW" | "EXHAUSTED";

export interface MovieCandidateScanResult<T> {
  rawCandidates: T[];
  eligibleCandidates: T[];
  rawScanned: number;
  pagesScanned: number;
  exhausted: boolean;
  status: CalibrationSupplyStatus;
}

export interface MovieScanOptions<T> {
  fetchPage: (request: MovieCandidatePageRequest) => Promise<T[]>;
  pageSize?: number;
  maxPages?: number;
  targetPool?: number;
  reserveThreshold?: number;
}

/**
 * Scans a deterministic, bounded sequence of database pages and applies the shared
 * canonical CALIBRATION eligibility policy to each batch.
 *
 * Guarantees:
 * - 100% Database-Only: Never triggers external network calls.
 * - Bounded Scan: Stops early as soon as target pool is met, up to maxPages cap.
 * - Strict Eligibility: Adheres strictly to CALIBRATION eligibility without relaxation.
 */
export async function scanEligibleMovieCandidatePages<T extends EligibleMovieInput>({
  fetchPage,
  pageSize = MOVIE_CALIBRATION_PAGE_SIZE,
  maxPages = MOVIE_CALIBRATION_MAX_PAGES,
  targetPool = MOVIE_CALIBRATION_TARGET_POOL,
  reserveThreshold = MOVIE_CALIBRATION_RESERVE_THRESHOLD,
}: MovieScanOptions<T>): Promise<MovieCandidateScanResult<T>> {
  const rawCandidates: T[] = [];
  const eligibleCandidates: T[] = [];
  let exhausted = false;
  let pagesScanned = 0;

  for (let page = 0; page < maxPages; page++) {
    const batch = await fetchPage({
      page,
      skip: page * pageSize,
      take: pageSize,
    });

    pagesScanned++;
    rawCandidates.push(...batch);

    const eligibleBatch = filterEligibleMovies(batch, "CALIBRATION");
    eligibleCandidates.push(...eligibleBatch);

    // If batch size is less than requested, DB has no more rows
    if (batch.length < pageSize) {
      exhausted = true;
      break;
    }

    // Stop early once we reach the target candidate pool
    if (eligibleCandidates.length >= targetPool) {
      break;
    }
  }

  let status: CalibrationSupplyStatus = "AVAILABLE";
  if (eligibleCandidates.length === 0) {
    status = "EXHAUSTED";
  } else if (eligibleCandidates.length < reserveThreshold) {
    status = "LOW";
  }

  return {
    rawCandidates,
    eligibleCandidates,
    rawScanned: rawCandidates.length,
    pagesScanned,
    exhausted,
    status,
  };
}

/**
 * Resolves the database-first movie candidate supply.
 */
export async function resolveMovieCandidateSupply<T extends EligibleMovieInput>(
  options: MovieScanOptions<T>
): Promise<MovieCandidateScanResult<T>> {
  return scanEligibleMovieCandidatePages(options);
}
