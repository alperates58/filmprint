/**
 * CLI Tool for TMDB Catalog Ingestion & Dry-Run Evaluation.
 *
 * Usage:
 *   npm run catalog:ingest -- --media=movie --dry-run --limit=50
 *   npm run catalog:ingest -- --media=tv --dry-run --limit=50
 *   npm run catalog:ingest -- --media=movie --apply --limit=50 --batch-size=25
 */

import { db } from "../lib/db/client";
import { executeCatalogIngestionBatch } from "../lib/catalog-ingestion/service";
import type { MediaType } from "../lib/catalog-ingestion/types";

function parseArgs() {
  const args = process.argv.slice(2);
  const mediaArg = args.find((a) => a.startsWith("--media="))?.split("=")[1]?.toLowerCase();
  const mediaType: MediaType = mediaArg === "tv" ? "TV" : "FILM";

  const isApply = args.includes("--apply") && !args.includes("--dry-run");
  const dryRun = !isApply;

  const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const limit = limitArg ? Math.max(1, parseInt(limitArg, 10)) : 25;

  const batchSizeArg = args.find((a) => a.startsWith("--batch-size="))?.split("=")[1];
  const batchSize = batchSizeArg ? Math.max(1, Math.min(100, parseInt(batchSizeArg, 10))) : 25;

  const cursorArg = args.find((a) => a.startsWith("--cursor="))?.split("=")[1];
  const customCursor = cursorArg ? Math.max(0, parseInt(cursorArg, 10)) : undefined;

  return { mediaType, dryRun, limit, batchSize, customCursor };
}

async function main() {
  const { mediaType, dryRun, limit, batchSize, customCursor } = parseArgs();

  console.log("\n===============================================================");
  console.log(`TMDB CATALOG INGESTION CLI [${mediaType}]`);
  console.log(`MODE       : ${dryRun ? "DRY-RUN (Simulated evaluation, zero DB mutations)" : "APPLY (Live DB writes)"}`);
  console.log(`LIMIT      : ${limit} items`);
  console.log(`BATCH SIZE : ${batchSize}`);
  if (customCursor !== undefined) console.log(`CURSOR     : ${customCursor}`);
  console.log("===============================================================\n");

  let totalProcessed = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalRejected = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalRateLimited = 0;
  let currentCursor = customCursor;

  const startTime = Date.now();

  while (totalProcessed < limit) {
    const currentBatchLimit = Math.min(batchSize, limit - totalProcessed);
    const result = await executeCatalogIngestionBatch(mediaType, {
      batchSize: currentBatchLimit,
      dryRun,
      forceRun: true,
      customCursor: currentCursor,
    });

    totalProcessed += result.processed;
    totalInserted += result.inserted;
    totalUpdated += result.updated;
    totalRejected += result.rejected;
    totalFailed += result.failed;
    totalSkipped += result.skipped;
    totalRateLimited += result.rateLimited;
    currentCursor = result.nextCursor;

    console.log(
      `[Batch] Processed ${result.processed}/${limit} (Inserted: ${result.inserted}, Updated: ${result.updated}, Rejected: ${result.rejected}, Skipped: ${result.skipped}, Failed: ${result.failed}) - Next cursor: ${result.nextCursor}`
    );

    // Print sample details
    for (const d of result.details.slice(0, 5)) {
      console.log(`  • TMDB ${d.tmdbId}: [${d.outcome}] ${d.title || ""} ${d.reason ? `(${d.reason})` : ""}`);
    }

    if (!result.hasMore || result.details.length === 0) {
      console.log("No more candidates available.");
      break;
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n===============================================================");
  console.log("FINAL INGESTION SUMMARY");
  console.log("===============================================================");
  console.log(`Media Type     : ${mediaType}`);
  console.log(`Execution Mode : ${dryRun ? "DRY-RUN" : "APPLY"}`);
  console.log(`Total Scanned  : ${totalProcessed + totalSkipped}`);
  console.log(`Processed      : ${totalProcessed}`);
  console.log(`Inserted       : ${totalInserted}`);
  console.log(`Updated        : ${totalUpdated}`);
  console.log(`Rejected       : ${totalRejected}`);
  console.log(`Skipped        : ${totalSkipped}`);
  console.log(`429 Rate Limit : ${totalRateLimited}`);
  console.log(`Failed         : ${totalFailed}`);
  console.log(`Next Cursor    : ${currentCursor}`);
  console.log(`Elapsed Time   : ${durationSec}s`);
  console.log("===============================================================\n");
}

main()
  .catch((err) => {
    console.error("CLI Execution failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
