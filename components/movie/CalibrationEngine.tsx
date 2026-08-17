"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { MovieCard, MovieItem } from "@/components/movie/MovieCard";
import { MovieCardSkeleton } from "@/components/movie/MovieCardSkeleton";
import { getProgressionForCount, RankDefinition } from "@/lib/progression/service";
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

  // Dynamic Rank Up & DNA Reanalysis State
  const [rankUpData, setRankUpData] = useState<{
    oldRank: RankDefinition;
    newRank: RankDefinition;
    answeredCount: number;
  } | null>(null);
  const [showRankUpModal, setShowRankUpModal] = useState<boolean>(false);
  const [isRecalculatingDna, setIsRecalculatingDna] = useState<boolean>(false);

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

  // Submit interaction handler (Optimistic UI + Dynamic Rank Up)
  const handleAnswer = async (
    status: "WATCHED" | "NOT_WATCHED" | "UNSURE",
    rating: "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE" | null
  ) => {
    if (queue.length === 0 || isTransitioning) return;

    if (showOnboarding) {
      setShowOnboarding(false);
    }

    const currentMovie = queue[0];
    const prevProgression = getProgressionForCount(answeredCount);
    const newAnsweredCount = answeredCount + 1;
    const nextProgression = getProgressionForCount(newAnsweredCount);

    // 1. Optimistic UI transition (150ms perceived latency)
    setIsTransitioning(true);
    setAnsweredCount(newAnsweredCount);

    // Initial 30-films milestone trigger
    if (newAnsweredCount === milestoneTarget) {
      setShowMilestoneScreen(true);
    }

    // Dynamic Rank-Up Milestone Check (e.g. Cinephile, Curator, Master...)
    if (prevProgression.currentRank.key !== nextProgression.currentRank.key) {
      const milestoneStorageKey = `filmprint_milestone_FILM_${nextProgression.currentRank.key}`;
      const alreadySeen = typeof window !== "undefined" && localStorage.getItem(milestoneStorageKey);

      if (!alreadySeen) {
        try {
          localStorage.setItem(milestoneStorageKey, "true");
        } catch {}

        setRankUpData({
          oldRank: prevProgression.currentRank,
          newRank: nextProgression.currentRank,
          answeredCount: newAnsweredCount,
        });
        setShowRankUpModal(true);
        setIsRecalculatingDna(true);

        // Trigger background DNA recalculation
        fetch("/api/profile?forceRefresh=true")
          .catch((e) => console.warn("[DNA Reanalysis Error]:", e))
          .finally(() => setIsRecalculatingDna(false));
      }
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
        {showOnboarding && !showMilestoneScreen && !showRankUpModal && (
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

        {/* Dynamic Rank-Up Milestone Modal */}
        {showRankUpModal && rankUpData && (
          <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface-1 border border-accent/40 rounded-3xl p-8 md:p-12 shadow-2xl animate-fadeIn relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-accent-subtle border border-accent/40 text-accent flex items-center justify-center mx-auto text-3xl font-bold">
              {rankUpData.newRank.badgeIcon}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold">
                YENİ RÜTBE KAZANILDI
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                Tebrikler! {rankUpData.newRank.label} Oldun!
              </h2>
              <p className="text-text-secondary text-sm md:text-base leading-relaxed font-sans">
                <strong className="text-text-primary">{rankUpData.answeredCount} film</strong> değerlendirmesine ulaştınız. Film DNA profiliniz çok daha keskinleşti.
              </p>
            </div>

            {/* DNA Reanalysis Progress State */}
            <div className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-center gap-3 text-xs font-sans">
              {isRecalculatingDna ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-text-secondary">Film DNA profiliniz arka planda yeniden analiz ediliyor...</span>
                </>
              ) : (
                <>
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span className="text-text-primary font-medium">Film DNA profiliniz güncellendi!</span>
                </>
              )}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/profile"
                className="px-6 py-3.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover active:scale-95 transition-all shadow-sm text-center"
              >
                Yeni Film DNA&apos;mı Gör →
              </Link>

              <button
                onClick={() => {
                  setShowRankUpModal(false);
                  if (queue.length <= 2) fetchQueue(5);
                }}
                className="px-6 py-3.5 rounded-xl bg-surface-2 border border-border text-text-primary font-medium text-sm hover:bg-surface-3 active:scale-95 transition-all shadow-sm"
              >
                Değerlendirmeye Devam Et
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <MovieCardSkeleton />
        ) : showMilestoneScreen && !showRankUpModal ? (
          /* Milestone Reached State View (30 Films Milestone) */
          <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface-1 border border-border/80 rounded-3xl p-8 md:p-12 shadow-md animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                İlk Film DNA Profilin Hazır {userName ? `, ${userName}` : ""}
              </h2>
              <p className="text-text-secondary text-sm md:text-base leading-relaxed font-sans">
                Tebrikler! <strong className="text-text-primary">{answeredCount} filmi</strong> başarıyla değerlendirdiniz.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-2 border border-border text-xs font-sans text-text-secondary">
              Kişisel Film DNA profiliniz hazırlandı. Profilinizi inceleyebilir veya önerilerinizi daha da keskinleştirmek için değerlendirmeye devam edebilirsiniz.
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/profile"
                className="px-6 py-3.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover active:scale-95 transition-all shadow-sm text-center"
              >
                Film DNA Profilini Gör →
              </Link>

              <button
                onClick={() => {
                  setShowMilestoneScreen(false);
                  if (queue.length <= 2) fetchQueue(5);
                }}
                className="px-6 py-3.5 rounded-xl bg-surface-2 border border-border text-text-primary font-medium text-sm hover:bg-surface-3 active:scale-95 transition-all shadow-sm"
              >
                Değerlendirmeye Devam Et
              </button>
            </div>
          </div>
        ) : activeMovie && !showRankUpModal ? (
          /* Active Interactive Movie Card */
          <div ref={cardRef} className="w-full space-y-3">
            {(() => {
              const progression = getProgressionForCount(answeredCount);
              return (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-4xl mx-auto px-1 text-xs font-sans">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-accent-subtle border border-accent/30 text-accent font-semibold text-[11px]">
                      {progression.currentRank.badgeIcon} {progression.currentRank.label}
                    </span>
                    <span className="text-text-muted">
                      {answeredCount} Film Oylandı
                    </span>
                  </div>

                  {progression.nextRank && (
                    <span className="text-text-secondary text-[11px]">
                      Sıradaki: <strong className="text-text-primary">{progression.nextRank.label}</strong> ({progression.remaining} film kaldı)
                    </span>
                  )}
                </div>
              );
            })()}
            <MovieCard
              movie={activeMovie}
              onAnswer={handleAnswer}
              isTransitioning={isTransitioning}
            />
          </div>
        ) : !showRankUpModal ? (
          /* Queue Empty / Retry Fallback State */
          <div className="w-full max-w-lg mx-auto text-center space-y-5 bg-surface-1 border border-border/80 rounded-3xl p-8 shadow-md">
            <div className={`w-12 h-12 rounded-2xl ${errorMessage ? "bg-rose-500/15 border border-rose-500/30 text-rose-400" : "bg-accent-subtle border border-accent/30 text-accent"} flex items-center justify-center mx-auto text-xl font-bold`}>
              {errorMessage ? "!" : "✨"}
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-text-primary">
                {errorMessage ? "Film Sırası Yüklenemedi" : "Yeni Filmler Hazırlanıyor"}
              </h3>
              <p className="text-text-secondary text-sm font-sans leading-relaxed">
                {errorMessage
                  ? errorMessage
                  : "Mevcut film sırasındaki tüm uygun yapımları değerlendirdin. Arka plan katalog senkronizasyonu devam ediyor, birazdan tekrar deneyebilirsin."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              {answeredCount > 0 && (
                <Link
                  href="/profile"
                  className="px-5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary text-xs font-semibold hover:bg-surface-3 transition-all shadow-sm text-center"
                >
                  Film DNA Profilini Gör
                </Link>
              )}
              <button
                onClick={() => fetchQueue(5)}
                className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover active:scale-95 transition-all shadow-sm"
              >
                Yeniden Kontrol Et
              </button>
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
