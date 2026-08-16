"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { PersonalizedRecommendationItem } from "@/lib/recommendation/types";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { MediaCard } from "@/components/ui/MediaCard";

interface RecommendationGridProps {
  items: PersonalizedRecommendationItem[];
  onFeedbackAction?: (movieId: string, action: string, rating?: string) => void;
  onOpenDetails?: (movie: any, matchScore?: number, headline?: string, reasons?: string[]) => void;
}

export function RecommendationGrid({ items, onFeedbackAction, onOpenDetails }: RecommendationGridProps) {
  const [filterThreshold, setFilterThreshold] = useState<number>(0);
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
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

  // Extract all unique genres for compact filter
  const allGenres = Array.from(
    new Set(
      items.flatMap((item) => item.movie.genres || [])
    )
  ).slice(0, 8);

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
          source: "RECOMMENDATIONS_UNDO",
        }),
      });
    } catch (e) {
      console.error("Undo hide error:", e);
    }
  };

  const handleFetchAiExplanation = async (movieId: string, fallbackHeadline?: string, fallbackReasons?: string[]) => {
    if (loadingExplanationMovieId === movieId) return;

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
              headline: data.headline || fallbackHeadline || "Film DNA Uyumu",
              reasons: data.reasons,
              isAiGenerated: data.isAiGenerated ?? true,
            },
          }));
        }
      }
    } catch (e) {
      console.error("On-demand explanation fetch failed:", e);
    } finally {
      setLoadingExplanationMovieId(null);
    }
  };

  // Filter items
  const visibleItems = items.filter((item) => {
    if (hiddenMovieIds.has(item.movie.id)) return false;
    if (filterThreshold > 0 && item.match < filterThreshold) return false;
    if (selectedGenre !== "ALL") {
      const genres = item.movie.genres || [];
      if (!genres.includes(selectedGenre)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Compact Filter Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-surface-1 border border-border/80">
        {/* Match Threshold Segmented Control */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-border text-xs font-sans font-medium overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterThreshold(0)}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              filterThreshold === 0
                ? "bg-accent text-white font-semibold shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Tüm Öneriler ({items.length})
          </button>
          <button
            onClick={() => setFilterThreshold(85)}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              filterThreshold === 85
                ? "bg-accent text-white font-semibold shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            %85+ Yüksek Uyum
          </button>
          <button
            onClick={() => setFilterThreshold(90)}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              filterThreshold === 90
                ? "bg-emerald-500 text-white font-semibold shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            %90+ Zirve Eşleşmeler
          </button>
        </div>

        {/* Genre Filter Pill List */}
        {allGenres.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-sans">
            <button
              onClick={() => setSelectedGenre("ALL")}
              className={`px-3 py-1 rounded-full border transition-all whitespace-nowrap ${
                selectedGenre === "ALL"
                  ? "bg-accent-subtle border-accent/40 text-accent font-semibold"
                  : "bg-surface-2 border-border text-text-muted hover:text-text-primary"
              }`}
            >
              Tüm Türler
            </button>
            {allGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3 py-1 rounded-full border transition-all whitespace-nowrap ${
                  selectedGenre === genre
                    ? "bg-accent-subtle border-accent/40 text-accent font-semibold"
                    : "bg-surface-2 border-border text-text-muted hover:text-text-primary"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Undo Toast Banner */}
      {undoToast && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 p-4 rounded-2xl bg-surface-2 border border-border-strong text-text-primary shadow-xl flex items-center gap-3 animate-fadeIn">
          <span className="text-xs font-sans">
            <strong>{undoToast.title}</strong> önerilerden gizlendi.
          </span>
          <button
            onClick={() => handleUndoHide(undoToast.movieId)}
            className="px-3 py-1 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
          >
            Geri Al
          </button>
        </div>
      )}

      {/* Media Cards Grid */}
      {visibleItems.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-surface-1 border border-border space-y-3">
          <p className="text-sm font-sans text-text-secondary">
            Seçili filtrelere uygun öneri bulunamadı.
          </p>
          <button
            onClick={() => {
              setFilterThreshold(0);
              setSelectedGenre("ALL");
            }}
            className="px-4 py-2 rounded-xl bg-surface-2 border border-border text-accent text-xs font-semibold hover:bg-surface-3 transition-colors"
          >
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {visibleItems.map((item) => {
            const { movie, match, matchLabel } = item;
            const genres = movie.genres || [];

            return (
              <MediaCard
                key={movie.id}
                id={movie.id}
                mediaType="FILM"
                title={movie.title}
                originalTitle={movie.originalTitle}
                posterPath={movie.posterPath}
                releaseYear={movie.releaseYear}
                genres={genres}
                matchScore={match}
                matchLabel={matchLabel}
                reasonHeadline={item.headline}
                isWatchlist={feedbackStateMap[movie.id] === "WATCHLIST"}
                onClick={() => {
                  if (onOpenDetails) {
                    onOpenDetails(movie, match, item.headline, item.reasons);
                  }
                }}
                onFeedbackAction={(action) => handleFeedback(movie.id, action, undefined, movie.title)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
