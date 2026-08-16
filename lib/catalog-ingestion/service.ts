import { db } from "@/lib/db/client";
import { getTMDBApiKey, updateSystemSetting } from "@/lib/config/service";
import { filterEligibleMovies } from "@/lib/movies/eligibility";
import { filterEligibleTvShows } from "@/lib/tv/eligibility";
import { CatalogCircuitBreaker, CircuitBreakerOpenError } from "./circuit-breaker";
import { DailyExportDiscoveryProvider, DiscoverApiFallbackProvider } from "./discovery";
import { processCandidate } from "./pipeline";
import { sharedCatalogLimiter } from "./rate-limiter";
import type {
  CatalogAdminActionType,
  CatalogIngestionBatchResult,
  CatalogIngestionFullConfig,
  CatalogIngestionGlobalConfig,
  CatalogIngestionOverviewStatus,
  CatalogMediaConfigInput,
  CatalogMediaStatusView,
  CandidateProcessingResult,
  CircuitBreakerState,
  DiscoveryBatchResult,
  MediaType,
} from "./types";

// In-memory circuit breaker instances mapped to media types
const filmCircuitBreaker = new CatalogCircuitBreaker(10, 300_000);
const tvCircuitBreaker = new CatalogCircuitBreaker(10, 300_000);

export function getTodayUtcDateString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getCatalogIngestionGlobalConfig(): Promise<CatalogIngestionGlobalConfig> {
  const settings = await db.systemSetting.findMany({
    where: {
      key: {
        in: [
          "catalog_ingestion_master_enabled",
          "catalog_ingestion_global_max_rps",
          "catalog_ingestion_stale_days",
          "catalog_ingestion_circuit_threshold",
          "catalog_ingestion_circuit_cooldown_ms",
        ],
      },
    },
  });

  const map = new Map(settings.map((s) => [s.key, s.value]));

  const masterEnabled = map.get("catalog_ingestion_master_enabled") !== "false";
  const globalMaxRps = Math.max(0.1, Math.min(10.0, parseFloat(map.get("catalog_ingestion_global_max_rps") || "4.0")));
  const staleDays = Math.max(30, Math.min(365, parseInt(map.get("catalog_ingestion_stale_days") || "180", 10)));
  const circuitThreshold = Math.max(3, Math.min(50, parseInt(map.get("catalog_ingestion_circuit_threshold") || "10", 10)));
  const circuitCooldownMs = Math.max(10000, Math.min(3600000, parseInt(map.get("catalog_ingestion_circuit_cooldown_ms") || "300000", 10)));

  // Update shared limiter and circuit breakers
  sharedCatalogLimiter.setGlobalMaxRps(globalMaxRps);
  filmCircuitBreaker.updateConfig(circuitThreshold, circuitCooldownMs);
  tvCircuitBreaker.updateConfig(circuitThreshold, circuitCooldownMs);

  return {
    masterEnabled,
    globalMaxRps,
    staleDays,
    circuitThreshold,
    circuitCooldownMs,
  };
}

export async function getOrCreateMediaIngestionState(mediaType: MediaType) {
  const existing = await db.catalogIngestionState.findUnique({
    where: { mediaType },
  });

  if (existing) {
    // Perform daily UTC counter reset if date rolled over
    const todayUtc = getTodayUtcDateString();
    if (existing.lastCounterResetDate !== todayUtc) {
      return await db.catalogIngestionState.update({
        where: { mediaType },
        data: {
          processedToday: 0,
          insertedToday: 0,
          updatedToday: 0,
          rejectedToday: 0,
          rateLimitedToday: 0,
          failedToday: 0,
          lastCounterResetDate: todayUtc,
        },
      });
    }
    return existing;
  }

  const defaultInitialTarget = mediaType === "FILM" ? 100_000 : 30_000;
  const defaultDailyTarget = mediaType === "FILM" ? 10_000 : 3_000;

  return await db.catalogIngestionState.create({
    data: {
      mediaType,
      enabled: true,
      mode: "INITIAL_FILL",
      targetDailyItems: defaultDailyTarget,
      requestsPerSecond: 1.0,
      concurrency: 2,
      initialTarget: defaultInitialTarget,
      lastCounterResetDate: getTodayUtcDateString(),
    },
  });
}

