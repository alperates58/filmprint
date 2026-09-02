import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { getTvGenreBySlug, TV_GENRES } from "@/lib/growth/seo/genres";
import { generateTvSlug, getAbsoluteCanonicalUrl } from "@/lib/growth/seo/slug";
import { evaluateTvSeoEligibility } from "@/lib/growth/seo/quality-gate";
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

export const dynamic = "force-dynamic";

const PAGE_SIZE = 18;

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { genreSlug } = await params;
  const { page } = await searchParams;
  const genre = getTvGenreBySlug(genreSlug);

  if (!genre) {
    return {
      title: "Tür Bulunamadı | SINEAI",
      robots: { index: false, follow: false },
    };
  }

  const pageNum = parseInt(page || "1", 10);
  const pageSuffix = pageNum > 1 ? ` — Sayfa ${pageNum}` : "";
  const title = `En İyi ${genre.name} Dizileri${pageSuffix} | SINEAI`;
  const description = `${genre.description} SineAI zevk analizi ve yüksek kaliteli ${genre.name} dizileri listesi.`;
  const canonicalUrl = getAbsoluteCanonicalUrl(`/diziler/tur/${genre.slug}${pageNum > 1 ? `?page=${pageNum}` : ""}`);

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

export default async function TvGenreHubPage({ params, searchParams }: PageProps) {
  const { genreSlug } = await params;
  const { page } = await searchParams;
  const genre = getTvGenreBySlug(genreSlug);

  if (!genre) {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(page || "1", 10));

  // Query TV shows to filter by genre and SEO eligibility
  const allShows = await db.tvShow.findMany({
    orderBy: [
      { popularity: "desc" },
      { voteAverage: "desc" },
    ],
    select: {
      id: true,
      tmdbId: true,
      name: true,
      originalName: true,
      overview: true,
      posterPath: true,
      backdropPath: true,
      firstAirDate: true,
      voteAverage: true,
      voteCount: true,
      popularity: true,
      metadata: true,
    },
  });

  const matchingShows = allShows.filter((s) => {
    const meta = (s.metadata as Record<string, any>) || {};
    const genres = Array.isArray(meta.genres) ? meta.genres : [];
    const hasGenre = genres.some(
      (g: any) =>
        (typeof g === "string" && g.toLowerCase() === genre.name.toLowerCase()) ||
        g?.name?.toLowerCase() === genre.name.toLowerCase() ||
        g?.id === genre.id
    );
    if (!hasGenre) return false;
    return evaluateTvSeoEligibility(s as any).isEligible;
  });

  const totalItems = matchingShows.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const offset = (currentPage - 1) * PAGE_SIZE;
  const pagedShows = matchingShows.slice(offset, offset + PAGE_SIZE);

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "Diziler", url: "/tv" },
    { name: genre.name, url: `/diziler/tur/${genre.slug}` },
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
          <Link href="/tv" className="hover:text-accent transition-colors">Diziler</Link>
          <span>/</span>
          <span className="text-text-primary font-semibold">{genre.name}</span>
        </nav>

        {/* Header Intro */}
        <div className="p-6 sm:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-3 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-semibold">
            <span>📺</span>
            <span>Dizi Türü</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-text-primary tracking-tight">
            En İyi {genre.name} Dizileri
          </h1>
          <p className="text-sm sm:text-base text-text-secondary max-w-3xl leading-relaxed">
            {genre.description} SineAI zevk analizi motoru ile kişisel zevkinize en uygun {genre.name} dizilerini keşfedin.
          </p>
          <div className="pt-2 text-xs font-mono text-text-muted">
            Toplam {totalItems} dizi listeleniyor (Sayfa {currentPage} / {totalPages})
          </div>
        </div>

        {/* TV Grid with Placement Slots */}
        {pagedShows.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {pagedShows.slice(0, 8).map((show) => {
                const posterUrl = getTmdbImageUrl(show.posterPath, "w300");
                const slug = generateTvSlug(show.name, show.tmdbId);
                return (
                  <Link
                    key={show.id}
                    href={`/dizi/${slug}`}
                    className="group block rounded-2xl overflow-hidden border border-border/80 bg-surface-1 hover:border-accent/50 transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <div className="aspect-[2/3] relative bg-surface-2">
                      {posterUrl ? (
                        <Image
                          src={posterUrl}
                          alt={show.name}
                          fill
                          sizes="(max-width: 768px) 160px, 200px"
                          className="object-cover group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-mono">
                          Görsel Yok
                        </div>
                      )}
                      {show.voteAverage > 0 && (
                        <div className="absolute top-2 right-2">
                          <ScoreBadge score={Math.round(show.voteAverage * 10)} size="sm" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors truncate font-sans">
                        {show.name}
                      </p>
                      <p className="text-[11px] font-mono text-text-muted">
                        {show.firstAirDate ? show.firstAirDate.substring(0, 4) : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Ad Placement: Genre After 8 */}
            <AdPlacement slot="genre_after_8" />

            {pagedShows.length > 8 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {pagedShows.slice(8, 16).map((show) => {
                  const posterUrl = getTmdbImageUrl(show.posterPath, "w300");
                  const slug = generateTvSlug(show.name, show.tmdbId);
                  return (
                    <Link
                      key={show.id}
                      href={`/dizi/${slug}`}
                      className="group block rounded-2xl overflow-hidden border border-border/80 bg-surface-1 hover:border-accent/50 transition-all hover:scale-[1.02] shadow-sm"
                    >
                      <div className="aspect-[2/3] relative bg-surface-2">
                        {posterUrl ? (
                          <Image
                            src={posterUrl}
                            alt={show.name}
                            fill
                            sizes="(max-width: 768px) 160px, 200px"
                            className="object-cover group-hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-mono">
                            Görsel Yok
                          </div>
                        )}
                        {show.voteAverage > 0 && (
                          <div className="absolute top-2 right-2">
                            <ScoreBadge score={Math.round(show.voteAverage * 10)} size="sm" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors truncate font-sans">
                          {show.name}
                        </p>
                        <p className="text-[11px] font-mono text-text-muted">
                          {show.firstAirDate ? show.firstAirDate.substring(0, 4) : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {pagedShows.length > 16 && (
              <>
                {/* Ad Placement: Genre After 16 */}
                <AdPlacement slot="genre_after_16" />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {pagedShows.slice(16).map((show) => {
                    const posterUrl = getTmdbImageUrl(show.posterPath, "w300");
                    const slug = generateTvSlug(show.name, show.tmdbId);
                    return (
                      <Link
                        key={show.id}
                        href={`/dizi/${slug}`}
                        className="group block rounded-2xl overflow-hidden border border-border/80 bg-surface-1 hover:border-accent/50 transition-all hover:scale-[1.02] shadow-sm"
                      >
                        <div className="aspect-[2/3] relative bg-surface-2">
                          {posterUrl ? (
                            <Image
                              src={posterUrl}
                              alt={show.name}
                              fill
                              sizes="(max-width: 768px) 160px, 200px"
                              className="object-cover group-hover:opacity-90 transition-opacity"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-mono">
                              Görsel Yok
                            </div>
                          )}
                          {show.voteAverage > 0 && (
                            <div className="absolute top-2 right-2">
                              <ScoreBadge score={Math.round(show.voteAverage * 10)} size="sm" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 space-y-1">
                          <p className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors truncate font-sans">
                            {show.name}
                          </p>
                          <p className="text-[11px] font-mono text-text-muted">
                            {show.firstAirDate ? show.firstAirDate.substring(0, 4) : ""}
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
            <p className="text-sm text-text-muted font-mono">Bu türe ait henüz listelenen dizi bulunmuyor.</p>
            <Link href="/tv" className="inline-block px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold">
              Tüm Dizileri Keşfet
            </Link>
          </div>
        )}

        {/* Server Pagination */}
        {totalPages > 1 && (
          <nav aria-label="Sayfalama" className="flex items-center justify-center gap-3 pt-6">
            {currentPage > 1 && (
              <Link
                href={`/diziler/tur/${genre.slug}${currentPage - 1 > 1 ? `?page=${currentPage - 1}` : ""}`}
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
                href={`/diziler/tur/${genre.slug}?page=${currentPage + 1}`}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-medium text-text-primary transition-colors"
              >
                Sonraki →
              </Link>
            )}
          </nav>
        )}

        {/* Other TV Genres Quick Navigation */}
        <section className="space-y-3 pt-6 border-t border-border/60">
          <h2 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
            Diğer Dizi Türleri
          </h2>
          <div className="flex flex-wrap gap-2">
            {TV_GENRES.map((g) => (
              <Link
                key={g.slug}
                href={`/diziler/tur/${g.slug}`}
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
