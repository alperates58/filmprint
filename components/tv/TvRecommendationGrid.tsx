"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { TvDetailsModal } from "./TvDetailsModal";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { MediaCard } from "@/components/ui/MediaCard";
import type { PersonalizedTvRecommendationItem } from "@/lib/tv/recommendation/types";

interface TvRecommendationGridProps {
  items: PersonalizedTvRecommendationItem[];
  onFeedbackAction?: (tvShowId: string, action: string, rating?: string) => void;
  hybridPending?: boolean;
}

export function TvRecommendationGrid({ items, onFeedbackAction, hybridPending }: TvRecommendationGridProps) {
  const router = useRouter();
  const refreshedRef = useRef(false);
  const [filterThreshold, setFilterThreshold] = useState<number>(0);
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [feedbackStateMap, setFeedbackStateMap] = useState<Record<string, string>>({});
  const [hiddenShowIds, setHiddenShowIds] = useState<Set<string>>(new Set());
  const [undoToast, setUndoToast] = useState<{ showId: string; title: string } | null>(null);
  const [selectedTvModal, setSelectedTvModal] = useState<{ tvShowId: string; initialData?: any } | null>(null);

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

  if (!items || items.length === 0) return null;

  // Extract all unique genres
  const allGenres = Array.from(
    new Set(
      items.flatMap((item) => {
        const meta = (item.tvShow.metadata as Record<string, unknown>) || {};
        return (meta.genres as string[]) || [];
      })
    )
  ).slice(0, 8);

  const handleFeedback = async (
    tvShowId: string,
    action: "LIKE" | "DISLIKE" | "HIDE" | "WATCHLIST" | "WATCHED" | "CLEAR",
    rating?: string,
    showTitle?: string
  ) => {
    const previousAction = feedbackStateMap[tvShowId];
    const isClearing = previousAction === action && action !== "WATCHED" && action !== "HIDE";
    const effectiveAction = isClearing ? "CLEAR" : action;

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

  const handleUndoHide = async (showId: string) => {
    setHiddenShowIds((prev) => {
      const next = new Set(prev);
      next.delete(showId);
      return next;
    });
    setUndoToast(null);

    try {
      await fetch("/api/recommendation-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "TV",
          tvShowId: showId,
          action: "CLEAR",
          source: "TV_RECOMMENDATIONS_UNDO",
        }),
      });
    } catch (e) {
      console.error("Undo hide error:", e);
    }
  };

  // Filter items
  const visibleItems = items.filter((item) => {
    if (hiddenShowIds.has(item.tvShow.id)) return false;
    if (filterThreshold > 0 && item.matchScore < filterThreshold) return false;
    if (selectedGenre !== "ALL") {
      const meta = (item.tvShow.metadata as Record<string, unknown>) || {};
      const genres = (meta.genres as string[]) || [];
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
            onClick={() => handleUndoHide(undoToast.showId)}
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
            Seçili filtrelere uygun dizi önerisi bulunamadı.
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
            const { tvShow, matchScore, matchLabel } = item;
            const releaseYear = tvShow.firstAirDate ? tvShow.firstAirDate.slice(0, 4) : "";
            const genres = tvShow.metadata?.genres || [];

            return (
              <MediaCard
                key={tvShow.id}
                id={tvShow.id}
                mediaType="TV"
                title={tvShow.name}
                originalTitle={tvShow.originalName || undefined}
                posterPath={tvShow.posterPath}
                releaseYear={releaseYear}
                genres={genres}
                matchScore={matchScore}
                matchLabel={matchLabel}
                reasonHeadline={item.deterministicExplanation || item.matchLabel}
                isWatchlist={feedbackStateMap[tvShow.id] === "WATCHLIST"}
                onClick={() =>
                  setSelectedTvModal({
                    tvShowId: tvShow.id,
                    initialData: {
                      title: tvShow.name,
                      posterPath: tvShow.posterPath,
                      backdropPath: tvShow.backdropPath,
                      firstAirDate: tvShow.firstAirDate || undefined,
                      genres,
                      matchScore,
                      headline: item.matchLabel,
                    },
                  })
                }
                onFeedbackAction={(action) => handleFeedback(tvShow.id, action, undefined, tvShow.name)}
              />
            );
          })}
        </div>
      )}

      {/* TV Details Modal */}
      {selectedTvModal && (
        <TvDetailsModal
          tvShowId={selectedTvModal.tvShowId}
          initialData={selectedTvModal.initialData}
          onClose={() => setSelectedTvModal(null)}
        />
      )}
    </div>
  );
}
