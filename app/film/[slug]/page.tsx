import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { tmdbClient } from "@/lib/tmdb/client";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { parseSlugId, generateMovieSlug, getMovieCanonicalPath, getAbsoluteCanonicalUrl } from "@/lib/growth/seo/slug";
import { evaluateMovieSeoEligibility } from "@/lib/growth/seo/quality-gate";
import { generateMovieJsonLd, generateBreadcrumbJsonLd, safeJsonLdStringify } from "@/lib/growth/seo/json-ld";
import { slugify } from "@/lib/growth/seo/slug";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { getCurrentUser } from "@/lib/auth/service";
import { MediaPageActions } from "@/components/media/MediaPageActions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Helper to fetch and resolve movie data safely on the server.
 */
async function getMovieForPublicPage(slug: string) {
  const tmdbId = parseSlugId(slug);
  if (!tmdbId) return null;

  let movie = await db.movie.findUnique({
    where: { tmdbId },
  });

  if (!movie) {
    try {
      const fetched = await tmdbClient.getOrFetchMovie(tmdbId);
      if (fetched) {
        movie = await db.movie.findUnique({ where: { tmdbId } });
      }
    } catch {
      // Fallback
    }
  }

  if (!movie) return null;

  const meta = (movie.metadata as Record<string, any>) || {};

  // Enrich details if missing director/cast/trailer
  let director = meta.director || null;
  let cast = meta.cast || [];
  let trailer = meta.trailer || null;
  let runtime = meta.runtime || null;
  let genres = meta.genres || [];
  let overview = meta.overview || "Bu film için detaylı özet bilgisi hazırlanmaktadır.";

  if (!director || !cast.length || trailer === undefined) {
    try {
      const details = await tmdbClient.getMovieDetails(tmdbId);
      director = details.director || director;
      cast = details.cast || cast;
      trailer = details.trailer !== undefined ? details.trailer : trailer;
      runtime = details.runtime || runtime;
    } catch {
      // Fallback
    }
  }

  return {
    ...movie,
    overview,
    director,
    cast: cast.slice(0, 8),
    trailer,
    runtime,
    genres: Array.isArray(genres) ? genres : [],
  };
}

