"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

import { MovieDetailsModal } from "@/components/movie/MovieDetailsModal";

interface LibraryItem {
  id: string;
  movieId: string;
  title: string;
  originalTitle: string;
  releaseYear: number | null;
  posterPath: string | null;
  genres: string[];
  status: "WATCHED" | "NOT_WATCHED" | "UNSURE" | "WATCH_LATER";
  rating: "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE" | null;
  answeredAt: string;
  updatedAt: string;
}

interface LibraryResponse {
  items: LibraryItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  counts: {
    watched: number;
    notWatched: number;
    unsure: number;
    watchLater: number;
  };
}

const RATING_LABELS: Record<string, { label: string; emoji: string }> = {
  LOVE: { label: "Çok Sevdim", emoji: "❤️" },
  LIKE: { label: "Beğendim", emoji: "👍" },
  NEUTRAL: { label: "Ortalama", emoji: "😐" },
  DISLIKE: { label: "Sevmedim", emoji: "👎" },
};

function LibraryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = searchParams.get("tab") || "watched";
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [counts, setCounts] = useState({ watched: 0, notWatched: 0, unsure: 0, watchLater: 0 });
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [isLoading, setIsLoading] = useState(true);

  // Active inline action states
  const [activeRatingMovieId, setActiveRatingMovieId] = useState<string | null>(null);
  const [activeMenuMovieId, setActiveMenuMovieId] = useState<string | null>(null);
  const [confirmStatusModal, setConfirmStatusModal] = useState<{
    movieId: string;
    movieTitle: string;
    targetStatus: string;
  } | null>(null);
  const [selectedMovieModal, setSelectedMovieModal] = useState<{
    movieId: string;
    initialData?: any;
  } | null>(null);

  // Debounce search input
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
      const params = new URLSearchParams({
        status: currentTab,
        search: debouncedSearch,
        rating: ratingFilter,
        sort,
        page: String(page),
        limit: "24",
      });

      const res = await fetch(`/api/library?${params.toString()}`);
      if (res.ok) {
        const data: LibraryResponse = await res.json();
        setItems(data.items);
        setCounts(data.counts);
        setTotalPages(data.totalPages);
      }
    } catch (e) {
      console.error("[Fetch Library Error]:", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentTab, debouncedSearch, ratingFilter, sort, page]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleTabChange = (newTab: string) => {
    setPage(1);
    setActiveRatingMovieId(null);
    setActiveMenuMovieId(null);
    router.push(`/library?tab=${newTab}`);
  };

  const handleUpdateInteraction = async (
    movieId: string,
    targetStatus: "WATCHED" | "NOT_WATCHED" | "UNSURE",
    targetRating: "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE" | null = null
  ) => {
    // Optimistic UI update
    setItems((prev) => prev.filter((item) => item.movieId !== movieId));
    setActiveRatingMovieId(null);
    setActiveMenuMovieId(null);
    setConfirmStatusModal(null);

    try {
      const res = await fetch(`/api/interactions/${movieId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          rating: targetRating,
        }),
      });

      if (!res.ok) {
        fetchLibrary();
      } else {
        fetchLibrary();
      }
    } catch (e) {
      console.error("[Update Interaction Error]:", e);
      fetchLibrary();
    }
  };

  const handleRemoveFromWatchLater = async (movieId: string) => {
    setItems((prev) => prev.filter((item) => item.movieId !== movieId));
    try {
      await fetch(`/api/interactions/${movieId}`, {
        method: "DELETE",
      });
      fetchLibrary();
    } catch (e) {
      console.error("[Remove Watch Later Error]:", e);
      fetchLibrary();
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold">
            KİŞİSEL SİNEMA ARŞİVİ
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
            Filmlerim
          </h1>
          <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
            Değerlendirdiğiniz, izlemediğinizi belirttiğiniz veya daha sonra izlemek üzere kaydettiğiniz tüm yapımlar.
          </p>
        </div>

        {/* Tab Selector Bar */}
        <div className="border-b border-border/80 pb-1 overflow-x-auto no-scrollbar">
          <nav className="flex space-x-2 md:space-x-4 min-w-max">
            <button
              onClick={() => handleTabChange("watched")}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${
                currentTab === "watched"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
              }`}
            >
              <span>🎬 İzlediklerim</span>
              <span className="px-2 py-0.5 rounded-full bg-background/20 text-[10px] font-bold">
                {counts.watched}
              </span>
            </button>

            <button
              onClick={() => handleTabChange("not_watched")}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${
                currentTab === "not_watched"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
              }`}
            >
              <span>🙈 İzlemediklerim</span>
              <span className="px-2 py-0.5 rounded-full bg-background/20 text-[10px] font-bold">
                {counts.notWatched}
              </span>
            </button>

            <button
              onClick={() => handleTabChange("unsure")}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${
                currentTab === "unsure"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
              }`}
            >
              <span>🤔 Emin Değilim</span>
              <span className="px-2 py-0.5 rounded-full bg-background/20 text-[10px] font-bold">
                {counts.unsure}
              </span>
            </button>

            <button
              onClick={() => handleTabChange("watch_later")}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${
                currentTab === "watch_later"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
              }`}
            >
              <span>🔖 Daha Sonra</span>
              <span className="px-2 py-0.5 rounded-full bg-background/20 text-[10px] font-bold">
                {counts.watchLater}
              </span>
            </button>
          </nav>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border/80 shadow-sm">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Film adıyla ara (örn. Blade, Interstellar)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border text-xs md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            <span className="absolute left-3 top-2.5 text-text-muted text-xs">🔍</span>
          </div>

          {/* Rating Filter (Only for Watched Tab) */}
          {currentTab === "watched" && (
            <select
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono"
            >
              <option value="ALL">Tüm Değerlendirmeler</option>
              <option value="LOVE">❤️ Çok Sevdim</option>
              <option value="LIKE">👍 Beğendim</option>
              <option value="NEUTRAL">😐 Ortalama</option>
              <option value="DISLIKE">👎 Sevmedim</option>
            </select>
          )}

          {/* Sort Dropdown */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono"
          >
            <option value="newest">En Yeni Değerlendirilen</option>
            <option value="oldest">En Eski</option>
            <option value="title">Film Adı (A-Z)</option>
          </select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center text-text-muted font-mono text-xs space-y-3 rounded-3xl bg-surface border border-border">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Filmleriniz getiriliyor...</p>
          </div>
        )}

        {/* Empty States */}
        {!isLoading && items.length === 0 && (
          <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-4 max-w-md mx-auto my-8">
            <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 text-accent text-xl flex items-center justify-center mx-auto">
              {currentTab === "watched"
                ? "🎬"
                : currentTab === "not_watched"
                ? "🙈"
                : currentTab === "unsure"
                ? "🤔"
                : "🔖"}
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-text-primary">
                {currentTab === "watched"
                  ? "Henüz izlediğin bir film kaydetmedin"
                  : currentTab === "not_watched"
                  ? "İzlemediğini işaretlediğin film yok"
                  : currentTab === "unsure"
                  ? "Emin olmadığını belirttiğin film yok"
                  : "Daha sonra izlemek için kaydettiğin film yok"}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {debouncedSearch
                  ? "Arama kriterlerine uygun film bulunamadı."
                  : "Kalibrasyon ve öneri sayfalarından filmleri değerlendirebilirsiniz."}
              </p>
            </div>
            <div>
              <Link
                href="/recommendations"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-mono font-medium hover:bg-accent-hover transition-all"
              >
                Önerilere Git ➔
              </Link>
            </div>
          </div>
        )}

        {/* Movie Cards Grid */}
        {!isLoading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {items.map((item) => {
              const { movieId, title, releaseYear, posterPath, genres, status, rating } = item;
              const isRatingOpen = activeRatingMovieId === movieId;
              const isMenuOpen = activeMenuMovieId === movieId;
              const posterUrl = posterPath
                ? posterPath.startsWith("http")
                  ? posterPath
                  : `https://image.tmdb.org/t/p/w500${posterPath}`
                : null;

              return (
                <div
                  key={movieId}
                  className="p-4 rounded-2xl bg-surface border border-border/80 shadow-sm flex flex-col justify-between space-y-3 group hover:border-accent/40 transition-all"
                >
                  <div className="space-y-3">
                    {/* Poster */}
                    <div
                      onClick={() =>
                        setSelectedMovieModal({
                          movieId,
                          initialData: {
                            title,
                            posterPath,
                            releaseYear,
                            genres,
                          },
                        })
                      }
                      className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated relative shadow-sm cursor-pointer"
                      title="Film detaylarını gör"
                    >
                      {posterUrl ? (
                        <Image
                          src={posterUrl}
                          alt={title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-[10px]">
                          Görsel Yok
                        </div>
                      )}

                      {/* Current Rating Badge (If Watched) */}
                      {status === "WATCHED" && rating && (
                        <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-md border border-accent/40 text-text-primary text-[10px] font-mono font-bold flex items-center gap-1">
                          <span>{RATING_LABELS[rating]?.emoji}</span>
                          <span>{RATING_LABELS[rating]?.label}</span>
                        </div>
                      )}
                    </div>

                    {/* Movie Info */}
                    <div
                      onClick={() =>
                        setSelectedMovieModal({
                          movieId,
                          initialData: {
                            title,
                            posterPath,
                            releaseYear,
                            genres,
                          },
                        })
                      }
                      className="cursor-pointer"
                    >
                      <h4 className="font-display text-sm font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                        {title}
                      </h4>
                      <p className="text-[10px] font-mono text-text-muted line-clamp-1">
                        {releaseYear || "Tarihsiz"} • {genres.join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* Actions according to current tab */}
                  <div className="pt-2 border-t border-border/60">
                    {/* Inline Rating Selection */}
                    {isRatingOpen ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-mono text-text-primary font-bold">
                          <span>Değerlendir:</span>
                          <button
                            onClick={() => setActiveRatingMovieId(null)}
                            className="text-text-muted hover:text-text-primary text-[9px]"
                          >
                            İptal
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => handleUpdateInteraction(movieId, "WATCHED", "LOVE")}
                            className="py-1.5 rounded-lg bg-accent/20 text-text-primary font-mono text-[10px] border border-accent/40 hover:bg-accent/30 transition-colors"
                          >
                            ❤️ Çok Sevdim
                          </button>
                          <button
                            onClick={() => handleUpdateInteraction(movieId, "WATCHED", "LIKE")}
                            className="py-1.5 rounded-lg bg-surface-elevated text-text-primary font-mono text-[10px] border border-border hover:bg-border/60 transition-colors"
                          >
                            👍 Beğendim
                          </button>
                          <button
                            onClick={() => handleUpdateInteraction(movieId, "WATCHED", "NEUTRAL")}
                            className="py-1.5 rounded-lg bg-surface-elevated text-text-secondary font-mono text-[10px] border border-border hover:bg-border/60 transition-colors"
                          >
                            😐 Ortalama
                          </button>
                          <button
                            onClick={() => handleUpdateInteraction(movieId, "WATCHED", "DISLIKE")}
                            className="py-1.5 rounded-lg bg-surface-elevated text-text-muted font-mono text-[10px] border border-border hover:bg-border/60 transition-colors"
                          >
                            👎 Sevmedim
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Watched Tab Actions */}
                        {status === "WATCHED" && (
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => setActiveRatingMovieId(movieId)}
                              className="flex-1 py-1.5 rounded-lg bg-surface-elevated border border-border hover:border-accent text-text-primary font-mono text-xs font-semibold transition-colors"
                            >
                              Puanı Değiştir
                            </button>

                            <button
                              onClick={() =>
                                setActiveMenuMovieId(isMenuOpen ? null : movieId)
                              }
                              className="p-1.5 rounded-lg bg-surface-elevated border border-border text-text-muted hover:text-text-primary text-xs font-mono"
                              title="Diğer Seçenekler"
                            >
                              ⚙️
                            </button>

                            {/* Secondary Menu Dropdown */}
                            {isMenuOpen && (
                              <div className="absolute right-0 bottom-full mb-1 w-44 p-1 rounded-xl bg-surface-elevated border border-border/80 shadow-xl z-20 space-y-1">
                                <button
                                  onClick={() =>
                                    setConfirmStatusModal({
                                      movieId,
                                      movieTitle: title,
                                      targetStatus: "NOT_WATCHED",
                                    })
                                  }
                                  className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-mono text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
                                >
                                  🙈 İzlemedim yap
                                </button>
                                <button
                                  onClick={() =>
                                    handleUpdateInteraction(movieId, "UNSURE", null)
                                  }
                                  className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-mono text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
                                >
                                  🤔 Emin Değilim yap
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Not Watched Tab Actions */}
                        {status === "NOT_WATCHED" && (
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => setActiveRatingMovieId(movieId)}
                              className="flex-1 py-1.5 rounded-lg bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
                            >
                              Artık İzledim ➔
                            </button>
                            <button
                              onClick={() => handleUpdateInteraction(movieId, "UNSURE", null)}
                              className="px-2.5 py-1.5 rounded-lg bg-surface-elevated border border-border text-text-muted hover:text-text-primary font-mono text-[10px]"
                            >
                              Emin Değilim
                            </button>
                          </div>
                        )}

                        {/* Unsure Tab Actions */}
                        {status === "UNSURE" && (
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => setActiveRatingMovieId(movieId)}
                              className="flex-1 py-1.5 rounded-lg bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-colors"
                            >
                              İzledim
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateInteraction(movieId, "NOT_WATCHED", null)
                              }
                              className="flex-1 py-1.5 rounded-lg bg-surface-elevated border border-border text-text-secondary hover:text-text-primary font-mono text-xs transition-colors"
                            >
                              İzlemedim
                            </button>
                          </div>
                        )}

                        {/* Watch Later Tab Actions */}
                        {status === "WATCH_LATER" && (
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => setActiveRatingMovieId(movieId)}
                              className="flex-1 py-1.5 rounded-lg bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-colors"
                            >
                              İzledim ➔
                            </button>
                            <button
                              onClick={() => handleRemoveFromWatchLater(movieId)}
                              className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-text-muted hover:text-text-primary font-mono text-xs transition-colors"
                            >
                              Kaldır
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-6 font-mono text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-xl bg-surface border border-border disabled:opacity-40 disabled:cursor-not-allowed hover:border-accent text-text-primary transition-all"
            >
              ← Önceki
            </button>
            <span className="text-text-muted font-bold">
              Sayfa {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-2 rounded-xl bg-surface border border-border disabled:opacity-40 disabled:cursor-not-allowed hover:border-accent text-text-primary transition-all"
            >
              Sonraki →
            </button>
          </div>
        )}
      </main>

      <Footer />

      {/* Cinematic Movie Detail Modal */}
      <MovieDetailsModal
        movieId={selectedMovieModal?.movieId || null}
        onClose={() => {
          setSelectedMovieModal(null);
          fetchLibrary();
        }}
        initialData={selectedMovieModal?.initialData}
        onInteractionUpdate={() => {
          fetchLibrary();
        }}
      />

      {/* Confirmation Modal for Destructive WATCHED -> NOT_WATCHED */}
      {confirmStatusModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-display text-base font-bold text-text-primary">
              Durumu Değiştirilsin mi?
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              <strong className="text-text-primary">{confirmStatusModal.movieTitle}</strong> filmini{" "}
              <span className="text-accent font-semibold">İzlemedim</span> durumuna getirmek istediğinize emin misiniz? Değerlendirmeniz kaldırılacaktır.
            </p>
            <div className="flex gap-2 justify-end pt-2 font-mono text-xs">
              <button
                onClick={() => setConfirmStatusModal(null)}
                className="px-4 py-2 rounded-xl bg-surface-elevated border border-border text-text-muted hover:text-text-primary"
              >
                İptal
              </button>
              <button
                onClick={() =>
                  handleUpdateInteraction(
                    confirmStatusModal.movieId,
                    "NOT_WATCHED",
                    null
                  )
                }
                className="px-4 py-2 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover"
              >
                Evet, Değiştir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans">
          <Header />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 space-y-8">
            <div className="p-12 text-center text-text-muted font-mono text-xs">
              Filmlerim kütüphanesi yükleniyor...
            </div>
          </main>
        </div>
      }
    >
      <LibraryContent />
    </React.Suspense>
  );
}
