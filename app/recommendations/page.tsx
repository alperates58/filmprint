"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { HeroRecommendation } from "@/components/recommendation/HeroRecommendation";
import { RecommendationGrid } from "@/components/recommendation/RecommendationGrid";
import { RecommendationResponse } from "@/lib/recommendation/types";

import { MovieDetailsModal } from "@/components/movie/MovieDetailsModal";

import { Footer } from "@/components/ui/Footer";

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

  const fetchRecommendations = async (targetPage: number = 0) => {
    try {
      if (data) setIsRefreshing(true);
      else setIsLoading(true);

      const res = await fetch(`/api/recommendations?limit=24&page=${targetPage}`);
      if (!res.ok) throw new Error("Öneriler alınamadı");
      const json: RecommendationResponse = await res.json();
      setData(json);
      setPage(targetPage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations(0);
  }, []);

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
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header progressCount={progressCount} progressTarget={progressTarget} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 space-y-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold">
                KİŞİSEL SİNEMA SEÇKİSİ
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
              Sana Özel Film Önerileri
            </h1>
            <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
              Film DNA profiliniz, izlediğiniz filmler ve kalibrasyon sinyalleriniz kullanılarak oluşturulmuş, yüksek uyumlu ve örnek film referanslı seçki.
            </p>
          </div>

          {/* Refresh Recommendations Button */}
          {data && data.ready && (
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-elevated border border-border/80 hover:border-accent text-text-primary text-xs font-mono font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] self-start sm:self-auto"
            >
              <span className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-accent" : ""}`}>
                🔄
              </span>
              <span>{isRefreshing ? "Yenileniyor..." : "Farklı Öneriler Getir"}</span>
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center text-text-muted font-mono text-xs space-y-3 rounded-3xl bg-surface border border-border">
            <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
            <p>Film DNA sinyalleriniz taranıyor ve uyum skorları hesaplanıyor...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 rounded-2xl bg-surface border border-border text-xs font-mono text-text-primary text-center">
            {error}
          </div>
        )}

        {/* Calibration Incomplete (Not Ready) State */}
        {!isLoading && data && !data.ready && (
          <div className="p-8 md:p-12 rounded-3xl bg-surface border border-border/80 shadow-cinematic text-center space-y-6 max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto text-accent text-xl font-bold font-mono">
              DNA
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-text-primary">
                Film DNA Profiliniz Henüz Hazır Değil
              </h2>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                Filmprint&apos;in tam uyumlu ve güvenilir film önerileri sunabilmesi için kalibrasyonu tamamlamanız gerekmektedir.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-xs font-mono text-text-secondary">
                <span>Tamamlanan: {data.current}</span>
                <span>Hedef: {data.required} Film</span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-elevated overflow-hidden border border-border">
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-all shadow-md"
              >
                Kalibrasyona Devam Et
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
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="font-display text-lg md:text-xl font-bold text-text-primary flex items-center gap-2">
                    <span>🎯</span>
                    <span>En Uyumlu Seçimler</span>
                  </h3>
                  <span className="text-xs font-mono text-text-muted">
                    Yüksek Uyum Skorları
                  </span>
                </div>
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
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="font-display text-lg md:text-xl font-bold text-text-primary flex items-center gap-2">
                    <span>🛡️</span>
                    <span>Daha Güvenli Seçimler</span>
                  </h3>
                  <span className="text-xs font-mono text-text-muted">
                    Popüler & İzleyici Konsensüsü
                  </span>
                </div>
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
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="font-display text-lg md:text-xl font-bold text-text-primary flex items-center gap-2">
                    <span>💎</span>
                    <span>Biraz Daha Keşif & Gizli Cevherler</span>
                  </h3>
                  <span className="text-xs font-mono text-text-muted">
                    Yüksek Puanlı Niche Yapımlar
                  </span>
                </div>
                <RecommendationGrid
                  items={discoveryGems}
                  onFeedbackAction={handleFeedbackAction}
                  onOpenDetails={handleOpenDetails}
                />
              </div>
            )}

            {/* Page Navigation Controls */}
            {(data.totalPages || 0) > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6 font-mono text-xs border-t border-border/60">
                <button
                  disabled={page <= 0 || isRefreshing}
                  onClick={() => fetchRecommendations(Math.max(0, page - 1))}
                  className="px-5 py-2.5 rounded-xl bg-surface border border-border disabled:opacity-40 hover:border-accent text-text-primary transition-all"
                >
                  ← Önceki Seçki
                </button>
                <span className="text-text-muted font-bold">
                  Sayfa {page + 1} / {data.totalPages}
                </span>
                <button
                  disabled={!data.hasMore || isRefreshing}
                  onClick={() => fetchRecommendations(page + 1)}
                  className="px-5 py-2.5 rounded-xl bg-surface border border-border disabled:opacity-40 hover:border-accent text-text-primary transition-all"
                >
                  Farklı Öneriler →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cinematic Movie Detail Modal */}
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
