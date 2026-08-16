/**
 * Dedicated Background TMDB Catalog Ingestion Worker.
 *
 * Runs continuous background loops for Film and TV ingestion,
 * respecting master and per-media switches, distributed leases,
 * token-bucket rate limits, and circuit breakers.
 *
 * Execution:
 *   Development: npm run catalog:worker (via tsx)
 *   Production:  npm run catalog:worker:prod (via node dist/catalog-worker.js)
 */

import { db } from "../lib/db/client";
import {
  getCatalogIngestionGlobalConfig,
  getOrCreateMediaIngestionState,
  executeCatalogIngestionBatch,
} from "../lib/catalog-ingestion/service";
import { CatalogWorkerLock } from "../lib/catalog-ingestion/lock";
import { sleep } from "../lib/catalog-ingestion/rate-limiter";
import type { MediaType } from "../lib/catalog-ingestion/types";

let isShuttingDown = false;

const filmLock = new CatalogWorkerLock("FILM");
const tvLock = new CatalogWorkerLock("TV");

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.info(`[CatalogWorker] Received ${signal}. Gracefully releasing locks and shutting down...`);

  await Promise.allSettled([
    filmLock.release(),
    tvLock.release(),
    db.$disconnect(),
  ]);

  console.info("[CatalogWorker] Shutdown complete. Exiting.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function runMediaWorkerCycle(mediaType: MediaType, lock: CatalogWorkerLock): Promise<void> {
  const globalConfig = await getCatalogIngestionGlobalConfig();
  if (!globalConfig.masterEnabled) {
    return;
  }

  const state = await getOrCreateMediaIngestionState(mediaType);
  if (!state.enabled || state.mode === "PAUSED") {
    return;
  }

  if (state.circuitOpenUntil && state.circuitOpenUntil > new Date()) {
    return;
  }

  if (state.processedToday >= state.targetDailyItems) {
    return;
  }

  // Acquire distributed lease lock
  const hasLock = await lock.acquire();
  if (!hasLock) {
    return;
  }

  try {
    const batchSize = Math.min(25, Math.max(5, state.concurrency * 5));
    const result = await executeCatalogIngestionBatch(mediaType, { batchSize });

    if (result.processed > 0) {
      console.info(`[CatalogWorker] ${mediaType} batch completed:`, {
        processed: result.processed,
        inserted: result.inserted,
        updated: result.updated,
        rejected: result.rejected,
        failed: result.failed,
        nextCursor: result.nextCursor,
        durationMs: result.durationMs,
      });
    }
  } catch (err) {
    console.error(`[CatalogWorker] Error during ${mediaType} cycle:`, err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  console.info("===============================================================");
  console.info("FILMPRINT TMDB CATALOG INGESTION WORKER STARTED");
  console.info("===============================================================");

  while (!isShuttingDown) {
    try {
      await runMediaWorkerCycle("FILM", filmLock);
      await runMediaWorkerCycle("TV", tvLock);
    } catch (err) {
      console.error("[CatalogWorker] Main loop error:", err);
    }

    // Sleep interval between cycles (e.g. 5 seconds)
    await sleep(5_000);
  }
}

main().catch((err) => {
  console.error("[CatalogWorker] Fatal worker error:", err);
  process.exit(1);
});
