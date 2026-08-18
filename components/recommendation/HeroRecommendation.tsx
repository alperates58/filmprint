"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { PersonalizedRecommendationItem } from "@/lib/recommendation/types";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

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
  const [feedbackAction, setFeedbackAction] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const headline = dynamicExplanation?.headline || item.headline;
  const reasons = dynamicExplanation?.reasons || item.reasons;
  const isAi = dynamicExplanation?.isAiGenerated ?? item.isAiGenerated;

  const posterUrl = getTmdbImageUrl(movie.posterPath, "w500");
  const backdropUrl = getTmdbImageUrl(movie.backdropPath, "w1280");
  const genres = movie.genres || [];

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
      <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 text-center space-y-2 animate-fadeIn">
        <div className="w-10 h-10 rounded-2xl bg-accent-subtle border border-accent/30 text-accent font-bold text-sm flex items-center justify-center mx-auto">
          ✓
        </div>
        <p className="text-sm font-sans font-medium text-text-primary">
          Tercihiniz kaydedildi. Film DNA ve öneri listeniz güncelleniyor.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-surface-1 border border-border/80 shadow-md">
      {/* Ambient Backdrop Scrim */}
      {backdropUrl && (
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none overflow-hidden">
          <Image
            src={backdropUrl}
            alt=""
            fill
            className="object-cover filter blur-2xl scale-110"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-surface-1 via-surface-1/90 to-surface-1/40" />
        </div>
      )}

      <div className="relative z-10 p-5 sm:p-7 md:p-8 space-y-6">
        {/* Top Context Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-sans font-semibold">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>BUGÜNÜN ZİRVE EŞLEŞMESİ</span>
          </div>

          <ScoreBadge score={match} label={matchLabel} size="md" showLabel />
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col sm:flex-row gap-5 md:gap-7 items-start">
          {/* Poster */}
          <div
            onClick={handleOpenDetails}
            className="w-28 sm:w-36 md:w-44 aspect-[2/3] rounded-2xl overflow-hidden bg-surface-2 border border-border-strong shadow-md relative flex-shrink-0 cursor-pointer group hover:border-accent transition-all duration-300"
          >
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={movie.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 112px, (max-width: 768px) 144px, 176px"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-sans">
                Görsel Yok
              </div>
            )}
          </div>

          {/* Details & AI Explanation */}
          <div className="flex-1 space-y-4 min-w-0">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary font-sans mb-1">
                <span className="font-semibold text-text-primary">{movie.releaseYear || "—"}</span>
                {genres.length > 0 && <span>• {genres.slice(0, 3).join(", ")}</span>}
              </div>

              <h2
                onClick={handleOpenDetails}
                className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-text-primary hover:text-accent transition-colors cursor-pointer"
              >
                {movie.title}
              </h2>
            </div>

            {/* AI Decision Box */}
            <div className="p-4 rounded-2xl bg-surface-2/80 border border-border/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-sans font-semibold text-accent flex items-center gap-1.5">
                  <span>✨</span> {headline || "Film DNA'nızla Yüksek Uyum"}
                </span>

                {!isAi && (
                  <button
                    onClick={handleFetchAiExplanation}
                    disabled={isLoadingExplain}
                    className="text-[11px] font-sans font-medium text-text-muted hover:text-text-primary underline"
                  >
                    {isLoadingExplain ? "Analiz ediliyor..." : "AI Detayı →"}
                  </button>
                )}
              </div>

              {reasons && reasons.length > 0 && (
                <ul className="space-y-1 text-xs text-text-secondary font-sans">
                  {reasons.slice(0, 2).map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      <span className="line-clamp-2">{reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Action Buttons (48dp Touch Target) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={handleOpenDetails}
                className="px-5 py-3 rounded-xl bg-accent text-white font-sans font-semibold text-xs hover:bg-accent-hover active:scale-95 transition-all shadow-sm flex items-center gap-2 min-h-[48px]"
              >
                <span>🎬</span>
                <span>Detayları ve Fragmanı Gör</span>
              </button>

              <button
                onClick={() => handleFeedback("WATCHLIST")}
                className={`px-4 py-3 rounded-xl border font-sans font-medium text-xs transition-all flex items-center gap-1.5 min-h-[48px] ${
                  feedbackAction === "WATCHLIST"
                    ? "bg-accent-subtle border-accent/40 text-accent font-semibold"
                    : "bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:border-border-strong"
                }`}
              >
                <span>🔖</span>
                <span>{feedbackAction === "WATCHLIST" ? "✓ İzleme Listemde" : "İzleme Listesine Ekle"}</span>
              </button>

              <button
                onClick={() => handleFeedback("LIKE")}
                className={`p-3 rounded-xl border transition-all text-sm min-h-[48px] min-w-[48px] flex items-center justify-center ${
                  feedbackAction === "LIKE"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : "bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:border-border-strong"
                }`}
                title="Beğendim"
                aria-label="Beğendim"
              >
                👍
              </button>

              <button
                onClick={() => handleFeedback("HIDE")}
                className="p-3 rounded-xl bg-surface-2 border border-border text-text-muted hover:text-destructive hover:border-destructive/30 transition-all text-sm min-h-[48px] min-w-[48px] flex items-center justify-center"
                title="Görmek İstemiyorum"
                aria-label="Görmek İstemiyorum"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
