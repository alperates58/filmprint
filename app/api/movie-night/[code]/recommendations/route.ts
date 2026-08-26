import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { getMovieNightRecommendations } from "@/lib/movie-night/service";
import { MovieNightAdvancedOptions } from "@/lib/movie-night/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const userSession = await getOrCreateSession();
    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = userSession;

    const { searchParams } = new URL(request.url);
    const mood = searchParams.get("mood") as any;
    const minYear = searchParams.get("minYear") ? parseInt(searchParams.get("minYear")!, 10) : undefined;
    const maxYear = searchParams.get("maxYear") ? parseInt(searchParams.get("maxYear")!, 10) : undefined;
    const strictUnwatched = searchParams.get("strictUnwatched") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    const options: MovieNightAdvancedOptions = {
      ...(mood ? { mood } : {}),
      ...(minYear ? { minYear } : {}),
      ...(maxYear ? { maxYear } : {}),
      ...(strictUnwatched ? { strictUnwatched: true } : {}),
      ...(limit ? { limit } : {}),
    };

    const data = await getMovieNightRecommendations(code, userId, options);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Movie Night Recommendations Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Grup önerileri hesaplanamadı." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const userSession = await getOrCreateSession();
    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = userSession;

    const body = await request.json().catch(() => ({}));
    const options: MovieNightAdvancedOptions = {
      mood: body.mood,
      minYear: body.minYear ? Number(body.minYear) : undefined,
      maxYear: body.maxYear ? Number(body.maxYear) : undefined,
      strictUnwatched: body.strictUnwatched === true,
      limit: body.limit ? Number(body.limit) : undefined,
    };

    const data = await getMovieNightRecommendations(code, userId, options);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Movie Night Recommendations POST Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Grup önerileri hesaplanamadı." },
      { status: 500 }
    );
  }
}
