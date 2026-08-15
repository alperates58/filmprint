"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { MovieCard, MovieItem } from "@/components/movie/MovieCard";
import { MovieCardSkeleton } from "@/components/movie/MovieCardSkeleton";
import { getProgressionForCount } from "@/lib/progression/service";
import { getTmdbImageUrl } from "@/lib/tmdb/image";

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
  const [showOnboarding, setShowOnboarding] = useState<boolean>(initialAnsweredCount === 0);
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(initialMovies.length === 0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const milestoneTarget = 30;

  // Fetch logged in user status
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUserName(data.user.name);
        }
      })
      .catch(() => {});
  }, []);

  // Preload poster images for upcoming movies in queue
  const preloadUpcomingImages = useCallback((movieList: MovieItem[]) => {
    movieList.slice(1, 4).forEach((m) => {
      const url = getTmdbImageUrl(m.posterPath, "w500");
      if (url) {
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

    if (showOnboarding) {
      setShowOnboarding(false);
    }

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

        // Background refilling if queue drops below 4 (unlimited progression)
        if (nextQueue.length <= 4) {
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
      <Header progressCount={answeredCount} progressTarget={milestoneTarget} userName={userName} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-3 md:py-12 flex flex-col items-center justify-center space-y-4 md:space-y-8">


        {/* Minimal First-Use Onboarding Hero Banner */}
        {showOnboarding && !showMilestoneScreen && (
          <div className="w-full max-w-4xl mx-auto p-6 md:p-8 rounded-3xl bg-surface border border-accent/30 shadow-cinematic text-center space-y-4 animate-fadeIn relative overflow-hidden">
            <div className="space-y-2">
              <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                İLK GİRİŞ ONAYI
              </span>
              <h1 className="font-display text-2xl md:text-4xl font-bold tracking-tight text-text-primary">
                Film zevkini çözelim.
              </h1>
              <p className="text-text-secondary text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                Sana filmler göstereceğiz. İzlediklerini ve ne düşündüğünü söyle. Film DNA&apos;n zamanla netleşsin.
              </p>
            </div>

            <button
              onClick={() => {
                setShowOnboarding(false);
                cardRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 rounded-xl bg-accent text-white font-medium text-xs md:text-sm hover:bg-accent-hover transition-all shadow-md"
            >
              Başla ↓
            </button>
          </div>
        )}

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
                İlk Film DNA Profilin Hazır {userName ? `, ${userName}` : ""}
              </h2>
              <p className="text-text-secondary text-sm md:text-base leading-relaxed">
                Tebrikler! <strong className="text-text-primary">{answeredCount} filmi</strong> başarıyla sınıflandırdınız.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-elevated border border-border/60 text-xs font-mono text-text-muted">
              Kişisel Film DNA profiliniz hazırlandı. Profil sayfasını inceleyebilir veya zevk profilinizi daha da netleştirmek için sınırsız değerlendirmeye devam edebilirsiniz.
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/profile"
                className="px-6 py-3.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-hover active:scale-[0.98] transition-all shadow-md text-center"
              >
                Film DNA Profilini Gör →
              </Link>

              <button
                onClick={() => {
                  setShowMilestoneScreen(false);
                  if (queue.length <= 2) fetchQueue(5);
                }}
                className="px-6 py-3.5 rounded-xl bg-surface-elevated border border-border text-text-primary font-medium text-sm hover:bg-border/60 active:scale-[0.98] transition-all shadow-sm"
              >
                Değerlendirmeye Devam Et
              </button>
            </div>
          </div>
        ) : activeMovie ? (
          /* Active Interactive Movie Card */
          <div ref={cardRef} className="w-full space-y-2">
            {(() => {
              const progression = getProgressionForCount(answeredCount);
              return progression.nextRank ? (
                <div className="text-[11px] font-mono text-text-muted flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>
                    {answeredCount} / {progression.nextRank.minimum} • <strong className="text-text-secondary">{progression.nextRank.label} yolunda</strong> ({progression.remaining} film kaldı)
                  </span>
                </div>
              ) : null;
            })()}
            <MovieCard
              movie={activeMovie}
              onAnswer={handleAnswer}
              isTransitioning={isTransitioning}
            />
          </div>
        ) : (
          /* Queue Empty / Retry Fallback State */
          <div className="w-full max-w-lg mx-auto text-center space-y-5 bg-surface border border-border/80 rounded-3xl p-8 shadow-cinematic">
            <div className="w-12 h-12 rounded-full bg-warning/15 border border-warning/30 text-warning flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-text-primary">
                Film Sırası Yenileniyor
              </h3>
              <p className="text-text-secondary text-sm">
                {errorMessage || "Yeni filmler hazırlanıyor, lütfen tekrar deneyin."}
              </p>
            </div>

            <button
              onClick={() => fetchQueue(5)}
              className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all shadow-md"
            >
              Filmleri Yenile
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-text-muted font-mono">
        SINEAI &copy; {new Date().getFullYear()} — SineAI Taste Engine
      </footer>
    </div>
  );
}
