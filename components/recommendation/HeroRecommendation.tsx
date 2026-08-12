"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PersonalizedRecommendationItem } from "@/lib/recommendation/types";

interface HeroRecommendationProps {
  item: PersonalizedRecommendationItem;
  onFeedbackAction?: (movieId: string, action: string, rating?: string) => void;
}

export function HeroRecommendation({ item, onFeedbackAction }: HeroRecommendationProps) {
  const { movie, match, matchLabel, headline, reasons, isAiGenerated } = item;
  const [showRatingStep, setShowRatingStep] = useState<"WATCHED" | "ALREADY_WATCHED" | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const posterUrl = movie.posterPath
    ? movie.posterPath.startsWith("http")
      ? movie.posterPath
      : `https://image.tmdb.org/t/p/w500${movie.posterPath}`
    : null;

  const handleActionClick = (actionType: "WATCHED" | "ALREADY_WATCHED" | "WATCH_LATER" | "NOT_INTERESTED") => {
    if (actionType === "WATCHED" || actionType === "ALREADY_WATCHED") {
      setShowRatingStep(actionType);
    } else {
      setIsSubmitted(true);
      if (onFeedbackAction) {
        onFeedbackAction(movie.id, actionType);
      }
    }
  };

  const handleRatingSelect = (rating: string) => {
    setIsSubmitted(true);
    const action = showRatingStep === "ALREADY_WATCHED" ? "ALREADY_WATCHED" : "WATCHED_FROM_RECOMMENDATION";
    if (onFeedbackAction) {
      onFeedbackAction(movie.id, action, rating);
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
        <div className="w-28 sm:w-36 md:w-56 mx-auto sm:mx-0 aspect-[2/3] rounded-2xl overflow-hidden bg-surface-elevated border border-border/60 shadow-md relative flex-shrink-0">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={movie.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 144px, 224px"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-xs">
              Görsel Yok
            </div>
          )}
        </div>

        {/* Hero Content & Explanation */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <span className="text-xs font-mono text-text-muted">
              {movie.releaseYear || "Tarihsiz"} • {movie.genres.join(", ")}
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary mt-1">
              {movie.title}
            </h2>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p className="text-xs text-text-muted italic font-mono mt-0.5">
                {movie.originalTitle}
              </p>
            )}
          </div>

          {/* Recommendation Explanation Card */}
          <div className="p-5 rounded-2xl bg-surface-elevated/80 border border-border/70 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-sm md:text-base font-bold text-text-primary">
                {headline}
              </h3>
              <span className="text-[10px] font-mono text-text-muted bg-surface border border-border/60 px-2 py-0.5 rounded-full flex-shrink-0">
                Filmprint yorumu
              </span>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-border/40">
              <p className="text-[10px] font-mono font-semibold uppercase text-accent tracking-wider">
                NEDEN SANA UYGUN?
              </p>
              <ul className="space-y-1.5 text-xs md:text-sm text-text-secondary">
                {reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-accent font-bold">•</span>
                    <span>{reason.replace(/\*\*(.*?)\*\*/g, "$1")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Buttons / Inline Rating Step */}
          {showRatingStep ? (
            <div className="p-4 rounded-2xl bg-surface-elevated border border-accent/40 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono text-text-primary font-bold">
                <span>Nasıl buldun?</span>
                <button
                  onClick={() => setShowRatingStep(null)}
                  className="text-text-muted hover:text-text-primary text-[10px]"
                >
                  İptal
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleRatingSelect("LOVE")}
                  className="px-3 py-2 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40 text-text-primary font-mono text-xs transition-all"
                >
                  ❤️ Çok Sevdim
                </button>
                <button
                  onClick={() => handleRatingSelect("LIKE")}
                  className="px-3 py-2 rounded-xl bg-surface-elevated hover:bg-border border border-border text-text-primary font-mono text-xs transition-all"
                >
                  👍 Beğendim
                </button>
                <button
                  onClick={() => handleRatingSelect("NEUTRAL")}
                  className="px-3 py-2 rounded-xl bg-surface-elevated hover:bg-border border border-border text-text-secondary font-mono text-xs transition-all"
                >
                  😐 Ortalama
                </button>
                <button
                  onClick={() => handleRatingSelect("DISLIKE")}
                  className="px-3 py-2 rounded-xl bg-surface-elevated hover:bg-border border border-border text-text-muted font-mono text-xs transition-all"
                >
                  👎 Sevmedim
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => handleActionClick("WATCHED")}
                className="px-4 py-2 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-all shadow-sm"
              >
                İzledim
              </button>
              <button
                onClick={() => handleActionClick("WATCH_LATER")}
                className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-border border border-border text-text-primary font-mono text-xs transition-all"
              >
                Daha Sonra
              </button>
              <button
                onClick={() => handleActionClick("NOT_INTERESTED")}
                className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-border border border-border text-text-muted hover:text-text-primary font-mono text-xs transition-all"
              >
                İlgilenmiyorum
              </button>
              <button
                onClick={() => handleActionClick("ALREADY_WATCHED")}
                className="px-3 py-2 text-[11px] font-mono text-text-muted hover:text-text-primary underline underline-offset-4 transition-colors"
              >
                Zaten İzlemiştim
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