/**
 * Dynamic Next.js Metadata Generator for Movie Canonical Route.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovieForPublicPage(slug);

  if (!movie) {
    return {
      title: "Film Bulunamadı | SINEAI",
      robots: { index: false, follow: false },
    };
  }

  const evalRes = evaluateMovieSeoEligibility(movie as any);
  const canonicalPath = getMovieCanonicalPath(movie.title, movie.tmdbId);
  const canonicalUrl = getAbsoluteCanonicalUrl(canonicalPath);

  const releaseYearStr = movie.releaseYear ? ` (${movie.releaseYear})` : "";
  const title = `${movie.title}${releaseYearStr} — Film Bilgileri, Oyuncuları ve İnceleme | SINEAI`;

  const cleanOverview = movie.overview.replace(/[\r\n]+/g, " ").trim();
  const description = cleanOverview.length > 155
    ? `${cleanOverview.slice(0, 152)}...`
    : cleanOverview || `${movie.title} filmi konusu, oyuncuları, fragmanı ve SINEAI zevk analizi puanı.`;

  const posterUrl = getTmdbImageUrl(movie.posterPath, "w500");
  const backdropUrl = getTmdbImageUrl(movie.backdropPath, "w1280");
  const ogImages = [backdropUrl, posterUrl].filter((url): url is string => Boolean(url));

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: evalRes.isEligible,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "SINEAI",
      locale: "tr_TR",
      type: "video.movie",
      images: ogImages.map((url) => ({ url, alt: movie.title })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages,
    },
  };
}

export default async function PublicMoviePage({ params }: PageProps) {
  const { slug } = await params;
  const movie = await getMovieForPublicPage(slug);

  if (!movie) {
    notFound();
  }

  // Canonical Slug Check: if user comes via legacy/different slug, permanent redirect to canonical
  const canonicalSlug = generateMovieSlug(movie.title, movie.tmdbId);
  if (slug !== canonicalSlug) {
    redirect(getMovieCanonicalPath(movie.title, movie.tmdbId));
  }

  // Fetch related movies in the same genre
  const [relatedMovies, currentUser] = await Promise.all([
    db.movie.findMany({
      where: {
        id: { not: movie.id },
        posterPath: { not: null },
      },
      orderBy: { popularity: "desc" },
      take: 6,
    }),
    getCurrentUser(),
  ]);

  let userStatus: string | null = null;
  let userRating: string | null = null;
  let isFavorite = false;

  if (currentUser) {
    const libraryEntry = await db.libraryEntry.findUnique({
      where: {
        userId_contentId_mediaType: {
          userId: currentUser.id,
          contentId: movie.id,
          mediaType: "FILM",
        },
      },
    });

    if (libraryEntry) {
      userStatus = libraryEntry.state;
      userRating = libraryEntry.rating;
      isFavorite = libraryEntry.isFavorite;
    } else {
      const interaction = await db.movieInteraction.findUnique({
        where: {
          userId_movieId: {
            userId: currentUser.id,
            movieId: movie.id,
          },
        },
      });
      if (interaction) {
        userStatus = interaction.status;
        userRating = interaction.rating;
        isFavorite = interaction.isFavorite || false;
      }
    }
  }

  const posterUrl = getTmdbImageUrl(movie.posterPath, "w500");
  const backdropUrl = getTmdbImageUrl(movie.backdropPath, "w1280");

  const movieJsonLd = generateMovieJsonLd({
    tmdbId: movie.tmdbId,
    title: movie.title,
    originalTitle: movie.originalTitle,
    overview: movie.overview,
    releaseYear: movie.releaseYear,
    runtime: movie.runtime,
    posterUrl,
    backdropUrl,
    director: movie.director,
    cast: movie.cast,
    genres: movie.genres,
    voteAverage: movie.voteAverage,
  });

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "Filmler", url: "/" },
    { name: movie.title, url: getMovieCanonicalPath(movie.title, movie.tmdbId) },
  ]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans">
      <Header />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(movieJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
      />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10 w-full">
        {/* Breadcrumb Bar */}
        <nav aria-label="Breadcrumb" className="text-xs font-mono text-text-muted flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-accent transition-colors">Ana Sayfa</Link>
          <span>/</span>
          <span className="text-text-secondary">Filmler</span>
          <span>/</span>
          <span className="text-text-primary font-semibold truncate max-w-xs">{movie.title}</span>
        </nav>

        {/* Hero Card */}
        <section className="relative rounded-3xl overflow-hidden border border-border/80 bg-surface-1/90 shadow-2xl backdrop-blur-xl">
          {/* Backdrop Image with Gradient Overlay */}
          {backdropUrl && (
            <div className="absolute inset-0 z-0 opacity-25 pointer-events-none">
              <Image
                src={backdropUrl}
                alt={movie.title}
                fill
                priority
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-surface-1/80 to-transparent" />
            </div>
          )}

          <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start">
            {/* Poster Card */}
            <div className="w-48 sm:w-56 md:w-64 flex-shrink-0 mx-auto md:mx-0 rounded-2xl overflow-hidden border border-border shadow-xl bg-surface-2 aspect-[2/3] relative">
              {posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={movie.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 220px, 260px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-mono">
                  Görsel Yok
                </div>
              )}
            </div>

            {/* Metadata & Title */}
            <div className="flex-1 space-y-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  {movie.releaseYear && (
                    <span className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-xs font-mono text-accent font-semibold">
                      {movie.releaseYear}
                    </span>
                  )}
                  {movie.runtime && (
                    <span className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-xs font-mono text-text-muted">
                      {movie.runtime} dk
                    </span>
                  )}
                  {movie.voteAverage > 0 && (
                    <ScoreBadge score={Math.round(movie.voteAverage * 10)} size="md" />
                  )}
                </div>

                <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-extrabold tracking-tight text-text-primary">
                  {movie.title}
                </h1>

                {movie.originalTitle && movie.originalTitle !== movie.title && (
                  <p className="text-sm font-mono text-text-muted">
                    Orijinal Başlık: <span className="text-text-secondary">{movie.originalTitle}</span>
                  </p>
                )}
              </div>

              {/* Genres */}
              {movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre: string) => {
                    const genreSlug = slugify(genre);
                    return (
                      <Link
                        key={genre}
                        href={`/filmler/tur/${genreSlug}`}
                        className="px-3 py-1 rounded-full bg-surface-2/80 hover:bg-accent/15 border border-border hover:border-accent/40 text-xs font-sans text-text-secondary hover:text-accent transition-all"
                      >
                        {genre}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Synopsis */}
              <div className="space-y-2">
                <h2 className="text-xs uppercase font-mono text-text-muted tracking-wider font-semibold">
                  Özet & Hikâye
                </h2>
                <p className="text-sm sm:text-base text-text-secondary leading-relaxed font-sans">
                  {movie.overview}
                </p>
              </div>

              {/* Crew / Director */}
              {movie.director && (
                <div className="pt-2 border-t border-border/60 text-xs font-sans text-text-muted">
                  <span className="font-mono text-text-secondary uppercase">Yönetmen: </span>
                  <span className="text-text-primary font-medium">{movie.director}</span>
                </div>
              )}

              {/* Interactive Library & Rating Actions */}
              <MediaPageActions
                contentId={movie.id}
                tmdbId={movie.tmdbId}
                mediaType="FILM"
                title={movie.title}
                initialStatus={userStatus}
                initialRating={userRating}
                initialFavorite={isFavorite}
              />
            </div>
          </div>
        </section>

        {/* Cast Section */}
        {movie.cast && movie.cast.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              <span>🎭</span>
              <span>Oyuncular ve Karakterler</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
              {movie.cast.map((actor: any, idx: number) => {
                const profileUrl = actor.profilePath ? getTmdbImageUrl(actor.profilePath, "w185") : null;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-surface-1 border border-border/80 flex flex-col items-center text-center space-y-2"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-2 relative border border-border">
                      {profileUrl ? (
                        <Image
                          src={profileUrl}
                          alt={actor.name}
                          fill
                          sizes="60px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-mono">
                          👤
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-primary font-sans line-clamp-1">{actor.name}</p>
                      {actor.character && (
                        <p className="text-[11px] text-text-muted font-sans line-clamp-1">{actor.character}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Trailer Section */}
        {movie.trailer && (movie.trailer.key || movie.trailer.youtubeKey) && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              <span>🎬</span>
              <span>Resmi Fragman</span>
            </h2>
            <div className="rounded-3xl overflow-hidden border border-border/80 bg-black aspect-video max-w-3xl mx-auto shadow-2xl relative">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${movie.trailer.key || movie.trailer.youtubeKey}`}
                title={`${movie.title} Fragman`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </section>
        )}

        {/* Related Discovery */}
        {relatedMovies.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
                <span>✨</span>
                <span>Benzer ve İlgili Filmler</span>
              </h2>
              <Link href="/" className="text-xs font-mono text-accent hover:underline">
                Tümünü Keşfet →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {relatedMovies.map((rel) => {
                const relPoster = getTmdbImageUrl(rel.posterPath, "w300");
                const relSlug = generateMovieSlug(rel.title, rel.tmdbId);
                return (
                  <Link
                    key={rel.id}
                    href={`/film/${relSlug}`}
                    className="group block rounded-2xl overflow-hidden border border-border/80 bg-surface-1 hover:border-accent/50 transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <div className="aspect-[2/3] relative bg-surface-2">
                      {relPoster ? (
                        <Image
                          src={relPoster}
                          alt={rel.title}
                          fill
                          sizes="(max-width: 768px) 160px, 200px"
                          className="object-cover group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-mono">
                          Görsel Yok
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 space-y-1">
                      <p className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors truncate font-sans">
                        {rel.title}
                      </p>
                      <p className="text-[11px] font-mono text-text-muted">
                        {rel.releaseYear || ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
