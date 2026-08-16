"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import type { PersonalizedTvRecommendationItem } from "@/lib/tv/recommendation/types";

interface TvRecommendationGridProps {
  items: PersonalizedTvRecommendationItem[];
  onFeedbackAction?: (tvShowId: string, action: string, rating?: string) => void;
  hybridPending?: boolean;
}

export function TvRecommendationGrid({ items, onFeedbackAction, hybridPending }: TvRecommendationGridProps) {
  const router = useRouter();
  const refreshedRef = useRef(false);
  const [activeRatingShowId, setActiveRatingShowId] = useState<string | null>(null);
  const [activeMenuShowId, setActiveMenuShowId] = useState<string | null>(null);
  const [feedbackStateMap, setFeedbackStateMap] = useState<Record<string, string>>({});
  const [hiddenShowIds, setHiddenShowIds] = useState<Set<string>>(new Set());
  const [undoToast, setUndoToast] = useState<{ showId: string; title: string } | null>(null);

  useEffect(() => {
    if (hybridPending && !refreshedRef.current) {
      refreshedRef.current = true;
      fetch("/api/tv/recommendations/hybrid-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => {
          if (res.ok) {
            router.refresh();
          }
        })
        .catch((e) => console.error("[TV Hybrid Auto-Refresh Error]:", e));
    }
  }, [hybridPending, router]);

  const [expandedShowId, setExpandedShowId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<
    Record<string, { headline: string; explanation: string; loading: boolean; open: boolean }>
  >({});

  const handleFeedback = async (
    tvShowId: string,
    action: "LIKE" | "DISLIKE" | "HIDE" | "WATCHLIST" | "WATCHED" | "CLEAR",
    rating?: string,
    showTitle?: string
  ) => {
    setActiveMenuShowId(null);
    const previousAction = feedbackStateMap[tvShowId];
    const isClearing = previousAction === action && action !== "WATCHED" && action !== "HIDE";
    const effectiveAction = isClearing ? "CLEAR" : action;

    // Optimistic UI updates
    if (effectiveAction === "HIDE") {
      setHiddenShowIds((prev) => new Set([...prev, tvShowId]));
      setUndoToast({ showId: tvShowId, title: showTitle || "Dizi" });
      setTimeout(() => {
        setUndoToast((current) => (current?.showId === tvShowId ? null : current));
      }, 6000);
    } else if (effectiveAction === "WATCHED") {
      setHiddenShowIds((prev) => new Set([...prev, tvShowId]));
    } else if (effectiveAction === "CLEAR") {
      setFeedbackStateMap((prev) => {
        const next = { ...prev };
        delete next[tvShowId];
        return next;
      });
    } else {
      setFeedbackStateMap((prev) => ({ ...prev, [tvShowId]: effectiveAction }));
    }

    try {
      if (onFeedbackAction) {
        onFeedbackAction(tvShowId, effectiveAction, rating);
      }

      await fetch("/api/recommendation-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "TV",
          tvShowId,
          action: effectiveAction,
          rating,
          source: "TV_RECOMMENDATIONS",
        }),
      });
    } catch (err) {
      console.error("[TV Feedback Action Error]:", err);
      if (effectiveAction === "HIDE") {
        setHiddenShowIds((prev) => {
          const next = new Set(prev);
          next.delete(tvShowId);
          return next;
        });
      }
    }
  };

  const handleUndoHide = async (tvShowId: string) => {
    setHiddenShowIds((prev) => {
      const next = new Set(prev);
      next.delete(tvShowId);
      return next;
    });
    setUndoToast(null);

    try {
      await fetch("/api/recommendation-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "TV",
          tvShowId,
          action: "CLEAR",
          source: "TV_RECOMMENDATIONS",
        }),
      });
    } catch (err) {
      console.error("[Undo TV Hide Error]:", err);
    }
  };

  const handleToggleExplanation = async (tvShowId: string) => {
    const cur = explanations[tvShowId];
    if (cur?.open) {
      setExplanations((prev) => ({ ...prev, [tvShowId]: { ...cur, open: false } }));
      return;
    }

    if (cur?.explanation) {
      setExplanations((prev) => ({ ...prev, [tvShowId]: { ...cur, open: true } }));
      return;
    }

    setExplanations((prev) => ({
      ...prev,
      [tvShowId]: { headline: "", explanation: "", loading: true, open: true },
    }));

    try {
      const res = await fetch("/api/tv/recommendations/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tvShowId }),
      });

      if (res.ok) {
        const data = await res.json();
        setExplanations((prev) => ({
          ...prev,
          [tvShowId]: {
            headline: data.headline || "Dizi DNA Uyumu",
            explanation: data.explanation || "",
            loading: false,
            open: true,
          },
        }));
      } else {
        setExplanations((prev) => ({
          ...prev,
          [tvShowId]: {
            headline: "Dizi DNA Uyumu",
            explanation: "Açıklama yüklenirken bir sorun oluştu.",
            loading: false,
            open: true,
          },
        }));
      }
    } catch {
      setExplanations((prev) => ({
        ...prev,
        [tvShowId]: {
          headline: "Dizi DNA Uyumu",
          explanation: "Açıklama yüklenirken bir sorun oluştu.",
          loading: false,
          open: true,
        },
      }));
    }
  };

  if (!items || items.length === 0) return null;

  const visibleItems = items.filter((item) => !hiddenShowIds.has(item.tvShow.id));

  return (
    <div className="space-y-4 relative">
      {/* Toast Banner for Undo Hide */}
      {undoToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-surface-elevated/95 border border-accent/40 shadow-2xl backdrop-blur-md flex items-center gap-4 text-xs font-mono animate-fadeIn">
          <span>🚫 <strong>{undoToast.title}</strong> önerilerden gizlendi.</span>
          <button
            onClick={() => handleUndoHide(undoToast.showId)}
            className="px-3 py-1.5 rounded-lg bg-accent text-white font-bold hover:bg-accent-hover transition-colors shadow-sm"
          >
            Geri Al
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleItems.map((item) => {
          const show = item.tvShow;
          const currentFeedback = feedbackStateMap[show.id];
          const isActiveRating = activeRatingShowId === show.id;
          const isMenuOpen = activeMenuShowId === show.id;

          const posterUrl = getTmdbImageUrl(show.posterPath, "w500");
          const firstAirYear = show.firstAirDate ? new Date(show.firstAirDate).getFullYear() : null;
          const rawGenres = (show.metadata as any)?.genres || [];
          const genres: string[] = Array.isArray(rawGenres)
            ? rawGenres.map((g: any) => (typeof g === "string" ? g : g.name || "")).filter(Boolean)
            : [];
          const numberOfSeasons = (show.metadata as any)?.numberOfSeasons;

          return (
            <div
              key={show.id}
              className="p-4 rounded-2xl bg-surface border border-border/80 shadow-md flex flex-col justify-between space-y-3 group hover:border-accent/40 transition-all duration-300 relative"
            >
              {/* Poster Container */}
              <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated relative shadow-sm">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={show.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-xs">
                    Görsel Yok
                  </div>
                )}

                {/* Match Score Badge */}
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-md border border-accent/40 text-accent text-xs font-mono font-bold">
                  %{item.matchScore} UYUM
                </div>

                {/* Status / Format Tag */}
                {numberOfSeasons && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[10px] font-mono text-text-secondary border border-border/60">
                    {numberOfSeasons === 1 ? "Mini Dizi" : `${numberOfSeasons} Sezon`}
                  </div>
                )}
              </div>

              {/* Show Metadata */}
              <div className="space-y-1 flex-1">
                <h3 className="font-display text-base font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                  {show.name}
                </h3>
                <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                  <span>{firstAirYear || "Tarihsiz"} • {genres.slice(0, 2).join(", ")}</span>
                  {show.voteAverage > 0 && (
                    <span className="text-text-secondary font-bold">⭐ {show.voteAverage.toFixed(1)}</span>
                  )}
                </div>
              </div>

              {/* AI Signals & Evidence */}
              {item.isHybrid && item.aiSignals && item.aiSignals.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {item.aiSignals.map((sig, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[10px] font-mono text-accent"
                    >
                      ✦ {sig}
                    </span>
                  ))}
                </div>
              )}

              {/* Deterministic Explanation / Evidence */}
              <div className="p-2.5 rounded-xl bg-surface-elevated/80 border border-border/60 text-xs text-text-secondary leading-relaxed">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-start gap-1.5">
                    <span className="text-accent text-xs">💡</span>
                    <p className="line-clamp-2">{item.deterministicExplanation}</p>
                  </div>
                </div>

                {/* On-Demand Explanation Trigger */}
                <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleExplanation(show.id)}
                    className="text-[11px] font-mono text-accent hover:underline flex items-center gap-1 transition-colors"
                  >
                    <span>✨</span>
                    <span>{explanations[show.id]?.open ? "Açıklamayı Kapat" : "Neden sana uygun?"}</span>
                  </button>
                  {explanations[show.id]?.loading && (
                    <span className="text-[10px] text-text-muted font-mono animate-pulse">Analiz ediliyor...</span>
                  )}
                </div>

                {/* On-Demand AI Explanation Expansion */}
                {explanations[show.id]?.open && !explanations[show.id]?.loading && (
                  <div className="mt-2.5 p-3 rounded-lg bg-surface/90 border border-accent/25 space-y-1.5 animate-fadeIn">
                    <div className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
                      <span className="text-accent">🎯</span>
                      <span>{explanations[show.id]?.headline}</span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      {explanations[show.id]?.explanation}
                    </p>
                  </div>
                )}
              </div>

              {/* Interactive Actions / Quick Feedback */}
              {isActiveRating ? (
                <div className="pt-2 space-y-1.5 animate-fadeIn border-t border-border/60">
                  <div className="flex justify-between items-center text-[10px] font-mono text-text-muted">
                    <span>NASIL BULDUNUZ?</span>
                    <button
                      type="button"
                      onClick={() => setActiveRatingShowId(null)}
                      className="text-text-muted hover:text-text-primary"
                    >
                      İptal
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      onClick={() => {
                        setActiveRatingShowId(null);
                        handleFeedback(show.id, "WATCHED", "LOVE", show.name);
                      }}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-accent/20 text-xs font-mono border border-border text-center"
                      title="Çok Sevdim"
                    >
                      ❤️
                    </button>
                    <button
                      onClick={() => {
                        setActiveRatingShowId(null);
                        handleFeedback(show.id, "WATCHED", "LIKE", show.name);
                      }}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-accent/20 text-xs font-mono border border-border text-center"
                      title="Beğendim"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => {
                        setActiveRatingShowId(null);
                        handleFeedback(show.id, "WATCHED", "NEUTRAL", show.name);
                      }}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-accent/20 text-xs font-mono border border-border text-center"
                      title="Nötr"
                    >
                      😐
                    </button>
                    <button
                      onClick={() => {
                        setActiveRatingShowId(null);
                        handleFeedback(show.id, "WATCHED", "DISLIKE", show.name);
                      }}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-accent/20 text-xs font-mono border border-border text-center"
                      title="Beğenmedim"
                    >
                      👎
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
                      onClick={() => handleFeedback(show.id, "LIKE", undefined, show.name)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
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
                      onClick={() => handleFeedback(show.id, "DISLIKE", undefined, show.name)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
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
                      onClick={() => handleFeedback(show.id, "WATCHLIST", undefined, show.name)}
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
                        onClick={() => setActiveMenuShowId(isMenuOpen ? null : show.id)}
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
                              setActiveMenuShowId(null);
                              setActiveRatingShowId(show.id);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg text-left text-[11px] font-mono hover:bg-surface hover:text-accent transition-colors flex items-center gap-2"
                          >
                            <span>👁️</span>
                            <span>İzledim</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(show.id, "HIDE", undefined, show.name)}
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