export async function getCatalogIngestionOverviewStatus(): Promise<CatalogIngestionOverviewStatus> {
  const globalConfig = await getCatalogIngestionGlobalConfig();
  const [filmState, tvState] = await Promise.all([
    getOrCreateMediaIngestionState("FILM"),
    getOrCreateMediaIngestionState("TV"),
  ]);

  // Compute live database counts and eligible usable counts
  const [filmTotal, tvTotal] = await Promise.all([
    db.movie.count(),
    db.tvShow.count(),
  ]);

  // Sample eligible usable totals (using realistic quality floor query)
  const [sampleMovies, sampleTvShows] = await Promise.all([
    db.movie.findMany({ take: 250, select: { title: true, originalTitle: true, posterPath: true, releaseYear: true, voteAverage: true, popularity: true, metadata: true } }),
    db.tvShow.findMany({ take: 250, select: { name: true, originalName: true, posterPath: true, firstAirDate: true, voteAverage: true, popularity: true, metadata: true, overview: true } }),
  ]);

  const eligibleSampleMovieCount = filterEligibleMovies(sampleMovies as any, "RECOMMENDATION").length;
  const eligibleSampleTvCount = filterEligibleTvShows(sampleTvShows as any, "RECOMMENDATION").length;

  const movieEligibleRatio = sampleMovies.length > 0 ? eligibleSampleMovieCount / sampleMovies.length : 1.0;
  const tvEligibleRatio = sampleTvShows.length > 0 ? eligibleSampleTvCount / sampleTvShows.length : 1.0;

  const estimatedFilmEligible = Math.round(filmTotal * movieEligibleRatio);
  const estimatedTvEligible = Math.round(tvTotal * tvEligibleRatio);

  const filmCircuit = filmCircuitBreaker.getState(filmState.circuitOpenUntil);
  const tvCircuit = tvCircuitBreaker.getState(tvState.circuitOpenUntil);

  const buildMediaView = (
    state: typeof filmState,
    catalogTotal: number,
    eligibleTotal: number,
    circuitState: CircuitBreakerState
  ): CatalogMediaStatusView => {
    const effectiveRunning =
      globalConfig.masterEnabled &&
      state.enabled &&
      state.mode !== "PAUSED" &&
      circuitState !== "OPEN" &&
      state.processedToday < state.targetDailyItems;

    const progressPercent = Math.min(
      100,
      Math.round((eligibleTotal / Math.max(1, state.initialTarget)) * 100)
    );

    return {
      mediaType: state.mediaType,
      enabled: state.enabled,
      mode: state.mode,
      effectiveRunning,
      sourceDate: state.sourceDate,
      sourceCursor: state.sourceCursor,
      targetDailyItems: state.targetDailyItems,
      requestsPerSecond: state.requestsPerSecond,
      concurrency: state.concurrency,
      initialTarget: state.initialTarget,
      processedToday: state.processedToday,
      insertedToday: state.insertedToday,
      updatedToday: state.updatedToday,
      rejectedToday: state.rejectedToday,
      rateLimitedToday: state.rateLimitedToday,
      failedToday: state.failedToday,
      catalogTotal,
      eligibleTotal,
      progressPercent,
      circuitState,
      circuitOpenUntil: state.circuitOpenUntil,
      lastRunAt: state.lastRunAt,
      lastSuccessAt: state.lastSuccessAt,
      lastErrorAt: state.lastErrorAt,
      lastError: state.lastError,
    };
  };

  return {
    ...globalConfig,
    film: buildMediaView(filmState, filmTotal, estimatedFilmEligible, filmCircuit),
    tv: buildMediaView(tvState, tvTotal, estimatedTvEligible, tvCircuit),
  };
}

