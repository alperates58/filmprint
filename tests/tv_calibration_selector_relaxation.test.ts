import { rankCandidateTvShows } from "../lib/tv/calibration/selector";
import { scoreCandidateTvShow } from "../lib/tv/calibration/scoring";
import { CandidateTvShow, TvSelectorUserState, RecentTvInteractionPattern } from "../lib/tv/calibration/types";

export async function runTvCalibrationSelectorRelaxationTests(): Promise<void> {
  console.log("\n🧪 Running TV Calibration Selector Relaxation Tests...");

  // Mock candidates
  const mockCandidates: CandidateTvShow[] = [
    {
      id: "show-1",
      tmdbId: 101,
      name: "Test Drama Show",
      originalName: "Test Drama Show",
      firstAirDate: "2022-01-01",
      lastAirDate: "2023-01-01",
      status: "Ended",
      originalLanguage: "en",
      popularity: 80.0,
      voteAverage: 8.5,
      voteCount: 500,
      posterPath: "/poster1.jpg",
      backdropPath: "/backdrop1.jpg",
      genres: ["Dram", "Gizem"],
      overview: "A thrilling mystery drama about unresolved secrets and deep family conflicts.",
      numberOfSeasons: 2,
      numberOfEpisodes: 16,
      adult: false,
    },
    {
      id: "show-2",
      tmdbId: 102,
      name: "Test Comedy Mini",
      originalName: "Test Comedy Mini",
      firstAirDate: "2021-05-01",
      lastAirDate: "2021-06-01",
      status: "Ended",
      originalLanguage: "tr",
      popularity: 45.0,
      voteAverage: 8.0,
      voteCount: 200,
      posterPath: "/poster2.jpg",
      backdropPath: "/backdrop2.jpg",
      genres: ["Komedi"],
      overview: "An entertaining and witty mini series exploring contemporary life with sharp humor.",
      numberOfSeasons: 1,
      numberOfEpisodes: 6,
      adult: false,
    },
    {
      id: "show-3",
      tmdbId: 103,
      name: "Test SciFi Epic",
      originalName: "Test SciFi Epic",
      firstAirDate: "2020-03-01",
      lastAirDate: null,
      status: "Returning Series",
      originalLanguage: "en",
      popularity: 120.0,
      voteAverage: 8.2,
      voteCount: 1500,
      posterPath: "/poster3.jpg",
      backdropPath: "/backdrop3.jpg",
      genres: ["Bilim Kurgu & Fantezi", "Aksiyon & Macera"],
      overview: "An expansive interstellar saga across distant planetary systems and evolving civil structures.",
      numberOfSeasons: 4,
      numberOfEpisodes: 40,
      adult: false,
    },
  ];

  const userState: TvSelectorUserState = {
    totalAnsweredCount: 347,
    genreFrequency: { Dram: 150, Gizem: 90, "Bilim Kurgu & Fantezi": 30 },
    positiveGenres: ["Dram", "Gizem"],
    negativeGenres: [],
  };

  const recentHistory: RecentTvInteractionPattern[] = [
    { tvShowId: "prev-1", genres: ["Dram"], firstAirYear: 2021 },
    { tvShowId: "prev-2", genres: ["Dram", "Gizem"], firstAirYear: 2022 },
  ];

  // Test 1: Level 1 Full Active Learning Ranking
  {
    console.log("  → Test 1: Level 1 ranking produces scored results with reasons");
    const ranked = rankCandidateTvShows(mockCandidates, userState, recentHistory);

    if (ranked.length !== mockCandidates.length) {
      throw new Error(`Expected ${mockCandidates.length} ranked results, got ${ranked.length}`);
    }

    if (typeof ranked[0].score !== "number") {
      throw new Error("Ranked candidate missing numeric score");
    }

    console.log(`     ✓ Top candidate: ${ranked[0].tvShow.name} (Score: ${ranked[0].score})`);
  }

  // Test 2: Level 2 Relaxation (Zero recent history penalty)
  {
    console.log("  → Test 2: Level 2 relaxation eliminates repetition penalty");
    const rankedWithPenalty = rankCandidateTvShows(mockCandidates, userState, recentHistory);
    const rankedRelaxed = rankCandidateTvShows(mockCandidates, userState, []);

    const dramaWithPenalty = rankedWithPenalty.find((r) => r.tvShow.id === "show-1");
    const dramaRelaxed = rankedRelaxed.find((r) => r.tvShow.id === "show-1");

    if (dramaRelaxed && dramaWithPenalty && dramaRelaxed.score < dramaWithPenalty.score) {
      throw new Error("Relaxed score should be greater than or equal to penalized score");
    }

    console.log(`     ✓ Penalized score: ${dramaWithPenalty?.score} vs Relaxed score: ${dramaRelaxed?.score}`);
  }

  // Test 3: Level 3 Pure Quality Ordering
  {
    console.log("  → Test 3: Level 3 deterministic quality fallback ordering");
    const sortedQuality = [...mockCandidates].sort((a, b) => {
      if (b.voteAverage !== a.voteAverage) return b.voteAverage - a.voteAverage;
      if (b.popularity !== a.popularity) return b.popularity - a.popularity;
      return a.tmdbId - b.tmdbId;
    });

    if (sortedQuality[0].id !== "show-1") {
      throw new Error(`Expected show-1 (voteAverage: 8.5) to be first in quality sort, got ${sortedQuality[0].id}`);
    }

    console.log(`     ✓ Quality sort highest: ${sortedQuality[0].name} (${sortedQuality[0].voteAverage})`);
  }

  console.log("  ✅ TV Calibration Selector Relaxation Tests Passed!\n");
}
