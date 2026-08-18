import { NextResponse } from "next/server";
import { getStagedEligibleMovies, getStagedEligibleTvShows } from "@/lib/growth/seo/staged-rollout";
import { generateMovieSlug, generateTvSlug } from "@/lib/growth/seo/slug";
import { MOVIE_GENRES, TV_GENRES } from "@/lib/growth/seo/genres";

export const dynamic = "force-dynamic";

const SHARD_SIZE = 1000;

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

function buildSitemapXml(urls: UrlEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}${u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : ""}${u.priority ? `\n    <priority>${u.priority}</priority>` : ""}
  </url>`
  )
  .join("\n")}
</urlset>`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");

  const cleanId = id.replace(/\.xml$/, "");

  // 1. Static Pages Sitemap
  if (cleanId === "static") {
    const urls: UrlEntry[] = [
      { loc: `${baseUrl}/`, changefreq: "daily", priority: "1.0" },
      { loc: `${baseUrl}/tv`, changefreq: "daily", priority: "0.9" },
      { loc: `${baseUrl}/how-it-works`, changefreq: "monthly", priority: "0.7" },
      { loc: `${baseUrl}/about`, changefreq: "monthly", priority: "0.6" },
      { loc: `${baseUrl}/contact`, changefreq: "monthly", priority: "0.5" },
      { loc: `${baseUrl}/legal/terms`, changefreq: "yearly", priority: "0.3" },
      { loc: `${baseUrl}/legal/privacy`, changefreq: "yearly", priority: "0.3" },
      { loc: `${baseUrl}/legal/copyright`, changefreq: "yearly", priority: "0.3" },
    ];

    return new NextResponse(buildSitemapXml(urls), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }

  // 2. Genres Sitemap
  if (cleanId === "genres") {
    const urls: UrlEntry[] = [
      ...MOVIE_GENRES.map((g) => ({
        loc: `${baseUrl}/filmler/tur/${g.slug}`,
        changefreq: "weekly",
        priority: "0.8",
      })),
      ...TV_GENRES.map((g) => ({
        loc: `${baseUrl}/diziler/tur/${g.slug}`,
        changefreq: "weekly",
        priority: "0.8",
      })),
    ];

    return new NextResponse(buildSitemapXml(urls), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }

  // 3. Movie Shard Sitemap (e.g. movies-1, movies-2)
  if (cleanId.startsWith("movies-")) {
    const pageNum = parseInt(cleanId.replace("movies-", ""), 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return new NextResponse("Invalid sitemap shard", { status: 404 });
    }

    const movies = await getStagedEligibleMovies();
    const offset = (pageNum - 1) * SHARD_SIZE;
    const shardMovies = movies.slice(offset, offset + SHARD_SIZE);

    if (shardMovies.length === 0 && pageNum > 1) {
      return new NextResponse("Sitemap shard not found", { status: 404 });
    }

    const urls: UrlEntry[] = shardMovies.map((m) => ({
      loc: `${baseUrl}/film/${generateMovieSlug(m.title, m.tmdbId)}`,
      lastmod: m.updatedAt ? new Date(m.updatedAt).toISOString() : undefined,
      changefreq: "weekly",
      priority: "0.7",
    }));

    return new NextResponse(buildSitemapXml(urls), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }

  // 4. TV Shard Sitemap (e.g. tv-1, tv-2)
  if (cleanId.startsWith("tv-")) {
    const pageNum = parseInt(cleanId.replace("tv-", ""), 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return new NextResponse("Invalid sitemap shard", { status: 404 });
    }

    const shows = await getStagedEligibleTvShows();
    const offset = (pageNum - 1) * SHARD_SIZE;
    const shardShows = shows.slice(offset, offset + SHARD_SIZE);

    if (shardShows.length === 0 && pageNum > 1) {
      return new NextResponse("Sitemap shard not found", { status: 404 });
    }

    const urls: UrlEntry[] = shardShows.map((s) => ({
      loc: `${baseUrl}/dizi/${generateTvSlug(s.name, s.tmdbId)}`,
      lastmod: s.updatedAt ? new Date(s.updatedAt).toISOString() : undefined,
      changefreq: "weekly",
      priority: "0.7",
    }));

    return new NextResponse(buildSitemapXml(urls), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }

  return new NextResponse("Sitemap not found", { status: 404 });
}
