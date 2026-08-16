/**
 * Repairs only Movie rows with missing/placeholder overview or invalid display title.
 * Default mode is dry-run; use --apply explicitly for writes.
 */
import { db } from "../lib/db/client";
import { getTMDBApiKey } from "../lib/config/service";
import { evaluateContentIngestionSafety } from "../lib/content/ingestion-safety";
import { isMeaningfulOverview } from "../lib/content/overview-safety";
import { isDisplayTitleAllowed } from "../lib/content/title-safety";
import { localizeTmdbMovie } from "../lib/tmdb/movie-localization";
import { fetchTmdbTvJson, type TmdbTvRequestMetrics } from "../lib/tmdb/tv/replenishment";
import type { TMDBMovie } from "../lib/tmdb/client";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

function option(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function metadataOverview(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const overview = (metadata as Record<string, unknown>).overview;
  return typeof overview === "string" ? overview : "";
}

async function main() {
  const apply = process.argv.includes("--apply") && !process.argv.includes("--dry-run");
  const limit = option("limit", 500);
  const batchSize = option("batch-size", 5);
  const delayMs = option("delay-ms", 500);
  const apiKey = (await getTMDBApiKey()) || process.env.TMDB_API_KEY || "";
  if (!apiKey) throw new Error("TMDB API key is not configured");

  const rows = await db.movie.findMany({
    orderBy: { tmdbId: "asc" },
    select: { id: true, tmdbId: true, title: true, originalTitle: true, metadata: true },
  });
  const candidates = rows
    .filter(
      (row) =>
        !isMeaningfulOverview(metadataOverview(row.metadata)) ||
        !isDisplayTitleAllowed(row.title)
    )
    .slice(0, limit);

  const metrics: TmdbTvRequestMetrics = {
    httpAttempts: 0,
    retries: 0,
    rateLimited: 0,
    failures: 0,
  };
  const report = {
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
  };

  for (let offset = 0; offset < candidates.length; offset += batchSize) {
    const batch = candidates.slice(offset, offset + batchSize);
    await Promise.all(
      batch.map(async (row) => {
        report.processed++;
        try {
          const turkish = await fetchTmdbTvJson<TMDBMovie>(
            `${TMDB_API_BASE}/movie/${row.tmdbId}?api_key=${apiKey}&language=tr-TR`,
            { metrics }
          );
          const localized = await localizeTmdbMovie(turkish, () =>
            fetchTmdbTvJson<TMDBMovie>(
              `${TMDB_API_BASE}/movie/${row.tmdbId}?api_key=${apiKey}&language=en-US`,
              { metrics }
            )
          );
          const safety = evaluateContentIngestionSafety({
            localizedTitle: localized.turkishTitle,
            englishTitle: localized.englishTitle,
            originalTitle: localized.movie.original_title,
            overview: localized.movie.overview,
            adult: localized.movie.adult,
          });

          if (localized.overviewSource === "TR") report.overviewFromTurkish++;
          if (localized.overviewSource === "EN") report.overviewFromEnglish++;
          if (localized.titleSource === "TR") report.titleFromTurkish++;
          if (localized.titleSource === "EN") report.titleFromEnglish++;
          if (localized.titleSource === "ORIGINAL") report.titleFromOriginal++;
          if (!isMeaningfulOverview(localized.movie.overview)) report.stillMissingOverview++;
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

          const previousMetadata =
            row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
              ? (row.metadata as Record<string, unknown>)
              : {};
          const overview = localized.movie.overview || "";
          const title = safety.displayTitle.title;
          const originalTitle = localized.movie.original_title || row.originalTitle;
          const changed =
            title !== row.title ||
            originalTitle !== row.originalTitle ||
            overview !== metadataOverview(row.metadata);
          if (!changed) return;

          report.wouldUpdate++;
          if (!apply) return;
          await db.movie.update({
            where: { id: row.id },
            data: {
              title,
              originalTitle,
              metadata: {
                ...previousMetadata,
                overview,
                adult: localized.movie.adult === true,
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

  console.log(
    JSON.stringify(
      {
        mode: apply ? "APPLY" : "DRY_RUN",
        options: { limit, batchSize, delayMs },
        candidates: candidates.length,
        ...report,
        "429": metrics.rateLimited,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Movie localization backfill failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
