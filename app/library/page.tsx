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
    dropped: 0,
    favorites: 0,
    films: { total: 0, watchlist: 0, watched: 0, dropped: 0, favorites: 0 },
    tv: { total: 0, watchlist: 0, watched: 0, dropped: 0, favorites: 0 },
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
    router.push(`/library?tab=${newTab.toLowerCase()}`, { scroll: false });
  };

  const handleAction = async (
    mediaType: "FILM" | "TV",
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
          mediaType,
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

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 md:px-6 py-6 md:py-10 space-y-6 md:space-y-8">
        {/* Top Header & Tonight Feature Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-surface border border-border/80 shadow-cinematic relative overflow-hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-accent uppercase tracking-widest font-bold">
                KİŞİSEL KÜTÜPHANE
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Kütüphanem
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              İzleme listeniz, tamamladığınız yapımlar ve favorileriniz tek bir çatı altında.
            </p>
          </div>

          <button
            onClick={handleFetchTonightPicks}
            disabled={isTonightLoading || counts.watchlist === 0}
            className="px-5 py-3 rounded-2xl bg-accent text-white font-mono text-xs font-bold hover:bg-accent-hover transition-all shadow-md flex items-center justify-center gap-2 self-start md:self-auto disabled:opacity-50 disabled:cursor-not-allowed group flex-shrink-0"
          >
            <span>🍿</span>
            <span>{isTonightLoading ? "Seçiliyor..." : "Bu Akşam Ne İzlesem?"}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/25 text-white">
              {counts.watchlist}
            </span>
          </button>
        </div>

        {/* Filters and Navigation Controls */}
        <div className="space-y-4">
          {/* Main State Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
            {[
              { key: "WATCHLIST", label: "İzleme Listem", count: counts.watchlist, icon: "🔖" },
              { key: "WATCHED", label: "İzlediklerim", count: counts.watched, icon: "👁️" },
              { key: "FAVORITES", label: "Favorilerim", count: counts.favorites, icon: "⭐" },
              { key: "DROPPED", label: "Bıraktıklarım", count: counts.dropped, icon: "🚫" },
              { key: "ALL", label: "Tümü", count: counts.total, icon: "📁" },
            ].map((tab) => {
              const isActive = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? "bg-accent text-white font-bold shadow-sm"
                      : "bg-surface border border-border/70 text-text-muted hover:text-text-primary hover:border-border"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-black/20 text-white" : "bg-surface-elevated text-text-secondary"
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
            <div className="flex items-center p-1 rounded-xl bg-surface border border-border/80 text-xs font-mono self-start">
              {[
                { key: "ALL", label: "Tümü" },
                { key: "FILM", label: "Filmler" },
                { key: "TV", label: "Diziler" },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setMediaType(m.key as any);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    mediaType === m.key
                      ? "bg-accent/20 text-accent font-bold border border-accent/30"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search input */}
              <div className="relative flex-1 sm:w-60">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Kütüphanede ara..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-border/80 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60"
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
                className="px-2.5 py-1.5 rounded-xl bg-surface border border-border/80 text-xs font-mono text-text-primary focus:outline-none focus:border-accent/60"
              >
                <option value="newest">En Yeni Eklenenler</option>
                <option value="oldest">En Eski Eklenenler</option>
                <option value="title">Başlık (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 animate-pulse">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="aspect-[2/3] rounded-2xl bg-surface border border-border/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 rounded-3xl bg-surface border border-border/80 text-center space-y-4 my-8">
            <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 text-accent text-2xl flex items-center justify-center mx-auto">
              📭
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-display text-lg font-bold text-text-primary">
                {currentTab === "WATCHLIST"
                  ? "İzleme listeniz henüz boş"
                  : currentTab === "WATCHED"
                  ? "Henüz izlenmiş bir yapım yok"
                  : currentTab === "FAVORITES"
                  ? "Henüz bir favori eklemediniz"
                  : "Bu filtrede bir yapım bulunamadı"}
              </h3>
              <p className="text-xs text-text-secondary">
                {currentTab === "WATCHLIST"
                  ? "Öneriler sayfasından veya film detaylarından beğendiğiniz yapımları izleme listenize ekleyebilirsiniz."
                  : "Önerileri keşfederek kütüphanenizi zenginleştirebilirsiniz."}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3 font-mono text-xs">
              <Link
                href="/recommendations"
                className="px-4 py-2 rounded-xl bg-accent text-white font-bold hover:bg-accent-hover transition-all shadow-sm"
              >
                Önerilere Git →
              </Link>
              <Link
                href="/calibrate"
                className="px-4 py-2 rounded-xl bg-surface-elevated border border-border text-text-secondary hover:text-text-primary transition-all"
              >
                Kalibrasyon Yap
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {items.map((item) => {
              const posterUrl = getTmdbImageUrl(item.posterPath, "w500");
              const isRatingOpen = activeRatingItem?.id === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-surface border border-border/80 p-2.5 shadow-sm flex flex-col justify-between space-y-2 group hover:border-accent/50 transition-all duration-300 relative"
                >
                  {/* Poster Container */}
                  <div
                    onClick={() => {
                      if (item.mediaType === "FILM") {
                        setSelectedMovieModal({ movieId: item.contentId });
                      } else {
                        setSelectedTvModal({ tvShowId: item.contentId });
                      }
                    }}
                    className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated relative shadow-sm cursor-pointer"
                  >
                    {posterUrl ? (
                      <Image
                        src={posterUrl}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-[10px]">
                        Görsel Yok
                      </div>
                    )}

                    {/* Media Type Badge */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[9px] font-mono font-bold text-text-muted border border-border/60">
                      {item.mediaType === "TV" ? "DİZİ" : "FİLM"}
                    </div>

                    {/* Favorite Star Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(
                          item.mediaType,
                          item.contentId,
                          item.isFavorite ? "REMOVE_FAVORITE" : "ADD_FAVORITE"
                        );
                      }}
                      className={`absolute top-2 right-2 w-7 h-7 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                        item.isFavorite
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                          : "bg-background/80 border-border/60 text-text-muted hover:text-amber-400"
                      }`}
                      title={item.isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
                    >
                      ★
                    </button>

                    {/* State Badge */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                      <span className="px-2 py-0.5 rounded-md bg-background/90 backdrop-blur-md text-[9px] font-mono font-bold text-text-primary border border-border/60">
                        {item.state === "WATCHLIST"
                          ? "🔖 Listede"
                          : item.state === "WATCHED"
                          ? "👁️ İzlendi"
                          : "🚫 Bırakıldı"}
                      </span>
                      {item.userRating && (
                        <span className="px-1.5 py-0.5 rounded-md bg-accent/20 text-accent text-[9px] font-mono font-bold border border-accent/30">
                          {RATING_LABELS[item.userRating]?.emoji || "⭐"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-1">
                    <h4
                      onClick={() => {
                        if (item.mediaType === "FILM") {
                          setSelectedMovieModal({ movieId: item.contentId });
                        } else {
                          setSelectedTvModal({ tvShowId: item.contentId });
                        }
                      }}
                      className="font-display text-xs font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors cursor-pointer"
                    >
                      {item.title}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                      <span>{item.releaseYear || "Tarihsiz"}</span>
                      {item.voteAverage > 0 && (
                        <span className="text-text-secondary font-bold">
                          ⭐ {item.voteAverage.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Action Bar / Rating Mode */}
                  {isRatingOpen ? (
                    <div className="pt-1.5 border-t border-border/60 space-y-1 animate-fadeIn">
                      <div className="flex justify-between items-center text-[9px] font-mono text-text-muted">
                        <span>PUANLA:</span>
                        <button
                          onClick={() => setActiveRatingItem(null)}
                          className="hover:text-text-primary"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {["LOVE", "LIKE", "NEUTRAL", "DISLIKE"].map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              setActiveRatingItem(null);
                              handleAction(item.mediaType, item.contentId, "MARK_WATCHED", r);
                            }}
                            className="p-1 rounded bg-surface-elevated hover:bg-accent/20 border border-border text-center text-xs"
                            title={RATING_LABELS[r].label}
                          >
                            {RATING_LABELS[r].emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1.5 border-t border-border/60 flex items-center justify-between gap-1 text-[10px] font-mono">
                      {item.state !== "WATCHED" && (
                        <button
                          type="button"
                          onClick={() => setActiveRatingItem({ id: item.id, contentId: item.contentId, mediaType: item.mediaType })}
                          className="px-2 py-1 rounded bg-surface-elevated hover:bg-accent/15 hover:text-accent border border-border/70 transition-all flex-1 text-center font-semibold"
                          title="İzlendi olarak işaretle"
                        >
                          İzledim
                        </button>
                      )}

                      {item.state !== "WATCHLIST" && (
                        <button
                          type="button"
                          onClick={() => handleAction(item.mediaType, item.contentId, "ADD_WATCHLIST")}
                          className="px-2 py-1 rounded bg-surface-elevated hover:bg-border border border-border/70 transition-all flex-1 text-center"
                          title="İzleme listesine geri al"
                        >
                          Listem
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAction(item.mediaType, item.contentId, "CLEAR_STATE")}
                        className="p-1 rounded bg-surface-elevated hover:bg-red-500/20 hover:text-red-400 border border-border/70 transition-all text-text-muted"
                        title="Kütüphaneden Kaldır"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pt-6 flex items-center justify-center gap-2 font-mono text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-xl bg-surface border border-border text-text-primary disabled:opacity-40"
            >
              ← Önceki
            </button>
            <span className="px-3 py-1.5 text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-xl bg-surface border border-border text-text-primary disabled:opacity-40"
            >
              Sonraki →
            </button>
          </div>
        )}
      </main>

      {/* "Bu Akşam Ne İzlesem?" Modal */}
      {tonightPicks && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-2xl w-full bg-surface border border-accent/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🍿</span>
                <div>
                  <h3 className="font-display text-xl font-bold text-text-primary">
                    Bu Akşam Ne İzlesem?
                  </h3>
                  <p className="text-xs text-text-secondary font-mono">
                    İzleme listenizdeki yapımlar zevk profilinizle eşleştirildi.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTonightPicks(null)}
                className="w-8 h-8 rounded-full bg-surface-elevated hover:bg-border border border-border flex items-center justify-center text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {tonightPicks.map((pick) => {
                const posterUrl = getTmdbImageUrl(pick.posterPath, "w500");
                return (
                  <div
                    key={pick.id}
                    className="p-3 rounded-2xl bg-surface-elevated border border-accent/30 space-y-2 flex flex-col justify-between group"
                  >
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-surface relative">
                      {posterUrl ? (
                        <Image
                          src={posterUrl}
                          alt={pick.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-text-muted">
                          Görsel Yok
                        </div>
                      )}
                      {pick.matchScore && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-background/90 text-accent font-mono text-[9px] font-bold border border-accent/40">
                          %{pick.matchScore} UYUM
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-display text-xs font-bold text-text-primary line-clamp-1">
                        {pick.title}
                      </h4>
                      <p className="text-[10px] font-mono text-text-muted">
                        {pick.releaseYear || "Tarihsiz"} • {pick.genres.slice(0, 2).join(", ")}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setTonightPicks(null);
                        if (pick.mediaType === "FILM") {
                          setSelectedMovieModal({ movieId: pick.contentId });
                        } else {
                          setSelectedTvModal({ tvShowId: pick.contentId });
                        }
                      }}
                      className="w-full py-1.5 rounded-lg bg-accent text-white font-mono text-[10px] font-bold hover:bg-accent-hover transition-colors text-center"
                    >
                      Detayları Gör
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTonightPicks(null)}
                className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-border text-xs font-mono text-text-secondary"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movie Details Modal */}
      {selectedMovieModal && (
        <MovieDetailsModal
          movieId={selectedMovieModal.movieId}
          initialData={selectedMovieModal.initialData}
          onClose={() => {
            setSelectedMovieModal(null);
            fetchLibrary();
          }}
          onInteractionUpdate={() => fetchLibrary()}
        />
      )}

      {/* TV Details Modal */}
      {selectedTvModal && (
        <TvDetailsModal
          tvShowId={selectedTvModal.tvShowId}
          initialData={selectedTvModal.initialData}
          onClose={() => {
            setSelectedTvModal(null);
            fetchLibrary();
          }}
          onInteractionUpdate={() => fetchLibrary()}
        />
      )}

      <Footer />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LibraryContent />
    </Suspense>
  );
}
