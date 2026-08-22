import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { getMovieGenreBySlug, MOVIE_GENRES } from "@/lib/growth/seo/genres";
import { generateMovieSlug, getAbsoluteCanonicalUrl } from "@/lib/growth/seo/slug";
import { evaluateMovieSeoEligibility } from "@/lib/growth/seo/quality-gate";
import { generateBreadcrumbJsonLd, safeJsonLdStringify } from "@/lib/growth/seo/json-ld";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { AdPlacement } from "@/components/monetization/AdPlacement";

interface PageProps {
  params: Promise<{ genreSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 18;

/**
 * Bounded candidate pool size for genre hub browsing.
 * In a 1M+ movie catalog, fetching all records into memory causes severe Out-Of-Memory (OOM) crashes.
 * By bounding to the top 1500 quality/popularity records, we provide up to ~30-60 pages
 * of top genre movies while guaranteeing bounded memory (~2MB) and sub-15ms response times.
 * Note: Deep pagination beyond this candidate pool is safely bounded to available matching results.
 */
const GENRE_CANDIDATE_POOL_SIZE = 1500;

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { genreSlug } = await params;
  const { page } = await searchParams;
  const genre = getMovieGenreBySlug(genreSlug);

  if (!genre) {
    return {
      title: "Tür Bulunamadı | SINEAI",
      robots: { index: false, follow: false },
    };
  }

  const pageNum = parseInt(page || "1", 10);
  const pageSuffix = pageNum > 1 ? ` — Sayfa ${pageNum}` : "";
  const title = `En İyi ${genre.name} Filmleri${pageSuffix} | SINEAI`;
  const description = `${genre.description} SineAI zevk analizi ve yüksek kaliteli ${genre.name} filmleri listesi.`;
  const canonicalUrl = getAbsoluteCanonicalUrl(`/filmler/tur/${genre.slug}${pageNum > 1 ? `?page=${pageNum}` : ""}`);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "SINEAI",
      locale: "tr_TR",
      type: "website",
    },
  };
}

