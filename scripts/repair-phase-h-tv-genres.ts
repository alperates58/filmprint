import { db } from "@/lib/db/client";
import { resolveCanonicalGenreIds } from "@/lib/catalog/genres";
import { MediaType } from "@prisma/client";

const BATCH_SIZE = 500;
const JOB_TYPE = "SAFETY_PRIORITY_GENRE_V1";

export interface TvGenreRepairStats {
  examined: number;
  repaired: number;
  stillUnresolved: number;
  errors: number;
  totalCatalog: number;
  genrePopulated: number;
  genreCoverage: number;
}

export async function repairTvGenres(): Promise<TvGenreRepairStats> {
  console.log("=== Starting Targeted TV Genre Alias Repair ===");

  const stats: TvGenreRepairStats = {
    examined: 0,
    repaired: 0,
    stillUnresolved: 0,
    errors: 0,
    totalCatalog: 0,
    genrePopulated: 0,
    genreCoverage: 0,
  };

  let lastId: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const whereClause: any = { genreIds: { equals: [] } };
    if (lastId) {
      whereClause.id = { gt: lastId };
    }

    const candidates: Array<{
      id: string;
      tmdbId: number;
      name: string;
      metadata: any;
    }> = await db.tvShow.findMany({
      where: whereClause,
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      select: {
        id: true,
        tmdbId: true,
        name: true,
        metadata: true,
      },
    });

    if (candidates.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing TV repair batch: lastId=${lastId || "START"}, count=${candidates.length}`);

    // Update keyset cursor to the last fetched record in this batch
    lastId = candidates[candidates.length - 1].id;

    for (const show of candidates) {
      stats.examined++;
      try {
        const meta = (show.metadata as Record<string, unknown>) || {};
        const rawGenres = (meta.genres as any[]) || [];
        const rawGenreIds = (meta.genre_ids as any[]) || (meta.genreIds as any[]) || [];

        // If metadata has no genre data at all, record unresolved and continue
        if (rawGenres.length === 0 && rawGenreIds.length === 0) {
          stats.stillUnresolved++;
          continue;
        }

        const inputGenres = [...rawGenreIds, ...rawGenres];
        const resolvedIds = resolveCanonicalGenreIds(inputGenres, "TV");

        if (resolvedIds.length > 0) {
          await db.tvShow.update({
            where: { id: show.id },
            data: {
              genreIds: resolvedIds,
            },
          });
          stats.repaired++;
        } else {
          stats.stillUnresolved++;
        }
      } catch (err: any) {
        stats.errors++;
        console.error(`Error repairing TV show ${show.id}:`, err?.message);
      }
    }

    if (candidates.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  // Calculate final catalog-level TV genre coverage
  stats.totalCatalog = await db.tvShow.count();
  stats.genrePopulated = await db.tvShow.count({
    where: { NOT: { genreIds: { equals: [] } } },
  });
  stats.genreCoverage =
    stats.totalCatalog > 0 ? stats.genrePopulated / stats.totalCatalog : 0;

  // Update existing TV CatalogBackfillJob metadata without resetting counters
  const existingJob = await db.catalogBackfillJob.findUnique({
    where: {
      jobType_mediaType: {
        jobType: JOB_TYPE,
        mediaType: MediaType.TV,
      },
    },
  });

  if (existingJob) {
    const existingMeta =
      existingJob.metadata && typeof existingJob.metadata === "object"
        ? (existingJob.metadata as Record<string, unknown>)
        : {};

    await db.catalogBackfillJob.update({
      where: { id: existingJob.id },
      data: {
        metadata: {
          ...existingMeta,
          totalCatalog: stats.totalCatalog,
          genreCoverage: stats.genreCoverage,
          lastRepairedAt: new Date().toISOString(),
          repairedGenreCount: stats.repaired,
        },
      },
    });
  }

  console.log("=== TV Genre Alias Repair Completed ===", {
    examined: stats.examined,
    repaired: stats.repaired,
    stillUnresolved: stats.stillUnresolved,
    errors: stats.errors,
    totalCatalog: stats.totalCatalog,
    genrePopulated: stats.genrePopulated,
    genreCoverage: `${(stats.genreCoverage * 100).toFixed(1)}%`,
  });

  return stats;
}

if (require.main === module) {
  repairTvGenres()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("TV Genre repair script failed:", err);
      process.exit(1);
    });
}
