import { db } from "@/lib/db/client";
import { evaluateContentIngestionSafety } from "@/lib/content/ingestion-safety";
import { isMeaningfulOverview, normalizeOverviewForPersistence } from "@/lib/content/overview-safety";
import { isDisplayTitleAllowed } from "@/lib/content/title-safety";
import { localizeTmdbMovie, mergeTmdbMovieLocalization, type LocalizedTmdbMovie } from "@/lib/tmdb/movie-localization";
import { fetchLocalizedTmdbTvShow, localizeTmdbTvShow, mergeTmdbTvLocalization, type LocalizedTmdbTvShow } from "@/lib/tmdb/tv/localization";
import { tmdbClient, type TMDBMovie } from "@/lib/tmdb/client";
import { tmdbTvClient } from "@/lib/tmdb/tv/client";
import type { TMDBTvShow } from "@/lib/tmdb/tv/types";
import {
  sharedCatalogLimiter,
  parseRetryAfterHeader,
  calculateExponentialBackoff,
  sleep,
} from "./rate-limiter";
import type { CatalogCircuitBreaker } from "./circuit-breaker";
import type {
  CandidateProcessingResult,
  CandidateProcessingOutcome,
  DiscoveryCandidate,
  MediaType,
} from "./types";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const HTTP_TIMEOUT_MS = 9_000;

interface FetchOptions {
  apiKey: string;
  workerKey: string;
  circuitBreaker: CatalogCircuitBreaker;
}

