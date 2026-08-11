"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { HeroRecommendation } from "@/components/recommendation/HeroRecommendation";
import { RecommendationGrid } from "@/components/recommendation/RecommendationGrid";
import { RecommendationResponse } from "@/lib/recommendation/types";

export default function RecommendationsPage() {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch("/api/recommendations?limit=10");
      if (!res.ok) throw new Error("Öneriler alınamadı");
      const json: RecommendationResponse = await res.json();
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

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

      // Refetch queue in background if needed
    } catch (e) {
      console.error("[Feedback Action Error]:", e);
    }
  };

  const progressCount = data?.current || 0;
  const progressTarget = data?.required || 30;

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header progressCount={progressCount} progressTarget={progressTarget} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 space-y-10">
        {/* Page Header */}
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
            Film DNA profiliniz ve kalibrasyon sinyalleriniz kullanılarak oluşturulmuş, tam uyumlu ve açıklanabilir sinema önerileri.
          </p>
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
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-all shadow-md"
              >
                Kalibrasyona Devam Et
              </Link>
            </div>
          </div>
        )}

        {/* Ready State: Recommendations Render */}
        {!isLoading && data && data.ready && data.recommendations && (
          <div className="space-y-12">
            {/* Top #1 Hero Recommendation */}
            {data.recommendations.length > 0 && (
              <HeroRecommendation
                item={data.recommendations[0]}
                onFeedbackAction={handleFeedbackAction}
              />
            )}

            {/* Grid Recommendations (#2 to #10) */}
            {data.recommendations.length > 1 && (
              <RecommendationGrid
                items={data.recommendations.slice(1)}
                onFeedbackAction={handleFeedbackAction}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
