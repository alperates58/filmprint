import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { getUserLibraryData, setLibraryState, LibraryFilterOptions } from "@/lib/library/service";
import { RatingStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await getOrCreateSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;

    const { searchParams } = new URL(request.url);

    // Extract filters
    const rawMediaType = (searchParams.get("mediaType") || "ALL").toUpperCase();
    const mediaType = (["FILM", "TV", "ALL"].includes(rawMediaType)
      ? rawMediaType
      : "ALL") as LibraryFilterOptions["mediaType"];

    const rawState = (searchParams.get("state") || searchParams.get("status") || "ALL").toUpperCase();
    const state = (["WATCHLIST", "WATCHED", "DROPPED", "ALL"].includes(rawState)
      ? rawState
      : "ALL") as LibraryFilterOptions["state"];

    const rawFavorite = searchParams.get("favorite") || searchParams.get("isFavorite");
    const isFavorite = rawFavorite === "true" ? true : rawFavorite === "false" ? false : undefined;

    const search = searchParams.get("search") || searchParams.get("q") || "";
    const rating = (searchParams.get("rating") || "ALL").toUpperCase();
    const sort = (searchParams.get("sort") || "newest") as LibraryFilterOptions["sort"];
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "24", 10)), 50);

    const result = await getUserLibraryData(userId, {
      mediaType,
      state,
      isFavorite,
      search,
      rating,
      sort,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/library Error]:", error);
    return NextResponse.json(
      { error: "Kütüphane verisi alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getOrCreateSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = session;

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Geçersiz JSON gövdesi." }, { status: 400 });
    }

    const {
      mediaType = "FILM",
      movieId,
      tvShowId,
      contentId,
      action,
      rating,
    } = body;

    const normalizedMediaType = mediaType === "TV" || mediaType === "SHOW" ? "TV" : "FILM";
    const targetId = normalizedMediaType === "TV" ? tvShowId || contentId : movieId || contentId;

    if (!targetId || typeof targetId !== "string") {
      return NextResponse.json(
        { error: `Geçerli bir ${normalizedMediaType === "TV" ? "Dizi" : "Film"} ID gereklidir.` },
        { status: 400 }
      );
    }

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "Geçerli bir eylem gereklidir." }, { status: 400 });
    }

    const upperAction = action.toUpperCase();
    const validActions = [
      "ADD_WATCHLIST",
      "REMOVE_WATCHLIST",
      "MARK_WATCHED",
      "MARK_DROPPED",
      "ADD_FAVORITE",
      "REMOVE_FAVORITE",
      "CLEAR_STATE",
    ];

    if (!validActions.includes(upperAction)) {
      return NextResponse.json({ error: "Geçersiz kütüphane eylemi." }, { status: 400 });
    }

    const validRating =
      rating && Object.values(RatingStatus).includes(rating as RatingStatus)
        ? (rating as RatingStatus)
        : null;

    const result = await setLibraryState(
      userId,
      normalizedMediaType,
      targetId,
      upperAction as any,
      validRating
    );

    return NextResponse.json({
      mediaType: normalizedMediaType,
      contentId: targetId,
      action: upperAction,
      ...result,
      recommendationInvalidated: true,
    });
  } catch (error) {
    console.error("[POST /api/library Error]:", error);
    return NextResponse.json(
      { error: "Kütüphane işlemi gerçekleştirilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
