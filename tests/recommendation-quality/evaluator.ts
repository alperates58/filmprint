import { db } from "../../lib/db/client";
import {
  FixtureArchetypeSpec,
  ProfileQualityEvaluationResult,
  EvaluatedRecommendationItem,
  EvaluatedHomeRow,
  PipelineAttritionStats,
} from "./types";
import { setupFixtureUser, generateIndependentGroundTruth, cleanupFixtureUser } from "./fixtures";
import { getPersonalizedRecommendations } from "../../lib/recommendation/service";
import { filterEligibleMovies } from "../../lib/movies/eligibility";
import {
  calculateCategoryContextFit,
  filterCategoryCandidatesWithRelaxation,
  deduplicateHomeModules,
} from "../../lib/recommendation/editorial-scorer";
import { calculateMovieMatch } from "../../lib/recommendation/matcher";
import { calculateDislikePenalty } from "../../lib/recommendation/evidence";
import { calculateQualityScore } from "../../lib/recommendation/quality";
import {
  calculatePrecisionAtK,
  calculateRecallAtK,
  calculateHitRateAtK,
  calculateMRR,
  calculateNDCGAtK,
  calculateEntropy,
  calculateIntraListDiversity,
  evaluateScoreCalibration,
  calculateCompositeProfileScore,
} from "./metrics";
import { CandidateMovie } from "../../lib/calibration/types";
import { EditorialCategoryMode } from "../../lib/recommendation/types";
import { FilmDnaResult } from "../../lib/profile/types";

export interface ProfileEvaluationOptions {
  hybridEnabled?: boolean;
  hybridMatchWeight?: number;
  hybridAiWeight?: number;
  frozenAiTasteProfile?: any;
  frozenAiAffinityMap?: Map<string, { affinity: number; signals: string[] }>;
}

/**
 * Runs full quality evaluation for a single fixture user profile.
 */
