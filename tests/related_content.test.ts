import { strict as assert } from "assert";
import { scoreMovieSimilarity } from "@/lib/movies/related";
import { scoreTvSimilarity } from "@/lib/tv/related";

export async function runRelatedContentTests() {
  console.log("--> 1. Testing Movie Similarity Scoring");
  {
    const sourceMovie = {
      genres: ["Aile", "Animasyon"],
      director: "Alan Barillaro",
      releaseYear: 2016,
    };

    // Candidate 1: Animation + Family short by same director / similar era (e.g., Bao or Pixar short)
    const pixarCandidate = {
      genres: ["Animasyon", "Aile"],
      director: "Alan Barillaro",
      releaseYear: 2018,
      voteAverage: 8.0,
      popularity: 45.0,
    };

    // Candidate 2: Animation + Family by different director (e.g., Finding Dory)
    const familyCandidate = {
      genres: ["Animasyon", "Aile", "Macera"],
      director: "Andrew Stanton",
      releaseYear: 2016,
      voteAverage: 7.5,
      popularity: 60.0,
    };

    // Candidate 3: Unrelated Action blockbuster (e.g., Spider-Man)
    const actionCandidate = {
      genres: ["Aksiyon", "Macera", "Bilim Kurgu"],
      director: "Jon Watts",
      releaseYear: 2021,
      voteAverage: 8.2,
      popularity: 250.0,
    };

    // Candidate 4: Unrelated Horror (e.g., The Conjuring)
    const horrorCandidate = {
      genres: ["Korku", "Gerilim"],
      director: "James Wan",
      releaseYear: 2013,
      voteAverage: 7.5,
      popularity: 80.0,
    };

    const scorePixar = scoreMovieSimilarity(sourceMovie, pixarCandidate);
    const scoreFamily = scoreMovieSimilarity(sourceMovie, familyCandidate);
    const scoreAction = scoreMovieSimilarity(sourceMovie, actionCandidate);
    const scoreHorror = scoreMovieSimilarity(sourceMovie, horrorCandidate);

    assert.ok(
      scorePixar > scoreFamily,
      `Expected same director & genres (${scorePixar}) to outscore different director (${scoreFamily})`
    );
    assert.ok(
      scoreFamily > scoreAction,
      `Expected genre-matching animation/family (${scoreFamily}) to outscore unrelated action movie (${scoreAction})`
    );
    assert.ok(
      scoreFamily > scoreHorror,
      `Expected genre-matching family (${scoreFamily}) to outscore unrelated horror (${scoreHorror})`
    );
    assert.ok(
      scoreAction < 0 || scoreAction < 20,
      `Expected zero-matching action movie to have heavily penalized score, got ${scoreAction}`
    );

    console.log("  ✓ Movie similarity scoring correctly prioritizes related thematic content over unrelated blockbusters.");
  }

  console.log("--> 2. Testing TV Show Similarity Scoring");
  {
    const sourceShow = {
      genres: ["Bilim Kurgu", "Gizem", "Dram"],
      creators: ["Baran bo Odar", "Jantje Friese"],
      firstAirYear: 2017,
    };

    // Candidate 1: Same creators and Sci-Fi/Mystery (e.g., 1899)
    const sameCreatorCandidate = {
      genres: ["Gizem", "Dram", "Bilim Kurgu"],
      creators: ["Baran bo Odar", "Jantje Friese"],
      firstAirYear: 2022,
      voteAverage: 7.8,
      popularity: 50.0,
    };

    // Candidate 2: Similar genre Sci-Fi/Mystery (e.g., Stranger Things)
    const genreCandidate = {
      genres: ["Bilim Kurgu", "Gizem", "Dram"],
      creators: ["The Duffer Brothers"],
      firstAirYear: 2016,
      voteAverage: 8.6,
      popularity: 120.0,
    };

    // Candidate 3: Unrelated Reality Show / Sitcom
    const unrelatedCandidate = {
      genres: ["Komedi"],
      creators: ["Chuck Lorre"],
      firstAirYear: 2007,
      voteAverage: 8.0,
      popularity: 90.0,
    };

    const scoreSameCreator = scoreTvSimilarity(sourceShow, sameCreatorCandidate);
    const scoreGenreMatch = scoreTvSimilarity(sourceShow, genreCandidate);
    const scoreUnrelated = scoreTvSimilarity(sourceShow, unrelatedCandidate);

    assert.ok(
      scoreSameCreator > scoreGenreMatch,
      `Expected shared creators (${scoreSameCreator}) to outscore different creators (${scoreGenreMatch})`
    );
    assert.ok(
      scoreGenreMatch > scoreUnrelated,
      `Expected matching sci-fi genre (${scoreGenreMatch}) to outscore comedy (${scoreUnrelated})`
    );

    console.log("  ✓ TV similarity scoring correctly prioritizes thematic and creator overlap.");
  }
}

if (typeof require !== "undefined" && require.main === module) {
  runRelatedContentTests()
    .then(() => {
      console.log("All related content tests passed successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Test failure:", err);
      process.exit(1);
    });
}
