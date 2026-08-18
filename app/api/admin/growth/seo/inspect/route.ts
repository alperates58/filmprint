import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { evaluateMovieSeoEligibility, evaluateTvSeoEligibility } from "@/lib/growth/seo/quality-gate";
import { generateMovieSlug, generateTvSlug, getMovieCanonicalPath, getTvCanonicalPath, getAbsoluteCanonicalUrl } from "@/lib/growth/seo/slug";

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    const body = await request.json();

    // 1. Handle Manual Override Mutation
    if (body.action === "SET_OVERRIDE") {
      const { mediaType, tmdbId, override } = body;
      if (!tmdbId || !mediaType) {
        return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
      }

      if (mediaType === "FILM") {
        const movie = await db.movie.findUnique({ where: { tmdbId: Number(tmdbId) } });
        if (!movie) return NextResponse.json({ error: "Film bulunamadı" }, { status: 404 });
        const currentMeta = (movie.metadata as Record<string, any>) || {};
        await db.movie.update({
          where: { tmdbId: Number(tmdbId) },
          data: {
            metadata: {
              ...currentMeta,
              seoOverride: override === "AUTO" ? null : override,
            },
          },
        });
      } else {
        const tv = await db.tvShow.findUnique({ where: { tmdbId: Number(tmdbId) } });
        if (!tv) return NextResponse.json({ error: "Dizi bulunamadı" }, { status: 404 });
        const currentMeta = (tv.metadata as Record<string, any>) || {};
        await db.tvShow.update({
          where: { tmdbId: Number(tmdbId) },
          data: {
            metadata: {
              ...currentMeta,
              seoOverride: override === "AUTO" ? null : override,
            },
          },
        });
      }

      await logAdminAudit(
        session.id,
        "GROWTH_SEO_MANUAL_OVERRIDE_CHANGED",
        mediaType === "FILM" ? "Movie" : "TvShow",
        String(tmdbId),
        { override }
      );

      return NextResponse.json({ success: true, message: "SEO durumu güncellendi." });
    }

    // 2. Handle Inspection Search
    const query = String(body.query || "").trim();
    if (!query) {
      return NextResponse.json({ error: "Arama terimi giriniz." }, { status: 400 });
    }

    const isNumeric = /^\d+$/.test(query);
    const tmdbIdNum = isNumeric ? parseInt(query, 10) : null;

    // Search Movies
    const matchingMovies = await db.movie.findMany({
      where: tmdbIdNum
        ? { tmdbId: tmdbIdNum }
        : { title: { contains: query, mode: "insensitive" } },
      take: 5,
    });

    // Search TV Shows
    const matchingTvShows = await db.tvShow.findMany({
      where: tmdbIdNum
        ? { tmdbId: tmdbIdNum }
        : { name: { contains: query, mode: "insensitive" } },
      take: 5,
    });

    const movieResults = matchingMovies.map((m) => {
      const evalRes = evaluateMovieSeoEligibility(m as any);
      const canonicalPath = getMovieCanonicalPath(m.title, m.tmdbId);
      const canonicalUrl = getAbsoluteCanonicalUrl(canonicalPath);
      const meta = (m.metadata as Record<string, any>) || {};

      return {
        mediaType: "FILM",
        id: m.id,
        tmdbId: m.tmdbId,
        title: m.title,
        originalTitle: m.originalTitle,
        canonicalSlug: generateMovieSlug(m.title, m.tmdbId),
        canonicalPath,
        canonicalUrl,
        eligibility: evalRes,
        manualOverride: meta.seoOverride || "AUTO",
      };
    });

    const tvResults = matchingTvShows.map((s) => {
      const evalRes = evaluateTvSeoEligibility(s as any);
      const canonicalPath = getTvCanonicalPath(s.name, s.tmdbId);
      const canonicalUrl = getAbsoluteCanonicalUrl(canonicalPath);
      const meta = (s.metadata as Record<string, any>) || {};

      return {
        mediaType: "TV",
        id: s.id,
        tmdbId: s.tmdbId,
        title: s.name,
        originalTitle: s.originalName,
        canonicalSlug: generateTvSlug(s.name, s.tmdbId),
        canonicalPath,
        canonicalUrl,
        eligibility: evalRes,
        manualOverride: meta.seoOverride || "AUTO",
      };
    });

    return NextResponse.json({
      results: [...movieResults, ...tvResults],
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[POST /api/admin/growth/seo/inspect] Error:", error);
    return NextResponse.json({ error: "Denetim sırasında hata oluştu" }, { status: 500 });
  }
}
