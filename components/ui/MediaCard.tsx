"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

export interface MediaCardProps {
  id: string;
  mediaType: "FILM" | "TV";
  title: string;
  originalTitle?: string;
  posterPath: string | null;
  releaseYear?: number | string | null;
  genres?: string[];
  matchScore?: number;
  matchLabel?: string;
  reasonHeadline?: string;
  voteAverage?: number;
  isFavorite?: boolean;
  isWatchlist?: boolean;
  userStatus?: string | null;
  onClick?: () => void;
  onFeedbackAction?: (action: "LIKE" | "DISLIKE" | "WATCHLIST" | "WATCHED" | "HIDE") => void;
  className?: string;
}

export function MediaCard({
  id,
  mediaType,
  title,
  posterPath,
  releaseYear,
  genres = [],
  matchScore,
  matchLabel,
  reasonHeadline,
  isFavorite = false,
  isWatchlist = false,
  userStatus,
  onClick,
  onFeedbackAction,
  className = "",
}: MediaCardProps) {
  const [imgError, setImgError] = useState(false);
  const posterUrl = getTmdbImageUrl(posterPath, "w500");

  const handleAction = (e: React.MouseEvent, action: "LIKE" | "DISLIKE" | "WATCHLIST" | "WATCHED" | "HIDE") => {
    e.stopPropagation();
    if (onFeedbackAction) {
      onFeedbackAction(action);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col rounded-2xl bg-surface-1 border border-border/70 overflow-hidden shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-1 transition-all duration-200 cursor-pointer select-none ${className}`}
    >
      {/* 2:3 Aspect Ratio Poster Container */}
      <div className="relative aspect-[2/3] w-full bg-surface-2 overflow-hidden">
        {posterUrl && !imgError ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-text-muted bg-surface-2">
            <span className="text-2xl mb-1">{mediaType === "TV" ? "📺" : "🎬"}</span>
            <span className="text-xs font-sans font-medium line-clamp-2">{title}</span>
          </div>
        )}

        {/* Dynamic Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-transparent to-black/30 pointer-events-none opacity-60 group-hover:opacity-80 transition-opacity" />

        {/* Top-Right: Score Badge */}
        {typeof matchScore === "number" && matchScore > 0 && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <ScoreBadge score={matchScore} label={matchLabel} size="sm" />
          </div>
        )}

        {/* Top-Left: Media Type / Status Pill */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap gap-1">
          {isFavorite && (
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 text-[10px] font-bold">
              ★ Favorilerimde
            </span>
          )}
          {isWatchlist && (
            <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-300 text-[10px] font-bold">
              ✓ İzleme Listemde
            </span>
          )}
          {userStatus === "WATCHED" && (
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
              ✓ İzledim
            </span>
          )}
        </div>

        {/* Desktop Quick Action Strip (Revealed on Hover) */}
        {onFeedbackAction && (
          <div className="absolute bottom-2 inset-x-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex items-center justify-center gap-1.5 p-1 rounded-xl bg-surface-1/90 backdrop-blur-md border border-border-strong shadow-md">
            <button
              onClick={(e) => handleAction(e, "LIKE")}
              className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors text-xs"
              title="Beğendim"
              aria-label="Beğendim"
            >
              👍
            </button>
            <button
              onClick={(e) => handleAction(e, "WATCHLIST")}
              className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors text-xs"
              title="İzleme Listesine Ekle"
              aria-label="İzleme Listesine Ekle"
            >
              🔖
            </button>
            <button
              onClick={(e) => handleAction(e, "DISLIKE")}
              className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive transition-colors text-xs"
              title="Görmek İstemiyorum"
              aria-label="Görmek İstemiyorum"
            >
              👎
            </button>
          </div>
        )}
      </div>

      {/* Card Info Details */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-1.5 bg-surface-1">
        <div>
          {reasonHeadline && (
            <p className="text-[10px] font-sans font-semibold text-accent line-clamp-1 mb-0.5 tracking-tight">
              ✨ {reasonHeadline}
            </p>
          )}

          <h3 className="font-sans text-sm font-semibold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
            {title}
          </h3>
        </div>

        <div className="flex items-center justify-between text-[11px] text-text-muted font-sans pt-0.5 border-t border-border/50">
          <span>{releaseYear || "—"}</span>
          {genres.length > 0 && (
            <span className="truncate max-w-[110px] text-right text-text-secondary">
              {genres[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
