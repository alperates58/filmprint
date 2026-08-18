import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { tmdbTvClient } from "@/lib/tmdb/tv/client";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { parseSlugId, generateTvSlug, getTvCanonicalPath, getAbsoluteCanonicalUrl } from "@/lib/growth/seo/slug";
import { evaluateTvSeoEligibility } from "@/lib/growth/seo/quality-gate";
import { generateTvJsonLd, generateBreadcrumbJsonLd, safeJsonLdStringify } from "@/lib/growth/seo/json-ld";
import { slugify } from "@/lib/growth/seo/slug";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Safely fetches and resolves TV show details on the server without AI runtime.
 */
async function getTvShowForPublicPage(slug: string) {
  const tmdbId = parseSlugId(slug);
  if (!tmdbId) return null;

  let show = await db.tvShow.findUnique({
    where: { tmdbId },
  });

  if (!show) {
    try {
      const fetched = await tmdbTvClient.getOrFetchTvShow(tmdbId);
      if (fetched) {
        show = await db.tvShow.findUnique({ where: { tmdbId } });
      }
    } catch {
      // Fallback
    }
  }

  if (!show) return null;

  const meta = (show.metadata as Record<string, any>) || {};

  let creators = meta.creators || [];
  let cast = meta.cast || [];
  let trailer = meta.trailer || null;
  let numberOfSeasons = meta.numberOfSeasons || null;
  let numberOfEpisodes = meta.numberOfEpisodes || null;
  let genres = meta.genres || [];
  let overview = show.overview || meta.overview || "Bu dizi için detaylı özet bilgisi hazırlanmaktadır.";

  if (!creators.length || !cast.length || trailer === undefined) {
    try {
      const details = await tmdbTvClient.getTvDetails(tmdbId);
      creators = details.creators || creators;
      cast = details.cast || cast;
      trailer = details.trailer !== undefined ? details.trailer : trailer;
      numberOfSeasons = details.numberOfSeasons || numberOfSeasons;
      numberOfEpisodes = details.numberOfEpisodes || numberOfEpisodes;
    } catch {
      // Fallback
    }
  }

  return {
    ...show,
    overview,
    creators,
    cast: cast.slice(0, 8),
    trailer,
    numberOfSeasons,
    numberOfEpisodes,
    genres: Array.isArray(genres) ? genres : [],
  };
}

