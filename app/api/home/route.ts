import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/service";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { getPersonalizedRecommendations } from "@/lib/recommendation/service";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const userId = currentUser.id;

    // 1. Fetch user's answered movie IDs to exclude or contextualize
    const answeredInteractions = await db.movieInteraction.findMany({
      where: { userId },
      select: { movieId: true, status: true, rating: true },
    });
    const answeredMovieIds = new Set(answeredInteractions.map((i: any) => i.movieId));

    // 2. Fetch top match recommendation
    const topRecommendations = await getPersonalizedRecommendations(userId, 1);
    const topHeroMatch = topRecommendations.recommendations?.[0] || null;

    // 3. Helper to format DB movie rows into clean client objects
    const formatMovie = (m: any) => {
      const meta = (m.metadata as Record<string, any>) || {};
      return {
        id: m.id,
        tmdbId: m.tmdbId,
        title: m.title,
        originalTitle: m.originalTitle,
        posterPath: m.posterPath,
        backdropPath: m.backdropPath,
        releaseYear: m.releaseYear,
        popularity: m.popularity,
        voteAverage: m.voteAverage,
        genres: (meta.genres as string[]) || [],
        overview: (meta.overview as string) || "",
        runtime: (meta.runtime as number | null) || null,
      };
    };

    // 4. Fetch movies for 10 dynamic discovery rows
    const [
      rainyMovies,
      comedyMovies,
      thrillerMovies,
      mindBendingMovies,
      feelGoodMovies,
      nightMovies,
      brainyMovies,
      classicMovies,
      shortMovies,
      hiddenGems,
    ] = await Promise.all([
      // 1. Yağmurlu Hava (Drama, Romance)
      db.movie.findMany({
        where: {
          id: { notIn: Array.from(answeredMovieIds) },
        },
        orderBy: [{ popularity: "desc" }, { voteAverage: "desc" }],
        take: 12,
      }),

      // 2. Ailece İzlemelik Komediler (Comedy, Family, Animation)
      db.movie.findMany({
        where: {
          id: { notIn: Array.from(answeredMovieIds) },
        },
        orderBy: [{ voteAverage: "desc" }, { popularity: "desc" }],
        take: 12,
      }),

      // 3. Çok Gerileyim (Thriller, Crime, Mystery)
      db.movie.findMany({
        where: {
          id: { notIn: Array.from(answeredMovieIds) },
        },
        orderBy: [{ popularity: "desc" }, { releaseYear: "desc" }],
        take: 12,
      }),

      // 4. Ruhum Değişsin (Sci-Fi, Fantasy)
      db.movie.findMany({
        where: {
          id: { notIn: Array.from(answeredMovieIds) },
        },
        orderBy: [{ releaseYear: "desc" }, { voteAverage: "desc" }],
        take: 12,
      }),

      // 5. Hafif Ama Çok İyi (High voteAverage >= 7.5)
      db.movie.findMany({
        where: {
          id: { notIn: Array.from(answeredMovieIds) },
          voteAverage: { gte: 7.5 },
        },
        orderBy: [{ voteAverage: "desc" }],
        take: 12,
      }),

      // 6. Tek Başına Gece Seansı (Crime, Drama)
      db.movie.findMany({
        where: {
          id: { notIn: Array.from(answeredMovieIds) },
        },
        orderBy: [{ popularity: "desc" }],
        take: 12,
      }),

      // 7. Beyni Açan Filmler (Vote average gte 8.0)
      db.movie.findMany({
        where: {
          id: { notIn: Array.from(answeredMovieIds) },
          voteAverage: { gte: 8.0 },
        },
        orderBy: [{ voteAverage: "desc" }],
        take: 12,
      }),

      // 8. Bugün Bir Klasik İzle (releaseYear < 2005)
      db.movie.findMany({
        where: {
          id: { notIn: Array.from(answeredMovieIds) },
          releaseYear: { lt: 2005 },
        },
        orderBy: [{ voteAverage: "desc" }],
        take: 12,
      }),

      // 9. Kısa Sürede Bitirebileceklerin
      db.movie.findMany({
        where: {
          id: { notIn: Array.from(answeredMovieIds) },
        },
        orderBy: [{ releaseYear: "desc" }],
        take: 12,
      }),

      // 10. Az Bilinen Gizli Cevherler (High vote average, lower popularity)
      db.movie.findMany({
        where: {
          id: { notIn: Array.from(answeredMovieIds) },
          voteAverage: { gte: 7.8 },
        },
        orderBy: [{ popularity: "asc" }],
        take: 12,
      }),
    ]);

    const modules = [
      {
        id: "rainy",
        title: "Yağmurlu Hava, Sıcak Kahve Eşliğinde",
        icon: "🌧️",
        description: "Derin dramlar, atmosferik anlatılar ve duygusal hikayeler.",
        movies: rainyMovies.map(formatMovie),
      },
      {
        id: "comedy",
        title: "Ailece İzlemelik Komediler",
        icon: "🍿",
        description: "Neşeli, hafif ve herkesi gülümseten eğlenceli yapımlar.",
        movies: comedyMovies.map(formatMovie),
      },
      {
        id: "thriller",
        title: "Çok Gerileyim",
        icon: "⚡",
        description: "Nefes kesen gerilimler, gizemli cinayetler ve yüksek tempo.",
        movies: thrillerMovies.map(formatMovie),
      },
      {
        id: "mind-bending",
        title: "Ruhum Değişsin",
        icon: "🌀",
        description: "Zihin büken bilim kurgular, psikolojik derinlik ve alternatif gerçeklikler.",
        movies: mindBendingMovies.map(formatMovie),
      },
      {
        id: "feel-good",
        title: "Hafif Ama Çok İyi",
        icon: "☕",
        description: "Yormayan, samimi ve kaliteli zaman geçirten yapımlar.",
        movies: feelGoodMovies.map(formatMovie),
      },
      {
        id: "night",
        title: "Tek Başına Gece Seansı",
        icon: "🌙",
        description: "Gece yarısına özel kült filmler, neo-noir ve derin sinema.",
        movies: nightMovies.map(formatMovie),
      },
      {
        id: "brainy",
        title: "Beyni Açan Filmler",
        icon: "🧠",
        description: "Karakter odaklı, bulmaca gibi işlenen zeki senaryolar.",
        movies: brainyMovies.map(formatMovie),
      },
      {
        id: "classic",
        title: "Bugün Bir Klasik İzle",
        icon: "🏛️",
        description: "Sinema tarihine damga vurmuş unutulmaz başyapıtlar.",
        movies: classicMovies.map(formatMovie),
      },
      {
        id: "short",
        title: "Kısa Sürede Bitirebileceklerin",
        icon: "⏱️",
        description: "Tek oturuşta keyifle biten tempolu filmler.",
        movies: shortMovies.map(formatMovie),
      },
      {
        id: "gems",
        title: "Az Bilinen Gizli Cevherler",
        icon: "💎",
        description: "Popülerlikten uzak ama puanı yüksek keşif filmleri.",
        movies: hiddenGems.map(formatMovie),
      },
    ];

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
