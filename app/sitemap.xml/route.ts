import { NextResponse } from "next/server";
import { getStagedEligibleMovies, getStagedEligibleTvShows } from "@/lib/growth/seo/staged-rollout";

export const dynamic = "force-dynamic";

const SHARD_SIZE = 1000;

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");

  const [movies, tvShows] = await Promise.all([
    getStagedEligibleMovies(),
    getStagedEligibleTvShows(),
  ]);

  const movieShards = Math.max(1, Math.ceil(movies.length / SHARD_SIZE));
  const tvShards = Math.max(1, Math.ceil(tvShows.length / SHARD_SIZE));

  const sitemaps: { loc: string; lastmod?: string }[] = [];

  // Static Pages Sitemap
  sitemaps.push({
    loc: `${baseUrl}/sitemaps/static.xml`,
  });

  // Genres Sitemap
  sitemaps.push({
    loc: `${baseUrl}/sitemaps/genres.xml`,
  });

  // Movie Sub-Sitemaps
  for (let i = 1; i <= movieShards; i++) {
    const shardMovies = movies.slice((i - 1) * SHARD_SIZE, i * SHARD_SIZE);
    const newestDate = shardMovies.reduce((latest, m) => {
      const d = m.updatedAt ? new Date(m.updatedAt) : null;
      return d && (!latest || d > latest) ? d : latest;
    }, null as Date | null);

    sitemaps.push({
      loc: `${baseUrl}/sitemaps/movies-${i}.xml`,
      lastmod: newestDate ? newestDate.toISOString() : undefined,
    });
  }

  // TV Sub-Sitemaps
  for (let i = 1; i <= tvShards; i++) {
    const shardShows = tvShows.slice((i - 1) * SHARD_SIZE, i * SHARD_SIZE);
    const newestDate = shardShows.reduce((latest, s) => {
      const d = s.updatedAt ? new Date(s.updatedAt) : null;
      return d && (!latest || d > latest) ? d : latest;
    }, null as Date | null);

    sitemaps.push({
      loc: `${baseUrl}/sitemaps/tv-${i}.xml`,
      lastmod: newestDate ? newestDate.toISOString() : undefined,
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (s) => `  <sitemap>
    <loc>${s.loc}</loc>${s.lastmod ? `\n    <lastmod>${s.lastmod}</lastmod>` : ""}
  </sitemap>`
  )
  .join("\n")}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
