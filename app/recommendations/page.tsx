"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { HeroRecommendation } from "@/components/recommendation/HeroRecommendation";
import { RecommendationGrid } from "@/components/recommendation/RecommendationGrid";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MovieDetailsModal } from "@/components/movie/MovieDetailsModal";
import { RecommendationResponse } from "@/lib/recommendation/types";

export default function RecommendationsPage() {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [page, setPage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovieModal, setSelectedMovieModal] = useState<{
    movieId: string;
    initialData?: any;
  } | null>(null);

  const refreshedFingerprintsRef = React.useRef<Set<string>>(new Set());

  const fetchRecommendations = async (targetPage: number = 0, silent: boolean = false) => {
    try {
      if (!silent) {
        if (data) setIsRefreshing(true);
        else setIsLoading(true);
      }

      const res = await fetch(`/api/recommendations?limit=24&page=${targetPage}`);
      if (!res.ok) throw new Error("Öneriler alınamadı");
      const json: RecommendationResponse = await res.json();
      setData(json);
      setPage(targetPage);
    } catch (err) {
      if (!silent) setError((err as Error).message);
    } finally {
      if (!silent) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchRecommendations(0);
  }, []);

  // Background Hybrid Auto-Refresh: Triggers single background generation & silent refetch
  useEffect(() => {
    if (data?.hybridPending && data?.candidateFingerprint) {
      const fp = data.candidateFingerprint;
      if (refreshedFingerprintsRef.current.has(fp)) {
        return;
      }
      refreshedFingerprintsRef.current.add(fp);

      fetch("/api/recommendations/hybrid-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((refreshRes) => {
          if (refreshRes?.success) {
            fetchRecommendations(page, true);
          }
        })
        .catch((e) => console.error("[Hybrid Auto-Refresh Error]:", e));
    }
  }, [data?.hybridPending, data?.candidateFingerprint, page]);

  const handleRefresh = () => {
    if (isLoading || isRefreshing) return;
    const nextPage = data && data.hasMore ? page + 1 : 0;
    fetchRecommendations(nextPage);
  };

  const handleFeedbackAction = async (movieId: string, action: string, rating?: string) => {
    try {
      await fetch("/api/recommendations/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId,
          action,
          rating,
        }),
      });
    } catch (e) {
      console.error("[Feedback Action Error]:", e);
    }
  };

  const handleOpenDetails = (movie: any, matchScore?: number, headline?: string, reasons?: string[]) => {
    setSelectedMovieModal({
      movieId: movie.id,
      initialData: {
        title: movie.title,
        posterPath: movie.posterPath,
        backdropPath: movie.backdropPath,
        releaseYear: movie.releaseYear,
        genres: movie.genres,
        matchScore,
        headline,
        reasons,
      },
    });
  };

  const progressCount = data?.current || 0;
  const progressTarget = data?.required || 30;

  const allRecs = data?.recommendations || [];
  const heroRec = allRecs[0] || null;
  const topMatches = allRecs.slice(1, 9);
  const safeMatches = allRecs.slice(9, 17);
  const discoveryGems = allRecs.slice(17, 25);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header progressCount={progressCount} progressTarget={progressTarget} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold">
              <span>✨ KİŞİSEL SİNEMA SEÇKİSİ</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
              Sana Özel Film Önerileri
            </h1>
            <p className="text-sm text-text-secondary max-w-xl">
              Film DNA profilinizdeki ağırlıklar, türe özel zevk katsayılarınız ve son geri bildirimleriniz ile harmanlanmış kişisel seçki.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-primary text-xs font-medium transition-all flex items-center gap-2 disabled:opacity-50 min-h-[40px]"
          >
            <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
            <span>{isRefreshing ? "Yenileniyor..." : "Yeni Öneriler Getir"}</span>
          </button>
        </div>

        {/* Quick AI Keşfet Callout */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-surface-1 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-lg flex-shrink-0">
              ✨
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Farklı bir ruh halinde misin?</h3>
              <p className="text-xs text-zinc-300">"Beyin yakan gizemli bir film" veya "Okyanusta geçen aşk hikayesi" gibi aklındakini yapay zekaya sor.</p>
            </div>
          </div>
          <Link
            href="/kesfet"
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition-all flex items-center gap-1.5 self-end sm:self-center flex-shrink-0"
          >
            <span>AI İle Keşfet</span>
            <span>→</span>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center text-text-muted text-xs space-y-3 rounded-3xl bg-surface-1 border border-border">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
            <p className="font-sans">Film DNA sinyalleriniz taranıyor ve uyum skorları hesaplanıyor...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 rounded-2xl bg-surface-1 border border-destructive/30 text-xs font-sans text-destructive text-center">
            {error}
          </div>
        )}

        {/* Calibration Incomplete (Not Ready) State */}
        {!isLoading && data && !data.ready && (
          <div className="p-8 md:p-12 rounded-3xl bg-surface-1 border border-border shadow-md text-center space-y-6 max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-accent-subtle border border-accent/30 flex items-center justify-center mx-auto text-accent text-xl font-bold">
              🧬
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-text-primary">
                Film DNA Profiliniz Henüz Hazır Değil
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                SineAI&apos;ın tam uyumlu ve güvenilir film önerileri sunabilmesi için kalibrasyonu tamamlamanız gerekmektedir.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-xs font-sans text-text-secondary">
                <span>Tamamlanan: {data.current}</span>
                <span>Hedef: {data.required} Film</span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-2 overflow-hidden border border-border">
                <div
                  className="h-full bg-accent transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      ((data.current || 0) / (data.required || 30)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <Link
                href="/calibrate"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-hover transition-all shadow-sm"
              >
                Kalibrasyona Devam Et →
              </Link>
            </div>
          </div>
        )}

        {/* Ready State: Segmented Recommendations Render */}
        {!isLoading && data && data.ready && allRecs.length > 0 && (
          <div className="space-y-12">
            {/* Top #1 Hero Recommendation */}
            {heroRec && (
              <HeroRecommendation
                item={heroRec}
                onFeedbackAction={handleFeedbackAction}
                onOpenDetails={handleOpenDetails}
              />
            )}

            {/* Segment 1: En Uyumlu Seçimler (%85+ Uyum) */}
            {topMatches.length > 0 && (
              <div className="space-y-4">
                <SectionHeader
                  badge="EN UYUMLU"
                  badgeIcon="🎯"
                  title="Zirve Eşleşmeler"
                  subtitle="Film DNA profilinizle en yüksek korelasyona sahip yapımlar."
                />
                <RecommendationGrid
                  items={topMatches}
                  onFeedbackAction={handleFeedbackAction}
                  onOpenDetails={handleOpenDetails}
                />
              </div>
            )}

            {/* Segment 2: Daha Güvenli Seçimler */}
            {safeMatches.length > 0 && (
              <div className="space-y-4">
                <SectionHeader
                  badge="GÜVENLİ SEÇKİ"
                  badgeIcon="🛡️"
                  title="Popüler & Konsensüs Yapımlar"
                  subtitle="Geniş izleyici kitleleri tarafından beğenilmiş, risksiz yüksek puanlı filmler."
                />
                <RecommendationGrid
                  items={safeMatches}
                  onFeedbackAction={handleFeedbackAction}
                  onOpenDetails={handleOpenDetails}
                />
              </div>
            )}

            {/* Segment 3: Biraz Daha Keşif & Gizli Cevherler */}
            {discoveryGems.length > 0 && (
              <div className="space-y-4">
                <SectionHeader
                  badge="KEŞİF"
                  badgeIcon="💎"
                  title="Gizli Kalmış Cevherler"
                  subtitle="Gözden kaçmış olabilecek özel atmosferli niş sinema eserleri."
                />
                <RecommendationGrid
                  items={discoveryGems}
                  onFeedbackAction={handleFeedbackAction}
                  onOpenDetails={handleOpenDetails}
                />
              </div>
            )}

            {/* Page Navigation Controls */}
            {(data.totalPages || 0) > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6 text-xs font-sans border-t border-border/60">
                <button
                  disabled={page <= 0 || isRefreshing}
                  onClick={() => fetchRecommendations(Math.max(0, page - 1))}
                  className="px-5 py-2.5 rounded-xl bg-surface-1 border border-border disabled:opacity-40 hover:border-accent text-text-primary transition-all min-h-[44px]"
                >
                  ← Önceki Seçki
                </button>
                <span className="text-text-muted font-mono font-bold">
                  Sayfa {page + 1} / {data.totalPages}
                </span>
                <button
                  disabled={!data.hasMore || isRefreshing}
                  onClick={() => fetchRecommendations(page + 1)}
                  className="px-5 py-2.5 rounded-xl bg-surface-1 border border-border disabled:opacity-40 hover:border-accent text-text-primary transition-all min-h-[44px]"
                >
                  Farklı Öneriler →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Movie Detail Modal */}
        <MovieDetailsModal
          movieId={selectedMovieModal?.movieId || null}
          onClose={() => setSelectedMovieModal(null)}
          initialData={selectedMovieModal?.initialData}
          onInteractionUpdate={(movieId, status) => {
            if (status === "WATCHED" || status === "NOT_INTERESTED") {
              handleFeedbackAction(movieId, status);
            }
          }}
        />
      </main>

      <Footer />
    </div>
  );
}
