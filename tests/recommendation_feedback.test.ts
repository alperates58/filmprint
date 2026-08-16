import {
  calculateMovieFeedbackAdjustment,
  EMPTY_FEEDBACK_PROFILE,
  type FeedbackProfile,
} from "../lib/recommendation/feedback-profile";
import {
  calculateTvFeedbackAdjustment,
  EMPTY_TV_FEEDBACK_PROFILE,
  type TvFeedbackProfile,
} from "../lib/tv/recommendation/feedback-profile";
import { FEEDBACK_ADJUSTMENT_BOUNDS } from "../lib/recommendation/feedback-constants";
import { TV_FEEDBACK_ADJUSTMENT_BOUNDS } from "../lib/tv/recommendation/constants";
import { buildAiRerankPromptPayload } from "../lib/recommendation/hybrid-reranker";
import type { AiTasteProfile } from "../lib/recommendation/ai-taste-types";
import type { ScoredCandidate } from "../lib/recommendation/service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runRecommendationFeedbackTests(): Promise<void> {
  console.log("  Running Recommendation Feedback Learning Loop Unit Tests...");

  // 1. Cold Start Invariance: 0 feedback produces exact 0 adjustment
  {
    const movieAdjustment = calculateMovieFeedbackAdjustment(
      "movie-101",
      ["Sci-Fi", "Adventure"],
      2020,
      { director: "Christopher Nolan", keywords: ["space", "wormhole"] },
      EMPTY_FEEDBACK_PROFILE
    );
    assert(movieAdjustment === 0, "Cold start movie feedback adjustment must be exactly 0");

    const tvCandidate = {
      id: "tv-201",
      tmdbId: 201,
      name: "Dark",
      originalName: "Dark",
      overview: "Time travel mystery.",
      posterPath: "/poster.jpg",
      backdropPath: null,
      firstAirDate: "2017-12-01",
      popularity: 80,
      voteAverage: 8.7,
      originalLanguage: "de",
      originCountry: ["DE"],
      status: "Ended",
      metadata: {
        genres: ["Sci-Fi", "Mystery", "Drama"],
        created_by: ["Baran bo Odar"],
        networks: ["Netflix"],
      },
    };

    const tvAdjustment = calculateTvFeedbackAdjustment(
      tvCandidate as any,
      EMPTY_TV_FEEDBACK_PROFILE
    );
    assert(tvAdjustment === 0, "Cold start TV feedback adjustment must be exactly 0");
  }

  // 2. Direct Content Feedback Signals (LIKE, DISLIKE, WATCHLIST)
  {
    const mockProfile: FeedbackProfile = {
      ...EMPTY_FEEDBACK_PROFILE,
      totalFeedbacks: 3,
      likedMovieIds: new Set(["movie-liked"]),
      dislikedMovieIds: new Set(["movie-disliked"]),
      watchlistMovieIds: new Set(["movie-watchlist"]),
      hiddenMovieIds: new Set(["movie-hidden"]),
      watchedMovieIds: new Set(["movie-watched"]),
    };

    const likedAdj = calculateMovieFeedbackAdjustment("movie-liked", ["Drama"], 2018, {}, mockProfile);
    assert(likedAdj === 6.0, "Direct LIKE must yield +6.0 adjustment");

    const watchlistAdj = calculateMovieFeedbackAdjustment("movie-watchlist", ["Drama"], 2018, {}, mockProfile);
    assert(watchlistAdj === 10.0, "Direct WATCHLIST must yield +10.0 max adjustment");

    const dislikedAdj = calculateMovieFeedbackAdjustment("movie-disliked", ["Drama"], 2018, {}, mockProfile);
    assert(dislikedAdj === -15.0, "Direct DISLIKE must yield -15.0 penalty");
  }

  // 3. Similarity Feedback Learning: Liked Genres & Directors Boost Similar Candidates
  {
    const learnedProfile: FeedbackProfile = {
      ...EMPTY_FEEDBACK_PROFILE,
      totalFeedbacks: 5,
      genreSignals: { "Sci-Fi": 4.5, Adventure: 3.0, Horror: -6.0 },
      directorSignals: { "Christopher Nolan": 4.0, "Uwe Boll": -5.0 },
      keywordSignals: { space: 2.0, "time-travel": 2.5, "jump-scare": -3.0 },
      eraSignals: { "2020s": 1.5, "1980s": -1.0 },
    };

    // Candidate A: Positive affinity (Sci-Fi, Nolan, Space)
    const candidateAAdj = calculateMovieFeedbackAdjustment(
      "movie-novel-sci-fi",
      ["Sci-Fi", "Adventure"],
      2024,
      { director: "Christopher Nolan", keywords: ["space", "time-travel"] },
      learnedProfile
    );
    assert(candidateAAdj > 0, "Candidate with liked genres and director must receive positive adjustment");
    assert(candidateAAdj <= FEEDBACK_ADJUSTMENT_BOUNDS.MAX, "Adjustment must not exceed maximum clamp bound");
    assert(candidateAAdj >= 8, "Strong similarity match should receive significant boost (>= +8)");

    // Candidate B: Negative affinity (Horror, Uwe Boll, Jump Scare)
    const candidateBAdj = calculateMovieFeedbackAdjustment(
      "movie-bad-horror",
      ["Horror"],
      1985,
      { director: "Uwe Boll", keywords: ["jump-scare"] },
      learnedProfile
    );
    assert(candidateBAdj < 0, "Candidate with disliked features must receive negative adjustment");
    assert(candidateBAdj >= FEEDBACK_ADJUSTMENT_BOUNDS.MIN, "Penalty must not breach minimum clamp bound");
    assert(candidateBAdj <= -10, "Strong negative similarity match should receive significant penalty (<= -10)");
  }

  // 4. Score Clamping & Saturation Guardrails
  {
    const extremeProfile: FeedbackProfile = {
      ...EMPTY_FEEDBACK_PROFILE,
      totalFeedbacks: 20,
      genreSignals: { "Sci-Fi": 50.0, Action: 30.0 },
      directorSignals: { "Denis Villeneuve": 25.0 },
      keywordSignals: { cyberpunk: 20.0, dystopia: 20.0 },
      eraSignals: { "2020s": 10.0 },
    };

    const clampedAdj = calculateMovieFeedbackAdjustment(
      "movie-extreme-positive",
      ["Sci-Fi", "Action"],
      2024,
      { director: "Denis Villeneuve", keywords: ["cyberpunk", "dystopia"] },
      extremeProfile
    );
    assert(clampedAdj === FEEDBACK_ADJUSTMENT_BOUNDS.MAX, "Extreme positive feedback must strictly clamp to MAX (10)");

    const extremeDislikeProfile: FeedbackProfile = {
      ...EMPTY_FEEDBACK_PROFILE,
      totalFeedbacks: 20,
      genreSignals: { Romance: -40.0, Comedy: -30.0 },
      directorSignals: { "Unknown Director": -25.0 },
      keywordSignals: { slapstick: -20.0 },
    };

    const clampedDislikeAdj = calculateMovieFeedbackAdjustment(
      "movie-extreme-negative",
      ["Romance", "Comedy"],
      2015,
      { director: "Unknown Director", keywords: ["slapstick"] },
      extremeDislikeProfile
    );
    assert(clampedDislikeAdj === FEEDBACK_ADJUSTMENT_BOUNDS.MIN, "Extreme negative feedback must strictly clamp to MIN (-15)");
  }

  // 5. TV Parity: TV Feedback Learning & Similarity
  {
    const mockTvProfile: TvFeedbackProfile = {
      ...EMPTY_TV_FEEDBACK_PROFILE,
      totalFeedbacks: 4,
      likedShowIds: new Set(["tv-liked-1"]),
      dislikedShowIds: new Set(["tv-disliked-1"]),
      watchlistShowIds: new Set(["tv-watchlist-1"]),
      hiddenShowIds: new Set(["tv-hidden-1"]),
      watchedShowIds: new Set(["tv-watched-1"]),
      genreSignals: { Mystery: 3.5, SciFi: 3.0, Reality: -5.0 },
      creatorSignals: { "Vince Gilligan": 4.0 },
      networkSignals: { HBO: 2.0, TLC: -3.0 },
      eraSignals: { "2010s": 1.5 },
    };

    const tvCandidate = {
      id: "tv-novel",
      tmdbId: 301,
      name: "Better Call Saul",
      originalName: "Better Call Saul",
      overview: "Legal drama.",
      posterPath: "/poster.jpg",
      backdropPath: null,
      firstAirDate: "2015-02-08",
      popularity: 95,
      voteAverage: 8.9,
      originalLanguage: "en",
      originCountry: ["US"],
      status: "Ended",
      metadata: {
        genres: ["Mystery", "Drama"],
        created_by: ["Vince Gilligan"],
        networks: ["AMC"],
      },
    };

    const tvAdj = calculateTvFeedbackAdjustment(tvCandidate as any, mockTvProfile);
    assert(tvAdj > 0, "TV candidate with liked creator and genre must receive positive adjustment");
    assert(tvAdj <= TV_FEEDBACK_ADJUSTMENT_BOUNDS.max, "TV adjustment must be within bounds");
  }

  // 6. Hybrid AI Rerank Prompt Payload with Feedback Signals
  {
    const mockAiProfile: AiTasteProfile = {
      corePreferences: ["atmospheric sci-fi", "psychological thrillers"],
      strongDislikes: ["shallow comedy", "torture porn"],
      storyPreferences: ["complex non-linear plots"],
      preferredCharacteristics: ["rich worldbuilding"],
      avoidCharacteristics: ["cliche tropes"],
    };

    const mockCandidates: ScoredCandidate[] = [
      {
        movie: {
          id: "m-1",
          tmdbId: 101,
          title: "Arrival",
          originalTitle: "Arrival",
          releaseYear: 2016,
          popularity: 90,
          voteAverage: 8.0,
          posterPath: "/poster.jpg",
          backdropPath: null,
          genres: ["Sci-Fi", "Drama"],
          overview: "Linguist communicates with aliens.",
          candidateSource: "FRESH_DISCOVERY",
        },
        rawMatchScore: 88,
        displayMatchScore: 88,
        qualityScore: 0.85,
        matchLabel: "Kuvvetli Uyum",
        feedbackAdjustment: 4,
        dislikePenalty: 0,
        components: {
          genre: 0.9,
          era: 0.8,
          popularity: 0.7,
          quality: 0.85,
          discovery: 0.6,
          feedback: 0.4,
          tasteFit: 0.9,
          evidenceFit: 0.8,
          qualityFit: 0.85,
        },
        reasons: ["Strong genre fit"],
      },
    ];

    const feedbackSummary = {
      recentLikes: ["Blade Runner 2049", "Interstellar"],
      recentDislikes: ["Transformers"],
      recentWatchlist: ["Dune: Part Two"],
    };

    const promptPayload = buildAiRerankPromptPayload(mockAiProfile, mockCandidates, feedbackSummary);
    assert((promptPayload.userTasteProfile as any).feedbackSignals !== undefined, "Prompt payload must include feedbackSignals");
    assert((promptPayload.userTasteProfile as any).feedbackSignals.recentLikes.includes("Blade Runner 2049"), "recentLikes must be in prompt payload");
    assert((promptPayload.userTasteProfile as any).feedbackSignals.recentWatchlist.includes("Dune: Part Two"), "recentWatchlist must be in prompt payload");
  }

  console.log("  ✅ Recommendation Feedback Learning Loop Unit Tests Passed.");
}
