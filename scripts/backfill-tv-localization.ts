/**
 * Repairs missing/placeholder TV overviews and invalid display titles.
 *
 * Default is dry-run. Production execution is intentionally manual:
 *   npm run backfill:tv-localization -- --dry-run --limit=159
 *   npm run backfill:tv-localization -- --apply --limit=159 --batch-size=5 --delay-ms=500
 */
import { db } from "../lib/db/client";
import { getTMDBApiKey } from "../lib/config/service";
import { evaluateContentIngestionSafety } from "../lib/content/ingestion-safety";
import { isMeaningfulOverview } from "../lib/content/overview-safety";
import { isDisplayTitleAllowed } from "../lib/content/title-safety";
import { fetchLocalizedTmdbTvShow } from "../lib/tmdb/tv/localization";
import { fetchTmdbTvJson, type TmdbTvRequestMetrics } from "../lib/tmdb/tv/replenishment";
import type { TMDBTvShow } from "../lib/tmdb/tv/types";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

interface BackfillReport {
  processed: number;
  wouldUpdate: number;
  updated: number;
  overviewFromTurkish: number;
  overviewFromEnglish: number;
  titleFromTurkish: number;
  titleFromEnglish: number;
  titleFromOriginal: number;
  stillMissingOverview: number;
  invalidDisplayTitle: number;
  unsafeContent: number;
  failed: number;
  rateLimited429: number;
}

function positiveIntegerOption(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function resolveApiKey(): Promise<string> {
  const configured = await getTMDBApiKey();
  return configured || process.env.TMDB_API_KEY || "";
}

async function main() {
  const apply = process.argv.includes("--apply") && !process.argv.includes("--dry-run");
  const limit = positiveIntegerOption("limit", 500);
  const batchSize = positiveIntegerOption("batch-size", 5);
  const delayMs = positiveIntegerOption("delay-ms", 500);
  const apiKey = await resolveApiKey();

  if (!apiKey) throw new Error("TMDB API key is not configured");

  const rows = await db.tvShow.findMany({
    orderBy: { tmdbId: "asc" },
    select: {
      id: true,
      tmdbId: true,
      name: true,
      originalName: true,
      overview: true,
      metadata: true,
    },
  });
  const candidates = rows
    .filter((row) => !isMeaningfulOverview(row.overview) || !isDisplayTitleAllowed(row.name))
    .slice(0, limit);

  const metrics: TmdbTvRequestMetrics = {
    httpAttempts: 0,
    retries: 0,
    rateLimited: 0,
    failures: 0,
  };
  const report: BackfillReport = {
    processed: 0,
    wouldUpdate: 0,
    updated: 0,
    overviewFromTurkish: 0,
    overviewFromEnglish: 0,
    titleFromTurkish: 0,
    titleFromEnglish: 0,
    titleFromOriginal: 0,
    stillMissingOverview: 0,
    invalidDisplayTitle: 0,
    unsafeContent: 0,
    failed: 0,
    rateLimited429: 0,
  };

  for (let offset = 0; offset < candidates.length; offset += batchSize) {
    const batch = candidates.slice(offset, offset + batchSize);
    await Promise.all(
      batch.map(async (row) => {
        report.processed++;
        try {
          const localized = await fetchLocalizedTmdbTvShow((language) =>
            fetchTmdbTvJson<TMDBTvShow>(
              `${TMDB_API_BASE}/tv/${row.tmdbId}?api_key=${apiKey}&language=${language}`,
              { metrics }
            )
          );
          const safety = evaluateContentIngestionSafety({
            localizedTitle: localized.turkishTitle,
            englishTitle: localized.englishTitle,
            originalTitle: localized.show.original_name,
            overview: localized.show.overview,
            adult: localized.show.adult,
          });

          if (localized.overviewSource === "TR") report.overviewFromTurkish++;
          if (localized.overviewSource === "EN") report.overviewFromEnglish++;
          if (localized.titleSource === "TR") report.titleFromTurkish++;
          if (localized.titleSource === "EN") report.titleFromEnglish++;
          if (localized.titleSource === "ORIGINAL") report.titleFromOriginal++;
          if (!isMeaningfulOverview(localized.show.overview)) report.stillMissingOverview++;

          if (!safety.displayTitle) {
            report.invalidDisplayTitle++;
            return;
          }
          if (
            safety.reasons.includes("ADULT_FLAG") ||
            safety.reasons.includes("EXPLICIT_ADULT_KEYWORD")
          ) {
            report.unsafeContent++;
            return;
          }

          const nextName = safety.displayTitle.title;
          const nextOverview = localized.show.overview || "";
          const nextOriginalName = localized.show.original_name || row.originalName;
          const changed =
            nextName !== row.name ||
            nextOverview !== row.overview ||
            nextOriginalName !== row.originalName;
          if (!changed) return;

          report.wouldUpdate++;
          if (!apply) return;

          const metadata =
            row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
              ? (row.metadata as Record<string, unknown>)
              : {};
          await db.tvShow.update({
            where: { id: row.id },
            data: {
              name: nextName,
              originalName: nextOriginalName,
              overview: nextOverview,
              metadata: {
                ...metadata,
                overview: nextOverview,
                adult: localized.show.adult === true,
                titleLocalizationSource: localized.titleSource,
                overviewLocalizationSource: localized.overviewSource,
                turkishTitle: localized.turkishTitle,
                englishTitle: localized.englishTitle,
              },
            },
          });
          report.updated++;
        } catch {
          report.failed++;
        }
      })
    );

    if (offset + batchSize < candidates.length) await sleep(delayMs);
  }

  report.rateLimited429 = metrics.rateLimited;
  console.log(
    JSON.stringify(
      {
        mode: apply ? "APPLY" : "DRY_RUN",
        options: { limit, batchSize, delayMs },
        candidates: candidates.length,
        ...report,
        "429": report.rateLimited429,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("TV localization backfill failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
