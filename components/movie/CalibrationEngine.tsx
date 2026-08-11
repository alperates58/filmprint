"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/ui/Header";
import { MovieCard, MovieItem } from "@/components/movie/MovieCard";
import { MovieCardSkeleton } from "@/components/movie/MovieCardSkeleton";

interface CalibrationEngineProps {
  initialMovies?: MovieItem[];
  initialAnsweredCount?: number;
  initialCompleted?: boolean;
}

export function CalibrationEngine({
  initialMovies = [],
  initialAnsweredCount = 0,
  initialCompleted = false,
}: CalibrationEngineProps) {
  const [queue, setQueue] = useState<MovieItem[]>(initialMovies);
  const [answeredCount, setAnsweredCount] = useState<number>(initialAnsweredCount);
  const [showMilestoneScreen, setShowMilestoneScreen] = useState<boolean>(initialCompleted);
  const [isLoading, setIsLoading] = useState<boolean>(initialMovies.length === 0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFetchingRef = useRef<boolean>(false);
  const milestoneTarget = 30;

  // Preload poster images for upcoming movies in queue
  const preloadUpcomingImages = useCallback((movieList: MovieItem[]) => {
    movieList.slice(1, 4).forEach((m) => {
      if (m.posterPath) {
        const url = m.posterPath.startsWith("http")
          ? m.posterPath
          : `https://image.tmdb.org/t/p/w500${m.posterPath}`;
        const img = new window.Image();
        img.src = url;
      }
    });
  }, []);

  // Fetch candidate queue from API
  const fetchQueue = useCallback(async (limit: number = 5) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch(`/api/movies/queue?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to load queue");

      const data = await res.json();
      const newMovies: MovieItem[] = data.movies || [];

      setAnsweredCount(data.answeredCount || 0);

      setQueue((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const filtered = newMovies.filter((m) => !existingIds.has(m.id));
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
  }, [preloadUpcomingImages]);

  // Initial load if initialMovies was empty
  useEffect(() => {
    if (initialMovies.length === 0) {
      fetchQueue(5);
    } else {
      preloadUpcomingImages(initialMovies);
    }
  }, [initialMovies, fetchQueue, preloadUpcomingImages]);

  // Submit interaction handler (Optimistic UI)
  const handleAnswer = async (
    status: "WATCHED" | "NOT_WATCHED" | "UNSURE",
    rating: "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE" | null
  ) => {
    if (queue.length === 0 || isTransitioning) return;

    const currentMovie = queue[0];

    // 1. Optimistic UI transition (150ms perceived latency)
    setIsTransitioning(true);
    const newAnsweredCount = answeredCount + 1;
    setAnsweredCount(newAnsweredCount);

    // Trigger milestone screen right when hitting 30 interactions for the first time
    if (newAnsweredCount === milestoneTarget) {
      setShowMilestoneScreen(true);
    }

    setTimeout(() => {
      // 2. Advance queue
      setQueue((prev) => {
        const nextQueue = prev.slice(1);
        preloadUpcomingImages(nextQueue);

        // Background refilling if queue drops below 3 (unlimited progression)
        if (nextQueue.length <= 3) {
          fetchQueue(5);
        }

        return nextQueue;
      });

      setIsTransitioning(false);
    }, 150);

    // 3. Asynchronously persist interaction to server
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: currentMovie.id,
          status,
          rating,
        }),
      });

      if (!res.ok) {
        console.warn("[CalibrationEngine] Interaction save received non-200 status");
      }
    } catch (err) {
      console.error("[CalibrationEngine] Failed to save interaction in background:", err);
    }
  };

  const activeMovie = queue[0];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent selection:text-white">
      <Header progressCount={answeredCount} progressTarget={milestoneTarget} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center">
        {isLoading ? (
          <MovieCardSkeleton />
        ) : showMilestoneScreen ? (
          /* Milestone Reached State View (30 Films Milestone) */
          <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface border border-border/80 rounded-3xl p-8 md:p-12 shadow-cinematic animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-success/15 border border-success/30 text-success flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                İlk Film DNA Profilin İçin Yeterli Sinyali Topladık
              </h2>
              <p className="text-text-secondary text-sm md:text-base leading-relaxed">
                Tebrikler! <strong className="text-text-primary">{answeredCount} filmi</strong> başarıyla sınıflandırdınız.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-elevated border border-border/60 text-xs font-mono text-text-muted">
              Profil analiz motoru hazır olduğunda kişisel Film DNA haritanız burada gösterilecektir. İsterseniz daha hassas bir zevk profili için film değerlendirmeye devam edebilirsiniz.
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                disabled
                className="px-6 py-3.5 rounded-xl bg-surface-elevated border border-border text-text-muted text-sm font-medium opacity-60 cursor-not-allowed"
              >
                Film DNA Profilini Gör (Phase 2)
              </button>

              <button
                onClick={() => {
                  setShowMilestoneScreen(false);
                  if (queue.length <= 2) fetchQueue(5);
                }}
                className="px-6 py-3.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-hover active:scale-[0.98] transition-all shadow-md"
              >
                Değerlendirmeye Devam Et
              </button>
            </div>
          </div>
        ) : activeMovie ? (
          /* Active Interactive Movie Card */
          <MovieCard
            movie={activeMovie}
            onAnswer={handleAnswer}
            isTransitioning={isTransitioning}
          />
        ) : (
          /* Queue Empty / Retry Fallback State */
          <div className="w-full max-w-lg mx-auto text-center space-y-5 bg-surface border border-border/80 rounded-3xl p-8 shadow-cinematic">
            <div className="w-12 h-12 rounded-full bg-warning/15 border border-warning/30 text-warning flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-text-primary">
                Film Sırası Hazırlanıyor
              </h3>
              <p className="text-text-secondary text-sm">
                {errorMessage || "Yeni filmler hazırlanıyor, lütfen bekleyin."}
              </p>
            </div>

            <button
              onClick={() => fetchQueue(5)}
              className="px-5 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm font-medium hover:bg-border/60 transition-all"
            >
              Tekrar Denetle
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-text-muted font-mono">
        FILMPRINT &copy; {new Date().getFullYear()} — Movie Taste Calibration Engine
      </footer>
    </div>
  );
}
