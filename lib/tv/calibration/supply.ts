import { filterEligibleTvShows } from "@/lib/tv/eligibility";
import type { EligibleTvShowInput } from "@/lib/tv/types";
import {
  TV_CALIBRATION_CANDIDATE_MAX_PAGES,
  TV_CALIBRATION_CANDIDATE_PAGE_SIZE,
  TV_CALIBRATION_CANDIDATE_TARGET_POOL,
  TV_CALIBRATION_RESERVE_THRESHOLD,
} from "./constants";

export interface TvCandidatePageRequest {
  page: number;
  skip: number;
  take: number;
}

export interface TvCandidateScanResult<T> {
  rawCandidates: T[];
  eligibleCandidates: T[];
  rawScanned: number;
  pagesScanned: number;
  exhausted: boolean;
}

export interface TvCandidateSupplyResult<T> extends TvCandidateScanResult<T> {
  replenishTriggered: boolean;
}

interface ScanOptions<T> {
  fetchPage: (request: TvCandidatePageRequest) => Promise<T[]>;
  pageSize?: number;
  maxPages?: number;
  targetPool?: number;
}

interface ResolveOptions<T> extends ScanOptions<T> {
  forceReplenish?: boolean;
  reserveThreshold?: number;
  replenish: () => Promise<unknown>;
}

/**
 * Scans a deterministic, bounded sequence of DB pages and applies the shared
 * eligibility policy to every batch. This prevents a single popularity slice
 * from hiding valid candidates immediately below it.
 */
export async function scanEligibleTvCandidatePages<T extends EligibleTvShowInput>({
  fetchPage,
  pageSize = TV_CALIBRATION_CANDIDATE_PAGE_SIZE,
  maxPages = TV_CALIBRATION_CANDIDATE_MAX_PAGES,
  targetPool = TV_CALIBRATION_CANDIDATE_TARGET_POOL,
}: ScanOptions<T>): Promise<TvCandidateScanResult<T>> {
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
    eligibleCandidates.push(...filterEligibleTvShows(batch, "CALIBRATION"));

    if (batch.length < pageSize) {
      exhausted = true;
      break;
    }

    if (eligibleCandidates.length >= targetPool) {
      break;
    }
  }

  return {
    rawCandidates,
    eligibleCandidates,
    rawScanned: rawCandidates.length,
    pagesScanned,
    exhausted,
  };
}

/**
 * Resolves the user-specific reserve, replenishing only when the paged eligible
 * supply is low (or an explicit refresh was requested), then rescans the DB.
 */
export async function resolveTvCandidateSupply<T extends EligibleTvShowInput>({
  fetchPage,
  replenish,
  forceReplenish = false,
  reserveThreshold = TV_CALIBRATION_RESERVE_THRESHOLD,
  pageSize,
  maxPages,
  targetPool,
}: ResolveOptions<T>): Promise<TvCandidateSupplyResult<T>> {
  const scanOptions = { fetchPage, pageSize, maxPages, targetPool };
  let scan = await scanEligibleTvCandidatePages(scanOptions);
  const replenishTriggered =
    forceReplenish || scan.eligibleCandidates.length < reserveThreshold;

  if (replenishTriggered) {
    await replenish();
    scan = await scanEligibleTvCandidatePages(scanOptions);
  }

  return {
    ...scan,
    replenishTriggered,
  };
}
