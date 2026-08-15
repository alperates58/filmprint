/**
 * scripts/refresh-tv-images.ts
 *
 * Standalone script to safely refresh posterPath and backdropPath for all TvShow
 * records in PostgreSQL by fetching authentic TMDB data via tmdbId.
 *
 * Features:
 * - Reads all TvShow records from database
 * - Fetches updated poster_path and backdrop_path from TMDB TV details endpoint
 * - Strictly updates only posterPath and backdropPath (preserves name, originalName, metadata, etc.)
 * - Replaces fake slug paths (e.g. /dexter.jpg, /friendsbg.jpg) with authentic TMDB hashes or null
 * - Controlled concurrency (6 workers) + rate limiting + exponential backoff retry on 429
 * - Dry-run mode by default; applies changes only when --apply flag is provided
 * - Comprehensive summary report with first 20 sample changes
 * - Zero secret/API key logging
 *
 * Usage:
 *   Dry-run (Default):
 *     npx tsx scripts/refresh-tv-images.ts
 *
 *   Apply to Database:
 *     npx tsx scripts/refresh-tv-images.ts --apply
 */

import { db } from "../lib/db/client";
import { isValidTmdbImagePath } from "../lib/tmdb/image";
import { getTMDBApiKey } from "../lib/config/service";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const CONCURRENCY = 6;
const BATCH_DELAY_MS = 50;
const MAX_RETRIES = 3;

interface ChangeSample {
  name: string;
  tmdbId: number;
  oldPoster: string | null;
  newPoster: string | null;
  oldBackdrop: string | null;
  newBackdrop: string | null;
}

interface ScriptSummary {
  total: number;
  wouldUpdate: number;
  updated: number;
  skipped: number;
  failed: number;
  sampleChanges: ChangeSample[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves TMDB API key from environment variable or DB secret without printing it.
 */
async function resolveApiKey(): Promise<string | null> {
  if (process.env.TMDB_API_KEY && process.env.TMDB_API_KEY.trim().length > 0) {
    return process.env.TMDB_API_KEY.trim();
  }

  try {
    const dbKey = await getTMDBApiKey();
    if (dbKey && dbKey.trim().length > 0) {
      return dbKey.trim();
    }
  } catch (e) {
    // Silent catch, fallback below
  }

  return null;
}

interface TmdbTvDetailResponse {
  id: number;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
}

/**
 * Fetches TV details from TMDB with rate limit retry support.
 */
async function fetchTmdbTvDetails(
  tmdbId: number,
  apiKey: string
): Promise<TmdbTvDetailResponse | null> {
  const url = `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=tr-TR`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (response.status === 429) {
        const retryAfter = attempt * 1500;
        console.warn(`[TMDB Rate Limit] HTTP 429 for tmdbId ${tmdbId}. Waiting ${retryAfter}ms (Attempt ${attempt}/${MAX_RETRIES})...`);
        await sleep(retryAfter);
        continue;
      }

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        if (attempt === MAX_RETRIES) {
          console.warn(`[TMDB Error] HTTP ${response.status} for tmdbId ${tmdbId}`);
          return null;
        }
        await sleep(attempt * 400);
        continue;
      }

      const data = (await response.json()) as TmdbTvDetailResponse;
      return data;
    } catch (err: any) {
      if (attempt === MAX_RETRIES) {
        console.warn(`[TMDB Network Error] tmdbId ${tmdbId}: ${err?.message || err}`);
        return null;
      }
      await sleep(attempt * 400);
    }
  }

  return null;
}

