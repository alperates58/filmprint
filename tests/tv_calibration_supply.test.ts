import { rankCandidateTvShows } from "../lib/tv/calibration/selector";
import { resolveTvCandidateSupply } from "../lib/tv/calibration/supply";
import type { CandidateTvShow, TvSelectorUserState } from "../lib/tv/calibration/types";
import {
  fetchTmdbTvJson,
  runTmdbTvSourceRotation,
  TmdbTvRequestError,
} from "../lib/tmdb/tv/replenishment";
import type { TMDBTvShow } from "../lib/tmdb/tv/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function candidate(index: number, popularity: number, eligible = true): CandidateTvShow {
  return {
    id: `fixture-show-${index}`,
    tmdbId: 100_000 + index,
    name: `Fixture Show ${index}`,
    originalName: `Fixture Show ${index}`,
    firstAirDate: "2020-01-01",
    lastAirDate: null,
    status: "Ended",
    originalLanguage: "en",
    popularity,
    voteAverage: 8,
    voteCount: eligible ? 100 : 1,
    posterPath: "/fixture.jpg",
    backdropPath: null,
    genres: ["Dram"],
    overview: eligible
      ? "A sufficiently detailed overview for deterministic TV calibration supply testing."
      : "short",
    numberOfSeasons: 1,
    numberOfEpisodes: 8,
    adult: false,
  };
}

function tmdbShow(id: number): TMDBTvShow {
  return {
    id,
    name: `TMDB Fixture ${id}`,
    original_name: `TMDB Fixture ${id}`,
    poster_path: "/fixture.jpg",
    backdrop_path: null,
    popularity: 100,
    vote_average: 8,
  };
}

function pagedFetcher(rows: CandidateTvShow[]) {
  return async ({ skip, take }: { skip: number; take: number }) =>
    rows.slice(skip, skip + take);
}

const matureUserState: TvSelectorUserState = {
  totalAnsweredCount: 347,
  genreFrequency: { Dram: 347 },
  positiveGenres: ["Dram"],
  negativeGenres: [],
};

function selectedCount(candidates: CandidateTvShow[]): number {
  return rankCandidateTvShows(candidates, matureUserState, []).slice(0, 5).length;
}

function response(status: number, retryAfter?: string, body: unknown = { results: [] }): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "retry-after" ? retryAfter || null : null,
    },
    json: async () => body,
  } as Response;
}

