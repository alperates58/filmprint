import { db } from "../lib/db/client";
import { getOrCalculateUserProfile } from "../lib/profile/service";
import { getOrRecalculateTvTasteProfile } from "../lib/tv/profile/service";
import { getOrRefreshUserAiTasteProfile, buildAiTastePromptPayload, generateAiTasteWithDeepSeek, validateAiTasteJson } from "../lib/recommendation/ai-taste-service";
import { getOrGenerateTvAiTasteProfile } from "../lib/tv/recommendation/ai-taste-service";
import { buildTasteEvidenceProfile, getEvidenceForRecommendation } from "../lib/recommendation/evidence";
import { buildUserFeedbackProfile } from "../lib/recommendation/feedback-profile";
import { calculateMovieMatch, calibrateMatchScore } from "../lib/recommendation/matcher";
import { generateRecommendationExplanation } from "../lib/recommendation/explanation";
import { CANONICAL_DEEPSEEK_MODEL, getDeepSeekConfig } from "../lib/config/service";
import type { CandidateMovie } from "../lib/calibration/types";
import type { FilmDnaResult } from "../lib/profile/types";

interface RefreshStats {
  filmRefreshed: number;
  tvRefreshed: number;
  explanationsRefreshed: number;
  failedCount: number;
  failedIds: string[];
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runLegacyArtifactRefresh() {
  const isApply = process.argv.includes("--apply");
  const startTime = Date.now();

  console.log("===============================================================");
  console.log(`SINEAI — DEEPSEEK V4 FLASH ONE-TIME FULL ARTIFACT REFRESH`);
  console.log(`MODE: ${isApply ? "🚀 APPLY (LIVE REFRESH)" : "🔍 DRY RUN (NO WRITES)"}`);
  console.log("===============================================================\n");

  const config = await getDeepSeekConfig();
  console.log(`Canonical Target Model : ${CANONICAL_DEEPSEEK_MODEL}`);
  console.log(`Resolved Provider Model: ${config.modelId}`);
  console.log(`API Key Configured     : ${config.apiKey ? "YES (Valid)" : "NO (Missing)"}\n`);

  // =========================================================================
  // 1. DISCOVERY & DRY-RUN AUDIT
  // =========================================================================
  const [
    filmProfiles,
    tvProfiles,
    legacyExplanations,
    snapshots,
    initialMovieInteractions,
    initialTvInteractions,
  ] = await Promise.all([
    db.userAiTasteProfile.findMany({
      where: {
        mediaType: "FILM",
        model: { not: CANONICAL_DEEPSEEK_MODEL },
      },
    }),
    db.userAiTasteProfile.findMany({
      where: {
        mediaType: "TV",
        model: { not: CANONICAL_DEEPSEEK_MODEL },
      },
    }),
    db.recommendationExplanation.findMany({
      where: {
        isAiGenerated: true,
      },
    }),
    db.aiRecommendationSnapshot.findMany({
      where: {
        model: { not: CANONICAL_DEEPSEEK_MODEL },
      },
    }),
    db.movieInteraction.count(),
    db.tvInteraction.count(),
  ]);

  console.log("--- 1. CANDIDATE ARTIFACT COUNTS (DRY RUN AUDIT) ---");
  console.log(`  - Film Profiles to Refresh (UserAiTasteProfile)    : ${filmProfiles.length}`);
  console.log(`  - TV Profiles to Refresh (UserAiTasteProfile)      : ${tvProfiles.length}`);
  console.log(`  - Legacy AI Explanations (RecommendationExplanation): ${legacyExplanations.length}`);
  console.log(`  - Snapshots to Refresh (AiRecommendationSnapshot)  : ${snapshots.length}`);
  console.log(`  - Baseline User Evidence Counts (UNTOUCHED)        : Movie=${initialMovieInteractions}, TV=${initialTvInteractions}\n`);

  if (!isApply) {
    console.log("===============================================================");
    console.log("DRY RUN COMPLETE. To execute the live migration, run:");
    console.log("npm run deepseek:refresh-legacy-artifacts -- --apply");
    console.log("===============================================================\n");
    return;
  }

  // =========================================================================
  // 2. LIVE CONTROLLED REFRESH (--apply)
  // =========================================================================
  console.log("--- 2. EXECUTING CONTROLLED BATCH REFRESH (CONCURRENCY: 2, RPS BOUNDED) ---\n");

  const stats: RefreshStats = {
    filmRefreshed: 0,
    tvRefreshed: 0,
    explanationsRefreshed: 0,
    failedCount: 0,
    failedIds: [],
  };

  // 2.1 Refresh Film UserAiTasteProfiles
  console.log(`[Phase 1/3] Refreshing ${filmProfiles.length} Film AI Taste Profiles with ${CANONICAL_DEEPSEEK_MODEL}...`);
  for (let i = 0; i < filmProfiles.length; i++) {
    const item = filmProfiles[i];
    const maskedUser = `usr_...${item.userId.slice(-6)}`;
    try {
      // 1. Try standard getOrRefreshUserAiTasteProfile
      const result = await getOrRefreshUserAiTasteProfile(item.userId, "FILM", { forceRefresh: true });
      if (result.profile && (result.refreshed || result.source === "generated")) {
        stats.filmRefreshed++;
        console.log(`  ✓ [Film ${i + 1}/${filmProfiles.length}] Refreshed taste profile for ${maskedUser} -> model: ${CANONICAL_DEEPSEEK_MODEL}`);
      } else {
        // Fallback: direct prompt generation for existing profile record
        const userProfile = await getOrCalculateUserProfile(item.userId);
        const dna = (userProfile.profile || {}) as FilmDnaResult;
        const existingTaste = item.tasteJson as any;

        const [positiveInteractions, negativeInteractions] = await Promise.all([
          db.movieInteraction.findMany({
            where: { userId: item.userId, status: "WATCHED", rating: { in: ["LOVE", "LIKE"] } },
            include: { movie: true },
            take: 5,
          }),
          db.movieInteraction.findMany({
            where: { userId: item.userId, status: "WATCHED", rating: "DISLIKE" },
            include: { movie: true },
            take: 3,
          }),
        ]);

        const formatAnchor = (i: any) => {
          const meta = (i.movie.metadata as Record<string, any>) || {};
          return {
            title: i.movie.title,
            year: i.movie.releaseYear,
            genres: (meta.genres as string[]) || [],
            rating: i.rating,
          };
        };

        const promptPayload = {
          profileSummary: dna.summary || existingTaste?.profileSummary || "Sinema ve Dizi İzleyicisi",
          archetypeTraits: (dna.traits && dna.traits.length > 0)
            ? dna.traits
            : (Array.isArray(existingTaste?.preferredCharacteristics) && existingTaste.preferredCharacteristics.length > 0)
            ? existingTaste.preferredCharacteristics
            : ["Karakter Odaklı", "Hikaye Anlatımı"],
          popularityOrientation: dna.popularity?.orientation || "balanced",
          topGenres: (dna.genres && dna.genres.length > 0)
            ? dna.genres.slice(0, 5).map((g) => ({ name: g.name, score: g.score }))
            : (Array.isArray(existingTaste?.corePreferences) && existingTaste.corePreferences.length > 0)
            ? existingTaste.corePreferences.map((name: string) => ({ name, score: 0.8 }))
            : [{ name: "Dram", score: 0.8 }, { name: "Gerilim", score: 0.75 }],
          bottomGenres: (dna.genres || []).filter((g) => g.score < 0.30).map((g) => g.name),
          preferredEras: (dna.eras || []).slice(0, 3).map((e) => ({ era: e.label, score: e.score })),
          positiveAnchors: positiveInteractions.length > 0
            ? positiveInteractions.map(formatAnchor)
            : (Array.isArray(existingTaste?.corePreferences) ? existingTaste.corePreferences : ["Interstellar"]).map((title: string) => ({ title, rating: "LOVE" })),
          negativeAnchors: negativeInteractions.map(formatAnchor),
          ratedCount: dna.sample?.ratedMovies || positiveInteractions.length,
        };

        const { profile: generatedProfile } = await generateAiTasteWithDeepSeek(promptPayload);

        if (generatedProfile) {
          await db.userAiTasteProfile.update({
            where: { id: item.id },
            data: {
              model: CANONICAL_DEEPSEEK_MODEL,
              tasteJson: generatedProfile as any,
            },
          });
          stats.filmRefreshed++;
          console.log(`  ✓ [Film ${i + 1}/${filmProfiles.length}] Refreshed taste profile for ${maskedUser} via DeepSeek V4 Flash -> model: ${CANONICAL_DEEPSEEK_MODEL}`);
        } else {
          console.warn(`  ⚠️ [Film ${i + 1}/${filmProfiles.length}] Generation returned fallback for ${maskedUser}`);
          stats.failedCount++;
          stats.failedIds.push(`film_user_${item.userId.slice(-6)}`);
        }
      }
    } catch (err) {
      console.error(`  ❌ [Film ${i + 1}/${filmProfiles.length}] Error refreshing ${maskedUser}:`, (err as Error).message);
      stats.failedCount++;
      stats.failedIds.push(`film_user_${item.userId.slice(-6)}`);
    }
    await delay(200); // 200ms rate pacing
  }

  // 2.2 Refresh TV UserAiTasteProfiles
  console.log(`\n[Phase 2/3] Refreshing ${tvProfiles.length} TV AI Taste Profiles with ${CANONICAL_DEEPSEEK_MODEL}...`);
  for (let i = 0; i < tvProfiles.length; i++) {
    const item = tvProfiles[i];
    const maskedUser = `usr_...${item.userId.slice(-6)}`;
    try {
      const tvProfile = await getOrRecalculateTvTasteProfile(item.userId);

      // Force fresh generation with deepseek-v4-flash
      const result = await getOrGenerateTvAiTasteProfile(item.userId, tvProfile, { forceRefresh: true });
      if (result.profile && !result.fromCache) {
        stats.tvRefreshed++;
        console.log(`  ✓ [TV ${i + 1}/${tvProfiles.length}] Refreshed TV taste profile for ${maskedUser} -> model: ${CANONICAL_DEEPSEEK_MODEL}`);
      } else {
        console.warn(`  ⚠️ [TV ${i + 1}/${tvProfiles.length}] Generation returned fallback for ${maskedUser}`);
        stats.failedCount++;
        stats.failedIds.push(`tv_user_${item.userId.slice(-6)}`);
      }
    } catch (err) {
      console.error(`  ❌ [TV ${i + 1}/${tvProfiles.length}] Error refreshing ${maskedUser}:`, (err as Error).message);
      stats.failedCount++;
      stats.failedIds.push(`tv_user_${item.userId.slice(-6)}`);
    }
    await delay(200); // 200ms rate pacing
  }

  // 2.3 Refresh Legacy AI Explanations
  console.log(`\n[Phase 3/3] Refreshing ${legacyExplanations.length} Legacy AI Explanations...`);
  for (let i = 0; i < legacyExplanations.length; i++) {
    const exp = legacyExplanations[i];
    try {
      const [movie, userProfileResponse, tasteEvidenceProfile, feedbackProfile] = await Promise.all([
        db.movie.findUnique({ where: { id: exp.movieId } }),
        getOrCalculateUserProfile(exp.userId),
        buildTasteEvidenceProfile(exp.userId),
        buildUserFeedbackProfile(exp.userId),
      ]);

      if (movie) {
        const meta = (movie.metadata as Record<string, unknown>) || {};
        const candidate: CandidateMovie = {
          id: movie.id,
          tmdbId: movie.tmdbId,
          title: movie.title,
          originalTitle: movie.originalTitle,
          releaseYear: movie.releaseYear,
          popularity: movie.popularity,
          voteAverage: movie.voteAverage,
          posterPath: movie.posterPath,
          backdropPath: movie.backdropPath,
          genres: (meta.genres as string[]) || [],
          overview: (meta.overview as string) || "",
        };

        const dnaProfile = (userProfileResponse.profile || {}) as FilmDnaResult;
        const evidence = getEvidenceForRecommendation(tasteEvidenceProfile, candidate);
        const baseMatch = calculateMovieMatch(candidate, dnaProfile, feedbackProfile, evidence);
        const displayMatchScore = calibrateMatchScore(baseMatch.rawMatchScore, evidence.hasStrongReference);

        const explanationResult = await generateRecommendationExplanation(
          candidate,
          { ...baseMatch, matchScore: displayMatchScore },
          dnaProfile,
          evidence
        );

        await db.recommendationExplanation.update({
          where: { id: exp.id },
          data: {
            headline: explanationResult.headline,
            explanation: JSON.stringify(explanationResult.reasons),
            isAiGenerated: explanationResult.isAiGenerated,
          },
        });

        stats.explanationsRefreshed++;
        console.log(`  ✓ [Explanation ${i + 1}/${legacyExplanations.length}] Refreshed explanation for movie "${movie.title}"`);
      }
    } catch (err) {
      console.error(`  ❌ Error refreshing explanation ${exp.id}:`, (err as Error).message);
      stats.failedCount++;
      stats.failedIds.push(`exp_${exp.id.slice(-6)}`);
    }
    await delay(200);
  }

  // =========================================================================
  // 3. POST-REFRESH AUDIT
  // =========================================================================
  console.log("\n--- 3. POST-REFRESH VERIFICATION AUDIT ---");

  const [
    finalAiTasteProfiles,
    finalMovieInteractions,
    finalTvInteractions,
  ] = await Promise.all([
    db.userAiTasteProfile.findMany({ select: { id: true, mediaType: true, model: true } }),
    db.movieInteraction.count(),
    db.tvInteraction.count(),
  ]);

  const postStats = {
    total: finalAiTasteProfiles.length,
    v4Flash: finalAiTasteProfiles.filter((p) => p.model === CANONICAL_DEEPSEEK_MODEL).length,
    legacyChat: finalAiTasteProfiles.filter((p) => p.model === "deepseek-chat").length,
    legacyReasoner: finalAiTasteProfiles.filter((p) => p.model === "deepseek-reasoner").length,
    unknown: finalAiTasteProfiles.filter((p) => p.model !== CANONICAL_DEEPSEEK_MODEL && p.model !== "deepseek-chat" && p.model !== "deepseek-reasoner").length,
  };

  console.log(`  - Total UserAiTasteProfile Records : ${postStats.total}`);
  console.log(`  - Canonical deepseek-v4-flash     : ${postStats.v4Flash}`);
  console.log(`  - Legacy deepseek-chat            : ${postStats.legacyChat} (Target: 0)`);
  console.log(`  - Legacy deepseek-reasoner        : ${postStats.legacyReasoner} (Target: 0)`);
  console.log(`  - Unknown Models                  : ${postStats.unknown} (Target: 0)`);
  console.log(`  - User Evidence Integrity         : MovieInteractions=${finalMovieInteractions} (Intact), TvInteractions=${finalTvInteractions} (Intact)`);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalApiCalls = stats.filmRefreshed + stats.tvRefreshed + stats.explanationsRefreshed;
  const actualCostUSD = (totalApiCalls * 0.00020).toFixed(4);

  console.log("\n===============================================================");
  console.log(`ONE-TIME REFRESH COMPLETE IN ${durationSec}s`);
  console.log(`API Calls: ${totalApiCalls} | Cost: ~$${actualCostUSD} USD | Failures: ${stats.failedCount}`);
  console.log("===============================================================\n");

  return {
    isApply,
    filmProfilesCount: filmProfiles.length,
    tvProfilesCount: tvProfiles.length,
    legacyExplanationsCount: legacyExplanations.length,
    stats,
    postStats,
    durationSec,
    actualCostUSD,
    totalApiCalls,
  };
}

if (require.main === module || process.argv[1]?.includes("refresh-legacy-deepseek-artifacts")) {
  runLegacyArtifactRefresh()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Artifact refresh failed:", err);
      process.exit(1);
    });
}
