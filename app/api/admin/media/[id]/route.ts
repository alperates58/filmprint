import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "movie").toLowerCase();

    if (type === "tv") {
      const show = await db.tvShow.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              interactions: true,
              libraryEntries: true,
            },
          },
        },
      });

      if (!show) {
        return NextResponse.json({ error: "Dizi bulunamadı" }, { status: 404 });
      }

      return NextResponse.json(show);
    } else {
      const movie = await db.movie.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              interactions: true,
              libraryEntries: true,
            },
          },
        },
      });

      if (!movie) {
        return NextResponse.json({ error: "Film bulunamadı" }, { status: 404 });
      }

      return NextResponse.json(movie);
    }
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[Admin Media Detail Error]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json();
    const { type = "movie", title, originalTitle, overview, releaseYear, voteAverage, popularity, genres } = body;

    if (type === "tv") {
      const existing = await db.tvShow.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Dizi bulunamadı" }, { status: 404 });
      }

      const currentMeta = (existing.metadata as Record<string, any>) || {};
      const updatedMeta = {
        ...currentMeta,
        ...(overview !== undefined ? { overview: overview.trim() } : {}),
        ...(genres !== undefined ? { genres } : {}),
      };

      const updated = await db.tvShow.update({
        where: { id },
        data: {
          ...(title !== undefined ? { name: title.trim() } : {}),
          ...(originalTitle !== undefined ? { originalName: originalTitle.trim() } : {}),
          ...(overview !== undefined ? { overview: overview.trim() } : {}),
          ...(voteAverage !== undefined ? { voteAverage: Number(voteAverage) } : {}),
          ...(popularity !== undefined ? { popularity: Number(popularity) } : {}),
          metadata: updatedMeta,
        },
      });

      return NextResponse.json({ success: true, item: updated });
    } else {
      const existing = await db.movie.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Film bulunamadı" }, { status: 404 });
      }

      const currentMeta = (existing.metadata as Record<string, any>) || {};
      const updatedMeta = {
        ...currentMeta,
        ...(overview !== undefined ? { overview: overview.trim() } : {}),
        ...(genres !== undefined ? { genres } : {}),
      };

      const updated = await db.movie.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title: title.trim() } : {}),
          ...(originalTitle !== undefined ? { originalTitle: originalTitle.trim() } : {}),
          ...(releaseYear !== undefined ? { releaseYear: Number(releaseYear) || null } : {}),
          ...(voteAverage !== undefined ? { voteAverage: Number(voteAverage) } : {}),
          ...(popularity !== undefined ? { popularity: Number(popularity) } : {}),
          metadata: updatedMeta,
        },
      });

      return NextResponse.json({ success: true, item: updated });
    }
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[Admin Media Update Error]:", error);
    return NextResponse.json({ error: "İçerik güncellenirken bir hata oluştu." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "movie").toLowerCase();

    if (type === "tv") {
      const existing = await db.tvShow.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Dizi bulunamadı" }, { status: 404 });
      }

      await db.tvShow.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Dizi ve bağlı tüm kayıtlar başarıyla silindi." });
    } else {
      const existing = await db.movie.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Film bulunamadı" }, { status: 404 });
      }

      await db.movie.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Film ve bağlı tüm kayıtlar başarıyla silindi." });
    }
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[Admin Media Delete Error]:", error);
    return NextResponse.json({ error: "İçerik silinirken bir hata oluştu." }, { status: 500 });
  }
}