export async function evaluateProfileQuality(
  spec: FixtureArchetypeSpec,
  options?: ProfileEvaluationOptions
): Promise<ProfileQualityEvaluationResult> {
  console.log(`\n===============================================================`);
  console.log(`EVALUATING PROFILE: [${spec.id}] ${spec.name} (${spec.maturity} interactions)`);
  console.log(`===============================================================`);

  // 1. Setup Fixture in PostgreSQL
  const setup = await setupFixtureUser(spec);
  const userId = setup.userId;

  try {
    // 2. Fetch User Profile
    const profileRecord = await db.userTasteProfile.findUnique({ where: { userId } });
    const profile = ((profileRecord?.profileJson || {}) as unknown) as FilmDnaResult;
    const profileConfidence = profileRecord?.confidence || 0.0;

    // Seed frozen AI Taste Profile if provided
    if (options?.frozenAiTasteProfile) {
      await db.userAiTasteProfile.upsert({
        where: { userId_mediaType: { userId, mediaType: "FILM" } },
        update: {
          profileVersion: profile.version || 1,
          aiTasteVersion: 1,
          model: "deepseek-chat",
          tasteJson: options.frozenAiTasteProfile as any,
          sourceEvidenceCount: setup.watchedCount,
          inputFingerprint: `frozen_${spec.id}`,
        },
        create: {
          userId,
          mediaType: "FILM",
          profileVersion: profile.version || 1,
          aiTasteVersion: 1,
          model: "deepseek-chat",
          tasteJson: options.frozenAiTasteProfile as any,
          sourceEvidenceCount: setup.watchedCount,
          inputFingerprint: `frozen_${spec.id}`,
        },
      });
    }

    // Count remaining unseen eligible catalog
    const userInteractions = await db.movieInteraction.findMany({
      where: { userId },
      select: { movieId: true, status: true, rating: true },
    });
    const interactedMovieIds = new Set(userInteractions.map((i) => i.movieId));

    const allCatalogMovies = await db.movie.findMany({
      select: {
        id: true,
        tmdbId: true,
        title: true,
        originalTitle: true,
        releaseYear: true,
        popularity: true,
        voteAverage: true,
        posterPath: true,
        backdropPath: true,
        metadata: true,
      },
    });

    const formatToCandidate = (m: any): CandidateMovie & { metadata?: any; adult?: boolean; voteCount?: number } => {
      const meta = (m.metadata as Record<string, any>) || {};
      return {
        id: m.id,
        tmdbId: m.tmdbId,
        title: m.title,
        originalTitle: m.originalTitle,
        releaseYear: m.releaseYear,
        popularity: m.popularity,
        voteAverage: m.voteAverage,
        posterPath: m.posterPath,
        backdropPath: m.backdropPath,
        genres: (meta.genres as string[]) || [],
        overview: (meta.overview as string) || "",
        adult: meta.adult === true,
        voteCount: meta.voteCount,
        metadata: meta,
      };
    };

    const formattedCatalog = allCatalogMovies.map(formatToCandidate);
    const eligibleCatalog = filterEligibleMovies(formattedCatalog, "RECOMMENDATION");
    const unseenEligibleCatalog = eligibleCatalog.filter((m) => !interactedMovieIds.has(m.id));
    const unseenEligibleCatalogCount = unseenEligibleCatalog.length;

    console.log(`- Catalog supply: ${eligibleCatalog.length} eligible, ${unseenEligibleCatalogCount} unseen candidates`);

    // 3. Run Recommendation Service (limit 24)
    const recResponse = await getPersonalizedRecommendations(userId, {
      limit: 24,
      page: 0,
      debugMode: true,
      hybridEnabledOverride: options?.hybridEnabled,
      hybridMatchWeightOverride: options?.hybridMatchWeight,
      hybridAiWeightOverride: options?.hybridAiWeight,
      frozenAiAffinityMap: options?.frozenAiAffinityMap,
    });
    const rawRecommendations = recResponse.recommendations || [];

    // Map positively rated movies for reference validity check
    const positiveMovieIds = new Set(
      userInteractions.filter((i) => i.status === "WATCHED" && (i.rating === "LOVE" || i.rating === "LIKE")).map((i) => i.movieId)
    );

    // 4. Evaluate Each Recommendation against Independent Ground Truth
    const referenceUsageMap: Record<string, number> = {};
    let invalidReferenceCount = 0;

    const evaluatedItems: EvaluatedRecommendationItem[] = rawRecommendations.map((item, idx) => {
      const isHoldout = setup.holdoutMovieIds.has(item.movie.id);
      const groundTruth = generateIndependentGroundTruth(spec, item.movie, isHoldout);

      // Track reference movie usage
      const selectedRef = item.evidence?.positiveReferences?.[0] || null;
      let selectedRefTitle: string | null = null;
      let refSimilarity: number | null = null;

      if (selectedRef) {
        selectedRefTitle = selectedRef.title;
        refSimilarity = selectedRef.similarityScore;
        referenceUsageMap[selectedRef.title] = (referenceUsageMap[selectedRef.title] || 0) + 1;

        // Assertion: Reference must be a positively rated movie
        if (!positiveMovieIds.has(selectedRef.movieId)) {
          invalidReferenceCount++;
          console.warn(`⚠️ Invalid reference detected for movie '${item.movie.title}': '${selectedRef.title}' was not positively rated!`);
        }
      }

      return {
        rank: idx + 1,
        movieId: item.movie.id,
        tmdbId: item.movie.tmdbId,
        title: item.movie.title,
        originalTitle: item.movie.originalTitle,
        releaseYear: item.movie.releaseYear,
        genres: item.movie.genres || [],
        voteAverage: item.movie.voteAverage,
        popularity: item.movie.popularity,
        candidateSource: item.candidateSource || "FRESH_DISCOVERY",
        rawMatchScore: item.rawMatch ?? item.match,
        displayMatchScore: item.displayMatch ?? item.match,
        qualityScore: item.components?.quality || 0.7,
        matchLabel: item.matchLabel,
        headline: item.headline,
        reasons: item.reasons,
        isAiGenerated: item.isAiGenerated,
        selectedReferenceTitle: selectedRefTitle,
        referenceSimilarity: refSimilarity,
        expectedRelevance: groundTruth.expectedRelevance,
        isHoldout,
      };
    });

    // 5. Trace Pipeline Attrition
    const attrition: PipelineAttritionStats = {
      candidatePoolRaw: allCatalogMovies.length,
      postEligibility: eligibleCatalog.length,
      postQualityFilter: evaluatedItems.length,
      postTasteScore: evaluatedItems.length,
      postDislikePenalty: evaluatedItems.length,
      finalRecommendationCount: evaluatedItems.length,
    };

    // 6. Evaluate Home Editorial Categories
    const homeCandidatePool = eligibleCatalog.filter((m) => {
      const isWatched = userInteractions.some((i) => i.movieId === m.id && i.status === "WATCHED");
      return !isWatched;
    });

    const notWatchedSet = new Set(
      userInteractions.filter((i) => i.status === "NOT_WATCHED").map((i) => i.movieId)
    );

    const editorialModes: { id: string; title: string; mode: EditorialCategoryMode }[] = [
      { id: "known-unwatched", title: "Bunu İzlemediğini Söylemiştin", mode: "KNOWN_UNWATCHED_ROW" },
      { id: "rainy", title: "Yağmurlu Hava, Sıcak Kahve", mode: "RAINY_COFFEE" },
      { id: "thriller", title: "Çok Gerileyim", mode: "HIGH_TENSION" },
      { id: "feel-good", title: "Hafif Ama Çok İyi", mode: "LIGHT_BUT_GOOD" },
      { id: "mind-bending", title: "Ruhum Değişsin", mode: "MIND_BENDING" },
      { id: "night", title: "Tek Başına Gece Seansı", mode: "SOLO_NIGHT" },
      { id: "classic", title: "Bugün Bir Klasik İzle", mode: "CLASSIC" },
      { id: "gems", title: "Az Bilinen Gizli Cevherler", mode: "HIDDEN_GEMS" },
      { id: "brainy", title: "Beyni Açan Filmler", mode: "BRAINY" },
      { id: "short", title: "Kısa Sürede Bitirebileceklerin", mode: "SHORT" },
      { id: "family-comedy", title: "Ailece İzlemelik Komediler", mode: "FAMILY_COMEDY" },
    ];

    const rawHomeModules = editorialModes.map((cat) => {
      const candidatesWithSource = homeCandidatePool.map((c) => ({
        ...c,
        candidateSource: notWatchedSet.has(c.id) ? "KNOWN_UNWATCHED" : "FRESH_DISCOVERY",
        knownUnwatched: notWatchedSet.has(c.id),
      }));

      const contextFiltered = candidatesWithSource.filter(
        (m) => calculateCategoryContextFit(m, cat.mode) >= 0.20
      );
      const relaxed = filterCategoryCandidatesWithRelaxation(contextFiltered, cat.mode, 12);

      const scored = relaxed
        .map((candidate) => {
          const matchRes = calculateMovieMatch(candidate, profile);
          const contextFit = calculateCategoryContextFit(candidate, cat.mode);
          const qualityScore = calculateQualityScore(candidate);
          const isKnownUnwatched = notWatchedSet.has(candidate.id);

          const finalScore =
            matchRes.displayMatchScore * 0.40 +
            contextFit * 40 +
            qualityScore * 20 +
            (isKnownUnwatched ? 6 : 0);

          return {
            candidate,
            finalScore,
            contextFit,
          };
        })
        .filter((item) => item.contextFit >= 0.20)
        .sort((a, b) => b.finalScore - a.finalScore)
        .map((item) => item.candidate);

      return {
        id: cat.id,
        title: cat.title,
        mode: cat.mode,
        candidateCount: scored.length,
        movies: scored,
      };
    });

    const deduplicatedModules = deduplicateHomeModules(rawHomeModules, true);
    const validHomeRows = deduplicatedModules.filter((m) => m.movies.length >= 4);

    const evaluatedHomeRows: EvaluatedHomeRow[] = validHomeRows.map((mod) => {
      const topMovies = mod.movies.slice(0, 8);
      const evaluatedMovies = topMovies.map((m) => {
        const contextFit = calculateCategoryContextFit(m, mod.mode);
        const matchRes = calculateMovieMatch(m, profile);
        return {
          movieId: m.id,
          tmdbId: m.tmdbId,
          title: m.title,
          genres: m.genres || [],
          releaseYear: m.releaseYear,
          voteAverage: m.voteAverage,
          contextFit: Number(contextFit.toFixed(2)),
          categoryScore: matchRes.displayMatchScore,
        };
      });

      const avgFit =
        evaluatedMovies.length > 0
          ? evaluatedMovies.reduce((a, b) => a + b.contextFit, 0) / evaluatedMovies.length
          : 0.0;

      return {
        categoryId: mod.id,
        categoryTitle: mod.title,
        categoryMode: mod.mode,
        candidateCount: mod.candidateCount,
        renderedCount: evaluatedMovies.length,
        movies: evaluatedMovies,
        averageContextFit: Number(avgFit.toFixed(2)),
        categoryFitPass: avgFit >= 0.40,
      };
    });

    // Cross-row duplication metrics
    const allRenderedHomeMovies = evaluatedHomeRows.flatMap((r) => r.movies);
    const movieAppearanceMap = new Map<string, number>();
    for (const m of allRenderedHomeMovies) {
      movieAppearanceMap.set(m.movieId, (movieAppearanceMap.get(m.movieId) || 0) + 1);
    }

    let duplicateCount = 0;
    let maxAppearances = 0;
    for (const count of movieAppearanceMap.values()) {
      if (count > 1) duplicateCount += (count - 1);
      if (count > maxAppearances) maxAppearances = count;
    }

    const homeCrossRowDuplicateRate =
      allRenderedHomeMovies.length > 0
        ? Number((duplicateCount / allRenderedHomeMovies.length).toFixed(3))
        : 0.0;

    const homeCategoryFitAverage =
      evaluatedHomeRows.length > 0
        ? Number(
            (
              evaluatedHomeRows.reduce((a, b) => a + b.averageContextFit, 0) /
              evaluatedHomeRows.length
            ).toFixed(2)
          )
        : 0.0;

    // 7. Relevance & Ranking Metrics
    const precisionAt5 = calculatePrecisionAtK(evaluatedItems, 5);
    const precisionAt10 = calculatePrecisionAtK(evaluatedItems, 10);
    const precisionAt20 = calculatePrecisionAtK(evaluatedItems, 20);

    const totalHoldouts = setup.holdoutTmdbIds.size;
    const recallAt10 = calculateRecallAtK(evaluatedItems, totalHoldouts, 10);
    const recallAt20 = calculateRecallAtK(evaluatedItems, totalHoldouts, 20);
    const hitRateAt10 = calculateHitRateAtK(evaluatedItems, 10);
    const hitRateAt20 = calculateHitRateAtK(evaluatedItems, 20);
    const mrr = calculateMRR(evaluatedItems);
    const ndcgAt10 = calculateNDCGAtK(evaluatedItems, 10);
    const ndcgAt20 = calculateNDCGAtK(evaluatedItems, 20);

    const holdoutHitsTop20 = evaluatedItems.slice(0, 20).filter((i) => i.isHoldout).length;
    const holdoutHitRate = totalHoldouts > 0 ? Number((holdoutHitsTop20 / totalHoldouts).toFixed(2)) : 1.0;

    // 8. Calibration Metrics
    const calib = evaluateScoreCalibration(evaluatedItems);

    // 9. Diversity & Novelty
    const genreCounts: Record<string, number> = {};
    const eraCounts: Record<string, number> = {};
    let knownCount = 0;
    let freshCount = 0;
    let adjacentCount = 0;

    const top20 = evaluatedItems.slice(0, 20);
    for (const item of top20) {
      for (const g of item.genres) {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      }
      if (item.releaseYear) {
        const dec = `${Math.floor(item.releaseYear / 10) * 10}s`;
        eraCounts[dec] = (eraCounts[dec] || 0) + 1;
      }
      if (item.candidateSource === "KNOWN_UNWATCHED") knownCount++;
      else if (item.candidateSource === "ADJACENT_DISCOVERY") adjacentCount++;
      else freshCount++;
    }

    const genreDiversityEntropy = calculateEntropy(genreCounts);
    const eraDiversityEntropy = calculateEntropy(eraCounts);
    const intraListDiversity = calculateIntraListDiversity(evaluatedItems);

    const totalTop20GenreAssignments = Object.values(genreCounts).reduce((a, b) => a + b, 0);
    const dominantGenreCount = Math.max(0, ...Object.values(genreCounts));
    const topGenreConcentrationRate =
      totalTop20GenreAssignments > 0
        ? Number((dominantGenreCount / totalTop20GenreAssignments).toFixed(3))
        : 0.0;
    const topGenreConcentrationWarning = topGenreConcentrationRate > 0.65;

    const candidateSourceDistribution = {
      knownUnwatchedPct: top20.length > 0 ? Number((knownCount / top20.length).toFixed(2)) : 0,
      freshDiscoveryPct: top20.length > 0 ? Number((freshCount / top20.length).toFixed(2)) : 0,
      adjacentDiscoveryPct: top20.length > 0 ? Number((adjacentCount / top20.length).toFixed(2)) : 0,
    };

    // 10. Reference Overuse
    let mostReusedReference: { title: string; count: number; percentage: number } | null = null;
    let maxRefCount = 0;
    let maxRefTitle = "";

    for (const [title, count] of Object.entries(referenceUsageMap)) {
      if (count > maxRefCount) {
        maxRefCount = count;
        maxRefTitle = title;
      }
    }

    if (maxRefCount > 0 && evaluatedItems.length > 0) {
      const pct = Number(((maxRefCount / evaluatedItems.length) * 100).toFixed(1));
      mostReusedReference = {
        title: maxRefTitle,
        count: maxRefCount,
        percentage: pct,
      };
    }

    const referenceOveruseWarning = mostReusedReference ? mostReusedReference.percentage > 30.0 : false;

    // 11. Sub-Scores (/100)
    const relevanceScore = Number((precisionAt10 * 60 + ndcgAt10 * 40).toFixed(1));
    const calibrationScore = Number(
      (
        calib.precisionScoreGte90 * 50 +
        (calib.scoreMonotonicityPass ? 30 : 0) +
        (!calib.scoreSaturationWarning ? 20 : 0)
      ).toFixed(1)
    );
    const categoryFitScore = Number(
      (
        homeCategoryFitAverage * 60 +
        (validHomeRows.length >= 5 ? 30 : validHomeRows.length * 5) +
        (homeCrossRowDuplicateRate <= 0.10 ? 10 : 0)
      ).toFixed(1)
    );
    const diversityScore = Number(
      (
        intraListDiversity * 50 +
        (!topGenreConcentrationWarning ? 30 : 0) +
        (genreDiversityEntropy >= 2.0 ? 20 : 10)
      ).toFixed(1)
    );
    const referenceQualityScore = Number(
      (
        (invalidReferenceCount === 0 ? 50 : 0) +
        (!referenceOveruseWarning ? 50 : 20)
      ).toFixed(1)
    );
    const supplyHealthScore = Number(
      (
        (unseenEligibleCatalogCount >= 2000 ? 50 : 25) +
        (evaluatedItems.length >= 24 ? 50 : evaluatedItems.length * 2)
      ).toFixed(1)
    );

    const subScores = {
      relevanceScore,
      calibrationScore,
      categoryFitScore,
      diversityScore,
      referenceQualityScore,
      supplyHealthScore,
    };

    const overallProfileScore = calculateCompositeProfileScore(subScores);

    // Top worst & best items
    const worstRecommendations = [...evaluatedItems]
      .sort((a, b) => a.expectedRelevance - b.expectedRelevance || b.displayMatchScore - a.displayMatchScore)
      .slice(0, 5);

    const bestRecommendations = [...evaluatedItems]
      .sort((a, b) => b.expectedRelevance - a.expectedRelevance || b.displayMatchScore - a.displayMatchScore)
      .slice(0, 5);

    return {
      spec,
      userId,
      interactionCount: setup.interactionCount,
      watchedCount: setup.watchedCount,
      notWatchedCount: setup.notWatchedCount,
      unseenEligibleCatalogCount,
      profileConfidence,
      precisionAt5,
      precisionAt10,
      precisionAt20,
      recallAt10,
      recallAt20,
      hitRateAt10,
      hitRateAt20,
      mrr,
      ndcgAt10,
      ndcgAt20,
      holdoutTotal: totalHoldouts,
      holdoutHitsTop20,
      holdoutHitRate,
      scoreHistogram: calib.scoreHistogram,
      precisionScoreGte90: calib.precisionScoreGte90,
      precisionScoreGte85: calib.precisionScoreGte85,
      precisionScoreGte80: calib.precisionScoreGte80,
      falseHighScores: calib.falseHighScores,
      falseLowScores: calib.falseLowScores,
      scoreMonotonicityPass: calib.scoreMonotonicityPass,
      scoreSaturationWarning: calib.scoreSaturationWarning,
      genreDiversityEntropy,
      topGenreConcentrationRate,
      topGenreConcentrationWarning,
      eraDiversityEntropy,
      intraListDiversity,
      candidateSourceDistribution,
      totalRecommendations: evaluatedItems.length,
      referenceUsageMap,
      mostReusedReference,
      referenceOveruseWarning,
      invalidReferenceCount,
      attrition,
      homeRows: evaluatedHomeRows,
      homeMeaningfulRowCount: evaluatedHomeRows.length,
      homeAverageMoviesPerRow:
        evaluatedHomeRows.length > 0
          ? Number((allRenderedHomeMovies.length / evaluatedHomeRows.length).toFixed(1))
          : 0,
      homeCrossRowDuplicatesCount: duplicateCount,
      homeCrossRowDuplicateRate,
      homeMaxRowAppearancesPerMovie: maxAppearances,
      homeCategoryFitAverage,
      subScores,
      overallProfileScore,
      topRecommendations: evaluatedItems.slice(0, 10),
      worstRecommendations,
      bestRecommendations,
    };
  } finally {
    // 8. Always clean up fixture user
    await cleanupFixtureUser(userId);
  }
}
