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
  deduplicateHomeModules,
} from "@/lib/recommendation/editorial-scorer";
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
    const [profileResponse, tasteEvidenceProfile] = await Promise.all([
      getOrCalculateUserProfile(userId),
      buildTasteEvidenceProfile(userId),
    ]);

    const profile = (profileResponse.profile || {}) as FilmDnaResult;

    // 2. Fetch answered movie IDs
    const answeredInteractions = await db.movieInteraction.findMany({
      where: { userId },
      select: { movieId: true },
    });
    const answeredMovieIds = new Set(answeredInteractions.map((i: any) => i.movieId));

    // 3. Fetch top match recommendation
    const topRecommendations = await getPersonalizedRecommendations(userId, 1);
    const topHeroMatch = topRecommendations.recommendations?.[0] || null;

    // 4. Fetch candidate pool (400 unrated candidates)
    const rawCandidates = await db.movie.findMany({
      where: {
        id: { notIn: Array.from(answeredMovieIds) },
      },
      orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
      take: 400,
    });

    const candidates: CandidateMovie[] = rawCandidates.map((m: any) => {
      const meta = (m.metadata as Record<string, unknown>) || {};
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
      };
    });

    // Helper to score movies for a specific editorial mode
    const scoreCategoryMovies = (mode: EditorialCategoryMode) => {
      return candidates
        .map((candidate) => {
          const matchRes = calculateMovieMatch(candidate, profile);
          const contextFit = calculateCategoryContextFit(candidate, mode);
          const dislikePenalty = calculateDislikePenalty(candidate, tasteEvidenceProfile);

          const finalHomeScore =
            matchRes.matchScore * 0.45 +
            contextFit * 35 +
            (candidate.voteAverage / 10) * 10 -
            dislikePenalty;

          return {
            candidate,
            finalHomeScore,
            contextFit,
          };
        })
        .filter((item) => item.contextFit >= 0.35) // Enforce strict category fit filter
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

    // 5. Build candidate lists for all 10 categories
    const rawModules = [
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

    // 6. Global Cross-Row Deduplication (Same movie max 1 row)
    const deduplicated = deduplicateHomeModules(rawModules);

    const modules = deduplicated.map((mod) => ({
      ...mod,
      movies: mod.movies.slice(0, 12).map(formatMovie),
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
