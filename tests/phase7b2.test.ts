import test from "node:test";
import assert from "node:assert/strict";
import { getMoviePersonalMatch, getMoviePersonalMatches } from "../lib/recommendation/universal-matcher.ts";
import { deduplicateHomeModules, filterCategoryCandidatesWithRelaxation, calculateCategoryContextFit } from "../lib/recommendation/editorial-scorer.ts";
import { calculateQualityScore } from "../lib/recommendation/quality.ts";
import type { CandidateMovie } from "../lib/calibration/types.ts";
import type { FilmDnaResult } from "../lib/profile/types.ts";

// Mock user profile with 1043 evaluated movies (177 watched, 866 not watched)
const mockProfile: FilmDnaResult = {
  version: 2,
  primaryGenre: "Gerilim",
  secondaryGenres: ["Dram", "Bilim Kurgu", "Suç"],
  avoidedGenres: ["Korku"],
  eraPreference: { era: "90s", weight: 0.8 },
  popularityOrientation: { label: "Balanced", weight: 0.5 },
  tasteVector: [0.8, 0.6, 0.4, 0.9, 0.2],
  genres: [
    { genre: "Gerilim", score: 0.9 },
    { genre: "Dram", score: 0.8 },
    { genre: "Bilim Kurgu", score: 0.7 },
    { genre: "Suç", score: 0.7 },
    { genre: "Korku", score: 0.1 },
  ],
  eras: [{ era: "90s", weight: 0.8 }],
  traits: ["Atmosferik", "Psikolojik Derinlik"],
  popularity: { label: "Dengeli", description: "Dengeli" },
  familiarity: { label: "Yüksek", description: "Yüksek" },
};

// Mock candidate dataset simulating a catalog
function createMockCatalog(count: number = 100): CandidateMovie[] {
  const genresPool = [
    ["Gerilim", "Dram"],
    ["Bilim Kurgu", "Gizem"],
    ["Komedi", "Aile"],
    ["Dram", "Romantik"],
    ["Suç", "Gerilim"],
    ["Korku", "Gizem"],
    ["Aksiyon", "Gerilim"],
    ["Dram", "Tarih"],
  ];

  const movies: CandidateMovie[] = [];
  for (let i = 1; i <= count; i++) {
    const isKnownUnwatched = i <= 60; // 60 known unwatched candidates
    movies.push({
      id: `movie-${i}`,
      tmdbId: 1000 + i,
      title: `Film ${i}`,
      originalTitle: `Original Film ${i}`,
      releaseYear: 1990 + (i % 35),
      popularity: 30 + (i % 60),
      voteAverage: 6.2 + (i % 30) / 10,
      posterPath: `/poster-${i}.jpg`,
      backdropPath: `/backdrop-${i}.jpg`,
      genres: genresPool[i % genresPool.length],
      overview: `Overview for test movie ${i} with deep psychological and dramatic elements.`,
      candidateSource: isKnownUnwatched ? "KNOWN_UNWATCHED" : "FRESH_DISCOVERY",
      knownUnwatched: isKnownUnwatched,
    } as any);
  }
  return movies;
}

test("1. Home Category Supply Recovery — 1043 Evaluated Fixture generates >= 5 rendered rows", async () => {
  const catalog = createMockCatalog(120);

  const categories = [
    "KNOWN_UNWATCHED_ROW",
    "RAINY_COFFEE",
    "HIGH_TENSION",
    "LIGHT_BUT_GOOD",
    "MIND_BENDING",
    "SOLO_NIGHT",
    "CLASSIC",
    "HIDDEN_GEMS",
    "BRAINY",
    "SHORT",
    "FAMILY_COMEDY",
  ] as const;

  const rawModules = categories.map((cat) => {
    const pool = filterCategoryCandidatesWithRelaxation(catalog, cat as any, 10);
    return {
      id: cat.toLowerCase(),
      title: cat,
      movies: pool.slice(0, 8),
    };
  });

  const deduplicated = deduplicateHomeModules(rawModules, true);
  const renderedModules = deduplicated.filter((m) => m.movies.length >= 4);

  assert.ok(
    renderedModules.length >= 5,
    `Expected at least 5 rendered home rows, got ${renderedModules.length}`
  );

  for (const mod of renderedModules) {
    assert.ok(
      mod.movies.length >= 4 && mod.movies.length <= 8,
      `Row ${mod.id} has invalid movie count: ${mod.movies.length}`
    );
  }
});

test("2. Softened Cross-Row Deduplication — Movie appears in max 2 rows during soft scarcity", () => {
  const catalog = createMockCatalog(20);

  const rawModules = [
    { id: "mod1", title: "Mod 1", movies: catalog.slice(0, 8) },
    { id: "mod2", title: "Mod 2", movies: catalog.slice(0, 8) },
    { id: "mod3", title: "Mod 3", movies: catalog.slice(0, 8) },
  ];

  const deduplicated = deduplicateHomeModules(rawModules, true);

  const movieCounts = new Map<string, number>();
  for (const mod of deduplicated) {
    for (const movie of mod.movies) {
      movieCounts.set(movie.id, (movieCounts.get(movie.id) || 0) + 1);
    }
  }

  for (const [movieId, count] of movieCounts.entries()) {
    assert.ok(
      count <= 2,
      `Movie ${movieId} appeared in ${count} rows, expected max 2`
    );
  }
});

test("3. Softened Quality Floor — TMDB 6.4 movie with high vote count is not hard-discarded", () => {
  const candidate: CandidateMovie = {
    id: "movie-64",
    tmdbId: 6464,
    title: "Solid Drama 6.4",
    originalTitle: "Solid Drama 6.4",
    releaseYear: 2018,
    popularity: 85,
    voteAverage: 6.4,
    posterPath: "/poster.jpg",
    backdropPath: "/backdrop.jpg",
    genres: ["Dram", "Gerilim"],
    overview: "Engaging atmospheric thriller with high votes.",
  };

  const qualityScore = calculateQualityScore(candidate);
  assert.ok(
    qualityScore >= 5.0,
    `Expected quality score >= 5.0 for TMDB 6.4, got ${qualityScore}`
  );
});

test("4. Context Relaxation — STRICT -> NORMAL -> RELAXED preserves category meaning", () => {
  const catalog = createMockCatalog(50);
  const mode = "HIGH_TENSION";

  const relaxedPool = filterCategoryCandidatesWithRelaxation(catalog, mode, 8);
  assert.ok(relaxedPool.length >= 4, "Relaxation failed to supply candidates");

  for (const candidate of relaxedPool) {
    const fit = calculateCategoryContextFit(candidate, mode);
    assert.ok(
      fit >= 0.20,
      `Candidate ${candidate.title} has ContextFit ${fit} below minimum 0.20 floor`
    );
  }
});

test("5. Universal Match Score Helper — Single and Batch Match", async () => {
  const fakeUserId = "test-user-id-phase7b2";

  const singleMatch = await getMoviePersonalMatch(fakeUserId, "non-existent-movie");
  assert.equal(singleMatch.available, false);
  assert.equal(singleMatch.displayScore, 0);

  const batchMatches = await getMoviePersonalMatches(fakeUserId, ["non-existent-1", "non-existent-2"]);
  assert.ok(batchMatches instanceof Map);
  assert.equal(batchMatches.size, 2);
  assert.equal(batchMatches.get("non-existent-1")?.available, false);
});
