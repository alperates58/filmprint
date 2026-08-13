import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { getMoviePersonalMatches } from "@/lib/recommendation/universal-matcher";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const body = await request.json();
    const movieIds = (body?.movieIds as string[]) || [];

    if (!Array.isArray(movieIds) || movieIds.length === 0) {
      return NextResponse.json({ matches: {} });
    }

    const matchesMap = await getMoviePersonalMatches(currentUser.id, movieIds);
    const matches: Record<string, any> = {};

    for (const [id, matchResult] of matchesMap.entries()) {
      matches[id] = matchResult;
    }

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("[POST /api/movies/match Error]:", error);
    return NextResponse.json(
      { error: "Match skorları hesaplanırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