export async function runTvCalibrationSupplyTests(): Promise<void> {
  console.log("\n🧪 Running deterministic TV calibration supply & TMDB recovery tests...");

  // Scenario A: 1700 total / 1500 eligible / 347 interacted.
  {
    const catalog = Array.from({ length: 1700 }, (_, index) =>
      candidate(index, 1700 - index, index < 1500)
    );
    const unanswered = catalog.slice(347);
    const supply = await resolveTvCandidateSupply({
      fetchPage: pagedFetcher(unanswered),
    });

    assert(supply.eligibleCandidates.length >= 100, "Scenario A must find a healthy reserve");
    assert(selectedCount(supply.eligibleCandidates) === 5, "Scenario A must return 5 candidates");
    assert(supply.status === "AVAILABLE", "Scenario A must have AVAILABLE supply status");
    console.log("  ✓ Scenario A: 1700/1500/347 returns 5 candidates from database");
  }

  // Scenario B: top 500 interacted, lower 500 unanswered.
  {
    const catalog = Array.from({ length: 1000 }, (_, index) =>
      candidate(2_000 + index, 1000 - index)
    );
    const supply = await resolveTvCandidateSupply({
      fetchPage: pagedFetcher(catalog.slice(500)),
    });

    assert(selectedCount(supply.eligibleCandidates) === 5, "Scenario B must reach lower-ranked shows");
    console.log("  ✓ Scenario B: lower 500 unanswered candidates remain reachable");
  }

  // Scenario C: four full invalid pages plus 100 invalid rows before valid supply.
  {
    const rows = [
      ...Array.from({ length: 1100 }, (_, index) => candidate(4_000 + index, 2_000 - index, false)),
      ...Array.from({ length: 100 }, (_, index) => candidate(6_000 + index, 100 - index, true)),
    ];
    const supply = await resolveTvCandidateSupply({
      fetchPage: pagedFetcher(rows),
      pageSize: 250,
      maxPages: 10,
    });

    assert(supply.pagesScanned === 5, "Scenario C must scan through the fifth page");
    assert(selectedCount(supply.eligibleCandidates) === 5, "Scenario C must reach the lower 100 valid rows");
    console.log("  ✓ Scenario C: pagination crosses 1100 invalid rows and returns 5 candidates");
  }

  // Scenario D: low reserve returns status LOW safely without external calls.
  {
    const rows = Array.from({ length: 10 }, (_, index) => candidate(7_000 + index, 10 - index));
    const supply = await resolveTvCandidateSupply({
      fetchPage: pagedFetcher(rows),
    });

    assert(supply.status === "LOW", "Scenario D must mark supply status as LOW");
    assert(supply.eligibleCandidates.length === 10, "Scenario D must return 10 eligible candidates");
    assert(supply.exhausted === true, "Scenario D must indicate catalog exhausted");
    console.log("  ✓ Scenario D: reserve=10 returns status LOW safely without TMDB calls");
  }

  // Scenario E: duplicate-only pages still consume and advance source/page cursor.
  {
    const requested: string[] = [];
    const rotation = await runTmdbTvSourceRotation<TMDBTvShow, TMDBTvShow>({
      initialCursor: { sourceIndex: 0, page: 1 },
      maxRequests: 10,
      concurrency: 3,
      fetchSource: async (request) => {
        requested.push(`${request.source}:${request.page}`);
        return [tmdbShow(1), tmdbShow(1)];
      },
      syncShows: async () => ({ synced: [], newUniqueIds: 0 }),
    });

    assert(rotation.requests.length === 10, "Scenario E must remain request-bounded");
    assert(new Set(requested).size === 10, "Scenario E must advance to distinct source/page positions");
    assert(rotation.cursor.page === 2, "Scenario E must advance into the next page cycle");
    console.log("  ✓ Scenario E: duplicate-only responses advance source/page cursor");
  }

  // Scenario F: Retry-After=1 is respected before a successful retry.
  {
    let attempts = 0;
    const delays: number[] = [];
    const data = await fetchTmdbTvJson<{ results: unknown[] }>("https://tmdb.test/tv", {
      fetchImpl: async () => {
        attempts++;
        return attempts === 1
          ? response(429, "1")
          : response(200, undefined, { results: [] });
      },
      sleep: async (delay) => {
        delays.push(delay);
      },
    });

    assert(data.results.length === 0 && attempts === 2, "Scenario F must retry once then succeed");
    assert(delays.length === 1 && delays[0] === 1000, "Scenario F must respect Retry-After=1");
    console.log("  ✓ Scenario F: Retry-After=1 produces a 1000ms mocked delay");
  }

  // Scenario G: repeated 429 stops after the bounded retry budget.
  {
    let attempts = 0;
    const delays: number[] = [];
    let failure: unknown = null;
    try {
      await fetchTmdbTvJson("https://tmdb.test/tv", {
        fetchImpl: async () => {
          attempts++;
          return response(429);
        },
        sleep: async (delay) => {
          delays.push(delay);
        },
      });
    } catch (error) {
      failure = error;
    }

    assert(failure instanceof TmdbTvRequestError, "Scenario G must return a structured failure");
    assert(attempts === 3, "Scenario G must stop after 3 total attempts");
    assert(delays.join(",") === "1000,2000", "Scenario G must use bounded exponential backoff");
    console.log("  ✓ Scenario G: repeated 429 stops after 3 attempts without a busy loop");
  }

  console.log("  ✅ Deterministic TV calibration supply & recovery tests passed\n");
}