async function fetchWithTimeout(url: string, timeoutMs: number = HTTP_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "Filmprint-Catalog-Ingestion/1.0" },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function processCandidate(
  candidate: DiscoveryCandidate,
  options: {
    dryRun?: boolean;
    staleDays?: number;
    circuitBreaker: CatalogCircuitBreaker;
    apiKey: string;
    workerKey: string;
  }
): Promise<CandidateProcessingResult> {
  const startTime = Date.now();
  const { tmdbId, mediaType } = candidate;
  const staleDays = options.staleDays || 180;
  const staleThreshold = new Date(Date.now() - staleDays * 86_400_000);

  // 1. Check Candidate Cache State in Database
  const candidateState = await db.catalogCandidateState.findUnique({
    where: {
      mediaType_tmdbId: { mediaType, tmdbId },
    },
  });

  if (candidateState) {
    // If already imported: skip unless stale in maintenance mode
    if (candidateState.status === "IMPORTED") {
      if (candidateState.updatedAt > staleThreshold) {
        return {
          tmdbId,
          mediaType,
          outcome: "SKIPPED_ALREADY_IMPORTED",
          durationMs: Date.now() - startTime,
          httpAttempts: 0,
          rateLimited: false,
        };
      }
    }

    // Permanent Rejection Cache: Avoid repeating API calls for known bad items
    const permanentRejectionStatuses = [
      "REJECTED",
      "NOT_FOUND",
      "ADULT",
      "UNSAFE",
      "NO_USABLE_TITLE",
      "NO_OVERVIEW",
    ];
    if (permanentRejectionStatuses.includes(candidateState.status)) {
      return {
        tmdbId,
        mediaType,
        outcome: "SKIPPED_PERMANENT_REJECTION",
        reason: candidateState.reason || candidateState.status,
        durationMs: Date.now() - startTime,
        httpAttempts: 0,
        rateLimited: false,
      };
    }

    // Retryable Failure Lock: Skip if retryAfter is still in the future
    if (
      candidateState.status === "FAILED_RETRYABLE" &&
      candidateState.retryAfter &&
      candidateState.retryAfter > new Date()
    ) {
      return {
        tmdbId,
        mediaType,
        outcome: "SKIPPED_RETRY_LOCKED",
        durationMs: Date.now() - startTime,
        httpAttempts: 0,
        rateLimited: false,
      };
    }
  }

  // 2. Pre-fetch Adult Flag evaluation (from discovery feed)
  if (candidate.adult === true) {
    if (!options.dryRun) {
      await db.catalogCandidateState.upsert({
        where: { mediaType_tmdbId: { mediaType, tmdbId } },
        update: { status: "ADULT", reason: "ADULT_FLAG_EXPORT", lastCheckedAt: new Date() },
        create: {
          mediaType,
          tmdbId,
          status: "ADULT",
          reason: "ADULT_FLAG_EXPORT",
          popularity: candidate.popularity,
        },
      });
    }

    return {
      tmdbId,
      mediaType,
      outcome: "REJECTED_ADULT",
      reason: "ADULT_FLAG_EXPORT",
      durationMs: Date.now() - startTime,
      httpAttempts: 0,
      rateLimited: false,
    };
  }

  // 3. Fetch Details with Token Bucket Rate Limiting & Error Handling
  let httpAttempts = 0;
  let rateLimited = false;

  const endpoint = mediaType === "FILM" ? "movie" : "tv";
  const trUrl = `${TMDB_API_BASE}/${endpoint}/${tmdbId}?api_key=${options.apiKey}&language=tr-TR`;

  let trData: any = null;

  for (let attempt = 0; attempt <= 2; attempt++) {
    httpAttempts++;
    await sharedCatalogLimiter.acquireToken(options.workerKey);

    try {
      const response = await fetchWithTimeout(trUrl);

      if (response.status === 404) {
        if (!options.dryRun) {
          await db.catalogCandidateState.upsert({
            where: { mediaType_tmdbId: { mediaType, tmdbId } },
            update: { status: "NOT_FOUND", lastCheckedAt: new Date() },
            create: { mediaType, tmdbId, status: "NOT_FOUND", popularity: candidate.popularity },
          });
        }
        return {
          tmdbId,
          mediaType,
          outcome: "NOT_FOUND",
          reason: "TMDB_404_NOT_FOUND",
          durationMs: Date.now() - startTime,
          httpAttempts,
          rateLimited,
        };
      }

      if (response.status === 429) {
        rateLimited = true;
        const retryAfterMs = parseRetryAfterHeader(response.headers.get("Retry-After"));
        sharedCatalogLimiter.reportRateLimited429(options.workerKey, retryAfterMs);

        if (attempt === 2) {
          const retryAfterDate = new Date(Date.now() + retryAfterMs);
          if (!options.dryRun) {
            await db.catalogCandidateState.upsert({
              where: { mediaType_tmdbId: { mediaType, tmdbId } },
              update: {
                status: "FAILED_RETRYABLE",
                reason: "HTTP_429_RATE_LIMITED",
                retryAfter: retryAfterDate,
                lastCheckedAt: new Date(),
                attemptCount: { increment: 1 },
              },
              create: {
                mediaType,
                tmdbId,
                status: "FAILED_RETRYABLE",
                reason: "HTTP_429_RATE_LIMITED",
                retryAfter: retryAfterDate,
                popularity: candidate.popularity,
              },
            });
          }
          return {
            tmdbId,
            mediaType,
            outcome: "FAILED_RETRYABLE",
            reason: "HTTP_429_RATE_LIMITED",
            durationMs: Date.now() - startTime,
            httpAttempts,
            rateLimited: true,
          };
        }

        await sleep(retryAfterMs);
        continue;
      }

      if (!response.ok) {
        if (response.status >= 500 && attempt < 2) {
          await sleep(calculateExponentialBackoff(attempt));
          continue;
        }

        options.circuitBreaker.recordFailure();
        if (!options.dryRun) {
          await db.catalogCandidateState.upsert({
            where: { mediaType_tmdbId: { mediaType, tmdbId } },
            update: {
              status: "FAILED_RETRYABLE",
              reason: `HTTP_${response.status}`,
              retryAfter: new Date(Date.now() + 60_000),
              lastCheckedAt: new Date(),
              attemptCount: { increment: 1 },
            },
            create: {
              mediaType,
              tmdbId,
              status: "FAILED_RETRYABLE",
              reason: `HTTP_${response.status}`,
              retryAfter: new Date(Date.now() + 60_000),
              popularity: candidate.popularity,
            },
          });
        }
        return {
          tmdbId,
          mediaType,
          outcome: "FAILED_RETRYABLE",
          reason: `HTTP_${response.status}`,
          durationMs: Date.now() - startTime,
          httpAttempts,
          rateLimited,
        };
      }

      trData = await response.json();
      break;
    } catch (error) {
      if (attempt === 2) {
        options.circuitBreaker.recordFailure();
        return {
          tmdbId,
          mediaType,
          outcome: "FAILED_RETRYABLE",
          reason: error instanceof Error ? error.message : "NETWORK_ERROR",
          durationMs: Date.now() - startTime,
          httpAttempts,
          rateLimited,
        };
      }
      await sleep(calculateExponentialBackoff(attempt));
    }
  }

  if (!trData) {
    return {
      tmdbId,
      mediaType,
      outcome: "FAILED_RETRYABLE",
      reason: "EMPTY_RESPONSE",
      durationMs: Date.now() - startTime,
      httpAttempts,
      rateLimited,
    };
  }

  // 4. Localization Fallback Handling (Movie vs TV)
  let localizedResult: {
    displayTitle: string;
    originalTitle: string;
    overview: string;
    adult: boolean;
    posterPath: string | null;
    backdropPath: string | null;
    rawItem: any;
    movieLocalization?: LocalizedTmdbMovie;
    tvLocalization?: LocalizedTmdbTvShow;
  };

  if (mediaType === "FILM") {
    const movieTr = trData as TMDBMovie;
    const needsEn = !isMeaningfulOverview(movieTr.overview) || !isDisplayTitleAllowed(movieTr.title || "");
    let movieEn: TMDBMovie | null = null;

    if (needsEn) {
      try {
        httpAttempts++;
        await sharedCatalogLimiter.acquireToken(options.workerKey);
        const enRes = await fetchWithTimeout(
          `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${options.apiKey}&language=en-US`
        );
        if (enRes.ok) {
          movieEn = (await enRes.json()) as TMDBMovie;
        }
      } catch {}
    }

    const localizedMovie = mergeTmdbMovieLocalization(movieTr, movieEn, needsEn);
    localizedResult = {
      displayTitle: localizedMovie.movie.title,
      originalTitle: localizedMovie.movie.original_title,
      overview: localizedMovie.movie.overview || "",
      adult: localizedMovie.movie.adult === true,
      posterPath: movieTr.poster_path || movieEn?.poster_path || null,
      backdropPath: movieTr.backdrop_path || movieEn?.backdrop_path || null,
      rawItem: localizedMovie.movie,
      movieLocalization: localizedMovie,
    };
  } else {
    const tvTr = trData as TMDBTvShow;
    const needsEn = !isMeaningfulOverview(tvTr.overview) || !isDisplayTitleAllowed(tvTr.name || "");
    let tvEn: TMDBTvShow | null = null;

    if (needsEn) {
      try {
        httpAttempts++;
        await sharedCatalogLimiter.acquireToken(options.workerKey);
        const enRes = await fetchWithTimeout(
          `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${options.apiKey}&language=en-US`
        );
        if (enRes.ok) {
          tvEn = (await enRes.json()) as TMDBTvShow;
        }
      } catch {}
    }

    const localizedTv = mergeTmdbTvLocalization(tvTr, tvEn, needsEn);
    localizedResult = {
      displayTitle: localizedTv.show.name,
      originalTitle: localizedTv.show.original_name || "",
      overview: localizedTv.show.overview || "",
      adult: localizedTv.show.adult === true,
      posterPath: tvTr.poster_path || tvEn?.poster_path || null,
      backdropPath: tvTr.backdrop_path || tvEn?.backdrop_path || null,
      rawItem: localizedTv.show,
      tvLocalization: localizedTv,
    };
  }

  // 5. Explicit Safety & Title Script Evaluation Gate
  const safety = evaluateContentIngestionSafety({
    localizedTitle: localizedResult.displayTitle,
    englishTitle:
      mediaType === "FILM"
        ? localizedResult.movieLocalization?.englishTitle
        : localizedResult.tvLocalization?.englishTitle,
    originalTitle: localizedResult.originalTitle,
    overview: localizedResult.overview,
    adult: localizedResult.adult,
  });

  if (!safety.allowed || !safety.displayTitle) {
    const reason = safety.reasons[0] || "CONTENT_SAFETY_REJECTED";
    let outcome: CandidateProcessingOutcome = "REJECTED_UNSAFE";

    if (reason === "ADULT_FLAG") outcome = "REJECTED_ADULT";
    else if (reason === "NON_LATIN_DISPLAY_TITLE" || reason === "MISSING_TITLE") {
      outcome = "REJECTED_NO_USABLE_TITLE";
    }

    if (!options.dryRun) {
      await db.catalogCandidateState.upsert({
        where: { mediaType_tmdbId: { mediaType, tmdbId } },
        update: {
          status: outcome === "REJECTED_ADULT" ? "ADULT" : outcome === "REJECTED_NO_USABLE_TITLE" ? "NO_USABLE_TITLE" : "UNSAFE",
          reason,
          lastCheckedAt: new Date(),
        },
        create: {
          mediaType,
          tmdbId,
          status: outcome === "REJECTED_ADULT" ? "ADULT" : outcome === "REJECTED_NO_USABLE_TITLE" ? "NO_USABLE_TITLE" : "UNSAFE",
          reason,
          popularity: candidate.popularity,
        },
      });
    }

    return {
      tmdbId,
      mediaType,
      outcome,
      title: localizedResult.displayTitle,
      reason,
      durationMs: Date.now() - startTime,
      httpAttempts,
      rateLimited,
    };
  }

  // 6. Usability & Quality Floor Gate (Valid poster & meaningful synopsis required for usable catalog)
  const hasValidPoster =
    localizedResult.posterPath !== null &&
    localizedResult.posterPath.length > 3 &&
    localizedResult.posterPath !== "null" &&
    localizedResult.posterPath !== "/null";

  if (!hasValidPoster) {
    if (!options.dryRun) {
      await db.catalogCandidateState.upsert({
        where: { mediaType_tmdbId: { mediaType, tmdbId } },
        update: { status: "REJECTED", reason: "MISSING_POSTER", lastCheckedAt: new Date() },
        create: { mediaType, tmdbId, status: "REJECTED", reason: "MISSING_POSTER", popularity: candidate.popularity },
      });
    }
    return {
      tmdbId,
      mediaType,
      outcome: "REJECTED_LOW_QUALITY",
      title: localizedResult.displayTitle,
      reason: "MISSING_POSTER",
      durationMs: Date.now() - startTime,
      httpAttempts,
      rateLimited,
    };
  }

  const hasMeaningfulOverview = isMeaningfulOverview(localizedResult.overview);
  if (!hasMeaningfulOverview) {
    if (!options.dryRun) {
      await db.catalogCandidateState.upsert({
        where: { mediaType_tmdbId: { mediaType, tmdbId } },
        update: { status: "NO_OVERVIEW", reason: "MISSING_OR_PLACEHOLDER_OVERVIEW", lastCheckedAt: new Date() },
        create: {
          mediaType,
          tmdbId,
          status: "NO_OVERVIEW",
          reason: "MISSING_OR_PLACEHOLDER_OVERVIEW",
          popularity: candidate.popularity,
        },
      });
    }
    return {
      tmdbId,
      mediaType,
      outcome: "REJECTED_NO_OVERVIEW",
      title: localizedResult.displayTitle,
      reason: "MISSING_OR_PLACEHOLDER_OVERVIEW",
      durationMs: Date.now() - startTime,
      httpAttempts,
      rateLimited,
    };
  }

  // 7. Upsert Movie / TvShow Record in Database
  let isUpdate = false;
  if (!options.dryRun) {
    if (mediaType === "FILM" && localizedResult.movieLocalization) {
      const existing = await db.movie.findUnique({ where: { tmdbId }, select: { id: true } });
      isUpdate = Boolean(existing);
      await tmdbClient.syncMovieToDatabase(
        localizedResult.movieLocalization.movie,
        localizedResult.movieLocalization
      );
    } else if (mediaType === "TV" && localizedResult.tvLocalization) {
      const existing = await db.tvShow.findUnique({ where: { tmdbId }, select: { id: true } });
      isUpdate = Boolean(existing);
      await tmdbTvClient.syncTvShowToDatabase(
        localizedResult.tvLocalization.show,
        localizedResult.tvLocalization
      );
    }

    // Mark as IMPORTED in CatalogCandidateState
    await db.catalogCandidateState.upsert({
      where: { mediaType_tmdbId: { mediaType, tmdbId } },
      update: {
        status: "IMPORTED",
        reason: null,
        popularity: candidate.popularity,
        lastCheckedAt: new Date(),
      },
      create: {
        mediaType,
        tmdbId,
        status: "IMPORTED",
        popularity: candidate.popularity,
      },
    });
  }

  options.circuitBreaker.recordSuccess();

  return {
    tmdbId,
    mediaType,
    outcome: isUpdate ? "UPDATED" : "IMPORTED",
    title: safety.displayTitle.title,
    durationMs: Date.now() - startTime,
    httpAttempts,
    rateLimited,
  };
}
