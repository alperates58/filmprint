"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { PersonalizedRecommendationItem } from "@/lib/recommendation/types";

interface RecommendationGridProps {
  items: PersonalizedRecommendationItem[];
  onFeedbackAction?: (movieId: string, action: string, rating?: string) => void;
  onOpenDetails?: (movie: any, matchScore?: number, headline?: string, reasons?: string[]) => void;
}

export function RecommendationGrid({ items, onFeedbackAction, onOpenDetails }: RecommendationGridProps) {
  const [activeRatingMovieId, setActiveRatingMovieId] = useState<string | null>(null);
  const [expandedMovieId, setExpandedMovieId] = useState<string | null>(null);
  const [loadingExplanationMovieId, setLoadingExplanationMovieId] = useState<string | null>(null);
  const [dynamicExplanations, setDynamicExplanations] = useState<
    Record<string, { headline: string; reasons: string[]; isAiGenerated: boolean }>
  >({});
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

  const handleToggleExpand = async (item: PersonalizedRecommendationItem) => {
    const movieId = item.movie.id;
    if (expandedMovieId === movieId) {
      setExpandedMovieId(null);
      return;
    }

    setExpandedMovieId(movieId);

    // If already AI generated from server or previously fetched on-demand, no API call needed
    const isAlreadyAi = item.isAiGenerated || dynamicExplanations[movieId]?.isAiGenerated;
    if (isAlreadyAi || dynamicExplanations[movieId]) {
      return;
    }

    // Trigger on-demand AI explanation
    try {
      setLoadingExplanationMovieId(movieId);
      const res = await fetch("/api/recommendations/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.reasons) && data.reasons.length > 0) {
          setDynamicExplanations((prev) => ({
            ...prev,
            [movieId]: {
              headline: data.headline || item.headline,
              reasons: data.reasons,
              isAiGenerated: data.isAiGenerated ?? true,
            },
          }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch on-demand explanation:", e);
    } finally {
      setLoadingExplanationMovieId(null);
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
          const { movie, match } = item;
          const dynamicExp = dynamicExplanations[movie.id];
          const headline = dynamicExp?.headline || item.headline;
          const reasons = dynamicExp?.reasons || item.reasons;
          const isAi = dynamicExp?.isAiGenerated ?? item.isAiGenerated;

          const isRatingOpen = activeRatingMovieId === movie.id;
          const isExpanded = expandedMovieId === movie.id;
          const isLoadingExplain = loadingExplanationMovieId === movie.id;

          const posterUrl = getTmdbImageUrl(movie.posterPath, "w500");

          return (
            <div
              key={movie.id}
              className="p-4 rounded-2xl bg-surface border border-border/70 shadow-sm flex flex-col justify-between space-y-3 group hover:border-accent/50 transition-all duration-300"
            >
              {/* Poster & Match Badge Container */}
              <div
                onClick={() => onOpenDetails && onOpenDetails(movie, match, headline, reasons)}
                className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated relative shadow-sm cursor-pointer"
                title="Film detaylarını gör"
              >
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
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-md border border-accent/40 text-accent text-[10px] font-mono font-bold">
                  ❤️ %{match} UYUM
                </div>
              </div>

              {/* Movie Details & Reasons */}
              <div className="space-y-1.5 flex-1">
                <h4
                  onClick={() => onOpenDetails && onOpenDetails(movie, match, headline, reasons)}
                  className="font-display text-sm font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors cursor-pointer"
                >
                  {movie.title}
                </h4>
                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span className="line-clamp-1">
                    {movie.releaseYear || "Tarihsiz"} • {movie.genres.join(", ")}
                  </span>
                  {movie.voteAverage > 0 && (
                    <span className="text-text-secondary font-bold flex-shrink-0 ml-1">
                      ⭐ {movie.voteAverage.toFixed(1)}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-text-secondary font-medium leading-snug pt-0.5">
                  {headline}
                </p>

                {/* Expandable Neden sana uygun? accordion */}
                <div className="pt-1">
                  <button
                    onClick={() => handleToggleExpand(item)}
                    className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Neden sana uygun?</span>
                    {isAi && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-accent/15 text-accent font-normal">
                        AI
                      </span>
                    )}
                    <span>{isExpanded ? "▴" : "▾"}</span>
                  </button>

                  {isExpanded && (
                    <>
                      {isLoadingExplain ? (
                        <div className="mt-1.5 p-3 rounded-xl bg-surface-elevated/90 border border-accent/30 text-[11px] space-y-2 animate-pulse">
                          <div className="flex items-center gap-1.5 text-accent font-mono text-[10px] font-semibold">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                            <span>Film DNA'nla eşleştiriliyor...</span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="h-2 bg-surface rounded-full w-5/6 animate-pulse" />
                            <div className="h-2 bg-surface rounded-full w-4/6 animate-pulse" />
                            <div className="h-2 bg-surface rounded-full w-3/4 animate-pulse" />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5 p-2.5 rounded-xl bg-surface-elevated/80 border border-border/60 text-[11px] text-text-secondary space-y-1 animate-fadeIn">
                          {reasons && reasons.length > 0 ? (
                            reasons.map((r, idx) => (
                              <div key={idx} className="flex items-start gap-1.5">
                                <span className="text-accent font-bold text-[10px]">•</span>
                                <span>{r.replace(/\*\*(.*?)\*\*/g, "$1")}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[10px] text-text-muted italic">
                              Zevk profiline göre özel eşleştirildi.
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
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