export async function updateCatalogIngestionConfig(input: {
  masterEnabled?: boolean;
  globalMaxRps?: number;
  staleDays?: number;
  film?: CatalogMediaConfigInput;
  tv?: CatalogMediaConfigInput;
}): Promise<void> {
  if (typeof input.masterEnabled === "boolean") {
    await updateSystemSetting("catalog_ingestion_master_enabled", input.masterEnabled ? "true" : "false");
  }

  if (typeof input.globalMaxRps === "number" && !isNaN(input.globalMaxRps)) {
    const clampedRps = Math.max(0.1, Math.min(10.0, input.globalMaxRps));
    await updateSystemSetting("catalog_ingestion_global_max_rps", String(clampedRps));
    sharedCatalogLimiter.setGlobalMaxRps(clampedRps);
  }

  if (typeof input.staleDays === "number" && !isNaN(input.staleDays)) {
    const clampedDays = Math.max(30, Math.min(365, input.staleDays));
    await updateSystemSetting("catalog_ingestion_stale_days", String(clampedDays));
  }

  const updateMedia = async (mediaType: MediaType, config?: CatalogMediaConfigInput) => {
    if (!config) return;

    const data: any = {};
    if (typeof config.enabled === "boolean") data.enabled = config.enabled;
    if (config.mode) data.mode = config.mode;
    if (typeof config.targetDailyItems === "number" && !isNaN(config.targetDailyItems)) {
      data.targetDailyItems = Math.max(10, Math.min(100_000, config.targetDailyItems));
    }
    if (typeof config.requestsPerSecond === "number" && !isNaN(config.requestsPerSecond)) {
      data.requestsPerSecond = Math.max(0.1, Math.min(10.0, config.requestsPerSecond));
    }
    if (typeof config.concurrency === "number" && !isNaN(config.concurrency)) {
      data.concurrency = Math.max(1, Math.min(4, config.concurrency));
    }
    if (typeof config.initialTarget === "number" && !isNaN(config.initialTarget)) {
      data.initialTarget = Math.max(500, Math.min(500_000, config.initialTarget));
    }

    if (Object.keys(data).length > 0) {
      await db.catalogIngestionState.update({
        where: { mediaType },
        data,
      });
    }
  };

  await Promise.all([
    updateMedia("FILM", input.film),
    updateMedia("TV", input.tv),
  ]);
}

/**
 * Core Batch Ingestion Executor.
 * Can run in live background worker or interactive dry-run CLI.
 */
