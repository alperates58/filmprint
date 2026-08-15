"use client";

import React, { useState } from "react";
import Image from "next/image";
import type { PersonalizedTvRecommendationItem } from "@/lib/tv/recommendation/types";

interface TvRecommendationGridProps {
  items: PersonalizedTvRecommendationItem[];
  onFeedbackAction?: (tvShowId: string, action: string, rating?: string) => void;
}

export function TvRecommendationGrid({ items, onFeedbackAction }: TvRecommendationGridProps) {
  const [activeRatingShowId, setActiveRatingShowId] = useState<string | null>(null);
  const [submittedShowIds, setSubmittedShowIds] = useState<Set<string>>(new Set());
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null);

  if (!items || items.length === 0) return null;

  const handleAction = async (tvShowId: string, actionType: "WATCHED" | "WATCH_LATER" | "NOT_INTERESTED") => {
    if (actionType === "WATCHED") {
      setActiveRatingShowId(tvShowId);
    } else {
      setSubmittedShowIds((prev) => new Set([...prev, tvShowId]));
      if (onFeedbackAction) {
        onFeedbackAction(tvShowId, actionType);
      } else {
        // Send interaction/feedback to API
        try {
          if (actionType === "WATCH_LATER") {
            await fetch("/api/tv/interactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tvShowId, status: "WATCH_LATER" }),
            });
          } else if (actionType === "NOT_INTERESTED") {
            await fetch("/api/tv/interactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tvShowId, status: "NOT_INTERESTED" }),
            });
          }
        } catch (err) {
          console.error("Feedback action failed:", err);
        }
      }
    }
  };

  const handleRatingSelect = async (tvShowId: string, rating: string) => {
    setActiveRatingShowId(null);
    setSubmittedShowIds((prev) => new Set([...prev, tvShowId]));

    if (onFeedbackAction) {
      onFeedbackAction(tvShowId, "WATCHED", rating);
    } else {
      try {
        await fetch("/api/tv/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tvShowId, status: "WATCHED", rating }),
        });
      } catch (err) {
        console.error("Watched rating submit failed:", err);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => {
        const show = item.tvShow;
        const isSubmitted = submittedShowIds.has(show.id);
        const isActiveRating = activeRatingShowId === show.id;
        const isExpanded = expandedShowId === show.id;

        if (isSubmitted) {
          return (
            <div
              key={show.id}
              className="p-6 rounded-3xl bg-surface/50 border border-border/40 text-center flex flex-col items-center justify-center min-h-[380px] space-y-3 animate-fadeOut"
            >
              <div className="text-3xl">✓</div>
              <div className="text-sm font-semibold text-text-primary">Geri Bildirim Kaydedildi</div>
              <p className="text-xs text-text-muted">Önerileriniz bu geri bildirime göre güncellenecektir.</p>
            </div>
          );
        }

        const posterUrl = show.posterPath
          ? show.posterPath.startsWith("http")
            ? show.posterPath
            : `https://image.tmdb.org/t/p/w500${show.posterPath}`
          : "/placeholder-poster.png";

        const seasons = show.metadata?.numberOfSeasons;
        const isMini = seasons === 1 && (show.status === "Ended" || show.status === "Canceled");
        const seasonLabel = isMini ? "Mini Dizi" : seasons ? `${seasons} Sezon` : null;

        const rawRun = show.metadata?.episodeRunTime ?? show.metadata?.episode_run_time;
        let runtimeMin: number | null = null;
        if (Array.isArray(rawRun) && rawRun.length > 0 && typeof rawRun[0] === "number") {
          runtimeMin = rawRun[0];
        } else if (typeof rawRun === "number") {
          runtimeMin = rawRun;
        }

        const year = show.firstAirDate?.slice(0, 4);

        return (
          <div
            key={show.id}
            className="group relative flex flex-col rounded-3xl bg-surface border border-border/80 hover:border-accent/40 shadow-cinematic hover:shadow-glow transition-all overflow-hidden"
          >
            {/* Poster & Badges Container */}
            <div className="relative aspect-[16/10] sm:aspect-[2/3] w-full bg-surface-elevated overflow-hidden">
              <Image
                src={posterUrl}
                alt={show.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />

              {/* Match Score Badge */}
              <div className="absolute top-3 right-3 px-3 py-1 rounded-xl bg-background/85 backdrop-blur-md border border-accent/40 text-accent font-mono text-xs font-bold shadow-md flex items-center gap-1">
                <span>⚡</span>
                <span>%{item.matchScore}</span>
              </div>

              {/* Source Badge */}
              <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-lg bg-surface/85 backdrop-blur-md border border-border text-[10px] font-mono text-text-muted uppercase">
                {item.source === "KNOWN_UNWATCHED" ? "Listenden" : "Keşif"}
              </div>

              {/* Title & Metadata on Mobile/Overlay */}
              <div className="absolute bottom-3 left-3 right-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
                  {year && <span>{year}</span>}
                  {seasonLabel && (
                    <>
                      <span>•</span>
                      <span className="text-text-secondary">{seasonLabel}</span>
                    </>
                  )}
                  {runtimeMin && (
                    <>
                      <span>•</span>
                      <span>{runtimeMin} dk</span>
                    </>
                  )}
                </div>
                <h3 className="font-display text-base font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                  {show.name}
                </h3>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              {/* Genres & Rating */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex flex-wrap gap-1">
                  {(show.metadata?.genres || []).slice(0, 2).map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border text-[10px] font-mono text-text-secondary"
                    >
                      {g}
                    </span>
                  ))}
                </div>
                {show.voteAverage > 0 && (
                  <span className="font-mono text-accent text-xs font-semibold">
                    ★ {show.voteAverage.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Deterministic Explanation / Evidence */}
              <div className="p-2.5 rounded-xl bg-surface-elevated/80 border border-border/60 text-xs text-text-secondary leading-relaxed">
                <div className="flex items-start gap-1.5">
                  <span className="text-accent text-xs">💡</span>
                  <p className="line-clamp-2">{item.deterministicExplanation}</p>
                </div>
              </div>

              {/* Interactive Actions / Quick Feedback */}
              {isActiveRating ? (
                <div className="pt-2 space-y-1.5 animate-fadeIn">
                  <div className="text-[10px] font-mono text-text-muted text-center">NASIL BULDUNUZ?</div>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      onClick={() => handleRatingSelect(show.id, "LOVE")}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-accent/20 text-xs font-mono border border-border text-center"
                      title="Çok Sevdim"
                    >
                      ❤️
                    </button>
                    <button
                      onClick={() => handleRatingSelect(show.id, "LIKE")}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-accent/20 text-xs font-mono border border-border text-center"
                      title="Beğendim"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleRatingSelect(show.id, "NEUTRAL")}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-accent/20 text-xs font-mono border border-border text-center"
                      title="Nötr"
                    >
                      😐
                    </button>
                    <button
                      onClick={() => handleRatingSelect(show.id, "DISLIKE")}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-accent/20 text-xs font-mono border border-border text-center"
                      title="Beğenmedim"
                    >
                      👎
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 grid grid-cols-3 gap-1.5 border-t border-border/60">
                  <button
                    onClick={() => handleAction(show.id, "WATCH_LATER")}
                    className="px-2 py-1.5 rounded-xl bg-surface-elevated hover:bg-accent/15 border border-border hover:border-accent/30 text-text-secondary hover:text-accent font-mono text-[10px] font-medium transition-colors text-center"
                  >
                    + Liste
                  </button>
                  <button
                    onClick={() => handleAction(show.id, "WATCHED")}
                    className="px-2 py-1.5 rounded-xl bg-surface-elevated hover:bg-accent/15 border border-border hover:border-accent/30 text-text-secondary hover:text-accent font-mono text-[10px] font-medium transition-colors text-center"
                  >
                    ✓ İzledim
                  </button>
                  <button
                    onClick={() => handleAction(show.id, "NOT_INTERESTED")}
                    className="px-2 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-elevated/60 border border-border text-text-muted hover:text-text-secondary font-mono text-[10px] transition-colors text-center"
                  >
                    ✕ Pas
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
