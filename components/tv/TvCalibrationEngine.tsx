"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { TvCard } from "@/components/tv/TvCard";
import { TvCardSkeleton } from "@/components/tv/TvCardSkeleton";
import { TvShowItem, TvInteractionStatusType, TvRatingStatusType } from "@/components/tv/types";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { getTvProgressionForCount, RankDefinition } from "@/lib/progression/service";

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
  const [showMilestoneScreen, setShowMilestoneScreen] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(initialAnsweredCount === 0);
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(initialTvShows.length === 0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic Rank Up & TV DNA Reanalysis State
  const [rankUpData, setRankUpData] = useState<{
    oldRank: RankDefinition;
    newRank: RankDefinition;
    answeredCount: number;
  } | null>(null);
  const [showRankUpModal, setShowRankUpModal] = useState<boolean>(false);
  const [isRecalculatingDna, setIsRecalculatingDna] = useState<boolean>(false);

  // Soft Session Checkpoint State
  const [showSoftBreak, setShowSoftBreak] = useState<boolean>(false);
  const sessionEvalCount = useRef<number>(0);

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

  // Fetch candidate queue from API (100% DB-first)
  const fetchQueue = useCallback(
    async (limit: number = 5) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoading(true);

      try {
        const response = await fetch(`/api/tv/calibration?limit=${limit}`);
        if (!response.ok) {
          throw new Error("Failed to load TV calibration queue");
        }
        const data = await response.json();
        const newShows: TvShowItem[] = data.tvShows || [];

        setAnsweredCount(data.answeredCount ?? 0);

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

  // Submit interaction handler (Optimistic UI + Dynamic Rank Up)
  const handleAnswer = async (
    status: TvInteractionStatusType,
    rating: TvRatingStatusType | null
  ) => {
    if (queue.length === 0 || isTransitioning) return;

    if (showOnboarding) {
      setShowOnboarding(false);
    }

    const currentShow = queue[0];
    const prevProgression = getTvProgressionForCount(answeredCount);
    const newAnsweredCount = answeredCount + 1;
    const nextProgression = getTvProgressionForCount(newAnsweredCount);

    sessionEvalCount.current += 1;

    // 1. Optimistic UI transition (150ms perceived latency)
    setIsTransitioning(true);
    setAnsweredCount(newAnsweredCount);

    // Initial 15-shows milestone trigger
    if (answeredCount < milestoneTarget && newAnsweredCount >= milestoneTarget) {
      setShowMilestoneScreen(true);
    }

    // Dynamic Rank-Up Milestone Check
    if (prevProgression.currentRank.key !== nextProgression.currentRank.key) {
      const milestoneStorageKey = `filmprint_milestone_TV_${nextProgression.currentRank.key}`;
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

        // Trigger background TV DNA recalculation
        fetch("/api/tv/profile?forceRefresh=true")
          .catch((e) => console.warn("[TV DNA Reanalysis Error]:", e))
          .finally(() => setIsRecalculatingDna(false));
      }
    } else if (sessionEvalCount.current >= 18 && !showRankUpModal && !showMilestoneScreen) {
      setShowSoftBreak(true);
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
        {showOnboarding && !showMilestoneScreen && !showRankUpModal && (
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
                <strong className="text-text-primary">{rankUpData.answeredCount} dizi</strong> değerlendirmesine ulaştınız. Dizi DNA profiliniz çok daha keskinleşti.
              </p>
            </div>

            {/* DNA Reanalysis Progress State */}
            <div className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-center gap-3 text-xs font-sans">
              {isRecalculatingDna ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-text-secondary">Dizi DNA profiliniz arka planda yeniden analiz ediliyor...</span>
                </>
              ) : (
                <>
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span className="text-text-primary font-medium">Dizi DNA profiliniz güncellendi!</span>
                </>
              )}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/tv/profile"
                className="px-6 py-3.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover active:scale-95 transition-all shadow-sm text-center"
              >
                Yeni Dizi DNA&apos;mı Gör →
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

        {/* Soft Session Break Checkpoint */}
        {showSoftBreak && !showRankUpModal && !showMilestoneScreen && (
          <div className="w-full max-w-lg mx-auto text-center space-y-5 bg-surface-1 border border-border/80 rounded-3xl p-7 md:p-9 shadow-lg animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-xl">
              ☕
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-text-primary">
                Harika İlerleme!
              </h3>
              <p className="text-text-secondary text-sm font-sans leading-relaxed">
                Bu oturumda <strong className="text-text-primary">{sessionEvalCount.current} diziyi</strong> değerlendirdiniz. Dizi DNA profiliniz için yeterli yeni sinyal toplandı.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2 text-xs font-semibold">
              <Link
                href="/tv/recommendations"
                className="px-5 py-3 rounded-xl bg-accent text-white hover:bg-accent-hover transition-all text-center"
              >
                Önerilerime Git →
              </Link>

              <Link
                href="/tv/profile"
                className="px-5 py-3 rounded-xl bg-surface-2 border border-border text-text-primary hover:bg-surface-3 transition-all text-center"
              >
                DNA&apos;mı Gör
              </Link>

              <button
                onClick={() => {
                  sessionEvalCount.current = 0;
                  setShowSoftBreak(false);
                }}
                className="px-5 py-3 rounded-xl bg-surface-2 border border-border text-text-secondary hover:text-text-primary transition-all"
              >
                Devam Et
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <TvCardSkeleton />
        ) : showMilestoneScreen && !showRankUpModal ? (
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
        ) : activeShow && !showRankUpModal && !showSoftBreak ? (
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

                  {progression.nextRank && (
                    <span className="text-text-secondary text-[11px]">
                      Sıradaki: <strong className="text-text-primary">{progression.nextRank.label}</strong> ({progression.remaining} dizi kaldı)
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
        ) : !showRankUpModal && !showSoftBreak ? (
          /* Queue Empty / Retry Fallback State */
          <div className="w-full max-w-lg mx-auto text-center space-y-5 bg-surface-1 border border-border/80 rounded-3xl p-8 shadow-md">
            <div className={`w-12 h-12 rounded-2xl ${errorMessage ? "bg-rose-500/15 border border-rose-500/30 text-rose-400" : "bg-accent-subtle border border-accent/30 text-accent"} flex items-center justify-center mx-auto text-xl font-bold`}>
              {errorMessage ? "!" : "📺"}
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-text-primary">
                {errorMessage ? "Dizi Sırası Yüklenemedi" : "Yeni Diziler Hazırlanıyor"}
              </h3>
              <p className="text-text-secondary text-sm font-sans leading-relaxed">
                {errorMessage
                  ? errorMessage
                  : "Mevcut dizi sırasındaki tüm uygun yapımları değerlendirdin. Arka plan katalog senkronizasyonu devam ediyor, birazdan tekrar deneyebilirsin."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              {answeredCount > 0 && (
                <Link
                  href="/tv/profile"
                  className="px-5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary text-xs font-semibold hover:bg-surface-3 transition-all shadow-sm text-center"
                >
                  Dizi DNA Profilini Gör
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
