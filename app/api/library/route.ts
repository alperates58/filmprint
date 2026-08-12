import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { getLibraryData, LibraryFilterOptions } from "@/lib/interactions/service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawStatus = (searchParams.get("status") || "watched").toLowerCase();
    const status = (["watched", "not_watched", "unsure", "watch_later"].includes(rawStatus)
      ? rawStatus
      : "watched") as LibraryFilterOptions["status"];

    const search = searchParams.get("search") || searchParams.get("q") || "";
    const rating = searchParams.get("rating") || "ALL";
    const sort = (searchParams.get("sort") || "newest") as LibraryFilterOptions["sort"];
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "24", 10)), 50);

    const result = await getLibraryData(user.id, {
      status,
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