export async function executeCatalogIngestionBatch(
  mediaType: MediaType,
  options: {
    batchSize?: number;
    dryRun?: boolean;
    forceRun?: boolean;
    date?: Date;
    customCursor?: number;
  } = {}
): Promise<CatalogIngestionBatchResult> {
  const startTime = Date.now();
  const globalConfig = await getCatalogIngestionGlobalConfig();
  const state = await getOrCreateMediaIngestionState(mediaType);

  const circuitBreaker = mediaType === "FILM" ? filmCircuitBreaker : tvCircuitBreaker;
  const circuitState = circuitBreaker.getState(state.circuitOpenUntil);

  if (!options.forceRun && !options.dryRun) {
    if (!globalConfig.masterEnabled) {
      throw new Error(`Master ingestion switch is OFF. Ingestion aborted.`);
    }

    if (!state.enabled || state.mode === "PAUSED") {
      throw new Error(`${mediaType} ingestion is disabled or paused.`);
    }

    if (circuitState === "OPEN") {
      throw new CircuitBreakerOpenError(state.circuitOpenUntil || new Date(Date.now() + 300_000));
    }

    if (state.processedToday >= state.targetDailyItems) {
      return {
        mediaType,
        dryRun: false,
        processed: 0,
        inserted: 0,
        updated: 0,
        rejected: 0,
        failed: 0,
        skipped: 0,
        rateLimited: 0,
        sourceDate: state.sourceDate || "TODAY_LIMIT_REACHED",
        startCursor: state.sourceCursor,
        nextCursor: state.sourceCursor,
        hasMore: true,
        durationMs: Date.now() - startTime,
        details: [],
        circuitState,
      };
    }
  }

  const apiKey = (await getTMDBApiKey()) || process.env.TMDB_API_KEY || "";
  if (!apiKey) {
    throw new Error("TMDB API key is not configured.");
  }

  const batchSize = Math.max(1, Math.min(100, options.batchSize || 25));
  const cursor = typeof options.customCursor === "number" ? options.customCursor : state.sourceCursor;

  // 1. Fetch Candidates from Discovery Provider
  const discoveryProvider = new DailyExportDiscoveryProvider();
  let discoveryResult: DiscoveryBatchResult;

  try {
    discoveryResult = await discoveryProvider.fetchCandidateBatch(
      mediaType,
      cursor,
      batchSize,
      options.date
    );
  } catch (err) {
    console.warn(`[CatalogIngestion] Daily export failed for ${mediaType}; using discover API fallback.`);
    const fallbackProvider = new DiscoverApiFallbackProvider();
    discoveryResult = await fallbackProvider.fetchCandidateBatch(
      mediaType,
      cursor,
      batchSize
    );
  }

  const candidates = discoveryResult.candidates;
  const workerKey = `worker-${mediaType.toLowerCase()}`;
  const workerLimiter = sharedCatalogLimiter.getWorkerLimiter(workerKey, state.requestsPerSecond);
  workerLimiter.updateRate(state.requestsPerSecond);

  // 2. Process Candidates with Bounded Concurrency
  const concurrency = Math.max(1, Math.min(4, state.concurrency || 2));
  const results: CandidateProcessingResult[] = [];

  for (let i = 0; i < candidates.length; i += concurrency) {
    const chunk = candidates.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((candidate) =>
        processCandidate(candidate, {
          dryRun: options.dryRun,
          staleDays: globalConfig.staleDays,
          circuitBreaker,
          apiKey,
          workerKey,
        })
      )
    );
    results.push(...chunkResults);
  }

  // 3. Aggregate Batch Metrics
  let inserted = 0;
  let updated = 0;
  let rejected = 0;
  let failed = 0;
  let skipped = 0;
  let rateLimited = 0;

  for (const r of results) {
    if (r.outcome === "IMPORTED") inserted++;
    else if (r.outcome === "UPDATED") updated++;
    else if (r.outcome.startsWith("REJECTED") || r.outcome === "NOT_FOUND") rejected++;
    else if (r.outcome === "FAILED_RETRYABLE") failed++;
    else if (r.outcome.startsWith("SKIPPED")) skipped++;
    if (r.rateLimited) rateLimited++;
  }

  const processed = inserted + updated + rejected + failed;
  const durationMs = Date.now() - startTime;
  const now = new Date();

  // 4. Update Ingestion State in Database
  if (!options.dryRun) {
    const openUntil = circuitBreaker.getOpenUntilDate();
    const consecutiveFailures = circuitBreaker.getConsecutiveFailures();

    // Check if initial target reached -> transition to MAINTENANCE
    const currentCount = mediaType === "FILM" ? await db.movie.count() : await db.tvShow.count();
    let nextMode = state.mode;
    if (state.mode === "INITIAL_FILL" && currentCount >= state.initialTarget) {
      nextMode = "MAINTENANCE";
      console.info(`[CatalogIngestion] ${mediaType} reached initial target (${currentCount}/${state.initialTarget}). Transitioning to MAINTENANCE mode.`);
    }

    await db.catalogIngestionState.update({
      where: { mediaType },
      data: {
        mode: nextMode,
        sourceDate: discoveryResult.sourceDate,
        sourceCursor: discoveryResult.nextCursor,
        processedToday: { increment: processed },
        insertedToday: { increment: inserted },
        updatedToday: { increment: updated },
        rejectedToday: { increment: rejected },
        rateLimitedToday: { increment: rateLimited },
        failedToday: { increment: failed },
        lastRunAt: now,
        lastSuccessAt: processed > failed ? now : state.lastSuccessAt,
        lastErrorAt: failed > 0 ? now : state.lastErrorAt,
        lastError: failed > 0 ? `${failed} candidates failed during batch` : null,
        circuitOpenUntil: openUntil,
        consecutiveFailures,
      },
    });
  }

  return {
    mediaType,
    dryRun: Boolean(options.dryRun),
    processed,
    inserted,
    updated,
    rejected,
    failed,
    skipped,
    rateLimited,
    sourceDate: discoveryResult.sourceDate,
    startCursor: cursor,
    nextCursor: discoveryResult.nextCursor,
    hasMore: discoveryResult.hasMore,
    durationMs,
    details: results,
    circuitState: circuitBreaker.getState(circuitBreaker.getOpenUntilDate()),
  };
}