/**
 * Dynamic Next.js Metadata Generator for TV Show Canonical Route.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const show = await getTvShowForPublicPage(slug);

  if (!show) {
    return {
      title: "Dizi Bulunamadı | SINEAI",
      robots: { index: false, follow: false },
    };
  }

  const evalRes = evaluateTvSeoEligibility(show as any);
  const canonicalPath = getTvCanonicalPath(show.name, show.tmdbId);
  const canonicalUrl = getAbsoluteCanonicalUrl(canonicalPath);

  const airYear = show.firstAirDate ? ` (${show.firstAirDate.substring(0, 4)})` : "";
  const title = `${show.name}${airYear} — Dizi Bilgileri, Oyuncuları ve Sezonlar | SINEAI`;

  const cleanOverview = show.overview.replace(/[\r\n]+/g, " ").trim();
  const description = cleanOverview.length > 155
    ? `${cleanOverview.slice(0, 152)}...`
    : cleanOverview || `${show.name} dizisi konusu, sezonları, oyuncuları, fragmanı ve SINEAI analiz puanı.`;

  const posterUrl = getTmdbImageUrl(show.posterPath, "w500");
  const backdropUrl = getTmdbImageUrl(show.backdropPath, "w1280");
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
      type: "video.tv_show",
      images: ogImages.map((url) => ({ url, alt: show.name })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages,
    },
  };
}

export default async function PublicTvPage({ params }: PageProps) {
  const { slug } = await params;
  const show = await getTvShowForPublicPage(slug);

  if (!show) {
    notFound();
  }

  // Canonical Slug Check
  const canonicalSlug = generateTvSlug(show.name, show.tmdbId);
  if (slug !== canonicalSlug) {
    redirect(getTvCanonicalPath(show.name, show.tmdbId));
  }

  // Fetch related TV shows in the same genre
  const relatedShows = await db.tvShow.findMany({
    where: {
      id: { not: show.id },
      posterPath: { not: null },
    },
    orderBy: { popularity: "desc" },
    take: 6,
  });

  const posterUrl = getTmdbImageUrl(show.posterPath, "w500");
  const backdropUrl = getTmdbImageUrl(show.backdropPath, "w1280");
  const firstAirYear = show.firstAirDate ? show.firstAirDate.substring(0, 4) : null;

  const tvJsonLd = generateTvJsonLd({
    tmdbId: show.tmdbId,
    name: show.name,
    originalName: show.originalName,
    overview: show.overview,
    firstAirDate: show.firstAirDate,
    posterUrl,
    backdropUrl,
    numberOfSeasons: show.numberOfSeasons,
    numberOfEpisodes: show.numberOfEpisodes,
    creators: show.creators,
    cast: show.cast,
    genres: show.genres,
    voteAverage: show.voteAverage,
    voteCount: show.voteCount,
  });

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "Diziler", url: "/tv" },
    { name: show.name, url: getTvCanonicalPath(show.name, show.tmdbId) },
  ]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans">
      <Header />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(tvJsonLd) }}
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
          <Link href="/tv" className="hover:text-accent transition-colors">Diziler</Link>
          <span>/</span>
          <span className="text-text-primary font-semibold truncate max-w-xs">{show.name}</span>
        </nav>

        {/* Hero Card */}
        <section className="relative rounded-3xl overflow-hidden border border-border/80 bg-surface-1/90 shadow-2xl backdrop-blur-xl">
          {backdropUrl && (
            <div className="absolute inset-0 z-0 opacity-25 pointer-events-none">
              <Image
                src={backdropUrl}
                alt={show.name}
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
                  alt={show.name}
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
                  {firstAirYear && (
                    <span className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-xs font-mono text-accent font-semibold">
                      {firstAirYear}
                    </span>
                  )}
                  {show.numberOfSeasons && (
                    <span className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-xs font-mono text-text-muted">
                      {show.numberOfSeasons} Sezon
                    </span>
                  )}
                  {show.numberOfEpisodes && (
                    <span className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-xs font-mono text-text-muted">
                      {show.numberOfEpisodes} Bölüm
                    </span>
                  )}
                  {show.voteAverage > 0 && (
                    <ScoreBadge score={Math.round(show.voteAverage * 10)} size="md" />
                  )}
                </div>

                <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-extrabold tracking-tight text-text-primary">
                  {show.name}
                </h1>

                {show.originalName && show.originalName !== show.name && (
                  <p className="text-sm font-mono text-text-muted">
                    Orijinal Başlık: <span className="text-text-secondary">{show.originalName}</span>
                  </p>
                )}
              </div>

              {/* Genres */}
              {show.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {show.genres.map((genre: string) => {
                    const genreSlug = slugify(genre);
                    return (
                      <Link
                        key={genre}
                        href={`/diziler/tur/${genreSlug}`}
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
                  Özet & Konu
                </h2>
                <p className="text-sm sm:text-base text-text-secondary leading-relaxed font-sans">
                  {show.overview}
                </p>
              </div>

              {/* Creators */}
              {show.creators && show.creators.length > 0 && (
                <div className="pt-2 border-t border-border/60 text-xs font-sans text-text-muted">
                  <span className="font-mono text-text-secondary uppercase">Yaratıcı / Ekip: </span>
                  <span className="text-text-primary font-medium">
                    {show.creators.map((c: any) => (typeof c === "string" ? c : c.name)).join(", ")}
                  </span>
                </div>
              )}

              {/* SINEAI CTA Bar */}
              <div className="pt-4 flex flex-wrap gap-3 items-center">
                <Link
                  href={`/tv/calibration`}
                  className="px-5 py-3 rounded-2xl bg-accent text-white font-sans text-sm font-semibold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20 flex items-center gap-2"
                >
                  <span>📺</span>
                  <span>Zevkime Uygun mu? Dizi DNA&apos;mı Oluştur</span>
                </Link>
                <Link
                  href={`/tv/recommendations`}
                  className="px-4 py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border text-text-secondary hover:text-text-primary font-sans text-sm font-medium transition-colors"
                >
                  ✨ Kişisel Dizi Önerilerim
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Cast Section */}
        {show.cast && show.cast.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              <span>🎭</span>
              <span>Oyuncular ve Kadro</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
              {show.cast.map((actor: any, idx: number) => {
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
        {show.trailer && (show.trailer.key || show.trailer.youtubeKey) && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              <span>🎬</span>
              <span>Resmi Fragman</span>
            </h2>
            <div className="rounded-3xl overflow-hidden border border-border/80 bg-black aspect-video max-w-3xl mx-auto shadow-2xl relative">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${show.trailer.key || show.trailer.youtubeKey}`}
                title={`${show.name} Fragman`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </section>
        )}

        {/* Related TV Discovery */}
        {relatedShows.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
                <span>✨</span>
                <span>Benzer ve İlgili Diziler</span>
              </h2>
              <Link href="/tv" className="text-xs font-mono text-accent hover:underline">
                Tümünü Keşfet →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {relatedShows.map((rel) => {
                const relPoster = getTmdbImageUrl(rel.posterPath, "w300");
                const relSlug = generateTvSlug(rel.name, rel.tmdbId);
                return (
                  <Link
                    key={rel.id}
                    href={`/dizi/${relSlug}`}
                    className="group block rounded-2xl overflow-hidden border border-border/80 bg-surface-1 hover:border-accent/50 transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <div className="aspect-[2/3] relative bg-surface-2">
                      {relPoster ? (
                        <Image
                          src={relPoster}
                          alt={rel.name}
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
                        {rel.name}
                      </p>
                      <p className="text-[11px] font-mono text-text-muted">
                        {rel.firstAirDate ? rel.firstAirDate.substring(0, 4) : ""}
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
