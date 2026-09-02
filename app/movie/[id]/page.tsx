import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { tmdbClient } from "@/lib/tmdb/client";
import { generateMovieSlug } from "@/lib/growth/seo/slug";

interface MovieRedirectPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function MovieRedirectPage({ params }: MovieRedirectPageProps) {
  const { id } = await params;
  const numId = Number(id);

  let movie = await db.movie.findFirst({
    where: {
      OR: [
        { id },
        { tmdbId: isNaN(numId) ? -1 : numId },
      ],
    },
  });

  if (!movie && !isNaN(numId) && numId > 0) {
    const fetched = await tmdbClient.getOrFetchMovie(numId);
    if (fetched) {
      movie = await db.movie.findUnique({ where: { tmdbId: numId } });
    }
  }

  if (!movie) {
    notFound();
  }

  const slug = generateMovieSlug(movie.title, movie.tmdbId);
  redirect(`/film/${slug}`);
}