export async function executeAdminAction(
  action: CatalogAdminActionType,
  params?: {
    batchSize?: number;
    resetCursorValue?: number;
  }
): Promise<{ success: boolean; message: string; result?: any }> {
  switch (action) {
    case "START_MOVIE":
      await db.catalogIngestionState.update({
        where: { mediaType: "FILM" },
        data: { enabled: true, mode: "INITIAL_FILL" },
      });
      return { success: true, message: "Film ingestion started." };

    case "PAUSE_MOVIE":
      await db.catalogIngestionState.update({
        where: { mediaType: "FILM" },
        data: { mode: "PAUSED" },
      });
      return { success: true, message: "Film ingestion paused." };

    case "START_TV":
      await db.catalogIngestionState.update({
        where: { mediaType: "TV" },
        data: { enabled: true, mode: "INITIAL_FILL" },
      });
      return { success: true, message: "TV ingestion started." };

    case "PAUSE_TV":
      await db.catalogIngestionState.update({
        where: { mediaType: "TV" },
        data: { mode: "PAUSED" },
      });
      return { success: true, message: "TV ingestion paused." };

    case "RESET_DAILY_COUNTERS":
      await db.catalogIngestionState.updateMany({
        data: {
          processedToday: 0,
          insertedToday: 0,
          updatedToday: 0,
          rejectedToday: 0,
          rateLimitedToday: 0,
          failedToday: 0,
          lastCounterResetDate: getTodayUtcDateString(),
        },
      });
      return { success: true, message: "Daily counters reset to 0." };

    case "RESET_CIRCUIT_BREAKER":
      filmCircuitBreaker.reset();
      tvCircuitBreaker.reset();
      await db.catalogIngestionState.updateMany({
        data: {
          circuitOpenUntil: null,
          consecutiveFailures: 0,
        },
      });
      return { success: true, message: "Circuit breaker reset." };

    case "RUN_BATCH":
      const media = (params as any)?.mediaType === "TV" ? "TV" : "FILM";
      const size = Math.min(100, Math.max(5, params?.batchSize || 10));
      const batchResult = await executeCatalogIngestionBatch(media, {
        batchSize: size,
        forceRun: true,
      });
      return {
        success: true,
        message: `Executed ${media} batch of ${batchResult.processed} items. (Inserted: ${batchResult.inserted}, Updated: ${batchResult.updated}, Rejected: ${batchResult.rejected}, Failed: ${batchResult.failed})`,
        result: batchResult,
      };

    case "RESET_CURSOR":
      const targetMedia = (params as any)?.mediaType === "TV" ? "TV" : "FILM";
      const cursorVal = Math.max(0, params?.resetCursorValue || 0);
      await db.catalogIngestionState.update({
        where: { mediaType: targetMedia },
        data: {
          sourceCursor: cursorVal,
        },
      });
      return { success: true, message: `${targetMedia} cursor reset to ${cursorVal}.` };

    default:
      return { success: false, message: "Unknown action." };
  }
}
