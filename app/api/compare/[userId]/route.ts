import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { db } from "@/lib/db/client";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { calculateFilmDna } from "@/lib/profile/calculator";
import { getProgressionForCount } from "@/lib/progression/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
    const session = await getOrCreateSession();
    const visitorUserId = session?.userId;

    // 1. Fetch Target User
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, image: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Hedef kullanıcı bulunamadı" }, { status: 404 });
    }

    const targetProfileData = await getOrCalculateUserProfile(targetUserId);
    const targetProgression = getProgressionForCount(targetProfileData.current || 0);

    // If visitor is same as target or visitor has profile
    let visitorProfile = null;
    let visitorData = null;
    let comparison = null;

    if (visitorUserId && visitorUserId !== targetUserId) {
      const vProfileData = await getOrCalculateUserProfile(visitorUserId);
      if (vProfileData.ready && vProfileData.profile) {
        visitorProfile = vProfileData.profile;
        const visitorUser = await db.user.findUnique({
          where: { id: visitorUserId },
          select: { id: true, name: true, image: true },
        });
        visitorData = {
          id: visitorUser?.id,
          name: visitorUser?.name || "Sen",
          image: visitorUser?.image,
        };

        if (targetProfileData.profile) {
          comparison = await calculateDuelCompatibility(
            targetProfileData.profile,
            visitorProfile,
            targetUserId
          );
        }
      }
    }

    // Rapid mini-quiz movies if visitor has no profile yet
    let miniQuizMovies: any[] = [];
    if (!comparison) {
      const topMovies = await db.movie.findMany({
        where: {
          voteAverage: { gte: 7.0 },
          posterPath: { not: null },
        },
        orderBy: { popularity: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          originalTitle: true,
          releaseYear: true,
          posterPath: true,
          metadata: true,
        },
      });
      miniQuizMovies = topMovies;
    }

    return NextResponse.json({
      targetUser: {
        id: targetUser.id,
        name: targetUser.name || "SineAI Kullanıcısı",
        image: targetUser.image,
        rankLabel: targetProgression.currentRank.label,
        rankBadgeIcon: targetProgression.currentRank.badgeIcon,
        sampleCount: targetProfileData.current,
        profile: targetProfileData.profile,
      },
      visitor: visitorData,
      comparison,
      miniQuizMovies,
    });
  } catch (error) {
    console.error("[Compare API Error]:", error);
    return NextResponse.json({ error: "Karşılaştırma hesaplanamadı" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
    const body = await request.json();
    const { quickAnswers } = body; // Array of { movieId, status, rating }

    const targetProfileData = await getOrCalculateUserProfile(targetUserId);
    if (!targetProfileData.profile) {
      return NextResponse.json({ error: "Hedef profil hazır değil" }, { status: 400 });
    }

    // Build temporary visitor profile from quick answers
    const movieIds = quickAnswers.map((a: any) => a.movieId);
    const movies = await db.movie.findMany({
      where: { id: { in: movieIds } },
      select: {
        id: true,
        tmdbId: true,
        title: true,
        originalTitle: true,
        releaseYear: true,
        popularity: true,
        voteAverage: true,
        metadata: true,
      },
    });

    const movieMap = new Map(movies.map((m) => [m.id, m]));
    const formattedData: any[] = quickAnswers
      .map((a: any) => {
        const m = movieMap.get(a.movieId);
        if (!m) return null;
        const meta = (m.metadata as Record<string, unknown>) || {};
        return {
          id: a.movieId,
          status: a.status,
          rating: a.rating,
          answeredAt: new Date(),
          movie: {
            id: m.id,
            tmdbId: m.tmdbId,
            title: m.title,
            originalTitle: m.originalTitle,
            releaseYear: m.releaseYear,
            popularity: m.popularity,
            voteAverage: m.voteAverage,
            metadata: {
              genres: (meta.genres as string[]) || [],
              runtime: (meta.runtime as number | null) || null,
              overview: (meta.overview as string) || "",
            },
          },
        };
      })
      .filter(Boolean);

    const visitorDna = calculateFilmDna(formattedData);
    const comparison = await calculateDuelCompatibility(
      targetProfileData.profile,
      visitorDna,
      targetUserId
    );

    return NextResponse.json({ comparison });
  } catch (error) {
    console.error("[Compare API POST Error]:", error);
    return NextResponse.json({ error: "Karşılaştırma yapılamadı" }, { status: 500 });
  }
}

async function calculateDuelCompatibility(
  targetDna: any,
  visitorDna: any,
  targetUserId: string
) {
  // 1. Calculate Genre Affinity Distance
  const targetGenreMap = new Map<string, number>(targetDna.genres.map((g: any) => [String(g.name), Number(g.score)]));
  const visitorGenreMap = new Map<string, number>(visitorDna.genres.map((g: any) => [String(g.name), Number(g.score)]));

  const allGenres: string[] = Array.from(new Set<string>([...targetGenreMap.keys(), ...visitorGenreMap.keys()]));
  let totalDiff = 0;
  const sharedHighGenres: string[] = [];
  const contrastGenres: string[] = [];

  for (const g of allGenres) {
    const s1 = targetGenreMap.get(g) ?? 0.5;
    const s2 = visitorGenreMap.get(g) ?? 0.5;
    const diff = Math.abs(s1 - s2);
    totalDiff += diff;

    if (s1 >= 0.7 && s2 >= 0.7) {
      sharedHighGenres.push(g);
    } else if (diff >= 0.35) {
      contrastGenres.push(g);
    }
  }

  const avgDiff = allGenres.length > 0 ? totalDiff / allGenres.length : 0.2;
  const rawCompatibility = Math.max(0.48, Math.min(0.98, 1.0 - avgDiff * 1.1));
  const compatibilityPercent = Math.round(rawCompatibility * 100);

  // 2. Fetch 3 Joint Recommendation Movies
  const topGenre = sharedHighGenres[0] || targetDna.genres[0]?.name || "Dram";
  const jointMovies = await db.movie.findMany({
    where: {
      posterPath: { not: null },
      voteAverage: { gte: 7.5 },
      metadata: {
        path: ["genres"],
        array_contains: topGenre,
      },
    },
    orderBy: { popularity: "desc" },
    take: 3,
    select: {
      id: true,
      title: true,
      releaseYear: true,
      posterPath: true,
      voteAverage: true,
    },
  });

  let verdict = "";
  if (compatibilityPercent >= 85) {
    verdict = "Efsanevi Sinefil Uyumu! Sinema salonuna birlikte gitmelisiniz; birbirinizin zevkine bayılacaksınız.";
  } else if (compatibilityPercent >= 70) {
    verdict = "Güçlü Sinematik Rezonans! Özellikle ortak türlerde keyifli saatler geçirebilirsiniz.";
  } else {
    verdict = "Keşif Dolu Zıt Kutuplar! Birbirinize yepyeni türler ve vizyonlar katabilirsiniz.";
  }

  return {
    compatibilityPercent,
    verdict,
    sharedPassions: sharedHighGenres.slice(0, 3),
    contrasts: contrastGenres.slice(0, 2),
    jointRecommendations: jointMovies,
  };
}
