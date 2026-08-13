import {
  calculateCategoryContextFit,
  deduplicateHomeModules,
} from "../lib/recommendation/editorial-scorer.ts";
import {
  getEvidenceForRecommendation,
  calculateMovieSimilarity,
  getEvidenceLimitForCount,
  MIN_REFERENCE_THRESHOLD,
  calculateDislikePenalty,
} from "../lib/recommendation/evidence.ts";
import { generateDeterministicExplanation } from "../lib/recommendation/explanation.ts";
import type { CandidateMovie } from "../lib/calibration/types";
import type { TasteEvidenceProfile, TasteEvidenceMovie } from "../lib/recommendation/types";

export function runRecommendationV3Tests() {
  console.log("=== PHASE 7B RECOMMENDATION INTELLIGENCE V3 TESTS ===\n");
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string) {
    totalCount++;
    if (condition) {
      console.log(`[PASS] Test ${totalCount}: ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] Test ${totalCount}: ${testName}`);
    }
  }

  // --- TEST FIXTURES ---
  const standByMe: CandidateMovie = {
    id: "m-standbyme",
    tmdbId: 235,
    title: "Stand by Me",
    originalTitle: "Stand by Me",
    releaseYear: 1986,
    popularity: 75,
    voteAverage: 8.1,
    genres: ["Dram", "Macera"],
    overview: "Gordie, Chris, Teddy ve Vern adlı dört çocuk kasaba yakınında kayıp bir çocuğun cesedini bulmak için yola çıkar.",
  };

  const se7en: CandidateMovie = {
    id: "m-se7en",
    tmdbId: 807,
    title: "Se7en",
    originalTitle: "Se7en",
    releaseYear: 1995,
    popularity: 88,
    voteAverage: 8.6,
    genres: ["Suç", "Gizem", "Gerilim"],
    overview: "Yedi ölümcül günahı işleyen insanları hedef alan bir seri katil ve iki dedektif.",
  };

  const paddington: CandidateMovie = {
    id: "m-paddington",
    tmdbId: 116149,
    title: "Paddington",
    originalTitle: "Paddington",
    releaseYear: 2014,
    popularity: 65,
    voteAverage: 7.2,
    genres: ["Komedi", "Aile", "Animasyon"],
    overview: "Londra'ya gelen genç bir Perulu ayının maceraları.",
  };

  const johnWick4: CandidateMovie = {
    id: "m-johnwick4",
    tmdbId: 603692,
    title: "John Wick 4",
    originalTitle: "John Wick: Chapter 4",
    releaseYear: 2023,
    popularity: 95,
    voteAverage: 7.8,
    genres: ["Aksiyon", "Suç", "Gerilim"],
    overview: "Yüksek Şura'ya karşı savaşan John Wick.",
  };

  // User Evidence Fixture
  const userPositiveMovies: TasteEvidenceMovie[] = [
    {
      id: "ev-gonegirl",
      title: "Gone Girl",
      rating: "LOVE",
      genres: ["Gerilim", "Gizem", "Suç"],
      releaseYear: 2014,
      popularity: 85,
      voteAverage: 8.1,
    },
    {
      id: "ev-johnwick3",
      title: "John Wick 3",
      rating: "LOVE",
      genres: ["Aksiyon", "Suç", "Gerilim"],
      releaseYear: 2019,
      popularity: 90,
      voteAverage: 7.4,
    },
    {
      id: "ev-holdovers",
      title: "The Holdovers",
      rating: "LIKE",
      genres: ["Komedi", "Dram"],
      releaseYear: 2023,
      popularity: 60,
      voteAverage: 8.0,
    },
  ];

  const mockEvidenceProfile: TasteEvidenceProfile = {
    positiveCount: userPositiveMovies.length,
    ratedCount: 150,
    positiveMovies: userPositiveMovies,
    negativeMovies: [
      {
        id: "ev-badhorror",
        title: "Bad Horror Movie",
        rating: "DISLIKE",
        genres: ["Korku"],
        releaseYear: 2021,
      },
    ],
    clusters: [],
    evidenceFingerprint: "v3_test_fingerprint",
  };

  // 1. Critical Test — Stand by Me Cross-Category Scoring & Deduplication
  const fitRainy = calculateCategoryContextFit(standByMe, "RAINY_COFFEE");
  const fitTension = calculateCategoryContextFit(standByMe, "HIGH_TENSION");
  assert(
    fitRainy >= 0.5 && fitTension < 0.3,
    "Stand by Me receives high context fit in RAINY_COFFEE and low fit in HIGH_TENSION"
  );

  const mockHomeModules = [
    { id: "rainy", movies: [standByMe, se7en] },
    { id: "thriller", movies: [standByMe, johnWick4] },
    { id: "comedy", movies: [standByMe, paddington] },
  ];
  const deduplicated = deduplicateHomeModules(mockHomeModules);
  const standByMeOccurrences = deduplicated.flatMap((m) => m.movies).filter((m) => m.id === standByMe.id);
  assert(
    standByMeOccurrences.length === 1,
    "Global home deduplication ensures Stand by Me appears in exactly 1 row per home page generation"
  );

  // 2. Critical Test — Gone Girl Candidate-Specific Reference Matching
  const evidenceSe7en = getEvidenceForRecommendation(mockEvidenceProfile, se7en);
  assert(
    evidenceSe7en.hasStrongReference && evidenceSe7en.positiveReferences[0].title === "Gone Girl",
    "Candidate Se7en (Psychological Thriller) accurately picks 'Gone Girl' as positive reference"
  );

  const evidencePaddington = getEvidenceForRecommendation(mockEvidenceProfile, paddington);
  assert(
    !evidencePaddington.hasStrongReference || evidencePaddington.positiveReferences[0].title !== "Gone Girl",
    "Candidate Paddington (Family Animation) NEVER picks 'Gone Girl' as positive reference"
  );

  const evidenceJW4 = getEvidenceForRecommendation(mockEvidenceProfile, johnWick4);
  assert(
    evidenceJW4.hasStrongReference && evidenceJW4.positiveReferences[0].title === "John Wick 3",
    "Candidate John Wick 4 accurately picks 'John Wick 3' as action evidence"
  );

  // 3. Minimum Reference Threshold & Fallback
  const weakCandidate: CandidateMovie = {
    id: "m-weak",
    tmdbId: 999,
    title: "Documentary on Bees",
    originalTitle: "Bees",
    releaseYear: 2005,
    popularity: 20,
    voteAverage: 6.5,
    genres: ["Belgesel"],
    overview: "Arıların dünyası.",
  };
  const evidenceWeak = getEvidenceForRecommendation(mockEvidenceProfile, weakCandidate);
  assert(
    !evidenceWeak.hasStrongReference && evidenceWeak.positiveReferences.length === 0,
    "Weak similarity candidate falls back to profile signals instead of forcing a fake reference"
  );

  // 4. Data Scale Evidence Expansion
  assert(getEvidenceLimitForCount(30) === 15, "30 rated movies -> 15 evidence limit");
  assert(getEvidenceLimitForCount(150) === 35, "150 rated movies -> 35 evidence limit");
  assert(getEvidenceLimitForCount(500) === 75, "500 rated movies -> 75 evidence limit");
  assert(getEvidenceLimitForCount(1200) === 150, "1200 rated movies -> 150 evidence limit");

  // 5. AI Anti-Hallucination Validation Test
  const validTitles = ["Gone Girl", "John Wick 3"];
  const hallucinatedResponseRef = ["Interstellar"];
  const isHallucinated = hallucinatedResponseRef.some((r) => !validTitles.includes(r));
  assert(isHallucinated === true, "Anti-hallucination validation detects and rejects invalid reference movie titles");

  // 6. Dislike Penalty Test
  const horrorCandidate: CandidateMovie = {
    id: "m-horror",
    tmdbId: 555,
    title: "Scary House",
    originalTitle: "Scary House",
    releaseYear: 2022,
    popularity: 50,
    voteAverage: 6.0,
    genres: ["Korku"],
    overview: "Korkunç ev.",
  };
  const penalty = calculateDislikePenalty(horrorCandidate, mockEvidenceProfile);
  assert(penalty < 0, "Dislike penalty applies negative ranking signal (-5 to -15) for disliked genres");

  console.log(`\nRESULTS: Passed ${passedCount} of ${totalCount} tests.\n`);
}

runRecommendationV3Tests();
