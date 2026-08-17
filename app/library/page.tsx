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
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<string>("newest");
  const [isLoading, setIsLoading] = useState(true);

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
        sort,
        page: String(page),
        limit: "24",
      });

      if (isFav) {
        params.set("isFavorite", "true");
      }

      const res = await fetch(`/api/library?${params.toString()}`);
      if (res.ok) {
        const data: UserLibraryResponse = await res.json();
        setItems(data.items);
        setCounts(data.counts);
        setTotalPages(data.totalPages);
      }
    } catch (e) {
      console.error("[Library Fetch Error]:", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentTab, mediaType, debouncedSearch, sort, page]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleTabChange = (newTab: string) => {
    setCurrentTab(newTab);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab.toLowerCase());
    router.push(`/library?${params.toString()}`, { scroll: false });
  };

  const handleMediaTypeChange = (newMediaType: "ALL" | "FILM" | "TV") => {
    setMediaType(newMediaType);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (newMediaType === "ALL") {
      params.delete("mediaType");
    } else {
      params.set("mediaType", newMediaType);
    }
    router.push(`/library?${params.toString()}`, { scroll: false });
  };

  const handleAction = async (
    targetMediaType: "FILM" | "TV",
    contentId: string,
    action: "ADD_WATCHLIST" | "REMOVE_WATCHLIST" | "MARK_WATCHED" | "MARK_DROPPED" | "ADD_FAVORITE" | "REMOVE_FAVORITE" | "CLEAR_STATE",
    rating?: string
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
          rating,
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

          {/* Sub-Filters: Media Type, Search, and Sorting */}
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

            <div className="flex items-center gap-2 w-full sm:w-auto font-sans text-xs">
              {/* Search input */}
              <div className="relative flex-1 sm:w-60">
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

              {/* Sort Selector */}
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-surface-1 border border-border text-xs text-text-primary focus:outline-none focus:border-accent min-h-[40px]"
              >
                <option value="newest">En Yeni Eklenenler</option>
                <option value="oldest">En Eski Eklenenler</option>
                <option value="title">Başlık (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

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
                Bu sekmede henüz içerik yok
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Öneriler veya arama sayfalarından beğendiğiniz filmleri ve dizileri listenize ekleyebilirsiniz.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <Link
                href="/recommendations"
                className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-all min-h-[44px] flex items-center justify-center"
              >
                Önerileri Keşfet →
              </Link>
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

                    {/* Media Type Tag */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-surface-1/90 backdrop-blur-md border border-border text-[10px] font-sans font-semibold text-text-primary">
                      {item.mediaType === "FILM" ? "FİLM" : "DİZİ"}
                    </span>

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(
                          item.mediaType,
                          item.contentId,
                          isFav ? "REMOVE_FAVORITE" : "ADD_FAVORITE"
                        );
                      }}
                      className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
                        isFav
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                          : "bg-surface-1/80 border-border text-text-muted hover:text-amber-400"
                      }`}
                    >
                      ★
                    </button>
                  </div>

                  {/* Info & Actions */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        if (item.mediaType === "FILM") {
                          setSelectedMovieModal({ movieId: item.contentId, initialData: item });
                        } else {
                          setSelectedTvModal({ tvShowId: item.contentId, initialData: item });
                        }
                      }}
                    >
                      <h4 className="font-sans font-bold text-xs text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-text-muted font-sans mt-0.5">
                        {item.releaseYear || ""} {item.genres && item.genres.length > 0 ? `• ${item.genres[0]}` : ""}
                      </p>
                    </div>

                    {/* Quick State Actions Strip */}
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/60">
                      {/* Rating or Watched button */}
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
