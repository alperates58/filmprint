"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { TvCard } from "@/components/tv/TvCard";
import { TvCardSkeleton } from "@/components/tv/TvCardSkeleton";
import { TvShowItem, TvInteractionStatusType, TvRatingStatusType } from "@/components/tv/types";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { getTvProgressionForCount } from "@/lib/progression/service";


interface TvCalibrationEngineProps {
  initialTvShows?: TvShowItem[];
  initialAnsweredCount?: number;
}

export function TvCalibrationEngine({
  initialTvShows = [],
  initialAnsweredCount = 0,
}: TvCalibrationEngineProps) {
  const [queue, setQueue] = useState<TvShowItem[]>(initialTvShows);
  const [answeredCount, setAnsweredCount] = useState<number>(initialAnsweredCount);
  // A mature user must not see the first milestone again on every page load.
  // It is shown only when this client session crosses the threshold.
  const [showMilestoneScreen, setShowMilestoneScreen] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(initialAnsweredCount === 0);
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(initialTvShows.length === 0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFetchingRef = useRef<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const milestoneTarget = 15;

  // Fetch authenticated user info
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

  // Preload poster images for upcoming TV shows
  const preloadUpcomingImages = useCallback((showList: TvShowItem[]) => {
    showList.slice(1, 4).forEach((s) => {
      const url = getTmdbImageUrl(s.posterPath, "w500");
      if (url) {
        const img = new window.Image();
        img.src = url;
      }
    });
  }, []);

  const hasAutoRecoveredRef = useRef<boolean>(false);

  // Fetch candidate queue from API (with optional forced replenishment)
  const fetchQueue = useCallback(
    async (limit: number = 5, forceRefresh: boolean = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoading(true);

      try {
        const requestQueue = async (refresh: boolean) => {
          const url = refresh
            ? `/api/tv/calibration?limit=${limit}&refresh=true`
            : `/api/tv/calibration?limit=${limit}`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error("Failed to load TV calibration queue");
          }
          return response.json();
        };

        let data = await requestQueue(forceRefresh);
        let newShows: TvShowItem[] = data.tvShows || [];

        if (newShows.length === 0 && !forceRefresh && !hasAutoRecoveredRef.current) {
          // Keep one loading lifecycle across normal fetch + forced recovery.
          hasAutoRecoveredRef.current = true;
          data = await requestQueue(true);
          newShows = data.tvShows || [];
        }

        setAnsweredCount(data.answeredCount ?? 0);

        if (newShows.length > 0) {
          hasAutoRecoveredRef.current = false;
        }

        setQueue((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const filtered = newShows.filter((s) => !existingIds.has(s.id));
          const updated = [...prev, ...filtered];
          preloadUpcomingImages(updated);
          return updated;
        });

        setErrorMessage(null);
      } catch (err) {
        console.error("[TvCalibrationEngine] Fetch queue error:", err);
        setErrorMessage("Dizi sırası yüklenirken bir sorun oluştu.");
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [preloadUpcomingImages]
  );

  // Initial load if initialTvShows was empty
  useEffect(() => {
    if (initialTvShows.length === 0) {
      fetchQueue(5);
    } else {
      preloadUpcomingImages(initialTvShows);
    }
  }, [initialTvShows, fetchQueue, preloadUpcomingImages]);

  // Submit interaction handler (Optimistic UI)
  const handleAnswer = async (
    status: TvInteractionStatusType,
    rating: TvRatingStatusType | null
  ) => {
    if (queue.length === 0 || isTransitioning) return;

    if (showOnboarding) {
      setShowOnboarding(false);
    }

    const currentShow = queue[0];

    // 1. Optimistic UI transition (150ms perceived latency)
    setIsTransitioning(true);
    const newAnsweredCount = answeredCount + 1;
    setAnsweredCount(newAnsweredCount);

    // Trigger milestone screen right when hitting 15 interactions for the first time in session
    if (answeredCount < milestoneTarget && newAnsweredCount >= milestoneTarget) {
      setShowMilestoneScreen(true);
    }

    setTimeout(() => {
      // 2. Advance queue
      setQueue((prev) => {
        const nextQueue = prev.slice(1);
        preloadUpcomingImages(nextQueue);

        // Background refilling if queue drops below 3
        if (nextQueue.length <= 3) {
          fetchQueue(5);
        }

        return nextQueue;
      });

      setIsTransitioning(false);
    }, 150);

    // 3. Asynchronously persist interaction to server
    try {
      const res = await fetch("/api/tv/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvShowId: currentShow.id,
          status,
          rating,
        }),
      });

      if (!res.ok) {
        console.warn("[TvCalibrationEngine] Interaction save received non-200 status");
      }
    } catch (err) {
      console.error("[TvCalibrationEngine] Failed to save interaction:", err);
    }
  };

  const activeShow = queue[0];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent selection:text-white">
      <Header
        progressCount={answeredCount}
        progressTarget={milestoneTarget}
        userName={userName}
      />

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
                Dizi zevkini çözelim.
              </h1>
              <p className="text-text-secondary text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                Sana diziler göstereceğiz. İzlediklerini, kısmen izlediklerini ve ne düşündüğünü söyle. Dizi DNA&apos;n zamanla netleşsin.
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
          <TvCardSkeleton />
        ) : showMilestoneScreen ? (
          /* Milestone Reached State View (15 Shows Milestone) */
          <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface-1 border border-border/80 rounded-3xl p-8 md:p-12 shadow-md animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                İlk Dizi DNA Profilin Hazır {userName ? `, ${userName}` : ""}
              </h2>
              <p className="text-text-secondary text-sm md:text-base leading-relaxed font-sans">
                Tebrikler! <strong className="text-text-primary">{answeredCount} diziyi</strong> başarıyla değerlendirdiniz.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-2 border border-border text-xs font-sans text-text-secondary">
              Kişisel Dizi DNA profiliniz hazırlandı. Profilinizi inceleyebilir veya önerilerinizi daha da keskinleştirmek için değerlendirmeye devam edebilirsiniz.
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/tv/profile"
                className="px-6 py-3.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover active:scale-95 transition-all shadow-sm text-center"
              >
                Dizi DNA Profilini Gör →
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
        ) : activeShow ? (
          /* Active Interactive TV Card */
          <div ref={cardRef} className="w-full space-y-3">
            {(() => {
              const progression = getTvProgressionForCount(answeredCount);
              return (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-4xl mx-auto px-1 text-xs font-sans">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-accent-subtle border border-accent/30 text-accent font-semibold text-[11px]">
                      {progression.currentRank.badgeIcon} {progression.currentRank.label}
                    </span>
                    <span className="text-text-muted">
                      {answeredCount} Dizi Oylandı
                    </span>
                  </div>

                  {progression.nextRank ? (
                    <span className="text-text-secondary text-[11px]">
                      Sıradaki: <strong className="text-text-primary">{progression.nextRank.label}</strong> ({progression.remaining} dizi kaldı)
                    </span>
                  ) : (
                    <span className="text-text-secondary text-[11px]">
                      <strong className="text-text-primary">{progression.currentRank.label}</strong>
                    </span>
                  )}
                </div>
              );
            })()}
            <TvCard
              tvShow={activeShow}
              onAnswer={handleAnswer}
              isTransitioning={isTransitioning}
            />
          </div>
        ) : (
          /* Queue Empty / Retry Fallback State */
          <div className="w-full max-w-lg mx-auto text-center space-y-5 bg-surface-1 border border-border/80 rounded-3xl p-8 shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-text-primary">
                Dizi Sırası Yenileniyor
              </h3>
              <p className="text-text-secondary text-sm font-sans">
                {errorMessage || "Yeni diziler hazırlanıyor, lütfen tekrar deneyin."}
              </p>
            </div>

            <button
              onClick={() => fetchQueue(5, true)}
              className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 mx-auto"
            >
              <span>Dizileri Yenile</span>
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
