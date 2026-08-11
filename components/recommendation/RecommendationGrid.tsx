"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PersonalizedRecommendationItem } from "@/lib/recommendation/types";

interface RecommendationGridProps {
  items: PersonalizedRecommendationItem[];
  onFeedbackAction?: (movieId: string, action: string, rating?: string) => void;
}

export function RecommendationGrid({ items, onFeedbackAction }: RecommendationGridProps) {
  const [activeRatingMovieId, setActiveRatingMovieId] = useState<string | null>(null);
  const [submittedMovieIds, setSubmittedMovieIds] = useState<Set<string>>(new Set());

  if (!items || items.length === 0) return null;

  const handleAction = (movieId: string, actionType: "WATCHED" | "WATCH_LATER" | "NOT_INTERESTED") => {
    if (actionType === "WATCHED") {
      setActiveRatingMovieId(movieId);
    } else {
      setSubmittedMovieIds((prev) => new Set([...prev, movieId]));
      if (onFeedbackAction) {
        onFeedbackAction(movieId, actionType);
      }
    }
  };

  const handleRatingSelect = (movieId: string, rating: string) => {
    setActiveRatingMovieId(null);
    setSubmittedMovieIds((prev) => new Set([...prev, movieId]));
    if (onFeedbackAction) {
      onFeedbackAction(movieId, "WATCHED_FROM_RECOMMENDATION", rating);
    }
  };

  const visibleItems = items.filter((item) => !submittedMovieIds.has(item.movie.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold tracking-tight text-text-primary">
          Kişiselleştirilmiş Seçkiler
        </h3>
        <span className="text-xs font-mono text-text-muted">
          {visibleItems.length} Öneri
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {visibleItems.map((item) => {
          const { movie, match, headline } = item;
          const isRatingOpen = activeRatingMovieId === movie.id;
          const posterUrl = movie.posterPath
            ? movie.posterPath.startsWith("http")
              ? movie.posterPath
              : `https://image.tmdb.org/t/p/w500${movie.posterPath}`
            : null;

          return (
            <div
              key={movie.id}
              className="p-4 rounded-2xl bg-surface border border-border/70 shadow-sm flex flex-col justify-between space-y-3 group hover:border-accent/50 transition-all duration-300"
            >
              {/* Poster & Match Badge Container */}
              <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated relative shadow-sm">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={movie.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-[10px]">
                    Görsel Yok
                  </div>
                )}

                {/* Match Percentage Badge */}
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-md border border-accent/40 text-text-primary text-[10px] font-mono font-bold">
                  %{match} UYUM
                </div>
              </div>

              {/* Movie Details */}
              <div className="space-y-1">
                <h4 className="font-display text-sm font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                  {movie.title}
                </h4>
                <p className="text-[10px] font-mono text-text-muted line-clamp-1">
                  {movie.releaseYear || "Tarihsiz"} • {movie.genres.join(", ")}
                </p>
                <p className="text-[11px] text-text-secondary line-clamp-2 mt-1 leading-snug">
                  {headline}
                </p>
              </div>

              {/* Feedback Actions */}
              {isRatingOpen ? (
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-mono text-text-primary font-bold">
                    <span>Nasıl buldun?</span>
                    <button
                      onClick={() => setActiveRatingMovieId(null)}
                      className="text-text-muted hover:text-text-primary text-[10px]"
                    >
                      İptal
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleRatingSelect(movie.id, "LOVE")}
                      className="py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 text-text-primary font-mono text-[10px] border border-accent/40"
                    >
                      ❤️ Çok Sevdim
                    </button>
                    <button
                      onClick={() => handleRatingSelect(movie.id, "LIKE")}
                      className="py-1.5 rounded-lg bg-surface-elevated hover:bg-border text-text-primary font-mono text-[10px] border border-border"
                    >
                      👍 Beğendim
                    </button>
                    <button
                      onClick={() => handleRatingSelect(movie.id, "NEUTRAL")}
                      className="py-1.5 rounded-lg bg-surface-elevated hover:bg-border text-text-secondary font-mono text-[10px] border border-border"
                    >
                      😐 Ortalama
                    </button>
                    <button
                      onClick={() => handleRatingSelect(movie.id, "DISLIKE")}
                      className="py-1.5 rounded-lg bg-surface-elevated hover:bg-border text-text-muted font-mono text-[10px] border border-border"
                    >
                      👎 Sevmedim
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1 text-[11px] font-mono">
                  <button
                    onClick={() => handleAction(movie.id, "WATCHED")}
                    className="px-2.5 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover transition-colors"
                  >
                    İzledim
                  </button>
                  <button
                    onClick={() => handleAction(movie.id, "WATCH_LATER")}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-border border border-border text-text-primary transition-colors"
                  >
                    Daha Sonra
                  </button>
                  <button
                    onClick={() => handleAction(movie.id, "NOT_INTERESTED")}
                    className="px-2 py-1.5 text-text-muted hover:text-text-primary transition-colors"
                    title="İlgilenmiyorum"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
