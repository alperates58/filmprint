import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { db } from "@/lib/db/client";
import { GenrePreferenceLevel, MediaType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mediaType = searchParams.get("mediaType");

    const where: any = { userId: user.id };
    if (mediaType && (mediaType === "FILM" || mediaType === "TV")) {
      where.mediaType = mediaType as MediaType;
    }

    const preferences = await db.userGenrePreference.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("[GET /api/user/genre-preferences Error]:", error);
    return NextResponse.json(
      { error: "Tür tercihleri alınamadı" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const body = await request.json();
    const { mediaType = "FILM", genreId, preference = "NEUTRAL" } = body;

    if (typeof genreId !== "number" || isNaN(genreId)) {
      return NextResponse.json({ error: "Geçersiz genreId" }, { status: 400 });
    }

    const validMediaType = mediaType === "TV" ? MediaType.TV : MediaType.FILM;
    const validLevel = Object.values(GenrePreferenceLevel).includes(preference)
      ? (preference as GenrePreferenceLevel)
      : GenrePreferenceLevel.NEUTRAL;

    const record = await db.userGenrePreference.upsert({
      where: {
        userId_mediaType_genreId: {
          userId: user.id,
          mediaType: validMediaType,
          genreId,
        },
      },
      update: {
        preference: validLevel,
      },
      create: {
        userId: user.id,
        mediaType: validMediaType,
        genreId,
        preference: validLevel,
      },
    });

    return NextResponse.json({ success: true, preference: record });
  } catch (error) {
    console.error("[POST /api/user/genre-preferences Error]:", error);
    return NextResponse.json(
      { error: "Tür tercihi kaydedilemedi" },
      { status: 500 }
    );
  }
}