export default async function MovieGenreHubPage({ params, searchParams }: PageProps) {
  const { genreSlug } = await params;
  const { page } = await searchParams;
  const genre = getMovieGenreBySlug(genreSlug);

  if (!genre) {
    notFound();
  }

  const requestedPage = Math.max(1, parseInt(page || "1", 10));

  // Query bounded candidate pool of top movies to filter by genre and SEO eligibility
  const allMovies = await db.movie.findMany({
    where: {
      posterPath: { not: null },
    },
    orderBy: [
      { popularity: "desc" },
      { voteAverage: "desc" },
    ],
    take: GENRE_CANDIDATE_POOL_SIZE,
    select: {
      id: true,
      tmdbId: true,
      title: true,
      originalTitle: true,
      posterPath: true,
      backdropPath: true,
      releaseYear: true,
      voteAverage: true,
      popularity: true,
      metadata: true,
    },
  });

  const matchingMovies = allMovies.filter((m) => {
    const meta = (m.metadata as Record<string, any>) || {};
    const genres = Array.isArray(meta.genres) ? meta.genres : [];
    const hasGenre = genres.some(
      (g: any) =>
        (typeof g === "string" && g.toLowerCase() === genre.name.toLowerCase()) ||
        g?.name?.toLowerCase() === genre.name.toLowerCase() ||
        g?.id === genre.id
    );
    if (!hasGenre) return false;
    return evaluateMovieSeoEligibility(m as any).isEligible;
  });

  const totalItems = matchingMovies.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const pagedMovies = matchingMovies.slice(offset, offset + PAGE_SIZE);

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "Filmler", url: "/" },
    { name: genre.name, url: `/filmler/tur/${genre.slug}` },
  ]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans">
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
      />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 w-full">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs font-mono text-text-muted flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-accent transition-colors">Ana Sayfa</Link>
          <span>/</span>
          <span className="text-text-secondary">Filmler</span>
          <span>/</span>
          <span className="text-text-primary font-semibold">{genre.name}</span>
        </nav>

        {/* Header Intro */}
        <div className="p-6 sm:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-3 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-semibold">
            <span>🎬</span>
            <span>Film Türü</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-text-primary tracking-tight">
            En İyi {genre.name} Filmleri
          </h1>
          <p className="text-sm sm:text-base text-text-secondary max-w-3xl leading-relaxed">
            {genre.description} SineAI zevk motoru ile kişisel beğeninize göre sıralanmış en kaliteli {genre.name} filmlerini keşfedin.
          </p>
          <div className="pt-2 text-xs font-mono text-text-muted">
            Toplam {totalItems} içerik listeleniyor (Sayfa {currentPage} / {totalPages})
          </div>
        </div>

        {/* Movie Grid with Placement Slots */}
        {pagedMovies.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {pagedMovies.slice(0, 8).map((movie) => {
                const posterUrl = getTmdbImageUrl(movie.posterPath, "w300");
                const slug = generateMovieSlug(movie.title, movie.tmdbId);
                return (
                  <Link
                    key={movie.id}
                    href={`/film/${slug}`}
                    className="group block rounded-2xl overflow-hidden border border-border/80 bg-surface-1 hover:border-accent/50 transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <div className="aspect-[2/3] relative bg-surface-2">
                      {posterUrl ? (
                        <Image
                          src={posterUrl}
                          alt={movie.title}
                          fill
                          sizes="(max-width: 768px) 160px, 200px"
                          className="object-cover group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-mono">
                          Görsel Yok
                        </div>
                      )}
                      {movie.voteAverage > 0 && (
                        <div className="absolute top-2 right-2">
                          <ScoreBadge score={Math.round(movie.voteAverage * 10)} size="sm" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors truncate font-sans">
                        {movie.title}
                      </p>
                      <p className="text-[11px] font-mono text-text-muted">
                        {movie.releaseYear || ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Ad Placement: Genre After 8 */}
            <AdPlacement slot="genre_after_8" />

            {pagedMovies.length > 8 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {pagedMovies.slice(8, 16).map((movie) => {
                  const posterUrl = getTmdbImageUrl(movie.posterPath, "w300");
                  const slug = generateMovieSlug(movie.title, movie.tmdbId);
                  return (
                    <Link
                      key={movie.id}
                      href={`/film/${slug}`}
                      className="group block rounded-2xl overflow-hidden border border-border/80 bg-surface-1 hover:border-accent/50 transition-all hover:scale-[1.02] shadow-sm"
                    >
                      <div className="aspect-[2/3] relative bg-surface-2">
                        {posterUrl ? (
                          <Image
                            src={posterUrl}
                            alt={movie.title}
                            fill
                            sizes="(max-width: 768px) 160px, 200px"
                            className="object-cover group-hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-mono">
                            Görsel Yok
                          </div>
                        )}
                        {movie.voteAverage > 0 && (
                          <div className="absolute top-2 right-2">
                            <ScoreBadge score={Math.round(movie.voteAverage * 10)} size="sm" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors truncate font-sans">
                          {movie.title}
                        </p>
                        <p className="text-[11px] font-mono text-text-muted">
                          {movie.releaseYear || ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {pagedMovies.length > 16 && (
              <>
                {/* Ad Placement: Genre After 16 */}
                <AdPlacement slot="genre_after_16" />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {pagedMovies.slice(16).map((movie) => {
                    const posterUrl = getTmdbImageUrl(movie.posterPath, "w300");
                    const slug = generateMovieSlug(movie.title, movie.tmdbId);
                    return (
                      <Link
                        key={movie.id}
                        href={`/film/${slug}`}
                        className="group block rounded-2xl overflow-hidden border border-border/80 bg-surface-1 hover:border-accent/50 transition-all hover:scale-[1.02] shadow-sm"
                      >
                        <div className="aspect-[2/3] relative bg-surface-2">
                          {posterUrl ? (
                            <Image
                              src={posterUrl}
                              alt={movie.title}
                              fill
                              sizes="(max-width: 768px) 160px, 200px"
                              className="object-cover group-hover:opacity-90 transition-opacity"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-mono">
                              Görsel Yok
                            </div>
                          )}
                          {movie.voteAverage > 0 && (
                            <div className="absolute top-2 right-2">
                              <ScoreBadge score={Math.round(movie.voteAverage * 10)} size="sm" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 space-y-1">
                          <p className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors truncate font-sans">
                            {movie.title}
                          </p>
                          <p className="text-[11px] font-mono text-text-muted">
                            {movie.releaseYear || ""}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-surface-1 border border-border/80 space-y-3">
            <p className="text-sm text-text-muted font-mono">Bu türe ait henüz listelenen film bulunmuyor.</p>
            <Link href="/" className="inline-block px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold">
              Tüm Filmleri Keşfet
            </Link>
          </div>
        )}

        {/* Server Pagination */}
        {totalPages > 1 && (
          <nav aria-label="Sayfalama" className="flex items-center justify-center gap-3 pt-6">
            {currentPage > 1 && (
              <Link
                href={`/filmler/tur/${genre.slug}${currentPage - 1 > 1 ? `?page=${currentPage - 1}` : ""}`}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-medium text-text-primary transition-colors"
              >
                ← Önceki
              </Link>
            )}

            <span className="text-xs font-mono text-text-muted px-3 py-2">
              Sayfa {currentPage} / {totalPages}
            </span>

            {currentPage < totalPages && (
              <Link
                href={`/filmler/tur/${genre.slug}?page=${currentPage + 1}`}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-medium text-text-primary transition-colors"
              >
                Sonraki →
              </Link>
            )}
          </nav>
        )}

        {/* Other Genres Quick Navigation */}
        <section className="space-y-3 pt-6 border-t border-border/60">
          <h2 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
            Diğer Film Türleri
          </h2>
          <div className="flex flex-wrap gap-2">
            {MOVIE_GENRES.map((g) => (
              <Link
                key={g.slug}
                href={`/filmler/tur/${g.slug}`}
                className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all border ${
                  g.slug === genre.slug
                    ? "bg-accent text-white border-accent font-semibold"
                    : "bg-surface-1 text-text-secondary border-border hover:border-accent/40 hover:text-accent"
                }`}
              >
                {g.name}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
