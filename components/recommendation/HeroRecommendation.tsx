"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { PersonalizedRecommendationItem } from "@/lib/recommendation/types";

interface HeroRecommendationProps {
  item: PersonalizedRecommendationItem;
  onFeedbackAction?: (movieId: string, action: string, rating?: string) => void;
  onOpenDetails?: (movie: any, matchScore?: number, headline?: string, reasons?: string[]) => void;
}

export function HeroRecommendation({ item, onFeedbackAction, onOpenDetails }: HeroRecommendationProps) {
  const { movie, match, matchLabel } = item;
  const [dynamicExplanation, setDynamicExplanation] = useState<{
    headline: string;
    reasons: string[];
    isAiGenerated: boolean;
  } | null>(null);
  const [isLoadingExplain, setIsLoadingExplain] = useState(false);
  const [showRatingStep, setShowRatingStep] = useState<boolean>(false);
  const [feedbackAction, setFeedbackAction] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const headline = dynamicExplanation?.headline || item.headline;
  const reasons = dynamicExplanation?.reasons || item.reasons;
  const isAi = dynamicExplanation?.isAiGenerated ?? item.isAiGenerated;

  const posterUrl = getTmdbImageUrl(movie.posterPath, "w500");

  const handleOpenDetails = () => {
    if (onOpenDetails) {
      onOpenDetails(movie, match, headline, reasons);
    }
  };

  const handleFetchAiExplanation = async () => {
    if (isAi || isLoadingExplain) return;

    try {
      setIsLoadingExplain(true);
      const res = await fetch("/api/recommendations/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: movie.id }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.reasons) && data.reasons.length > 0) {
          setDynamicExplanation({
            headline: data.headline || headline,
            reasons: data.reasons,
            isAiGenerated: data.isAiGenerated ?? true,
          });
        }
      }
    } catch (e) {
      console.error("Hero on-demand explanation error:", e);
    } finally {
      setIsLoadingExplain(false);
    }
  };

  const handleFeedback = async (
    action: "LIKE" | "DISLIKE" | "HIDE" | "WATCHLIST" | "WATCHED" | "CLEAR",
    rating?: string
  ) => {
    const isClearing = feedbackAction === action && action !== "WATCHED" && action !== "HIDE";
    const effectiveAction = isClearing ? "CLEAR" : action;

    if (effectiveAction === "HIDE" || effectiveAction === "WATCHED") {
      setIsSubmitted(true);
    } else if (effectiveAction === "CLEAR") {
      setFeedbackAction(null);
    } else {
      setFeedbackAction(effectiveAction);
    }

    try {
      if (onFeedbackAction) {
        onFeedbackAction(movie.id, effectiveAction, rating);
      }

      await fetch("/api/recommendation-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "FILM",
          movieId: movie.id,
          action: effectiveAction,
          rating,
          source: "HOME_HERO",
        }),
      });
    } catch (e) {
      console.error("[Hero Feedback Error]:", e);
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-8 rounded-3xl bg-surface border border-border text-center space-y-2 animate-fade-out">
        <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/30 text-accent font-bold text-xs flex items-center justify-center mx-auto">
          ✓
        </div>
        <p className="text-xs font-mono text-text-primary">
          Geri bildiriminiz kaydedildi. Film DNA ve önerileriniz güncelleniyor.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 rounded-3xl bg-surface border border-border/80 shadow-cinematic relative overflow-hidden space-y-6">
      {/* Top Banner Tag */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          ZİRVESEL ÖNERİ (TOP MATCH)
        </span>

        {/* Match Percentage Badge */}
        <div className="px-4 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-text-primary text-xs font-mono font-bold flex items-center gap-2">
          <span>%{match} UYUM</span>
          <span className="text-[10px] text-text-muted font-normal">({matchLabel})</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row md:grid md:grid-cols-3 gap-4 md:gap-6 items-start">
        {/* Movie Poster Card */}
        <div
          onClick={handleOpenDetails}
          className="w-28 sm:w-36 md:w-56 mx-auto sm:mx-0 aspect-[2/3] rounded-2xl overflow-hidden bg-surface-elevated border border-border/60 shadow-md relative flex-shrink-0 cursor-pointer group hover:border-accent/60 transition-all"
          title="Film detaylarını gör"
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={movie.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 112px, (max-width: 768px) 144px, 224px"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-xs">
              Görsel Yok
            </div>
          )}
        </div>

        {/* Info & Evidence Column */}
        <div className="flex-1 md:col-span-2 space-y-4 w-full">
          <div>
            <h2
              onClick={handleOpenDetails}
              className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-text-primary group-hover:text-accent transition-colors cursor-pointer"
            >
              {movie.title}
            </h2>
            <p className="text-xs font-mono text-text-muted mt-1">
              {movie.releaseYear || "Tarihsiz"} • {movie.genres.join(", ")}
              {movie.voteAverage > 0 && ` • ⭐ ${movie.voteAverage.toFixed(1)}`}
            </p>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed font-medium">
            {headline}
          </p>

          {/* AI or Deterministic Reasons */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <span>✦</span> NEDEN BU FİLM?
              </span>

              {!isAi && (
                <button
                  type="button"
                  onClick={handleFetchAiExplanation}
                  disabled={isLoadingExplain}
                  className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {isLoadingExplain ? (
                    <span className="animate-pulse">AI Analiz Ediyor...</span>
                  ) : (
                    <span>✨ AI ile Detaylandır</span>
                  )}
                </button>
              )}
            </div>

            {isLoadingExplain ? (
              <div className="p-3.5 rounded-2xl bg-surface-elevated/90 border border-accent/30 space-y-2 animate-pulse">
                <div className="h-2.5 bg-surface rounded-full w-4/5 animate-pulse" />
                <div className="h-2.5 bg-surface rounded-full w-3/5 animate-pulse" />
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-surface-elevated/80 border border-border/70 space-y-2 text-xs text-text-secondary">
                {reasons && reasons.length > 0 ? (
                  reasons.map((r, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-accent font-bold text-xs mt-0.5">•</span>
                      <span className="leading-snug">{r.replace(/\*\*(.*?)\*\*/g, "$1")}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-text-muted italic">
                    Film DNA tercihlerinle yüksek uyum sağladı.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons / Inline Rating Step */}
          {showRatingStep ? (
            <div className="p-4 rounded-2xl bg-surface-elevated border border-accent/40 space-y-3 animate-fadeIn">
              <div className="flex justify-between items-center text-xs font-mono text-text-primary font-bold">
                <span>Nasıl buldun?</span>
                <button
                  onClick={() => setShowRatingStep(false)}
                  className="text-text-muted hover:text-text-primary text-[10px]"
                >
                  İptal
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleFeedback("WATCHED", "LOVE")}
                  className="px-3 py-2 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40 text-text-primary font-mono text-xs transition-all text-center"
                >
                  ❤️ Çok Sevdim
                </button>
                <button
                  onClick={() => handleFeedback("WATCHED", "LIKE")}
                  className="px-3 py-2 rounded-xl bg-surface-elevated hover:bg-border border border-border text-text-primary font-mono text-xs transition-all text-center"
                >
                  👍 Beğendim
                </button>
                <button
                  onClick={() => handleFeedback("WATCHED", "NEUTRAL")}
                  className="px-3 py-2 rounded-xl bg-surface-elevated hover:bg-border border border-border text-text-secondary font-mono text-xs transition-all text-center"
                >
                  😐 Ortalama
                </button>
                <button
                  onClick={() => handleFeedback("WATCHED", "DISLIKE")}
                  className="px-3 py-2 rounded-xl bg-surface-elevated hover:bg-border border border-border text-text-muted font-mono text-xs transition-all text-center"
                >
                  👎 Sevmedim
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
              <button
                type="button"
                aria-pressed={feedbackAction === "LIKE"}
                onClick={() => handleFeedback("LIKE")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  feedbackAction === "LIKE"
                    ? "bg-accent/20 text-accent border border-accent/50 shadow-sm"
                    : "bg-surface-elevated hover:bg-border border border-border text-text-secondary hover:text-text-primary"
                }`}
                title="İlgimi Çekti"
              >
                <span>👍</span>
                <span>İlgimi Çekti</span>
              </button>

              <button
                type="button"
                aria-pressed={feedbackAction === "DISLIKE"}
                onClick={() => handleFeedback("DISLIKE")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  feedbackAction === "DISLIKE"
                    ? "bg-surface-elevated text-text-muted border border-border shadow-sm"
                    : "bg-surface-elevated hover:bg-border border border-border text-text-secondary hover:text-text-muted"
                }`}
                title="İlgimi Çekmedi"
              >
                <span>👎</span>
                <span>İlgimi Çekmedi</span>
              </button>

              <button
                type="button"
                aria-pressed={feedbackAction === "WATCHLIST"}
                onClick={() => handleFeedback("WATCHLIST")}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  feedbackAction === "WATCHLIST"
                    ? "bg-accent text-white font-bold shadow-sm"
                    : "bg-surface-elevated hover:bg-border border border-border text-text-secondary hover:text-text-primary"
                }`}
                title="İzleme Listeme Ekle"
              >
                <span>🔖</span>
                <span>Listeme Ekle</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRatingStep(true)}
                className="px-3.5 py-2 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-all shadow-sm"
              >
                👁️ İzledim
              </button>

              <button
                type="button"
                onClick={() => handleFeedback("HIDE")}
                className="px-3 py-2 text-[11px] font-mono text-text-muted hover:text-red-400 transition-colors"
                title="Bunu önerme"
              >
                🚫 Önerme
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
