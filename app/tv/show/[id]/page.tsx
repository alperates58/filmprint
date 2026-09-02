import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { tmdbTvClient } from "@/lib/tmdb/tv/client";
import { generateTvSlug } from "@/lib/growth/seo/slug";

interface TvRedirectPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function TvRedirectPage({ params }: TvRedirectPageProps) {
  const { id } = await params;
  const numId = Number(id);

  let show: any = null;
  if (!isNaN(numId) && numId > 0) {
    show = await tmdbTvClient.getOrFetchTvShow(numId);
  } else {
    show = await db.tvShow.findUnique({ where: { id } });
  }

  if (!show) {
    notFound();
  }

  const slug = generateTvSlug(show.name, show.tmdbId);
  redirect(`/dizi/${slug}`);
}