async function main() {
  const isApply = process.argv.includes("--apply");

  console.log("===============================================================");
  console.log("FILMPRINT — TV SHOW TMDB IMAGE REFRESH SCRIPT");
  console.log(`Execution Mode: ${isApply ? "🚀 APPLY (Live Database Updates)" : "🔍 DRY-RUN (Simulation Only)"}`);
  console.log("===============================================================\n");

  // 1. Resolve API Key
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    console.error("❌ ERROR: TMDB API Key not found.");
    console.error("Please set TMDB_API_KEY environment variable or configure it via the admin panel.\n");
    process.exit(1);
  }
  console.log(`✓ TMDB API Key resolved successfully (Key length: ${apiKey.length} chars). [Key Value Hidden]`);

  // 2. Fetch TvShows from Database
  console.log("Fetching all TvShow records from database...");
  const tvShows = await db.tvShow.findMany({
    select: {
      id: true,
      tmdbId: true,
      name: true,
      posterPath: true,
      backdropPath: true,
    },
    orderBy: { tmdbId: "asc" },
  });

  const totalCount = tvShows.length;
  console.log(`Found ${totalCount} TvShow records in database.\n`);

  if (totalCount === 0) {
    console.log("No TvShow records found. Exiting.");
    await db.$disconnect();
    return;
  }

  const summary: ScriptSummary = {
    total: totalCount,
    wouldUpdate: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    sampleChanges: [],
  };

  console.log(`Starting image audit & refresh across ${totalCount} titles (Concurrency: ${CONCURRENCY})...`);
  const startTime = Date.now();
  let processedCount = 0;

  // Process in controlled concurrent chunks
  for (let i = 0; i < totalCount; i += CONCURRENCY) {
    const chunk = tvShows.slice(i, i + CONCURRENCY);

    await Promise.all(
      chunk.map(async (show) => {
        if (!show.tmdbId || show.tmdbId <= 0) {
          summary.failed++;
          return;
        }

        const tmdbData = await fetchTmdbTvDetails(show.tmdbId, apiKey);

        if (!tmdbData) {
          summary.failed++;
          return;
        }

        // Determine target posterPath
        let newPosterPath: string | null = null;
        if (tmdbData.poster_path && typeof tmdbData.poster_path === "string" && tmdbData.poster_path.startsWith("/")) {
          const trimmed = tmdbData.poster_path.trim();
          newPosterPath = isValidTmdbImagePath(trimmed) ? trimmed : null;
        } else {
          // If TMDB returns null, keep existing if valid, otherwise purge fake slug
          newPosterPath = isValidTmdbImagePath(show.posterPath) ? show.posterPath : null;
        }

        // Determine target backdropPath
        let newBackdropPath: string | null = null;
        if (tmdbData.backdrop_path && typeof tmdbData.backdrop_path === "string" && tmdbData.backdrop_path.startsWith("/")) {
          const trimmed = tmdbData.backdrop_path.trim();
          newBackdropPath = isValidTmdbImagePath(trimmed) ? trimmed : null;
        } else {
          // If TMDB returns null, keep existing if valid, otherwise purge fake slug
          newBackdropPath = isValidTmdbImagePath(show.backdropPath) ? show.backdropPath : null;
        }

        const currentPosterNorm = show.posterPath ? show.posterPath.trim() : null;
        const currentBackdropNorm = show.backdropPath ? show.backdropPath.trim() : null;

        const posterChanged = currentPosterNorm !== newPosterPath;
        const backdropChanged = currentBackdropNorm !== newBackdropPath;

        if (posterChanged || backdropChanged) {
          if (isApply) {
            try {
              await db.tvShow.update({
                where: { id: show.id },
                data: {
                  posterPath: newPosterPath,
                  backdropPath: newBackdropPath,
                },
              });
              summary.updated++;
            } catch (dbErr: any) {
              console.error(`[DB Update Error] Failed to update '${show.name}' (${show.tmdbId}):`, dbErr?.message || dbErr);
              summary.failed++;
              return;
            }
          } else {
            summary.wouldUpdate++;
          }

          if (summary.sampleChanges.length < 20) {
            summary.sampleChanges.push({
              name: show.name,
              tmdbId: show.tmdbId,
              oldPoster: currentPosterNorm,
              newPoster: newPosterPath,
              oldBackdrop: currentBackdropNorm,
              newBackdrop: newBackdropPath,
            });
          }
        } else {
          summary.skipped++;
        }
      })
    );

    processedCount += chunk.length;
    if (processedCount % 100 === 0 || processedCount >= totalCount) {
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      const pct = ((processedCount / totalCount) * 100).toFixed(1);
      console.log(`[Progress ${pct}%] Processed ${processedCount}/${totalCount} titles (${elapsedSec}s elapsed)...`);
    }

    if (i + CONCURRENCY < totalCount) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // 3. Print Summary Report
  console.log("\n===============================================================");
  console.log("REFRESH SUMMARY REPORT");
  console.log("===============================================================");
  console.log(`Execution Mode : ${isApply ? "APPLY (Database Updated)" : "DRY-RUN (Simulated)"}`);
  console.log(`Total TvShows  : ${summary.total}`);
  if (isApply) {
    console.log(`Updated        : ${summary.updated}`);
  } else {
    console.log(`Would Update   : ${summary.wouldUpdate}`);
  }
  console.log(`Skipped (Same) : ${summary.skipped}`);
  console.log(`Failed / 404   : ${summary.failed}`);
  console.log(`Elapsed Time   : ${totalTimeSec}s`);
  console.log("---------------------------------------------------------------");

  if (summary.sampleChanges.length > 0) {
    console.log(`\nSample Changes (First ${summary.sampleChanges.length} titles):`);
    summary.sampleChanges.forEach((s, idx) => {
      console.log(`\n[${idx + 1}] ${s.name} (TMDB ID: ${s.tmdbId})`);
      if (s.oldPoster !== s.newPoster) {
        console.log(`    Poster   : "${s.oldPoster}" -> "${s.newPoster}"`);
      } else {
        console.log(`    Poster   : "${s.newPoster}" (Unchanged)`);
      }
      if (s.oldBackdrop !== s.newBackdrop) {
        console.log(`    Backdrop : "${s.oldBackdrop}" -> "${s.newBackdrop}"`);
      } else {
        console.log(`    Backdrop : "${s.newBackdrop}" (Unchanged)`);
      }
    });
  } else {
    console.log("\nNo changes required. All TvShow image paths are up-to-date and authentic.");
  }

  console.log("\n===============================================================");
  if (!isApply) {
    console.log("NOTE: This was a DRY-RUN. No changes were committed to database.");
    console.log("To apply these changes on the live database, run:");
    console.log("  npx tsx scripts/refresh-tv-images.ts --apply");
  } else {
    console.log("✅ All changes successfully applied to database.");
  }
  console.log("===============================================================\n");

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("Fatal Error in refresh-tv-images:", e);
  await db.$disconnect();
  process.exit(1);
});
