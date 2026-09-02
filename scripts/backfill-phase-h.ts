import { db } from "@/lib/db/client";
import { resolveCanonicalGenreIds } from "@/lib/catalog/genres";
import { evaluateContentSafety, pickTmdbCertification } from "@/lib/content/safety";
import {
  computeCalibrationPriorityScore,
  generateSearchNormalizedTitle,
} from "@/lib/calibration/priority";
import { MediaType, BackfillJobStatus, ContentSafetyLevel } from "@prisma/client";

const BATCH_SIZE = 500;
const JOB_TYPE = "SAFETY_PRIORITY_GENRE_V1";

export interface BackfillStats {
  processed: number;
  updated: number;
  safe: number;
  mature: number;
  blocked: number;
  unknown: number;
  errors: number;
}

/**
 * Resolves whether a legacy catalog record has an explicit adult signal.
 *
 * Invariants:
 * 1. Physical adult=true is preserved and never downgraded to false.
 * 2. If legacy metadata contains explicit adult=true (meta.adult, meta.raw_tmdb.adult, etc.), resolves true.
 * 3. Never infers adult=true from missing or unknown data.
 */
export function resolveLegacyAdultSignal(
  physicalAdult: boolean | null | undefined,
  metadata: Record<string, unknown> | null | undefined
): boolean {
  if (physicalAdult === true) {
    return true;
  }

  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  if (metadata.adult === true) {
    return true;
  }

  const rawTmdb = (metadata.raw_tmdb || metadata.rawTmdb || metadata.tmdb) as Record<string, unknown> | undefined;
  if (rawTmdb && typeof rawTmdb === "object" && rawTmdb.adult === true) {
    return true;
  }

  return false;
}

async function getOrCreateJob(mediaType: MediaType) {
  return await db.catalogBackfillJob.upsert({
    where: {
      jobType_mediaType: {
        jobType: JOB_TYPE,
        mediaType,
      },
    },
    update: {
      lastRunAt: new Date(),
      status: BackfillJobStatus.RUNNING,
    },
    create: {
      jobType: JOB_TYPE,
      mediaType,
      status: BackfillJobStatus.RUNNING,
      startedAt: new Date(),
      lastRunAt: new Date(),
    },
  });
}

