/**
 * CLI Tool for checking live TMDB Catalog Ingestion Status.
 *
 * Usage:
 *   npm run catalog:status
 */

import { db } from "../lib/db/client";
import { getCatalogIngestionOverviewStatus } from "../lib/catalog-ingestion/service";

async function main() {
  const status = await getCatalogIngestionOverviewStatus();

  console.log("\n===============================================================");
  console.log("FILMPRINT TMDB CATALOG INGESTION ENGINE STATUS");
  console.log("===============================================================\n");

  console.log(`MASTER SWITCH  : [ ${status.masterEnabled ? "ON (ENABLED)" : "OFF (DISABLED)"} ]`);
  console.log(`GLOBAL MAX RPS : ${status.globalMaxRps} req/s`);
  console.log(`STALE THRESHOLD: ${status.staleDays} days`);
  console.log(`CIRCUIT CONFIG : Threshold ${status.circuitThreshold} errors, Cooldown ${status.circuitCooldownMs / 1000}s\n`);

  console.log("---------------------------------------------------------------");
  console.log("🎬 FILM / MOVIE INGESTION");
  console.log("---------------------------------------------------------------");
  console.log(`Status         : ${status.film.enabled ? "ENABLED" : "DISABLED"} (Effective: ${status.film.effectiveRunning ? "RUNNING" : "STOPPED"})`);
  console.log(`Mode           : ${status.film.mode}`);
  console.log(`Catalog Total  : ${status.film.catalogTotal.toLocaleString()} movies (Usable: ~${status.film.eligibleTotal.toLocaleString()})`);
  console.log(`Initial Target : ${status.film.initialTarget.toLocaleString()} (%${status.film.progressPercent} completed)`);
  console.log(`Speed & Conc   : ${status.film.requestsPerSecond} req/s • Concurrency ${status.film.concurrency}`);
  console.log(`Daily Progress : ${status.film.processedToday}/${status.film.targetDailyItems} (Inserted: ${status.film.insertedToday}, Updated: ${status.film.updatedToday}, Rejected: ${status.film.rejectedToday}, 429: ${status.film.rateLimitedToday}, Failed: ${status.film.failedToday})`);
  console.log(`Source & Cursor: Date: ${status.film.sourceDate || "N/A"} • Cursor: ${status.film.sourceCursor.toLocaleString()}`);
  console.log(`Circuit Breaker: ${status.film.circuitState}${status.film.circuitOpenUntil ? ` (Open until ${new Date(status.film.circuitOpenUntil).toISOString()})` : ""}`);
  console.log(`Last Success   : ${status.film.lastSuccessAt ? new Date(status.film.lastSuccessAt).toLocaleString() : "Never"}\n`);

  console.log("---------------------------------------------------------------");
  console.log("📺 TV SHOW INGESTION");
  console.log("---------------------------------------------------------------");
  console.log(`Status         : ${status.tv.enabled ? "ENABLED" : "DISABLED"} (Effective: ${status.tv.effectiveRunning ? "RUNNING" : "STOPPED"})`);
  console.log(`Mode           : ${status.tv.mode}`);
  console.log(`Catalog Total  : ${status.tv.catalogTotal.toLocaleString()} shows (Usable: ~${status.tv.eligibleTotal.toLocaleString()})`);
  console.log(`Initial Target : ${status.tv.initialTarget.toLocaleString()} (%${status.tv.progressPercent} completed)`);
  console.log(`Speed & Conc   : ${status.tv.requestsPerSecond} req/s • Concurrency ${status.tv.concurrency}`);
  console.log(`Daily Progress : ${status.tv.processedToday}/${status.tv.targetDailyItems} (Inserted: ${status.tv.insertedToday}, Updated: ${status.tv.updatedToday}, Rejected: ${status.tv.rejectedToday}, 429: ${status.tv.rateLimitedToday}, Failed: ${status.tv.failedToday})`);
  console.log(`Source & Cursor: Date: ${status.tv.sourceDate || "N/A"} • Cursor: ${status.tv.sourceCursor.toLocaleString()}`);
  console.log(`Circuit Breaker: ${status.tv.circuitState}${status.tv.circuitOpenUntil ? ` (Open until ${new Date(status.tv.circuitOpenUntil).toISOString()})` : ""}`);
  console.log(`Last Success   : ${status.tv.lastSuccessAt ? new Date(status.tv.lastSuccessAt).toLocaleString() : "Never"}\n`);
  console.log("===============================================================\n");
}

main()
  .catch((err) => {
    console.error("Failed to read status:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
