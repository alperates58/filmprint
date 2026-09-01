"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { getTmdbImageUrl } from "@/lib/tmdb/image";

const GENRES = [
  { id: 28, name: "Aksiyon" },
  { id: 12, name: "Macera" },
  { id: 16, name: "Animasyon" },
  { id: 35, name: "Komedi" },
  { id: 80, name: "Suç" },
  { id: 99, name: "Belgesel" },
  { id: 18, name: "Dram" },
  { id: 10751, name: "Aile" },
  { id: 14, name: "Fantezi" },
  { id: 36, name: "Tarih" },
  { id: 27, name: "Korku" },
  { id: 10402, name: "Müzik" },
  { id: 9648, name: "Gizem" },
  { id: 10749, name: "Romantik" },
  { id: 878, name: "Bilim Kurgu" },
  { id: 53, name: "Gerilim" },
  { id: 10752, name: "Savaş" },
  { id: 37, name: "Vahşi Batı" },
];

const SORT_OPTIONS = [
  { value: "popularity", label: "En Popüler" },
  { value: "voteAverage", label: "En Yüksek Puan" },
  { value: "newest", label: "En Yeni Çıkanlar" },
  { value: "oldest", label: "En Klasikler (Eskiden Yeniye)" },
  { value: "voteCount", label: "En Çok Oy Alanlar" },
];

interface SearchResultItem {
  id: string;
  tmdbId: number;
  mediaType: "FILM" | "TV";
  title: string;
  originalTitle: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  voteAverage: number;
  voteCount: number;
  genres: string[];
  slug: string;
  popularity: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  movieCount?: number;
  tvCount?: number;
}

function AdvancedSearchContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL State
  const initialQ = searchParams.get("q") || "";
  const initialActor = searchParams.get("oyuncu") || "";
  const initialGenre = searchParams.get("tur") || "";
  const initialMediaType = (searchParams.get("mediaType") || "ALL").toUpperCase();
  const initialMinScore = searchParams.get("minScore") || "";
  const initialMinYear = searchParams.get("minYear") || "";
  const initialMaxYear = searchParams.get("maxYear") || "";
  const initialSort = searchParams.get("sort") || "popularity";
  const initialPage = parseInt(searchParams.get("page") || "1", 10);

  // Form State
  const [q, setQ] = useState(initialQ);
  const [actor, setActor] = useState(initialActor);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [mediaType, setMediaType] = useState(initialMediaType);
  const [minScore, setMinScore] = useState(initialMinScore);
  const [minYear, setMinYear] = useState(initialMinYear);
  const [maxYear, setMaxYear] = useState(initialMaxYear);
  const [sort, setSort] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Results State
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 24,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Sync state when URL params change
  useEffect(() => {
    setQ(searchParams.get("q") || "");
    setActor(searchParams.get("oyuncu") || "");
    setSelectedGenre(searchParams.get("tur") || "");
    setMediaType((searchParams.get("mediaType") || "ALL").toUpperCase());
    setMinScore(searchParams.get("minScore") || "");
    setMinYear(searchParams.get("minYear") || "");
    setMaxYear(searchParams.get("maxYear") || "");
    setSort(searchParams.get("sort") || "popularity");
    setCurrentPage(parseInt(searchParams.get("page") || "1", 10));
  }, [searchParams]);

  // Fetch results from DB
  const executeSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (actor) params.set("oyuncu", actor);
      if (selectedGenre) params.set("tur", selectedGenre);
      if (mediaType && mediaType !== "ALL") params.set("mediaType", mediaType);
      if (minScore) params.set("minScore", minScore);
      if (minYear) params.set("minYear", minYear);
      if (maxYear) params.set("maxYear", maxYear);
      if (sort) params.set("sort", sort);
      if (currentPage > 1) params.set("page", currentPage.toString());

      const res = await fetch(`/api/search/advanced?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setPagination(data.pagination || { page: 1, limit: 24, total: 0, totalPages: 1, hasMore: false });
      }
    } catch (error) {
      console.error("Advanced search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [q, actor, selectedGenre, mediaType, minScore, minYear, maxYear, sort, currentPage]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  // Apply filters to URL
  const applyFilters = (newPage = 1) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (actor.trim()) params.set("oyuncu", actor.trim());
    if (selectedGenre) params.set("tur", selectedGenre);
    if (mediaType !== "ALL") params.set("mediaType", mediaType);
    if (minScore) params.set("minScore", minScore);
    if (minYear) params.set("minYear", minYear);
    if (maxYear) params.set("maxYear", maxYear);
    if (sort !== "popularity") params.set("sort", sort);
    if (newPage > 1) params.set("page", newPage.toString());

    router.push(`${pathname}?${params.toString()}`);
  };

  const resetFilters = () => {
    setQ("");
    setActor("");
    setSelectedGenre("");
    setMediaType("ALL");
    setMinScore("");
    setMinYear("");
    setMaxYear("");
    setSort("popularity");
    router.push(pathname);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    applyFilters(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans">
      <ScrollToTop />
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 w-full">
        {/* Page Header */}
        <div className="space-y-2">
          <nav aria-label="Breadcrumb" className="text-xs font-mono text-text-muted flex items-center gap-2">
            <Link href="/" className="hover:text-accent transition-colors">Ana Sayfa</Link>
            <span>/</span>
            <span className="text-text-primary font-semibold">Detaylı Arama</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight text-text-primary flex items-center gap-3">
                <span>🔎</span>
                <span>Kapsamlı Film & Dizi Arama Motoru</span>
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">
                660.000+ yapım arasında tür, puan, çıkış yılı ve oyuncu filtresiyle dilediğin içeriği anında bul.
              </p>
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="md:hidden px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-xs font-semibold flex items-center justify-center gap-2 text-text-primary shadow-sm"
            >
              <span>⚙️</span>
              <span>{isMobileFiltersOpen ? "Filtreleri Gizle" : "Filtreleri Göster"}</span>
            </button>
          </div>
        </div>

        {/* Main Layout: Filters Sidebar + Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Filters Panel (Sidebar on desktop, Collapsible on mobile) */}
          <aside
            className={`lg:col-span-1 space-y-6 bg-surface-1/90 border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl ${
              isMobileFiltersOpen ? "block" : "hidden lg:block"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 font-mono">
                <span>⚙️</span>
                <span>Arama Filtreleri</span>
              </h2>
              <button
                onClick={resetFilters}
                className="text-[11px] text-accent hover:underline font-mono"
              >
                Sıfırla
              </button>
            </div>

            {/* Title Search Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Film / Dizi Adı</label>
              <div className="relative">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters(1)}
                  placeholder="Örn: Inception, Matrix..."
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-2 border border-border focus:border-accent text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Actor Search Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <span>🎭</span>
                <span>Oyuncu / Yönetmen Adı</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters(1)}
                  placeholder="Örn: Bruce Willis, Nolan..."
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-2 border border-border focus:border-accent text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Media Type Segmented Control */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Medya Türü</label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-surface-2 rounded-xl border border-border text-xs font-medium text-center">
                <button
                  type="button"
                  onClick={() => setMediaType("ALL")}
                  className={`py-1.5 rounded-lg transition-all ${
                    mediaType === "ALL"
                      ? "bg-accent text-white font-bold shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Tümü
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("FILM")}
                  className={`py-1.5 rounded-lg transition-all ${
                    mediaType === "FILM"
                      ? "bg-blue-600 text-white font-bold shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Filmler
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("TV")}
                  className={`py-1.5 rounded-lg transition-all ${
                    mediaType === "TV"
                      ? "bg-emerald-600 text-white font-bold shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Diziler
                </button>
              </div>
            </div>

            {/* Score Range Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary flex items-center justify-between">
                <span>Minimum Puan</span>
                <span className="text-accent font-mono font-bold">{minScore ? `${minScore}+` : "Tümü"}</span>
              </label>
              <select
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none cursor-pointer"
              >
                <option value="">Fark Etmez (Tüm Puanlar)</option>
                <option value="6.0">★ 6.0 ve Üzeri</option>
                <option value="7.0">★ 7.0 ve Üzeri (İyi)</option>
                <option value="7.5">★ 7.5 ve Üzeri (Çok İyi)</option>
                <option value="8.0">★ 8.0 ve Üzeri (Şaheserler)</option>
                <option value="8.5">★ 8.5 ve Üzeri (Efsaneler)</option>
              </select>
            </div>

            {/* Release Year Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Çıkış Yılı Aralığı</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min Yıl (Örn: 1980)"
                  value={minYear}
                  onChange={(e) => setMinYear(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Max Yıl (Örn: 2026)"
                  value={maxYear}
                  onChange={(e) => setMaxYear(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-surface-2 border border-border text-text-primary text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Genre Filter Pills */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary">Film / Dizi Türü</label>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                {GENRES.map((g) => {
                  const isSelected = selectedGenre === g.name || selectedGenre === g.id.toString();
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGenre(isSelected ? "" : g.name)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-sans transition-all ${
                        isSelected
                          ? "bg-accent text-white font-bold shadow-sm border border-accent"
                          : "bg-surface-2 text-text-secondary hover:text-text-primary border border-border hover:border-border-strong"
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Filter Button */}
            <button
              type="button"
              onClick={() => applyFilters(1)}
              className="w-full py-3 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-lg shadow-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🔍</span>
              <span>Filtreleri Uygula</span>
            </button>
          </aside>

          {/* Results Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Top Toolbar (Result count + Sort Dropdown) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-1 border border-border/80 shadow-sm">
              <div className="text-xs font-mono text-text-secondary">
                {isLoading ? (
                  <span>Sonuçlar yükleniyor...</span>
                ) : (
                  <span>
                    Toplam <strong className="text-text-primary font-bold">{pagination.total.toLocaleString("tr-TR")}</strong> sonuç bulundu
                    {pagination.movieCount !== undefined && pagination.tvCount !== undefined && (
                      <span className="text-text-muted"> ({pagination.movieCount} Film, {pagination.tvCount} Dizi)</span>
                    )}
                  </span>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-mono">Sırala:</span>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("sort", e.target.value);
                    params.set("page", "1");
                    router.push(`${pathname}?${params.toString()}`);
                  }}
                  className="h-9 px-3 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none cursor-pointer font-sans"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl overflow-hidden bg-surface-1 border border-border animate-pulse aspect-[2/3] flex flex-col justify-end p-4 space-y-2"
                  >
                    <div className="h-4 bg-surface-2 rounded w-3/4" />
                    <div className="h-3 bg-surface-2 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : items.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
                {items.map((item) => {
                  const posterUrl = item.posterPath ? getTmdbImageUrl(item.posterPath, "w300") : null;
                  return (
                    <Link
                      key={`${item.mediaType}-${item.id}`}
                      href={item.slug}
                      className="group block rounded-2xl overflow-hidden border border-border/80 bg-surface-1 hover:border-accent/60 transition-all hover:scale-[1.02] shadow-sm hover:shadow-xl flex flex-col"
                    >
                      {/* Poster Aspect Box */}
                      <div className="aspect-[2/3] relative bg-surface-2 overflow-hidden">
                        {posterUrl ? (
                          <Image
                            src={posterUrl}
                            alt={item.title}
                            fill
                            sizes="(max-width: 768px) 180px, 240px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-mono">
                            Görsel Yok
                          </div>
                        )}

                        {/* Top Badges (Media Type & Rating) */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md shadow-md backdrop-blur-md ${
                              item.mediaType === "FILM"
                                ? "bg-blue-600/90 text-white"
                                : "bg-emerald-600/90 text-white"
                            }`}
                          >
                            {item.mediaType === "FILM" ? "FİLM" : "DİZİ"}
                          </span>

                          {item.voteAverage > 0 && (
                            <ScoreBadge score={Math.round(item.voteAverage * 10)} size="sm" />
                          )}
                        </div>
                      </div>

                      {/* Info Body */}
                      <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-accent transition-colors line-clamp-1 font-sans">
                            {item.title}
                          </p>
                          {item.originalTitle && item.originalTitle !== item.title && (
                            <p className="text-[11px] text-text-muted italic truncate font-sans">
                              {item.originalTitle}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted pt-1 border-t border-border/40">
                          <span>{item.releaseYear || "—"}</span>
                          {item.genres.length > 0 && (
                            <span className="truncate max-w-[90px] text-right font-sans text-text-secondary">
                              {item.genres[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* Empty State */
              <div className="p-12 text-center rounded-3xl bg-surface-1 border border-border/80 space-y-4">
                <div className="text-5xl">🎬</div>
                <h3 className="text-lg font-bold text-text-primary font-display">
                  Eşleşen film veya dizi bulunamadı
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto">
                  Arama kriterlerinizi genişletmeyi veya farklı bir tür, puan veya oyuncu adı denemeyi düşünebilirsiniz.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors shadow-md"
                >
                  Tüm Filtreleri Temizle
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 font-mono text-xs">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3.5 py-2 rounded-xl bg-surface-2 border border-border hover:border-accent disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  ← Önceki
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="px-3.5 py-2 rounded-xl bg-accent text-white font-bold">
                    {pagination.page}
                  </span>
                  <span className="text-text-muted">/</span>
                  <span className="px-2 py-1 text-text-muted">
                    {pagination.totalPages}
                  </span>
                </div>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasMore}
                  className="px-3.5 py-2 rounded-xl bg-surface-2 border border-border hover:border-accent disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  Sonraki →
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AdvancedSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-base" />}>
      <AdvancedSearchContent />
    </Suspense>
  );
}
