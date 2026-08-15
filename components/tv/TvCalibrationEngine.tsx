"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { TvCard } from "@/components/tv/TvCard";
import { TvCardSkeleton } from "@/components/tv/TvCardSkeleton";
import { TvShowItem, TvInteractionStatusType, TvRatingStatusType } from "@/components/tv/types";

interface TvCalibrationEngineProps {
  initialTvShows?: TvShowItem[];
  initialAnsweredCount?: number;
  initialCompleted?: boolean;
}

export function TvCalibrationEngine({
  initialTvShows = [],
  initialAnsweredCount = 0,
  initialCompleted = false,
}: TvCalibrationEngineProps) {
  const [queue, setQueue] = useState<TvShowItem[]>(initialTvShows);
  const [answeredCount, setAnsweredCount] = useState<number>(initialAnsweredCount);
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
      if (s.posterPath) {
        const url = s.posterPath.startsWith("http")
          ? s.posterPath
          : `https://image.tmdb.org/t/p/w500${s.posterPath}`;
        const img = new window.Image();
        img.src = url;
      }
    });
  }, []);

  // Fetch candidate queue from API
  const fetchQueue = useCallback(
    async (limit: number = 5) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const res = await fetch(`/api/tv/calibration?limit=${limit}`);
        if (!res.ok) throw new Error("Failed to load TV calibration queue");

        const data = await res.json();
        const newShows: TvShowItem[] = data.tvShows || [];

        setAnsweredCount(data.answeredCount || 0);

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
    if (newAnsweredCount === milestoneTarget) {
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
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-accent selection:text-white">
      <Header
        progressCount={answeredCount}
        progressTarget={milestoneTarget}
        userName={userName}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 md:py-10 flex flex-col items-center justify-center space-y-4 md:space-y-6">
        {/* Onboarding Banner for first-time TV users */}
        {showOnboarding && !showMilestoneScreen && (
          <div className="w-full max-w-4xl mx-auto p-6 md:p-8 rounded-3xl bg-surface border border-accent/30 shadow-cinematic text-center space-y-4 animate-fadeIn relative overflow-hidden">
            <div className="space-y-2">
              <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                DİZİ KALİBRASYONU
              </span>
              <h1 className="font-display text-2xl md:text-4xl font-bold tracking-tight text-text-primary">
                Dizi zevkini çözelim.
              </h1>
              <p className="text-text-secondary text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Sana diziler göstereceğiz. İzlediklerini, kısmen izlediklerini ve ne düşündüğünü söyle. Dizi DNA profilin için ilk sinyaller toplansın.
              </p>
            </div>

            <button
              onClick={() => {
                setShowOnboarding(false);
                cardRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-2.5 rounded-xl bg-accent text-white font-mono text-xs md:text-sm font-semibold shadow-cinematic hover:bg-accent/90 transition-all"
            >
              Başla ↓
            </button>
          </div>
        )}

        {/* Calibration Progress Bar Pill */}
        {!showMilestoneScreen && !isLoading && (
          <div className="w-full max-w-4xl flex items-center justify-between px-2 text-xs font-mono text-text-muted">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>
                {answeredCount < milestoneTarget
                  ? `İlk Hedef: ${answeredCount} / ${milestoneTarget}`
                  : `Değerlendirilen: ${answeredCount} dizi`}
              </span>
            </div>
            {answeredCount < milestoneTarget && (
              <span className="text-[11px] text-text-muted">
                {milestoneTarget - answeredCount} dizi sonra ilk sinyaller hazır
              </span>
            )}
          </div>
        )}

        {/* Content Area */}
        {isLoading ? (
          <TvCardSkeleton />
        ) : showMilestoneScreen ? (
          /* ========================================================================= */
          /* ONE-TIME FIRST MILESTONE CELEBRATION (15 SHOWS)                           */
          /* ========================================================================= */
          <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface border border-accent/40 rounded-3xl p-8 md:p-12 shadow-cinematic animate-fadeIn my-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto text-3xl font-bold font-mono">
              🎉
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold">
                İLK HEDEF TAMAMLANDI
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                Dizi DNA&apos;n için ilk sinyaller hazır.
              </h2>
              <p className="text-text-secondary text-xs md:text-sm leading-relaxed max-w-md mx-auto">
                15 diziyi değerlendirerek TV zevkinizin ilk temel taşlarını oluşturdunuz. Dizi DNA profilinizi inceleyebilir veya değerlendirmeye devam ederek sinyalleri derinleştirebilirsiniz.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-elevated border border-border text-xs font-mono text-text-secondary space-y-1">
              <div>Toplam Değerlendirilen Dizi: <strong className="text-accent">{answeredCount}</strong></div>
              <div className="text-[11px] text-text-muted">
                Dizi DNA profili ve tür haritanız hesaplanmak üzere kaydedildi.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/tv/profile"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent text-white font-mono text-xs font-bold shadow-cinematic hover:bg-accent/90 transition-colors text-center"
              >
                🧬 Dizi DNA Profilini Gör
              </Link>
              <button
                onClick={() => setShowMilestoneScreen(false)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface-elevated border border-border hover:border-text-muted text-text-secondary font-mono text-xs font-semibold transition-colors text-center"
              >
                Değerlendirmeye Devam Et →
              </button>
            </div>
          </div>
        ) : activeShow ? (
          /* Active TV Card */
          <div ref={cardRef} className="w-full">
            <TvCard
              tvShow={activeShow}
              onAnswer={handleAnswer}
              isTransitioning={isTransitioning}
            />
          </div>
        ) : (
          /* Empty / Queue Exhausted State */
          <div className="w-full max-w-lg mx-auto text-center space-y-5 bg-surface border border-border rounded-3xl p-8 shadow-cinematic">
            <div className="text-3xl">📺</div>
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-text-primary">
                Yeni diziler hazırlanıyor
              </h3>
              <p className="text-text-secondary text-xs leading-relaxed">
                Tüm önerilen dizileri değerlendirdiniz. Yeni aday havuzunu yüklemek için tekrar deneyebilirsiniz.
              </p>
            </div>
            <button
              onClick={() => fetchQueue(5)}
              className="px-6 py-2.5 rounded-xl bg-accent text-white font-mono text-xs font-semibold hover:bg-accent/90 transition-colors"
            >
              Yeniden Dene ↻
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-mono">
            {errorMessage}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
