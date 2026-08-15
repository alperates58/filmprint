import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/service";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { getPersonalizedRecommendations } from "@/lib/recommendation/service";
import { calculateMovieMatch } from "@/lib/recommendation/matcher";
import {
  buildTasteEvidenceProfile,
  calculateDislikePenalty,
} from "@/lib/recommendation/evidence";
import {
  calculateCategoryContextFit,
  filterCategoryCandidatesWithRelaxation,
  deduplicateHomeModules,
  CategoryDiagnostics,
} from "@/lib/recommendation/editorial-scorer";
import { calculateQualityScore } from "@/lib/recommendation/quality";
import { filterEligibleMovies } from "@/lib/movies/eligibility";
import { CandidateMovie } from "@/lib/calibration/types";
import { FilmDnaResult } from "@/lib/profile/types";
import { EditorialCategoryMode } from "@/lib/recommendation/types";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const userId = currentUser.id;

    // 1. Fetch user profile, evidence, and interaction sets
    const [profileResponse, tasteEvidenceProfile, watchedInteractions, notWatchedInteractions, feedbacks] =
      await Promise.all([
        getOrCalculateUserProfile(userId),
        buildTasteEvidenceProfile(userId),
        db.movieInteraction.findMany({
          where: { userId, status: "WATCHED" },
          select: { movieId: true },
        }),
        db.movieInteraction.findMany({
          where: { userId, status: "NOT_WATCHED" },
          select: { movieId: true },
        }),
        db.recommendationFeedback.findMany({
          where: { userId },
          select: { movieId: true },
        }),
      ]);

    const profile = (profileResponse.profile || {}) as FilmDnaResult;

    // Excluded from home recommendations:
    // - Movies user WATCHED
    // - Recommendation feedback actions (NOT_INTERESTED, WATCH_LATER)
    const watchedMovieIds = new Set(watchedInteractions.map((i: any) => i.movieId));
    const blockedFeedbackIds = new Set(feedbacks.map((f: any) => f.movieId));
    const notWatchedMovieIds = new Set(notWatchedInteractions.map((i: any) => i.movieId));

    const excludedMovieIds = new Set([
      ...watchedMovieIds,
      ...blockedFeedbackIds,
    ]);

    // 2. Fetch top hero recommendation match
    const topRecommendations = await getPersonalizedRecommendations(userId, 1);
    const topHeroMatch = topRecommendations.recommendations?.[0] || null;

    // 3. Primary Candidate Pool (take up to 1000 eligible movies from local DB catalog)
    const rawCandidates = await db.movie.findMany({
      where: {
        id: { notIn: Array.from(excludedMovieIds) },
      },
      orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
      take: 1000,
    });

    const candidatesMap = new Map<string, CandidateMovie & { candidateSource: string; knownUnwatched: boolean; metadata?: any; adult?: boolean; voteCount?: number }>();

    for (const m of rawCandidates) {
      const meta = (m.metadata as Record<string, unknown>) || {};
      const isKnownUnwatched = notWatchedMovieIds.has(m.id);
      candidatesMap.set(m.id, {
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
        candidateSource: isKnownUnwatched ? "KNOWN_UNWATCHED" : "FRESH_DISCOVERY",
        knownUnwatched: isKnownUnwatched,
        adult: (meta.adult as boolean) || false,
        voteCount: (meta.voteCount as number) || undefined,
        metadata: meta,
      });
    }

    const allCandidatesRaw = Array.from(candidatesMap.values());
    const allCandidates = filterEligibleMovies(allCandidatesRaw, "HOME");
    const diagnosticsList: CategoryDiagnostics[] = [];

    // Helper to score and filter candidate movies for a specific editorial category mode
    const scoreCategoryMovies = (mode: EditorialCategoryMode): CandidateMovie[] => {
      const initialCount = allCandidates.length;

      // Filter candidates matching category context fit floor (>= 0.20)
      const contextFiltered = allCandidates.filter((m) => calculateCategoryContextFit(m, mode) >= 0.20);
      const afterContextCount = contextFiltered.length;

      // Apply progressive relaxation
      const relaxedPool = filterCategoryCandidatesWithRelaxation(contextFiltered, mode, 12);
      const afterRelaxationCount = relaxedPool.length;

      const scored = relaxedPool
        .map((candidate) => {
          const matchRes = calculateMovieMatch(candidate, profile);
          const contextFit = calculateCategoryContextFit(candidate, mode);
          const dislikePenalty = calculateDislikePenalty(candidate, tasteEvidenceProfile);

          // Softened quality score (penalty rather than hard exclude)
          const qualityScore = calculateQualityScore(candidate);

          const isKnownUnwatched = (candidate as any).candidateSource === "KNOWN_UNWATCHED" || (candidate as any).knownUnwatched;

          const finalHomeScore =
            matchRes.displayMatchScore * 0.40 +
            contextFit * 40 +
            qualityScore * 20 +
            (isKnownUnwatched ? 6 : 0) -
            dislikePenalty;

          return {
            candidate,
            finalHomeScore,
            contextFit,
          };
        })
        .filter((item) => item.contextFit >= 0.20)
        .sort((a, b) => b.finalHomeScore - a.finalHomeScore)
        .map((item) => item.candidate);

      diagnosticsList.push({
        category: mode,
        initialCandidateCount: initialCount,
        afterContextFilter: afterContextCount,
        afterQualityFilter: afterContextCount,
        afterWatchedExclusion: allCandidates.length,
        afterFeedbackExclusion: allCandidates.length,
        afterCrossRowDedupe: scored.length,
        afterRelaxation: afterRelaxationCount,
        finalCount: scored.length,
      });

      return scored;
    };

    const formatMovie = (m: CandidateMovie) => ({
      id: m.id,
      tmdbId: m.tmdbId,
      title: m.title,
      originalTitle: m.originalTitle,
      posterPath: m.posterPath,
      backdropPath: m.backdropPath,
      releaseYear: m.releaseYear,
      popularity: m.popularity,
      voteAverage: m.voteAverage,
      genres: m.genres,
      overview: m.overview,
    });

    // 4. Build candidate lists for all editorial categories in meaningful sequence
    const rawModules = [
      {
        id: "known-unwatched",
        title: "👀 Bunu İzlemediğini Söylemiştin",
        icon: "👀",
        description: "Daha önce izlemediğini belirttiğin ama Film DNA'nla bugün güçlü eşleşen filmler.",
        movies: scoreCategoryMovies("KNOWN_UNWATCHED_ROW"),
      },
      {
        id: "rainy",
        title: "Yağmurlu Hava, Sıcak Kahve Eşliğinde",
        icon: "🌧️",
        description: "Derin dramlar, atmosferik anlatılar ve duygusal hikayeler.",
        movies: scoreCategoryMovies("RAINY_COFFEE"),
      },
      {
        id: "thriller",
        title: "Çok Gerileyim",
        icon: "⚡",
        description: "Nefes kesen gerilimler, gizemli cinayetler ve yüksek tempo.",
        movies: scoreCategoryMovies("HIGH_TENSION"),
      },
      {
        id: "feel-good",
        title: "Hafif Ama Çok İyi",
        icon: "☕",
        description: "Yormayan, samimi ve kaliteli zaman geçirten yapımlar.",
        movies: scoreCategoryMovies("LIGHT_BUT_GOOD"),
      },
      {
        id: "mind-bending",
        title: "Ruhum Değişsin",
        icon: "🌀",
        description: "Zihin büken bilim kurgular, psikolojik derinlik ve alternatif gerçeklikler.",
        movies: scoreCategoryMovies("MIND_BENDING"),
      },
      {
        id: "night",
        title: "Tek Başına Gece Seansı",
        icon: "🌙",
        description: "Gece yarısına özel kült filmler, neo-noir ve derin sinema.",
        movies: scoreCategoryMovies("SOLO_NIGHT"),
      },
      {
        id: "classic",
        title: "Bugün Bir Klasik İzle",
        icon: "🏛️",
        description: "Sinema tarihine damga vurmuş unutulmaz başyapıtlar.",
        movies: scoreCategoryMovies("CLASSIC"),
      },
      {
        id: "gems",
        title: "Az Bilinen Gizli Cevherler",
        icon: "💎",
        description: "Popülerlikten uzak ama puanı yüksek keşif filmleri.",
        movies: scoreCategoryMovies("HIDDEN_GEMS"),
      },
      {
        id: "brainy",
        title: "Beyni Açan Filmler",
        icon: "🧠",
        description: "Karakter odaklı, bulmaca gibi işlenen zeki senaryolar.",
        movies: scoreCategoryMovies("BRAINY"),
      },
      {
        id: "short",
        title: "Kısa Sürede Bitirebileceklerin",
        icon: "⏱️",
        description: "Tek oturuşta keyifle biten tempolu filmler.",
        movies: scoreCategoryMovies("SHORT"),
      },
      {
        id: "family-comedy",
        title: "Ailece İzlemelik Komediler",
        icon: "🍿",
        description: "Neşeli, hafif ve herkesi gülümseten eğlenceli yapımlar.",
        movies: scoreCategoryMovies("FAMILY_COMEDY"),
      },
    ];

    // 5. Global Soft Cross-Row Deduplication (allowSoftScarcity = true)
    const deduplicated = deduplicateHomeModules(rawModules, true);

    // 6. Minimum Supply Filter (Hide rows with fewer than 4 movies after all fallbacks)
    const validModules = deduplicated.filter((mod) => mod.movies.length >= 4);

    const modules = validModules.map((mod) => ({
      ...mod,
      movies: mod.movies.slice(0, 8).map(formatMovie), // 6-8 target per row
    }));

    // 7. Calculate Home Supply Health Metrics
    const renderedRowCount = modules.length;
    const hiddenRowCount = rawModules.length - renderedRowCount;
    const allRenderedMovies = modules.flatMap((m) => m.movies);
    const totalUniqueMovies = new Set(allRenderedMovies.map((m) => m.id)).size;
    const averageMoviesPerRow =
      renderedRowCount > 0 ? Number((allRenderedMovies.length / renderedRowCount).toFixed(1)) : 0;

    let knownUnwatchedCount = 0;
    let freshDiscoveryCount = 0;

    for (const m of allRenderedMovies) {
      if (notWatchedMovieIds.has(m.id)) {
        knownUnwatchedCount++;
      } else {
        freshDiscoveryCount++;
      }
    }

    const totalRenderedCount = allRenderedMovies.length || 1;
    const knownUnwatchedShare = Number((knownUnwatchedCount / totalRenderedCount).toFixed(2));
    const freshDiscoveryShare = Number((freshDiscoveryCount / totalRenderedCount).toFixed(2));

    const healthMetrics = {
      renderedRowCount,
      averageMoviesPerRow,
      hiddenRowCount,
      totalUniqueMovies,
      knownUnwatchedShare,
      freshDiscoveryShare,
      diagnostics: diagnosticsList,
    };

    return NextResponse.json({
      topHeroMatch,
      modules,
      healthMetrics,
    });
  } catch (error) {
    console.error("[GET /api/home Error]:", error);
    return NextResponse.json(
      { error: "Ana sayfa verileri yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
