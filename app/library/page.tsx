"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { MovieDetailsModal } from "@/components/movie/MovieDetailsModal";
import { TvDetailsModal } from "@/components/tv/TvDetailsModal";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import type { LibraryItemDto, UserLibraryResponse } from "@/lib/library/service";

const RATING_LABELS: Record<string, { label: string; emoji: string }> = {
  LOVE: { label: "Çok Sevdim", emoji: "❤️" },
  LIKE: { label: "Beğendim", emoji: "👍" },
  NEUTRAL: { label: "Ortalama", emoji: "😐" },
  DISLIKE: { label: "Sevmedim", emoji: "👎" },
};

const ERA_OPTIONS = [
  { key: "ALL", label: "Tüm Yıllar" },
  { key: "2020s", label: "2020'ler" },
  { key: "2010s", label: "2010'lar" },
  { key: "2000s", label: "2000'ler" },
  { key: "1990s", label: "90'lar" },
  { key: "classic", label: "Klasikler (<1990)" },
];

const SORT_OPTIONS = [
  { key: "newest", label: "🕒 En Yeni Eklenenler" },
  { key: "oldest", label: "⏳ En Eski Eklenenler" },
  { key: "rating_desc", label: "⭐ En Yüksek Puan (IMDb)" },
  { key: "rating_asc", label: "📉 En Düşük Puan" },
  { key: "year_desc", label: "📅 En Yeni Çıkış Yılı" },
  { key: "year_asc", label: "📜 En Eski Çıkış Yılı" },
  { key: "title_asc", label: "🔤 Başlık (A-Z)" },
  { key: "user_rating", label: "💖 Önce Çok Sevdiklerim" },
];

function LibraryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = (searchParams.get("tab") || "WATCHLIST").toUpperCase();
  const rawMediaType = (searchParams.get("mediaType") || "ALL").toUpperCase();
  const initialMediaType: "ALL" | "FILM" | "TV" =
    rawMediaType === "FILM" || rawMediaType === "TV" ? rawMediaType : "ALL";

  const [currentTab, setCurrentTab] = useState<string>(tabParam);
  const [mediaType, setMediaType] = useState<"ALL" | "FILM" | "TV">(initialMediaType);

  const [items, setItems] = useState<LibraryItemDto[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    watchlist: 0,
    watched: 0,
    notWatched: 0,
    dropped: 0,
    favorites: 0,
    films: { total: 0, watchlist: 0, watched: 0, notWatched: 0, dropped: 0, favorites: 0 },
    tv: { total: 0, watchlist: 0, watched: 0, notWatched: 0, dropped: 0, favorites: 0 },
  });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(24);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<string>("newest");
  const [genre, setGenre] = useState<string>("ALL");
  const [era, setEra] = useState<string>("ALL");
  const [rating, setRating] = useState<string>("ALL");
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Tonight smart picker modal
  const [isTonightLoading, setIsTonightLoading] = useState(false);
  const [tonightPicks, setTonightPicks] = useState<LibraryItemDto[] | null>(null);

  // Active inline action states
  const [activeRatingItem, setActiveRatingItem] = useState<{ id: string; contentId: string; mediaType: "FILM" | "TV" } | null>(null);
  const [selectedMovieModal, setSelectedMovieModal] = useState<{ movieId: string; initialData?: any } | null>(null);
  const [selectedTvModal, setSelectedTvModal] = useState<{ tvShowId: string; initialData?: any } | null>(null);

  useEffect(() => {
    setCurrentTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (initialMediaType) {
      setMediaType(initialMediaType);
    }
  }, [initialMediaType]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const isFav = currentTab === "FAVORITES";
      const stateFilter = isFav ? "ALL" : currentTab;

      const params = new URLSearchParams({
        mediaType,
        state: stateFilter,
        search: debouncedSearch,
        genre: genre !== "ALL" ? genre : "",
        era: era !== "ALL" ? era : "",
        rating: rating !== "ALL" ? rating : "",
        sort,
        page: String(page),
        limit: String(limit),
      });

      if (isFav) {
        params.set("isFavorite", "true");
      }

      const res = await fetch(`/api/library?${params.toString()}`);
      if (res.ok) {
        const data: UserLibraryResponse = await res.json();
        setItems(data.items || []);
        setCounts(data.counts);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
        if (data.availableGenres) {
          setAvailableGenres(data.availableGenres);
        }
      }
    } catch (e) {
      console.error("[Library Fetch Error]:", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentTab, mediaType, debouncedSearch, genre, era, rating, sort, page, limit]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleTabChange = (newTab: string) => {
    setCurrentTab(newTab);
    setPage(1);
    setGenre("ALL");
    setEra("ALL");
    setRating("ALL");
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab.toLowerCase());
    router.push(`/library?${params.toString()}`, { scroll: false });
  };

  const handleMediaTypeChange = (newMediaType: "ALL" | "FILM" | "TV") => {
    setMediaType(newMediaType);
    setPage(1);
    setGenre("ALL");
    setEra("ALL");
    const params = new URLSearchParams(searchParams.toString());
    if (newMediaType === "ALL") {
      params.delete("mediaType");
    } else {
      params.set("mediaType", newMediaType);
    }
    router.push(`/library?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const clearAllFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setGenre("ALL");
    setEra("ALL");
    setRating("ALL");
    setSort("newest");
    setPage(1);
  };

  const hasActiveFilters =
    genre !== "ALL" || era !== "ALL" || rating !== "ALL" || sort !== "newest" || search.trim() !== "";

  const handleAction = async (
    targetMediaType: "FILM" | "TV",
    contentId: string,
    action: "ADD_WATCHLIST" | "REMOVE_WATCHLIST" | "MARK_WATCHED" | "MARK_DROPPED" | "ADD_FAVORITE" | "REMOVE_FAVORITE" | "CLEAR_STATE",
    actionRating?: string
  ) => {
    try {
      // Optimistic update
      if (action === "ADD_FAVORITE" || action === "REMOVE_FAVORITE") {
        const nextFav = action === "ADD_FAVORITE";
        setItems((prev) =>
          prev.map((i) => (i.contentId === contentId ? { ...i, isFavorite: nextFav } : i))
        );
      }

      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: targetMediaType,
          contentId,
          action,
          rating: actionRating,
        }),
      });

      if (res.ok) {
        fetchLibrary();
      }
    } catch (e) {
      console.error("[Library Action Error]:", e);
    }
  };

  const handleFetchTonightPicks = async () => {
    setIsTonightLoading(true);
    try {
      const res = await fetch(`/api/library/tonight?mediaType=${mediaType}`);
      if (res.ok) {
        const data = await res.json();
        setTonightPicks(data.picks || []);
      }
    } catch (e) {
      console.error("[Tonight Picks Error]:", e);
    } finally {
      setIsTonightLoading(false);
    }
  };

  const activeCounts =
    mediaType === "FILM"
      ? counts.films
      : mediaType === "TV"
      ? counts.tv
      : {
          watchlist: counts.watchlist,
          watched: counts.watched,
          notWatched: counts.notWatched,
          favorites: counts.favorites,
          dropped: counts.dropped,
          total: counts.total,
        };

  // Generate pagination page numbers
  const getPaginationItems = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-6 md:space-y-8">
        {/* Top Header & Tonight Feature Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 rounded-3xl bg-surface-1 border border-border shadow-md relative overflow-hidden">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold">
              <span>📚 KİŞİSEL KOLEKSİYON</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              {mediaType === "FILM" ? "Filmlerim" : mediaType === "TV" ? "Dizilerim" : "Kütüphanem"}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-xl leading-relaxed">
              İzleme listeniz, tamamladığınız yapımlar ve favorileriniz tek bir çatı altında.
            </p>
          </div>

          <button
            onClick={handleFetchTonightPicks}
            disabled={isTonightLoading || activeCounts.watchlist === 0}
            className="px-5 py-3 rounded-2xl bg-accent text-white font-sans text-xs font-semibold hover:bg-accent-hover active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 self-start md:self-auto disabled:opacity-50 disabled:cursor-not-allowed group flex-shrink-0 min-h-[48px]"
          >
            <span className="text-base">🍿</span>
            <span>{isTonightLoading ? "Seçiliyor..." : "Bu Akşam Ne İzlesem?"}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold">
              {activeCounts.watchlist}
            </span>
          </button>
        </div>

        {/* Tonight Picks Overlay Card */}
        {tonightPicks && tonightPicks.length > 0 && (
          <div className="p-6 rounded-3xl bg-surface-1 border border-accent/40 shadow-lg space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h3 className="font-display text-lg font-bold text-text-primary">
                  Bu Akşam İçin Seçilenler
                </h3>
              </div>
              <button
                onClick={() => setTonightPicks(null)}
                className="text-xs text-text-muted hover:text-text-primary px-3 py-1 rounded-lg bg-surface-2 border border-border"
              >
                Kapat ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {tonightPicks.map((pick) => {
                const posterUrl = getTmdbImageUrl(pick.posterPath, "w500");
                return (
                  <div
                    key={pick.id}
                    className="p-3 rounded-2xl bg-surface-2 border border-border hover:border-accent transition-all cursor-pointer space-y-2 group"
                    onClick={() => {
                      if (pick.mediaType === "FILM") {
                        setSelectedMovieModal({ movieId: pick.contentId, initialData: pick });
                      } else {
                        setSelectedTvModal({ tvShowId: pick.contentId, initialData: pick });
                      }
                    }}
                  >
                    <div className="aspect-[2/3] rounded-xl overflow-hidden relative bg-surface-3">
                      {posterUrl && (
                        <Image
                          src={posterUrl}
                          alt={pick.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-text-primary line-clamp-1">{pick.title}</p>
                      <span className="text-[10px] text-text-muted">{pick.releaseYear || ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters and Navigation Controls */}
        <div className="space-y-4">
          {/* Main State Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-sans">
            {[
              { key: "WATCHLIST", label: "İzleme Listem", count: activeCounts.watchlist, icon: "🔖" },
              { key: "WATCHED", label: "İzlediklerim", count: activeCounts.watched, icon: "👁️" },
              { key: "NOT_WATCHED", label: "İzlemediklerim", count: activeCounts.notWatched, icon: "🙈" },
              { key: "FAVORITES", label: "Favorilerim", count: activeCounts.favorites, icon: "⭐" },
              { key: "DROPPED", label: "Bıraktıklarım", count: activeCounts.dropped, icon: "🚫" },
              { key: "ALL", label: "Tümü", count: activeCounts.total, icon: "📁" },
            ].map((tab) => {
              const isActive = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? "bg-accent text-white font-semibold shadow-sm"
                      : "bg-surface-1 border border-border text-text-secondary hover:text-text-primary hover:border-border-strong"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? "bg-black/25 text-white font-bold" : "bg-surface-2 text-text-muted"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sub-Filters: Media Type, Search, Filter Toggle, and Sorting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Media Type Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-surface-1 border border-border text-xs font-sans font-medium self-start">
              {[
                { key: "ALL", label: "Tümü" },
                { key: "FILM", label: "Filmler" },
                { key: "TV", label: "Diziler" },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => handleMediaTypeChange(m.key as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    mediaType === m.key
                      ? "bg-accent text-white font-semibold shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto font-sans text-xs">
              {/* Search input */}
              <div className="relative flex-1 sm:w-56">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Kütüphanede ara..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-1 border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-all min-h-[40px]"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs">
                  🔍
                </span>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition-all ${
                  showFilterPanel || hasActiveFilters
                    ? "bg-accent-subtle border-accent/40 text-accent"
                    : "bg-surface-1 border border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                <span>⚙️</span>
                <span>Filtrele</span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                )}
              </button>

              {/* Sort Selector */}
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-surface-1 border border-border text-xs text-text-primary focus:outline-none focus:border-accent min-h-[40px]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed Filtering Panel */}
          {showFilterPanel && (
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-1 border border-border/80 shadow-sm space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {/* Genre Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-text-secondary">
                    Tür Filtresi
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => {
                      setGenre(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="ALL">Tüm Türler ({availableGenres.length})</option>
                    {availableGenres.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Era Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-text-secondary">
                    Çıkış Yılı / Dönem
                  </label>
                  <select
                    value={era}
                    onChange={(e) => {
                      setEra(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    {ERA_OPTIONS.map((e) => (
                      <option key={e.key} value={e.key}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rating Filter (Only for Watched or All) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-text-secondary">
                    Sizin Değerlendirmeniz
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => {
                      setRating(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="ALL">Tüm Puanlar</option>
                    <option value="LOVE">❤️ Çok Sevdim</option>
                    <option value="LIKE">👍 Beğendim</option>
                    <option value="NEUTRAL">😐 Ortalama</option>
                    <option value="DISLIKE">👎 Sevmedim</option>
                    <option value="UNRATED">Değerlendirilmemiş</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Badges & Reset Button */}
              {hasActiveFilters && (
                <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-border/40">
                  <span className="text-[11px] text-text-muted">Aktif Filtreler:</span>
                  {genre !== "ALL" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-[11px] text-accent font-medium">
                      <span>Tür: {genre}</span>
                      <button onClick={() => setGenre("ALL")} className="hover:text-white">✕</button>
                    </span>
                  )}
                  {era !== "ALL" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-[11px] text-accent font-medium">
                      <span>Dönem: {ERA_OPTIONS.find((e) => e.key === era)?.label}</span>
                      <button onClick={() => setEra("ALL")} className="hover:text-white">✕</button>
                    </span>
                  )}
                  {rating !== "ALL" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-[11px] text-accent font-medium">
                      <span>Puan: {RATING_LABELS[rating]?.label || rating}</span>
                      <button onClick={() => setRating("ALL")} className="hover:text-white">✕</button>
                    </span>
                  )}
                  {search.trim() !== "" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-[11px] text-accent font-medium">
                      <span>Arama: &quot;{search}&quot;</span>
                      <button onClick={() => setSearch("")} className="hover:text-white">✕</button>
                    </span>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="ml-auto text-[11px] text-text-muted hover:text-accent underline cursor-pointer"
                  >
                    Tüm Filtreleri Sıfırla
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Info Bar */}
        {!isLoading && totalCount > 0 && (
          <div className="flex items-center justify-between text-xs text-text-muted px-1">
            <span>
              Toplam <strong className="text-text-primary font-mono">{totalCount}</strong> içerikten{" "}
              <strong className="text-text-primary font-mono">
                {(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)}
              </strong>{" "}
              arası gösteriliyor
            </span>
            <span>
              Sayfa <strong className="text-text-primary font-mono">{page}</strong> /{" "}
              <strong className="text-text-primary font-mono">{totalPages}</strong>
            </span>
          </div>
        )}

        {/* Content Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div key={idx} className="aspect-[2/3] rounded-2xl bg-surface-1 animate-pulse border border-border" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 md:p-16 rounded-3xl bg-surface-1 border border-border text-center space-y-4 max-w-lg mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border text-2xl flex items-center justify-center mx-auto">
              📭
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-lg font-bold text-text-primary">
                {hasActiveFilters ? "Filtrelere uygun içerik bulunamadı" : "Bu sekmede henüz içerik yok"}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {hasActiveFilters
                  ? "Seçtiğiniz filtre kriterlerini değiştirerek veya sıfırlayarak tekrar deneyebilirsiniz."
                  : "Öneriler veya arama sayfalarından beğendiğiniz filmleri ve dizileri listenize ekleyebilirsiniz."}
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              {hasActiveFilters ? (
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary text-xs font-semibold hover:border-accent transition-all min-h-[44px] flex items-center justify-center"
                >
                  Filtreleri Temizle
                </button>
              ) : (
                <Link
                  href="/recommendations"
                  className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-all min-h-[44px] flex items-center justify-center"
                >
                  Önerileri Keşfet →
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((item) => {
              const posterUrl = getTmdbImageUrl(item.posterPath, "w500");
              const isWatched = item.state === "WATCHED";
              const isFav = item.isFavorite;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-surface-1 border border-border hover:border-border-strong transition-all flex flex-col overflow-hidden group shadow-sm"
                >
                  {/* Poster & Badges */}
                  <div
                    className="aspect-[2/3] relative overflow-hidden bg-surface-2 cursor-pointer"
                    onClick={() => {
                      if (item.mediaType === "FILM") {
                        setSelectedMovieModal({ movieId: item.contentId, initialData: item });
                      } else {
                        setSelectedTvModal({ tvShowId: item.contentId, initialData: item });
                      }
                    }}
                  >
                    {posterUrl ? (
                      <Image
                        src={posterUrl}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted text-2xl">
                        🎬
                      </div>
                    )}

                    {/* Top-Left Media Type Badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                      {item.mediaType === "FILM" ? "Film" : "Dizi"}
                    </div>

                    {/* Top-Right Favorite Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(
                          item.mediaType,
                          item.contentId,
                          isFav ? "REMOVE_FAVORITE" : "ADD_FAVORITE"
                        );
                      }}
                      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                        isFav
                          ? "bg-amber-500 text-white shadow-md"
                          : "bg-black/60 text-white/70 hover:text-amber-400 hover:bg-black/80"
                      }`}
                      title={isFav ? "Favorilerden Çıkar" : "Favorilere Ekle"}
                    >
                      <span className="text-xs">{isFav ? "★" : "☆"}</span>
                    </button>

                    {/* Rating Badge Overlay if Watched */}
                    {item.userRating && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-sans font-semibold text-emerald-400 flex items-center gap-1">
                        <span>{RATING_LABELS[item.userRating]?.emoji}</span>
                        <span>{RATING_LABELS[item.userRating]?.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Info Card Content */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-1">
                      <h4
                        className="font-display font-bold text-xs sm:text-sm text-text-primary line-clamp-1 hover:text-accent transition-colors cursor-pointer"
                        onClick={() => {
                          if (item.mediaType === "FILM") {
                            setSelectedMovieModal({ movieId: item.contentId, initialData: item });
                          } else {
                            setSelectedTvModal({ tvShowId: item.contentId, initialData: item });
                          }
                        }}
                      >
                        {item.title}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] text-text-muted">
                        <span>
                          {item.releaseYear || "—"}{" "}
                          {item.genres && item.genres.length > 0 && `• ${item.genres[0]}`}
                        </span>
                        {item.voteAverage > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-400 font-mono font-semibold">
                            ★ {item.voteAverage.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1 text-xs">
                      {/* State Button */}
                      {isWatched ? (
                        <button
                          onClick={() =>
                            setActiveRatingItem({
                              id: item.id,
                              contentId: item.contentId,
                              mediaType: item.mediaType,
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-surface-2 border border-border text-[11px] font-sans font-medium text-emerald-400 flex items-center gap-1 hover:bg-surface-3 transition-colors"
                        >
                          <span>{item.userRating ? RATING_LABELS[item.userRating]?.emoji || "✓" : "✓"}</span>
                          <span>{item.userRating ? RATING_LABELS[item.userRating]?.label || "İzledim" : "İzledim"}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(item.mediaType, item.contentId, "MARK_WATCHED")}
                          className="px-2 py-1 rounded-lg bg-surface-2 border border-border hover:border-emerald-500/40 text-[11px] font-sans text-text-secondary hover:text-emerald-400 flex items-center gap-1 transition-colors"
                        >
                          <span>👁️</span>
                          <span>Artık İzledim</span>
                        </button>
                      )}

                      {/* Remove / Clear Action */}
                      <button
                        onClick={() => handleAction(item.mediaType, item.contentId, "CLEAR_STATE")}
                        title="Kütüphaneden Çıkar"
                        className="w-7 h-7 rounded-lg bg-surface-2 border border-border hover:border-destructive/40 text-text-muted hover:text-destructive text-xs flex items-center justify-center transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && totalPages > 1 && (
          <div className="pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60">
            <div className="text-xs text-text-muted font-sans">
              Toplam <span className="text-text-primary font-bold">{totalCount}</span> içerik (Sayfa{" "}
              <span className="text-text-primary font-bold">{page}</span> / {totalPages})
            </div>

            <div className="flex items-center gap-1.5 text-xs font-sans">
              {/* Previous Page Button */}
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-3 py-2 rounded-xl bg-surface-1 border border-border text-text-secondary hover:text-text-primary hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[38px] flex items-center gap-1"
              >
                <span>‹</span>
                <span>Önceki</span>
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {getPaginationItems().map((p, idx) => {
                  if (typeof p === "string") {
                    return (
                      <span key={`dots-${idx}`} className="px-2 text-text-muted select-none">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = p === page;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-9 h-9 rounded-xl font-mono text-xs font-semibold flex items-center justify-center transition-all ${
                        isCurrent
                          ? "bg-accent text-white shadow-sm"
                          : "bg-surface-1 border border-border text-text-secondary hover:text-text-primary hover:border-border-strong"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-xl bg-surface-1 border border-border text-text-secondary hover:text-text-primary hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[38px] flex items-center gap-1"
              >
                <span>Sonraki</span>
                <span>›</span>
              </button>
            </div>
          </div>
        )}

        {/* Rating Dropdown / Modal for Watched Items */}
        {activeRatingItem && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setActiveRatingItem(null)}
          >
            <div
              className="w-full max-w-xs rounded-3xl bg-surface-1 border border-border p-5 space-y-3 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-display text-sm font-bold text-text-primary text-center">
                Değerlendirmenizi Seçin
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-sans font-semibold">
                {Object.entries(RATING_LABELS).map(([ratingKey, ratingVal]) => (
                  <button
                    key={ratingKey}
                    onClick={() => {
                      handleAction(activeRatingItem.mediaType, activeRatingItem.contentId, "MARK_WATCHED", ratingKey);
                      setActiveRatingItem(null);
                    }}
                    className="p-3 rounded-2xl bg-surface-2 border border-border hover:border-accent flex flex-col items-center gap-1 transition-all"
                  >
                    <span className="text-xl">{ratingVal.emoji}</span>
                    <span>{ratingVal.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {selectedMovieModal && (
          <MovieDetailsModal
            movieId={selectedMovieModal.movieId}
            initialData={selectedMovieModal.initialData}
            onClose={() => setSelectedMovieModal(null)}
            onInteractionUpdate={() => fetchLibrary()}
          />
        )}

        {selectedTvModal && (
          <TvDetailsModal
            tvShowId={selectedTvModal.tvShowId}
            initialData={selectedTvModal.initialData}
            onClose={() => setSelectedTvModal(null)}
            onInteractionUpdate={() => fetchLibrary()}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-base flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  );
}
