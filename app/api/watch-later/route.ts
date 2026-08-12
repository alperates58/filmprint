import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getOrCreateSession } from "@/lib/session";
import { RecommendationAction } from "@prisma/client";

export async function GET() {
  try {
    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;

    const watchLaterItems = await db.recommendationFeedback.findMany({
      where: {
        userId,
        action: RecommendationAction.WATCH_LATER,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        movie: true,
      },
    });

    const items = watchLaterItems.map((item: any) => {
      const meta = (item.movie.metadata as Record<string, unknown>) || {};
      return {
        feedbackId: item.id,
        savedMatchScore: item.matchScore,
        savedAt: item.updatedAt,
        movie: {
          id: item.movie.id,
          tmdbId: item.movie.tmdbId,
          title: item.movie.title,
          originalTitle: item.movie.originalTitle,
          releaseYear: item.movie.releaseYear,
          posterPath: item.movie.posterPath,
          backdropPath: item.movie.backdropPath,
          genres: (meta.genres as string[]) || [],
          overview: (meta.overview as string) || "",
        },
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[Watch Later GET Error]:", error);
    return NextResponse.json({ error: "Daha sonra izlenecek filmler alınamadı." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getOrCreateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;
    const { searchParams } = new URL(request.url);
    const movieId = searchParams.get("movieId");

    if (!movieId) {
      return NextResponse.json({ error: "movieId gereklidir." }, { status: 400 });
    }

    await db.recommendationFeedback.deleteMany({
      where: {
        userId,
        movieId,
        action: RecommendationAction.WATCH_LATER,
      },
    });

    return NextResponse.json({ success: true, movieId });
  } catch (error) {
    console.error("[Watch Later DELETE Error]:", error);
    return NextResponse.json({ error: "Film listeden çıkarılamadı." }, { status: 500 });
  }
}
