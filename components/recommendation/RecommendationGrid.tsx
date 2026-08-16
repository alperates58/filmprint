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
  const [activeMenuMovieId, setActiveMenuMovieId] = useState<string | null>(null);
  const [expandedMovieId, setExpandedMovieId] = useState<string | null>(null);
  const [loadingExplanationMovieId, setLoadingExplanationMovieId] = useState<string | null>(null);
  const [dynamicExplanations, setDynamicExplanations] = useState<
    Record<string, { headline: string; reasons: string[]; isAiGenerated: boolean }>
  >({});
  const [feedbackStateMap, setFeedbackStateMap] = useState<Record<string, string>>({});
  const [hiddenMovieIds, setHiddenMovieIds] = useState<Set<string>>(new Set());
  const [undoToast, setUndoToast] = useState<{ movieId: string; title: string } | null>(null);

  if (!items || items.length === 0) return null;

  const handleFeedback = async (
    movieId: string,
    action: "LIKE" | "DISLIKE" | "HIDE" | "WATCHLIST" | "WATCHED" | "CLEAR",
    rating?: string,
    movieTitle?: string
  ) => {
    setActiveMenuMovieId(null);
    const previousAction = feedbackStateMap[movieId];
    const isClearing = previousAction === action && action !== "WATCHED" && action !== "HIDE";
    const effectiveAction = isClearing ? "CLEAR" : action;

    // Optimistic UI updates
    if (effectiveAction === "HIDE") {
      setHiddenMovieIds((prev) => new Set([...prev, movieId]));
      setUndoToast({ movieId, title: movieTitle || "Film" });
      setTimeout(() => {
        setUndoToast((current) => (current?.movieId === movieId ? null : current));
      }, 6000);
    } else if (effectiveAction === "WATCHED") {
      setHiddenMovieIds((prev) => new Set([...prev, movieId]));
    } else if (effectiveAction === "CLEAR") {
      setFeedbackStateMap((prev) => {
        const next = { ...prev };
        delete next[movieId];
        return next;
      });
    } else {
      setFeedbackStateMap((prev) => ({ ...prev, [movieId]: effectiveAction }));
    }

    try {
      if (onFeedbackAction) {
        onFeedbackAction(movieId, effectiveAction, rating);
      }

      await fetch("/api/recommendation-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "FILM",
          movieId,
          action: effectiveAction,
          rating,
          source: "RECOMMENDATIONS",
        }),
      });
    } catch (err) {
      console.error("[Feedback Action Error]:", err);
      // Rollback on network failure
      if (effectiveAction === "HIDE") {
        setHiddenMovieIds((prev) => {
          const next = new Set(prev);
          next.delete(movieId);
          return next;
        });
      }
    }
  };

  const handleUndoHide = async (movieId: string) => {
    setHiddenMovieIds((prev) => {
      const next = new Set(prev);
      next.delete(movieId);
      return next;
    });
    setUndoToast(null);

    try {
      await fetch("/api/recommendation-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "FILM",
          movieId,
          action: "CLEAR",
          source: "RECOMMENDATIONS",
        }),
      });
    } catch (err) {
      console.error("[Undo Hide Error]:", err);
    }
  };

  const handleToggleExpand = async (item: PersonalizedRecommendationItem) => {
    const movieId = item.movie.id;
    if (expandedMovieId === movieId) {
      setExpandedMovieId(null);
      return;
    }

    setExpandedMovieId(movieId);

    const isAlreadyAi = item.isAiGenerated || dynamicExplanations[movieId]?.isAiGenerated;
    if (isAlreadyAi || dynamicExplanations[movieId]) {
      return;
    }

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

  const visibleItems = items.filter((item) => !hiddenMovieIds.has(item.movie.id));

  return (
    <div className="space-y-4 relative">
      {/* Toast Banner for Undo Hide */}
      {undoToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-surface-elevated/95 border border-accent/40 shadow-2xl backdrop-blur-md flex items-center gap-4 text-xs font-mono animate-fadeIn">
          <span>🚫 <strong>{undoToast.title}</strong> önerilerden gizlendi.</span>
          <button
            onClick={() => handleUndoHide(undoToast.movieId)}
            className="px-3 py-1.5 rounded-lg bg-accent text-white font-bold hover:bg-accent-hover transition-colors shadow-sm"
          >
            Geri Al
          </button>
        </div>
      )}

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
          const currentFeedback = feedbackStateMap[movie.id];
          const dynamicExp = dynamicExplanations[movie.id];
          const headline = dynamicExp?.headline || item.headline;
          const reasons = dynamicExp?.reasons || item.reasons;
          const isAi = dynamicExp?.isAiGenerated ?? item.isAiGenerated;

          const isRatingOpen = activeRatingMovieId === movie.id;
          const isMenuOpen = activeMenuMovieId === movie.id;
          const isExpanded = expandedMovieId === movie.id;
          const isLoadingExplain = loadingExplanationMovieId === movie.id;

          const posterUrl = getTmdbImageUrl(movie.posterPath, "w500");

          return (
            <div
              key={movie.id}
              className="p-4 rounded-2xl bg-surface border border-border/70 shadow-sm flex flex-col justify-between space-y-3 group hover:border-accent/50 transition-all duration-300 relative"
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

              {/* Feedback Actions Section */}
              {isRatingOpen ? (
                <div className="pt-2 border-t border-border/60 space-y-2 animate-fadeIn">
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
                      onClick={() => {
                        setActiveRatingMovieId(null);
                        handleFeedback(movie.id, "WATCHED", "LOVE", movie.title);
                      }}
                      className="py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 text-text-primary font-mono text-[10px] border border-accent/40 text-center"
                    >
                      ❤️ Çok Sevdim
                    </button>
                    <button
                      onClick={() => {
                        setActiveRatingMovieId(null);
                        handleFeedback(movie.id, "WATCHED", "LIKE", movie.title);
                      }}
                      className="py-1.5 rounded-lg bg-surface-elevated hover:bg-border text-text-primary font-mono text-[10px] border border-border text-center"
                    >
                      👍 Beğendim
                    </button>
                    <button
                      onClick={() => {
                        setActiveRatingMovieId(null);
                        handleFeedback(movie.id, "WATCHED", "NEUTRAL", movie.title);
                      }}
                      className="py-1.5 rounded-lg bg-surface-elevated hover:bg-border text-text-secondary font-mono text-[10px] border border-border text-center"
                    >
                      😐 Ortalama
                    </button>
                    <button
                      onClick={() => {
                        setActiveRatingMovieId(null);
                        handleFeedback(movie.id, "WATCHED", "DISLIKE", movie.title);
                      }}
                      className="py-1.5 rounded-lg bg-surface-elevated hover:bg-border text-text-muted font-mono text-[10px] border border-border text-center"
                    >
                      👎 Sevmedim
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1 text-[11px] font-mono relative">
                  {/* Quick Primary Actions: LIKE & DISLIKE */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={currentFeedback === "LIKE"}
                      onClick={() => handleFeedback(movie.id, "LIKE", undefined, movie.title)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        currentFeedback === "LIKE"
                          ? "bg-accent/20 text-accent border border-accent/50 shadow-sm"
                          : "bg-surface-elevated hover:bg-border border border-border/70 text-text-secondary hover:text-text-primary"
                      }`}
                      title="İlgimi Çekti (Benzerlerini daha çok öner)"
                    >
                      <span>👍</span>
                      <span className="hidden sm:inline text-[10px]">İlgimi Çekti</span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={currentFeedback === "DISLIKE"}
                      onClick={() => handleFeedback(movie.id, "DISLIKE", undefined, movie.title)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        currentFeedback === "DISLIKE"
                          ? "bg-surface-elevated text-text-muted border border-border shadow-sm"
                          : "bg-surface-elevated hover:bg-border border border-border/70 text-text-secondary hover:text-text-muted"
                      }`}
                      title="İlgimi Çekmedi"
                    >
                      <span>👎</span>
                      <span className="hidden sm:inline text-[10px]">İlgimi Çekmedi</span>
                    </button>
                  </div>

                  {/* Watchlist & Overflow Menu */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={currentFeedback === "WATCHLIST"}
                      onClick={() => handleFeedback(movie.id, "WATCHLIST", undefined, movie.title)}
                      className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                        currentFeedback === "WATCHLIST"
                          ? "bg-accent text-white font-bold shadow-sm"
                          : "bg-surface-elevated hover:bg-border border border-border/70 text-text-secondary hover:text-text-primary"
                      }`}
                      title="İzleme Listeme Ekle"
                    >
                      <span>🔖</span>
                      <span className="hidden md:inline text-[10px]">Listem</span>
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuMovieId(isMenuOpen ? null : movie.id)}
                        className="p-1.5 rounded-lg bg-surface-elevated hover:bg-border border border-border/70 text-text-secondary hover:text-text-primary text-xs"
                        title="Daha fazla seçenek"
                      >
                        ⋯
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="absolute bottom-full right-0 mb-1.5 w-44 rounded-xl bg-surface-elevated border border-border/80 shadow-2xl p-1.5 space-y-1 z-30 animate-fadeIn">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuMovieId(null);
                              setActiveRatingMovieId(movie.id);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg text-left text-[11px] font-mono hover:bg-surface hover:text-accent transition-colors flex items-center gap-2"
                          >
                            <span>👁️</span>
                            <span>İzledim</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(movie.id, "HIDE", undefined, movie.title)}
                            className="w-full px-2.5 py-1.5 rounded-lg text-left text-[11px] font-mono text-text-muted hover:bg-surface hover:text-red-400 transition-colors flex items-center gap-2"
                          >
                            <span>🚫</span>
                            <span>Bunu Önerme</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
