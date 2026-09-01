"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { MovieCard, MovieItem } from "@/components/movie/MovieCard";
import { MovieCardSkeleton } from "@/components/movie/MovieCardSkeleton";
import { getProgressionForCount, RankDefinition } from "@/lib/progression/service";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { CANONICAL_MOVIE_GENRES } from "@/lib/catalog/genres";
import { ConfidenceLevelInfo } from "@/lib/calibration/confidence";
import { CalibrationSearchResultItem } from "@/lib/calibration/search";

interface CalibrationEngineProps {
  initialMovies?: MovieItem[];
  initialTasteEvidenceCount?: number;
  initialWatchedCount?: number;
  initialEvaluationCount?: number;
  initialConfidence?: ConfidenceLevelInfo;
  initialCanGenerateDna?: boolean;
  initialCompleted?: boolean;
  minimumTarget?: number;
  recommendedTarget?: number;
}

export function CalibrationEngine({
  initialMovies = [],
  initialTasteEvidenceCount = 0,
  initialWatchedCount = 0,
  initialEvaluationCount = 0,
  initialConfidence,
  initialCanGenerateDna = false,
  initialCompleted = false,
  minimumTarget = 8,
  recommendedTarget = 15,
}: CalibrationEngineProps) {
  const [queue, setQueue] = useState<MovieItem[]>(initialMovies);
  const [tasteEvidenceCount, setTasteEvidenceCount] = useState<number>(initialTasteEvidenceCount);
  const [watchedCount, setWatchedCount] = useState<number>(initialWatchedCount);
  const [evaluationCount, setEvaluationCount] = useState<number>(initialEvaluationCount);
  const [confidence, setConfidence] = useState<ConfidenceLevelInfo | undefined>(initialConfidence);
  const [canGenerateDna, setCanGenerateDna] = useState<boolean>(initialCanGenerateDna);
  const [showMilestoneScreen, setShowMilestoneScreen] = useState<boolean>(initialCompleted);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(initialEvaluationCount === 0);
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(initialMovies.length === 0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calibration Modes: SMART, GENRE, SEARCH
  const [activeMode, setActiveMode] = useState<"SMART" | "GENRE" | "SEARCH">("SMART");
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);

  // Search Mode State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<CalibrationSearchResultItem[]>([]);
  const [searchRatedMap, setSearchRatedMap] = useState<Record<string, { status: string; rating: string | null }>>({});

  // Dynamic Rank Up State
  const [rankUpData, setRankUpData] = useState<{
    oldRank: RankDefinition;
    newRank: RankDefinition;
    watchedCount: number;
  } | null>(null);
  const [showRankUpModal, setShowRankUpModal] = useState<boolean>(false);

  const isFetchingRef = useRef<boolean>(false);
  const seenMovieIdsRef = useRef<Set<string>>(new Set(initialMovies.map((m) => m.id)));
  const cardRef = useRef<HTMLDivElement>(null);

  // Fetch user info
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.name) {
          setUserName(data.user.name);
        }
      })
      .catch(() => {});
  }, []);

  // Preload upcoming images
  const preloadUpcomingImages = useCallback((movieList: MovieItem[]) => {
    movieList.slice(1, 4).forEach((m) => {
      const url = getTmdbImageUrl(m.posterPath, "w500");
      if (url) {
        const img = new window.Image();
        img.src = url;
      }
    });
  }, []);

  // Fetch queue from API based on mode and selected genres
  const fetchQueue = useCallback(
    async (limit: number = 5, replace: boolean = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          limit: String(limit),
          mode: activeMode,
        });

        if (activeMode === "GENRE" && selectedGenreIds.length > 0) {
          params.set("genreIds", selectedGenreIds.join(","));
        }

        const excludeList = Array.from(seenMovieIdsRef.current).slice(-100);
        if (excludeList.length > 0) {
          params.set("excludeIds", excludeList.join(","));
        }

        const res = await fetch(`/api/movies/queue?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load queue");

        const data = await res.json();
        const newMovies: MovieItem[] = data.movies || [];

        setTasteEvidenceCount(data.tasteEvidenceCount || 0);
        setWatchedCount(data.watchedCount || 0);
        setEvaluationCount(data.evaluationCount || 0);
        if (data.confidence) setConfidence(data.confidence);
        setCanGenerateDna(Boolean(data.canGenerateDna));

        setQueue((prev) => {
          if (replace) {
            newMovies.forEach((m) => seenMovieIdsRef.current.add(m.id));
            preloadUpcomingImages(newMovies);
            return newMovies;
          }
          const existingIds = new Set(prev.map((m) => m.id));
          const filtered = newMovies.filter((m) => !existingIds.has(m.id) && !seenMovieIdsRef.current.has(m.id));
          filtered.forEach((m) => seenMovieIdsRef.current.add(m.id));
          const updated = [...prev, ...filtered];
          preloadUpcomingImages(updated);
          return updated;
        });

        setErrorMessage(null);
      } catch (err) {
        console.error("[CalibrationEngine] Fetch queue error:", err);
        setErrorMessage("Film sırası yüklenirken bir sorun oluştu.");
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [activeMode, selectedGenreIds, preloadUpcomingImages]
  );

  // Trigger search query
  useEffect(() => {
    if (activeMode !== "SEARCH") return;
    const clean = searchQuery.trim();
    if (!clean) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/calibration/search?mediaType=FILM&q=${encodeURIComponent(clean)}&limit=15`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.results || []);
        }
      } catch (e) {
        console.error("[Search Error]:", e);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, activeMode]);

  // Handle Mode Change
  const handleModeChange = (newMode: "SMART" | "GENRE" | "SEARCH") => {
    setActiveMode(newMode);
    if (newMode !== "SEARCH") {
      fetchQueue(5, true);
    }
  };

  // Toggle Genre in Genre Mode
  const toggleGenre = (genreId: number) => {
    setSelectedGenreIds((prev) => {
      const next = prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId];
      return next;
    });
  };

  // Reload queue when selected genres change in GENRE mode
  useEffect(() => {
    if (activeMode === "GENRE") {
      fetchQueue(5, true);
    }
  }, [selectedGenreIds, activeMode, fetchQueue]);

  // Handle Main Card Action (Watched / Not Watched / Unsure)
  const handleAction = async (status: "WATCHED" | "NOT_WATCHED" | "UNSURE", rating?: string | null) => {
    if (queue.length === 0 || isTransitioning) return;

    const currentMovie = queue[0];
    seenMovieIdsRef.current.add(currentMovie.id);
    const prevWatchedCount = watchedCount;

    // Optimistic UI updates
    setIsTransitioning(true);
    setQueue((prev) => prev.slice(1));
    setEvaluationCount((prev) => prev + 1);

    if (status === "WATCHED") {
      const nextWatched = watchedCount + 1;
      const nextEvidence = tasteEvidenceCount + (rating ? 1 : 0);
      setWatchedCount(nextWatched);
      setTasteEvidenceCount(nextEvidence);
      if (nextEvidence >= minimumTarget) setCanGenerateDna(true);

      // Check Rank Up
      const oldRank = getProgressionForCount(prevWatchedCount).currentRank;
      const newRank = getProgressionForCount(nextWatched).currentRank;
      if (oldRank.key !== newRank.key && newRank.minimum > oldRank.minimum) {
        setRankUpData({ oldRank, newRank, watchedCount: nextWatched });
        setShowRankUpModal(true);
      }

      if (nextEvidence === recommendedTarget) {
        setShowMilestoneScreen(true);
      }
    }

    if (queue.length <= 3) {
      fetchQueue(5, false);
    }

    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: currentMovie.id,
          status,
          rating: status === "WATCHED" ? rating : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTasteEvidenceCount(data.tasteEvidenceCount);
        setWatchedCount(data.watchedCount);
        setEvaluationCount(data.evaluationCount);
        if (data.confidence) setConfidence(data.confidence);
        setCanGenerateDna(Boolean(data.canGenerateDna));
      }
    } catch (err) {
      console.error("[CalibrationEngine] Interaction save error:", err);
    } finally {
      setTimeout(() => {
        setIsTransitioning(false);
      }, 150);
    }
  };

  // Handle Search Result Rating Action
  const handleSearchResultAction = async (
    item: CalibrationSearchResultItem,
    rating: "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE"
  ) => {
    seenMovieIdsRef.current.add(item.id);
    setSearchRatedMap((prev) => ({
      ...prev,
      [item.id]: { status: "WATCHED", rating },
    }));

    const prevWatchedCount = watchedCount;
    const nextWatched = watchedCount + 1;
    const nextEvidence = tasteEvidenceCount + 1;
    setWatchedCount(nextWatched);
    setTasteEvidenceCount(nextEvidence);
    setEvaluationCount((prev) => prev + 1);
    if (nextEvidence >= minimumTarget) setCanGenerateDna(true);

    const oldRank = getProgressionForCount(prevWatchedCount).currentRank;
    const newRank = getProgressionForCount(nextWatched).currentRank;
    if (oldRank.key !== newRank.key && newRank.minimum > oldRank.minimum) {
      setRankUpData({ oldRank, newRank, watchedCount: nextWatched });
      setShowRankUpModal(true);
    }

    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: item.id,
          status: "WATCHED",
          rating,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTasteEvidenceCount(data.tasteEvidenceCount);
        setWatchedCount(data.watchedCount);
        if (data.confidence) setConfidence(data.confidence);
        setCanGenerateDna(Boolean(data.canGenerateDna));
      }
    } catch (e) {
      console.error("[Search Interaction Error]:", e);
    }
  };

  const currentMovie = queue[0];
  const progressPercent = Math.min(100, Math.round((tasteEvidenceCount / recommendedTarget) * 100));

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6 pt-6 pb-24 w-full max-w-4xl mx-auto">
        {/* Progress & Confidence Header */}
        <div className="w-full max-w-2xl sm:max-w-3xl mb-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <span className="text-sm">{confidence?.badge || "🌱"}</span>
              <span>Güven:</span>
              <span className="text-accent font-bold">{confidence?.labelTr || "Başlangıç"}</span>
            </div>
            <div className="text-text-primary font-mono font-bold">
              {tasteEvidenceCount} / {recommendedTarget} Zevk Sinyali
            </div>
          </div>

          <div className="w-full h-2.5 bg-surface-2 rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>Minimum Kilit: 8 Film</span>
            <span>İzlenen: {watchedCount} • Toplam: {evaluationCount}</span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="w-full max-w-2xl sm:max-w-3xl mb-6 p-1 bg-surface-2/80 rounded-2xl border border-border flex items-center gap-1 shadow-inner backdrop-blur-md">
          <button
            onClick={() => handleModeChange("SMART")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === "SMART"
                ? "bg-surface-0 text-accent shadow-sm border border-border"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span>✨</span>
            <span>Akıllı</span>
          </button>

          <button
            onClick={() => handleModeChange("GENRE")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === "GENRE"
                ? "bg-surface-0 text-accent shadow-sm border border-border"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span>🏷️</span>
            <span>Tür Seç</span>
          </button>

          <button
            onClick={() => handleModeChange("SEARCH")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === "SEARCH"
                ? "bg-surface-0 text-accent shadow-sm border border-border"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span>🔍</span>
            <span>İzlediğimi Ara</span>
          </button>
        </div>

        {/* Mode 2: Genre Pills Sub-Bar */}
        {activeMode === "GENRE" && (
          <div className="w-full max-w-2xl sm:max-w-3xl mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CANONICAL_MOVIE_GENRES.map((g) => {
              const isSelected = selectedGenreIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGenre(g.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                    isSelected
                      ? "bg-accent text-white border-accent shadow-sm"
                      : "bg-surface-2 text-text-secondary border-border hover:border-accent hover:text-text-primary"
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Mode 3: Local Calibration Search Mode */}
        {activeMode === "SEARCH" ? (
          <div className="w-full max-w-2xl sm:max-w-3xl space-y-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="İzlediğin bir filmin adını ara..."
                className="w-full px-4 py-3 bg-surface-2 border border-border focus:border-accent rounded-2xl text-sm text-text-primary placeholder-text-muted focus:outline-none transition-all shadow-inner"
              />
              {isSearching && (
                <div className="absolute right-4 top-3.5 text-xs text-text-muted animate-pulse">
                  Aranıyor...
                </div>
              )}
            </div>

            <div className="space-y-3">
              {searchResults.map((item) => {
                const rated = searchRatedMap[item.id] || item.currentInteraction;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-surface-1 border border-border rounded-2xl flex items-center justify-between gap-3 hover:border-accent/40 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.posterPath ? (
                        <img
                          src={getTmdbImageUrl(item.posterPath, "w185") || undefined}
                          alt={item.title}
                          className="w-12 h-16 object-cover rounded-lg border border-border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-surface-2 rounded-lg border border-border flex-shrink-0 flex items-center justify-center text-xs text-text-muted">
                          🎬
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-text-primary truncate">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-text-muted truncate">
                          {item.releaseYear || "Bilinmiyor"} • ⭐ {item.voteAverage.toFixed(1)} • {item.genres.slice(0, 2).join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {rated ? (
                        <div className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-[11px] text-accent font-semibold flex items-center gap-1">
                          <span>✓</span>
                          <span>{rated.rating || "İzlendi"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSearchResultAction(item, "LOVE")}
                            title="Çok Beğendim"
                            className="p-1.5 rounded-lg bg-surface-2 hover:bg-rose-500/20 text-xs transition-all border border-border hover:border-rose-500"
                          >
                            ❤️
                          </button>
                          <button
                            onClick={() => handleSearchResultAction(item, "LIKE")}
                            title="Beğendim"
                            className="p-1.5 rounded-lg bg-surface-2 hover:bg-emerald-500/20 text-xs transition-all border border-border hover:border-emerald-500"
                          >
                            👍
                          </button>
                          <button
                            onClick={() => handleSearchResultAction(item, "NEUTRAL")}
                            title="Ortalama"
                            className="p-1.5 rounded-lg bg-surface-2 hover:bg-amber-500/20 text-xs transition-all border border-border hover:border-amber-500"
                          >
                            😐
                          </button>
                          <button
                            onClick={() => handleSearchResultAction(item, "DISLIKE")}
                            title="Beğenmedim"
                            className="p-1.5 rounded-lg bg-surface-2 hover:bg-rose-900/30 text-xs transition-all border border-border hover:border-rose-800"
                          >
                            👎
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Main Card View (Smart & Genre Modes) */
          <div className="w-full max-w-2xl sm:max-w-3xl relative">
            {isLoading && queue.length === 0 ? (
              <MovieCardSkeleton />
            ) : currentMovie ? (
              <div ref={cardRef} className="w-full">
                <MovieCard
                  key={currentMovie.id}
                  movie={currentMovie}
                  onAnswer={handleAction}
                  isTransitioning={isTransitioning}
                />
              </div>
            ) : (
              <div className="p-8 bg-surface-1 border border-border rounded-3xl text-center space-y-4 shadow-xl">
                <div className="text-4xl">🎉</div>
                <h3 className="text-lg font-bold text-text-primary">
                  Bu Filtredeki Tüm Filmleri İnceledin!
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Farklı bir tür seçebilir, Akıllı moda dönebilir veya doğrudan Film DNA profilini oluşturabilirsin.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => handleModeChange("SMART")}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-surface-2 border border-border hover:border-accent text-xs font-semibold text-text-primary transition-all"
                  >
                    ✨ Akıllı Moda Dön
                  </button>
                  {canGenerateDna && (
                    <Link
                      href="/profile"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-all shadow-md"
                    >
                      Film DNA&apos;mı Gör →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prominent Fast DNA Trigger (When >= 8 evidence gathered) */}
        {canGenerateDna && (
          <div className="w-full max-w-2xl sm:max-w-3xl mt-8 p-4 bg-gradient-to-r from-accent/15 via-purple-600/10 to-transparent border border-accent/30 rounded-2xl flex items-center justify-between gap-4 shadow-lg backdrop-blur-md animate-fadeIn">
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-1.5">
                <span>🧬</span>
                <span>Film DNA Kilidi Açıldı!</span>
              </h4>
              <p className="text-[11px] text-text-secondary">
                {tasteEvidenceCount} film ile ilk profilini oluşturabilirsin.
              </p>
            </div>
            <Link
              href="/profile"
              className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md flex-shrink-0 flex items-center gap-1.5"
            >
              <span>DNA&apos;mı Gör</span>
              <span>→</span>
            </Link>
          </div>
        )}

        {/* Milestone Modal (When recommended target 15 is reached) */}
        {showMilestoneScreen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-surface-1 border border-border p-6 sm:p-8 rounded-3xl max-w-md w-full text-center space-y-5 shadow-2xl animate-scaleUp">
              <div className="text-5xl">🎬</div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
                Tebrikler! Kalibrasyon Tamamlandı
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                {tasteEvidenceCount} izlenmiş film sinyaliyle Film DNA profilin başarıyla kristalleşti. Artık sana özel nokta atışı tavsiyeler alabilirsin.
              </p>
              <div className="pt-2 flex flex-col gap-2.5">
                <Link
                  href="/profile"
                  className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs sm:text-sm font-bold transition-all shadow-lg"
                >
                  Film DNA Profilimi Keşfet →
                </Link>
                <button
                  onClick={() => setShowMilestoneScreen(false)}
                  className="w-full py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-secondary hover:text-text-primary transition-all"
                >
                  Kalibrasyona Devam Et
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rank Up Notification Modal */}
        {showRankUpModal && rankUpData && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-1 border border-border p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl animate-scaleUp">
              <div className="text-4xl">{rankUpData.newRank.badgeIcon}</div>
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-accent uppercase tracking-wider">
                  RÜTBE ATLADIN!
                </div>
                <h3 className="text-lg font-bold text-text-primary">
                  {rankUpData.newRank.label}
                </h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {rankUpData.newRank.description}
              </p>
              <button
                onClick={() => setShowRankUpModal(false)}
                className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md"
              >
                Harika! Devam Et
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
