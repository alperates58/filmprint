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
} from "@/lib/recommendation/editorial-scorer";
import { calculateQualityScore } from "@/lib/recommendation/quality";
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

    // 1. Fetch user profile & evidence
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

    // 3. Query candidate pool from DB (take up to 600 eligible movies, NOT excluding NOT_WATCHED)
    const rawCandidates = await db.movie.findMany({
      where: {
        id: { notIn: Array.from(excludedMovieIds) },
      },
      orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
      take: 600,
    });

    const candidates: (CandidateMovie & { candidateSource: string; knownUnwatched: boolean })[] =
      rawCandidates.map((m: any) => {
        const meta = (m.metadata as Record<string, unknown>) || {};
        const isKnownUnwatched = notWatchedMovieIds.has(m.id);
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
          candidateSource: isKnownUnwatched ? "KNOWN_UNWATCHED" : "FRESH_DISCOVERY",
          knownUnwatched: isKnownUnwatched,
        };
      });

    // Helper to score and filter candidate movies for a specific editorial mode
    const scoreCategoryMovies = (mode: EditorialCategoryMode) => {
      const relaxedPool = filterCategoryCandidatesWithRelaxation(candidates, mode, 8);

      return relaxedPool
        .map((candidate) => {
          const matchRes = calculateMovieMatch(candidate, profile);
          const contextFit = calculateCategoryContextFit(candidate, mode);
          const dislikePenalty = calculateDislikePenalty(candidate, tasteEvidenceProfile);
          const qualityScore = calculateQualityScore(candidate);

          const finalHomeScore =
            matchRes.displayMatchScore * 0.40 +
            contextFit * 40 +
            qualityScore * 20 +
            ((candidate as any).candidateSource === "KNOWN_UNWATCHED" || (candidate as any).knownUnwatched ? 5 : 0) -
            dislikePenalty;

          return {
            candidate,
            finalHomeScore,
            contextFit,
          };
        })
        .filter((item) => item.contextFit >= 0.25) // CategoryFit minimum floor
        .sort((a, b) => b.finalHomeScore - a.finalHomeScore)
        .map((item) => item.candidate);
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

    // 4. Build candidate lists for all 11 categories (including KNOWN_UNWATCHED_ROW)
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
        id: "comedy",
        title: "Ailece İzlemelik Komediler",
        icon: "🍿",
        description: "Neşeli, hafif ve herkesi gülümseten eğlenceli yapımlar.",
        movies: scoreCategoryMovies("FAMILY_COMEDY"),
      },
      {
        id: "thriller",
        title: "Çok Gerileyim",
        icon: "⚡",
        description: "Nefes kesen gerilimler, gizemli cinayetler ve yüksek tempo.",
        movies: scoreCategoryMovies("HIGH_TENSION"),
      },
      {
        id: "mind-bending",
        title: "Ruhum Değişsin",
        icon: "🌀",
        description: "Zihin büken bilim kurgular, psikolojik derinlik ve alternatif gerçeklikler.",
        movies: scoreCategoryMovies("MIND_BENDING"),
      },
      {
        id: "feel-good",
        title: "Hafif Ama Çok İyi",
        icon: "☕",
        description: "Yormayan, samimi ve kaliteli zaman geçirten yapımlar.",
        movies: scoreCategoryMovies("LIGHT_BUT_GOOD"),
      },
      {
        id: "night",
        title: "Tek Başına Gece Seansı",
        icon: "🌙",
        description: "Gece yarısına özel kült filmler, neo-noir ve derin sinema.",
        movies: scoreCategoryMovies("SOLO_NIGHT"),
      },
      {
        id: "brainy",
        title: "Beyni Açan Filmler",
        icon: "🧠",
        description: "Karakter odaklı, bulmaca gibi işlenen zeki senaryolar.",
        movies: scoreCategoryMovies("BRAINY"),
      },
      {
        id: "classic",
        title: "Bugün Bir Klasik İzle",
        icon: "🏛️",
        description: "Sinema tarihine damga vurmuş unutulmaz başyapıtlar.",
        movies: scoreCategoryMovies("CLASSIC"),
      },
      {
        id: "short",
        title: "Kısa Sürede Bitirebileceklerin",
        icon: "⏱️",
        description: "Tek oturuşta keyifle biten tempolu filmler.",
        movies: scoreCategoryMovies("SHORT"),
      },
      {
        id: "gems",
        title: "Az Bilinen Gizli Cevherler",
        icon: "💎",
        description: "Popülerlikten uzak ama puanı yüksek keşif filmleri.",
        movies: scoreCategoryMovies("HIDDEN_GEMS"),
      },
    ];

    // 5. Global Soft Cross-Row Deduplication
    const deduplicated = deduplicateHomeModules(rawModules);

    // 6. Minimum Supply Filter (Hide rows with fewer than 4 movies)
    // 0-3 film modules are strictly HIDDEN
    const validModules = deduplicated.filter((mod) => mod.movies.length >= 4);

    const modules = validModules.map((mod) => ({
      ...mod,
      movies: mod.movies.slice(0, 8).map(formatMovie), // 6-8 target per row
    }));

    return NextResponse.json({
      topHeroMatch,
      modules,
    });
  } catch (error) {
    console.error("[GET /api/home Error]:", error);
    return NextResponse.json(
      { error: "Ana sayfa verileri yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
