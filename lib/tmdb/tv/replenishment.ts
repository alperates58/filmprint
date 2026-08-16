import type { TMDBTvShow } from "./types";

export const TMDB_TV_FETCH_TIMEOUT_MS = 9_000;
export const TMDB_TV_MAX_RETRIES = 2;
// Six logical sources with at most three attempts each bounds a replenish run
// to 18 outbound HTTP attempts, including retries.
export const TMDB_TV_MAX_REQUESTS_PER_RUN = 6;
export const TMDB_TV_REQUEST_CONCURRENCY = 3;
export const TMDB_TV_MAX_PAGE = 500;

export interface TmdbTvRequestMetrics {
  httpAttempts: number;
  retries: number;
  rateLimited: number;
  failures: number;
}

export interface TmdbTvReplenishmentCursor {
  sourceIndex: number;
  page: number;
}

export interface TmdbTvSourceRequest {
  source:
    | "popular"
    | "top_rated"
    | "discover_drama"
    | "discover_crime"
    | "discover_mystery"
    | "discover_scifi"
    | "discover_comedy"
    | "discover_animation";
  page: number;
  genreId?: string;
}

export const TMDB_TV_SOURCES: ReadonlyArray<
  Omit<TmdbTvSourceRequest, "page">
> = [
  { source: "popular" },
  { source: "top_rated" },
  { source: "discover_drama", genreId: "18" },
  { source: "discover_crime", genreId: "80" },
  { source: "discover_mystery", genreId: "9648" },
  { source: "discover_scifi", genreId: "10765" },
  { source: "discover_comedy", genreId: "35" },
  { source: "discover_animation", genreId: "16" },
];

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

interface FetchJsonOptions {
  fetchImpl?: FetchLike;
  sleep?: (delayMs: number) => Promise<void>;
  timeoutMs?: number;
  maxRetries?: number;
  metrics?: TmdbTvRequestMetrics;
}

interface RunRotationOptions<T, S> {
  initialCursor: TmdbTvReplenishmentCursor;
  fetchSource: (request: TmdbTvSourceRequest) => Promise<T[]>;
  syncShows: (shows: T[]) => Promise<{ synced: S[]; newUniqueIds: number }>;
  targetNewIds?: number;
  maxRequests?: number;
  concurrency?: number;
}

export interface TmdbTvRotationResult<S> {
  cursor: TmdbTvReplenishmentCursor;
  requests: TmdbTvSourceRequest[];
  synced: S[];
  newUniqueIds: number;
  failedSources: number;
}

export class TmdbTvRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly attempts: number
  ) {
    super(message);
    this.name = "TmdbTvRequestError";
  }
}

const defaultSleep = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

function retryAfterMs(response: Response, retryIndex: number): number {
  const header = response.headers.get("Retry-After");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1_000;
    }

    const retryAt = Date.parse(header);
    if (!Number.isNaN(retryAt)) {
      return Math.max(0, retryAt - Date.now());
    }
  }

  return 1_000 * 2 ** retryIndex;
}