async function backfillMovies() {
  console.log("=== Starting Movie Backfill ===");
  const job = await getOrCreateJob(MediaType.FILM);
  let skip = job.lastCursor;
  let hasMore = true;

  const stats: BackfillStats = {
    processed: job.processedCount,
    updated: job.updatedCount,
    safe: job.safeCount,
    mature: job.matureCount,
    blocked: job.blockedCount,
    unknown: job.unknownCount,
    errors: job.errorCount,
  };

  while (hasMore) {
    const movies = await db.movie.findMany({
      skip,
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      select: {
        id: true,
        tmdbId: true,
        title: true,
        originalTitle: true,
        releaseYear: true,
        popularity: true,
        voteAverage: true,
        voteCount: true,
        adult: true,
        genreIds: true,
        metadata: true,
      },
    });

    if (movies.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing movie batch: offset ${skip}, count ${movies.length}`);

    for (const m of movies) {
      try {
        const meta = (m.metadata as Record<string, unknown>) || {};
        const rawGenres = (meta.genres as string[]) || [];

        // 1. Resolve canonical genre IDs
        const canonicalGenreIds = resolveCanonicalGenreIds(rawGenres, "FILM");

        // 2. Resolve adult signal & certification & content safety
        const resolvedAdult = resolveLegacyAdultSignal(m.adult, meta);
        const cert = pickTmdbCertification(meta, "FILM");
        const safetyResult = evaluateContentSafety({
          adult: resolvedAdult,
          contentRating: cert.contentRating,
          normalizedMinimumAge: cert.normalizedMinimumAge,
          title: m.title,
          originalTitle: m.originalTitle,
          englishTitle: (meta.englishTitle as string) || null,
          overview: (meta.overview as string) || "",
          genres: canonicalGenreIds,
        });

        // 3. Compute priority score & search title
        const voteCount = m.voteCount || (meta.voteCount as number) || 0;
        const priorityScore = computeCalibrationPriorityScore({
          popularity: m.popularity,
          voteAverage: m.voteAverage,
          voteCount,
          releaseYear: m.releaseYear,
          safetyLevel: safetyResult.safetyLevel,
          normalizedMinimumAge: safetyResult.normalizedMinimumAge,
          adult: resolvedAdult,
        });

        const searchNormalizedTitle = generateSearchNormalizedTitle(
          m.title,
          m.originalTitle,
          (meta.englishTitle as string) || null
        );

        // 4. Update movie record (persisting resolved adult)
        await db.movie.update({
          where: { id: m.id },
          data: {
            genreIds: canonicalGenreIds,
            voteCount,
            adult: resolvedAdult,
            contentRating: safetyResult.contentRating,
            normalizedMinimumAge: safetyResult.normalizedMinimumAge,
            safetyLevel: safetyResult.safetyLevel,
            calibrationPriorityScore: priorityScore,
            searchNormalizedTitle,
          },
        });

        stats.updated++;
        if (safetyResult.safetyLevel === ContentSafetyLevel.SAFE) {
          stats.safe++;
        } else if (safetyResult.safetyLevel === ContentSafetyLevel.MATURE) {
          stats.mature++;
        } else if (safetyResult.safetyLevel === ContentSafetyLevel.UNKNOWN) {
          stats.unknown++;
        } else if (
          safetyResult.safetyLevel === ContentSafetyLevel.SEXUAL_CONTENT ||
          safetyResult.safetyLevel === ContentSafetyLevel.EROTIC ||
          safetyResult.safetyLevel === ContentSafetyLevel.ADULT
        ) {
          stats.blocked++;
        }
      } catch (err: any) {
        stats.errors++;
        console.error(`Error updating movie ${m.id}:`, err?.message);
      }
      stats.processed++;
    }

    skip += movies.length;

    // Update job state checkpoint
    await db.catalogBackfillJob.update({
      where: { id: job.id },
      data: {
        lastCursor: skip,
        processedCount: stats.processed,
        updatedCount: stats.updated,
        safeCount: stats.safe,
        matureCount: stats.mature,
        blockedCount: stats.blocked,
        unknownCount: stats.unknown,
        errorCount: stats.errors,
        lastRunAt: new Date(),
      },
    });

    if (movies.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  const totalCatalog = await db.movie.count();
  const searchPopulated = await db.movie.count({ where: { searchNormalizedTitle: { not: "" } } });
  const genrePopulated = await db.movie.count({ where: { NOT: { genreIds: { equals: [] } } } });

  const searchCoverage = totalCatalog > 0 ? searchPopulated / totalCatalog : 0;
  const genreCoverage = totalCatalog > 0 ? genrePopulated / totalCatalog : 0;

  await db.catalogBackfillJob.update({
    where: { id: job.id },
    data: {
      status: BackfillJobStatus.COMPLETED,
      completedAt: new Date(),
      metadata: {
        totalCatalog,
        searchCoverage,
        genreCoverage,
      },
    },
  });

  console.log("=== Movie Backfill Completed ===", {
    ...stats,
    totalCatalog,
    searchCoverage: `${(searchCoverage * 100).toFixed(1)}%`,
    genreCoverage: `${(genreCoverage * 100).toFixed(1)}%`,
  });
}

async function backfillTvShows() {
  console.log("=== Starting TV Show Backfill ===");
  const job = await getOrCreateJob(MediaType.TV);
  let skip = job.lastCursor;
  let hasMore = true;

  const stats: BackfillStats = {
    processed: job.processedCount,
    updated: job.updatedCount,
    safe: job.safeCount,
    mature: job.matureCount,
    blocked: job.blockedCount,
    unknown: job.unknownCount,
    errors: job.errorCount,
  };

  while (hasMore) {
    const shows = await db.tvShow.findMany({
      skip,
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      select: {
        id: true,
        tmdbId: true,
        name: true,
        originalName: true,
        firstAirDate: true,
        popularity: true,
        voteAverage: true,
        voteCount: true,
        adult: true,
        genreIds: true,
        metadata: true,
      },
    });

    if (shows.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing TV batch: offset ${skip}, count ${shows.length}`);

    for (const s of shows) {
      try {
        const meta = (s.metadata as Record<string, unknown>) || {};
        const rawGenres = (meta.genres as string[]) || [];

        // 1. Resolve canonical genre IDs
        const canonicalGenreIds = resolveCanonicalGenreIds(rawGenres, "TV");

        // 2. Resolve adult signal & certification & content safety
        const resolvedAdult = resolveLegacyAdultSignal(s.adult, meta);
        const cert = pickTmdbCertification(meta, "TV");
        const safetyResult = evaluateContentSafety({
          adult: resolvedAdult,
          contentRating: cert.contentRating,
          normalizedMinimumAge: cert.normalizedMinimumAge,
          title: s.name,
          originalTitle: s.originalName,
          englishTitle: (meta.englishTitle as string) || null,
          overview: (meta.overview as string) || "",
          genres: canonicalGenreIds,
        });

        const firstAirYear = s.firstAirDate
          ? parseInt(s.firstAirDate.substring(0, 4), 10)
          : null;

        const voteCount = s.voteCount || (meta.voteCount as number) || 0;
        const priorityScore = computeCalibrationPriorityScore({
          popularity: s.popularity,
          voteAverage: s.voteAverage,
          voteCount,
          releaseYear: firstAirYear && !isNaN(firstAirYear) ? firstAirYear : null,
          safetyLevel: safetyResult.safetyLevel,
          normalizedMinimumAge: safetyResult.normalizedMinimumAge,
          adult: resolvedAdult,
        });

        const searchNormalizedTitle = generateSearchNormalizedTitle(
          s.name,
          s.originalName,
          (meta.englishTitle as string) || null
        );

        // 3. Update TV show record (persisting resolved adult)
        await db.tvShow.update({
          where: { id: s.id },
          data: {
            genreIds: canonicalGenreIds,
            voteCount,
            adult: resolvedAdult,
            firstAirYear: firstAirYear && !isNaN(firstAirYear) ? firstAirYear : null,
            contentRating: safetyResult.contentRating,
            normalizedMinimumAge: safetyResult.normalizedMinimumAge,
            safetyLevel: safetyResult.safetyLevel,
            calibrationPriorityScore: priorityScore,
            searchNormalizedTitle,
          },
        });

        stats.updated++;
        if (safetyResult.safetyLevel === ContentSafetyLevel.SAFE) {
          stats.safe++;
        } else if (safetyResult.safetyLevel === ContentSafetyLevel.MATURE) {
          stats.mature++;
        } else if (safetyResult.safetyLevel === ContentSafetyLevel.UNKNOWN) {
          stats.unknown++;
        } else if (
          safetyResult.safetyLevel === ContentSafetyLevel.SEXUAL_CONTENT ||
          safetyResult.safetyLevel === ContentSafetyLevel.EROTIC ||
          safetyResult.safetyLevel === ContentSafetyLevel.ADULT
        ) {
          stats.blocked++;
        }
      } catch (err: any) {
        stats.errors++;
        console.error(`Error updating TV show ${s.id}:`, err?.message);
      }
      stats.processed++;
    }

    skip += shows.length;

    // Update job checkpoint
    await db.catalogBackfillJob.update({
      where: { id: job.id },
      data: {
        lastCursor: skip,
        processedCount: stats.processed,
        updatedCount: stats.updated,
        safeCount: stats.safe,
        matureCount: stats.mature,
        blockedCount: stats.blocked,
        unknownCount: stats.unknown,
        errorCount: stats.errors,
        lastRunAt: new Date(),
      },
    });

    if (shows.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  const totalCatalog = await db.tvShow.count();
  const searchPopulated = await db.tvShow.count({ where: { searchNormalizedTitle: { not: "" } } });
  const genrePopulated = await db.tvShow.count({ where: { NOT: { genreIds: { equals: [] } } } });

  const searchCoverage = totalCatalog > 0 ? searchPopulated / totalCatalog : 0;
  const genreCoverage = totalCatalog > 0 ? genrePopulated / totalCatalog : 0;

  await db.catalogBackfillJob.update({
    where: { id: job.id },
    data: {
      status: BackfillJobStatus.COMPLETED,
      completedAt: new Date(),
      metadata: {
        totalCatalog,
        searchCoverage,
        genreCoverage,
      },
    },
  });

  console.log("=== TV Show Backfill Completed ===", {
    ...stats,
    totalCatalog,
    searchCoverage: `${(searchCoverage * 100).toFixed(1)}%`,
    genreCoverage: `${(genreCoverage * 100).toFixed(1)}%`,
  });
}

async function main() {
  const target = process.argv[2]?.toUpperCase();
  if (target === "TV") {
    await backfillTvShows();
  } else if (target === "FILM" || target === "MOVIE") {
    await backfillMovies();
  } else {
    await backfillMovies();
    await backfillTvShows();
  }
}

if (typeof require !== "undefined" && require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Backfill failed:", err);
      process.exit(1);
    });
}
