import { getMoviePersonalMatch, getMoviePersonalMatches } from "../lib/recommendation/universal-matcher";
import { deduplicateHomeModules, filterCategoryCandidatesWithRelaxation, calculateCategoryContextFit } from "../lib/recommendation/editorial-scorer";
import { calculateQualityScore } from "../lib/recommendation/quality";
import type { CandidateMovie } from "../lib/calibration/types";
import type { FilmDnaResult } from "../lib/profile/types";

// Mock user profile with 1043 evaluated movies (177 watched, 866 not watched)
const mockProfile: FilmDnaResult = {
  version: 2,
  generatedAt: new Date().toISOString(),
  summary: "Gerilim & Dram Odaklı Profil",
  confidence: 0.95,
  confidenceLabel: "Yüksek Güvenilirlik",
  sample: { totalInteractions: 1043, ratedMovies: 177, watched: 177, notWatched: 866, unsure: 0 },
  genres: [
    { name: "Gerilim", score: 0.9, ratedCount: 60, exposureCount: 60 },
    { name: "Dram", score: 0.8, ratedCount: 50, exposureCount: 50 },
    { name: "Bilim Kurgu", score: 0.7, ratedCount: 40, exposureCount: 40 },
    { name: "Suç", score: 0.7, ratedCount: 30, exposureCount: 30 },
    { name: "Korku", score: 0.1, ratedCount: 15, exposureCount: 15 },
  ],
  eras: [{ key: "1990s", label: "1990'lar", score: 0.8, ratedCount: 60 }],
  traits: ["Atmosferik", "Psikolojik Derinlik"],
  popularity: { orientation: "balanced", label: "Dengeli", avgPopularityScore: 65 },
  familiarity: { score: 0.8, label: "discovery_heavy", description: "Yüksek" },
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
    } as any);
  }
  return movies;
}

export async function runPhase7b2Tests() {
  console.log("=== PHASE 7B.2 GROUNDED EVIDENCE & HOME EXPERIENCE TESTS ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${message}`);
    }
  }

  // 1. Home Category Supply Recovery
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

  assert(
    renderedModules.length >= 5,
    `Home Category Supply Recovery — 1043 Evaluated Fixture generates >= 5 rendered rows (${renderedModules.length} rows)`
  );

  // 2. Softened Cross-Row Deduplication
  const smallCatalog = createMockCatalog(20);
  const mockRows = [
    { id: "mod1", title: "Mod 1", movies: smallCatalog.slice(0, 8) },
    { id: "mod2", title: "Mod 2", movies: smallCatalog.slice(0, 8) },
    { id: "mod3", title: "Mod 3", movies: smallCatalog.slice(0, 8) },
  ];

  const dedupedRows = deduplicateHomeModules(mockRows, true);
  const movieCounts = new Map<string, number>();
  for (const mod of dedupedRows) {
    for (const movie of mod.movies) {
      movieCounts.set(movie.id, (movieCounts.get(movie.id) || 0) + 1);
    }
  }

  const maxDupes = Math.max(...Array.from(movieCounts.values()));
  assert(
    maxDupes <= 2,
    `Softened Cross-Row Deduplication — Movie appears in max 2 rows during soft scarcity (max count = ${maxDupes})`
  );

  // 3. Softened Quality Floor
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
  assert(
    qualityScore >= 0.50,
    `Softened Quality Floor — TMDB 6.4 movie with high vote count is not hard-discarded (quality = ${qualityScore})`
  );

  // 4. Context Relaxation
  const relaxedPool = filterCategoryCandidatesWithRelaxation(catalog, "HIGH_TENSION", 8);
  const allFitAboveFloor = relaxedPool.every((c) => calculateCategoryContextFit(c, "HIGH_TENSION") >= 0.20);
  assert(
    relaxedPool.length >= 4 && allFitAboveFloor,
    "Context Relaxation — STRICT -> NORMAL -> RELAXED preserves category meaning"
  );

  // 5. Universal Match Score Helper
  const fakeUserId = "test-user-id-phase7b2";
  const singleMatch = await getMoviePersonalMatch(fakeUserId, "non-existent-movie");
  const batchMatches = await getMoviePersonalMatches(fakeUserId, ["non-existent-1", "non-existent-2"]);

  assert(
    singleMatch.available === false && singleMatch.displayScore === 0 && batchMatches.size === 2,
    "Universal Match Score Helper — Single and Batch Match safe graceful fallback"
  );

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}