/** Fetches JSON with a per-attempt timeout and bounded 429/5xx retries. */
export async function fetchTmdbTvJson<T>(
  url: string,
  {
    fetchImpl = fetch,
    sleep = defaultSleep,
    timeoutMs = TMDB_TV_FETCH_TIMEOUT_MS,
    maxRetries = TMDB_TV_MAX_RETRIES,
    metrics,
  }: FetchJsonOptions = {}
): Promise<T> {
  let lastStatus: number | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (metrics) metrics.httpAttempts++;
      const response = await fetchImpl(url, {
        signal: controller.signal,
        cache: "no-store",
      });
      lastStatus = response.status;

      if (response.ok) {
        return (await response.json()) as T;
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (response.status === 429 && metrics) metrics.rateLimited++;

      if (!retryable || attempt === maxRetries) {
        throw new TmdbTvRequestError(
          `TMDB TV request failed with status ${response.status}`,
          response.status,
          attempt + 1
        );
      }

      if (metrics) metrics.retries++;
      await sleep(retryAfterMs(response, attempt));
    } catch (error) {
      lastError = error;
      if (error instanceof TmdbTvRequestError) throw error;

      if (attempt === maxRetries) {
        throw new TmdbTvRequestError(
          error instanceof Error ? error.message : "TMDB TV request failed",
          lastStatus,
          attempt + 1
        );
      }

      if (metrics) metrics.retries++;
      await sleep(1_000 * 2 ** attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new TmdbTvRequestError(
    lastError instanceof Error ? lastError.message : "TMDB TV request failed",
    lastStatus,
    maxRetries + 1
  );
}

export function normalizeTmdbTvCursor(
  value: Partial<TmdbTvReplenishmentCursor> | null | undefined
): TmdbTvReplenishmentCursor {
  const sourceIndex = Number.isInteger(value?.sourceIndex)
    ? Math.max(0, Number(value?.sourceIndex)) % TMDB_TV_SOURCES.length
    : 0;
  const page = Number.isInteger(value?.page)
    ? Math.min(Math.max(1, Number(value?.page)), TMDB_TV_MAX_PAGE)
    : 1;
  return { sourceIndex, page };
}

export function nextTmdbTvCursor(
  cursor: TmdbTvReplenishmentCursor
): TmdbTvReplenishmentCursor {
  const normalized = normalizeTmdbTvCursor(cursor);
  const sourceIndex = normalized.sourceIndex + 1;
  if (sourceIndex < TMDB_TV_SOURCES.length) {
    return { sourceIndex, page: normalized.page };
  }

  return {
    sourceIndex: 0,
    page: normalized.page >= TMDB_TV_MAX_PAGE ? 1 : normalized.page + 1,
  };
}

export function sourceRequestForCursor(
  cursor: TmdbTvReplenishmentCursor
): TmdbTvSourceRequest {
  const normalized = normalizeTmdbTvCursor(cursor);
  return {
    ...TMDB_TV_SOURCES[normalized.sourceIndex],
    page: normalized.page,
  };
}

/**
 * Executes source/page rotation in bounded concurrent batches. The cursor is
 * advanced for every attempted source, including duplicate-only and failed
 * responses, so a later replenish run cannot remain pinned to one page.
 */
export async function runTmdbTvSourceRotation<T extends TMDBTvShow, S>({
  initialCursor,
  fetchSource,
  syncShows,
  targetNewIds = 30,
  maxRequests = TMDB_TV_MAX_REQUESTS_PER_RUN,
  concurrency = TMDB_TV_REQUEST_CONCURRENCY,
}: RunRotationOptions<T, S>): Promise<TmdbTvRotationResult<S>> {
  let cursor = normalizeTmdbTvCursor(initialCursor);
  const requests: TmdbTvSourceRequest[] = [];
  const synced: S[] = [];
  let newUniqueIds = 0;
  let failedSources = 0;

  while (requests.length < maxRequests && newUniqueIds < targetNewIds) {
    const batch: TmdbTvSourceRequest[] = [];
    const batchSize = Math.min(concurrency, maxRequests - requests.length);

    for (let index = 0; index < batchSize; index++) {
      batch.push(sourceRequestForCursor(cursor));
      cursor = nextTmdbTvCursor(cursor);
    }
    requests.push(...batch);

    const responses = await Promise.allSettled(batch.map(fetchSource));
    for (const response of responses) {
      if (response.status === "rejected") {
        failedSources++;
        continue;
      }

      const uniqueShows = Array.from(
        new Map(response.value.map((show) => [show.id, show])).values()
      );
      if (uniqueShows.length === 0) continue;

      const syncResult = await syncShows(uniqueShows);
      synced.push(...syncResult.synced);
      newUniqueIds += syncResult.newUniqueIds;
    }
  }

  return { cursor, requests, synced, newUniqueIds, failedSources };
}
