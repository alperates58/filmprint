"use client";

import React, { useState } from "react";
import Link from "next/link";

export interface MediaPageActionsProps {
  contentId: string;
  tmdbId: number;
  mediaType: "FILM" | "TV";
  title: string;
  initialStatus?: string | null;
  initialRating?: string | null;
  initialFavorite?: boolean;
}

const RATING_LABELS: Record<string, { label: string; emoji: string; desc: string }> = {
  LOVE: { label: "Çok Sevdim", emoji: "❤️", desc: "Favorilerim arasına girdi" },
  LIKE: { label: "Beğendim", emoji: "👍", desc: "Güzeldi, tavsiye ederim" },
  NEUTRAL: { label: "Ortalama", emoji: "😐", desc: "Fena değildi" },
  DISLIKE: { label: "Sevmedim", emoji: "👎", desc: "Zaman kaybıydı" },
};

export function MediaPageActions({
  contentId,
  tmdbId,
  mediaType,
  title,
  initialStatus = null,
  initialRating = null,
  initialFavorite = false,
}: MediaPageActionsProps) {
  const [currentStatus, setCurrentStatus] = useState<string | null>(initialStatus);
  const [currentRating, setCurrentRating] = useState<string | null>(initialRating);
  const [isFavorite, setIsFavorite] = useState<boolean>(initialFavorite);
  const [activeRatingMode, setActiveRatingMode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isWatchlistActive = currentStatus === "WATCHLIST" || currentStatus === "WATCH_LATER";
  const isWatched = currentStatus === "WATCHED";
  const isNotWatched = currentStatus === "NOT_WATCHED" || currentStatus === "DROPPED";

  // Mark as Watched with optional rating
  const handleSetWatched = async (rating: string | null = null) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setCurrentStatus("WATCHED");
    setCurrentRating(rating);
    setActiveRatingMode(false);

    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType,
          contentId,
          action: "MARK_WATCHED",
          rating: rating || undefined,
        }),
      });
    } catch (e) {
      console.error("[Library Set Watched Error]:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark as Not Watched / Pass
  const handleSetNotWatched = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const nextStatus = isNotWatched ? null : "NOT_WATCHED";
    setCurrentStatus(nextStatus);
    setCurrentRating(null);
    setActiveRatingMode(false);

    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType,
          contentId,
          action: nextStatus ? "MARK_NOT_WATCHED" : "REMOVE",
        }),
      });
    } catch (e) {
      console.error("[Library Set Not Watched Error]:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Watchlist
  const handleToggleWatchlist = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const nextStatus = isWatchlistActive ? null : "WATCHLIST";
    setCurrentStatus(nextStatus);

    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType,
          contentId,
          action: isWatchlistActive ? "REMOVE_WATCHLIST" : "ADD_WATCHLIST",
        }),
      });
    } catch (e) {
      console.error("[Library Watchlist Toggle Error]:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const nextFav = !isFavorite;
    setIsFavorite(nextFav);

    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType,
          contentId,
          action: nextFav ? "ADD_FAVORITE" : "REMOVE_FAVORITE",
        }),
      });
    } catch (e) {
      console.error("[Library Favorite Toggle Error]:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-2 space-y-4 w-full">
      {/* Primary Interactive Action Bar */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Watched Action Button */}
        {isWatched ? (
          <button
            type="button"
            onClick={() => setActiveRatingMode((prev) => !prev)}
            disabled={isSubmitting}
            className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-semibold text-xs sm:text-sm flex items-center gap-2 hover:bg-emerald-500/25 active:scale-95 transition-all shadow-sm"
            title="Değerlendirmenizi Değiştirin"
          >
            <span className="text-base">{currentRating ? RATING_LABELS[currentRating]?.emoji || "✓" : "✓"}</span>
            <span>{currentRating ? RATING_LABELS[currentRating]?.label || "İzledim" : "İzledim"}</span>
            <span className="text-[11px] opacity-75 ml-0.5">▼</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveRatingMode(true)}
            disabled={isSubmitting}
            className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-surface-2 border border-border hover:border-emerald-500/40 text-text-primary font-semibold text-xs sm:text-sm flex items-center gap-2 hover:bg-surface-3 active:scale-95 transition-all shadow-sm"
          >
            <span className="text-base">👁️</span>
            <span>İzledim</span>
          </button>
        )}

        {/* Not Watched / Pass Button */}
        <button
          type="button"
          onClick={handleSetNotWatched}
          disabled={isSubmitting}
          className={`min-h-[46px] px-3.5 py-2.5 rounded-2xl border font-semibold text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 transition-all shadow-sm ${
            isNotWatched
              ? "bg-zinc-800 border-zinc-600 text-zinc-300 shadow-inner"
              : "bg-surface-2 border-border text-text-muted hover:text-text-primary hover:bg-surface-3"
          }`}
          title={isNotWatched ? "İzlemedim Durumunu Kaldır" : "İzlemedim Olarak İşaretle"}
        >
          <span>🚫</span>
          <span>{isNotWatched ? "İzlemedim" : "İzlemedim"}</span>
        </button>

        {/* Watchlist Action Button */}
        <button
          type="button"
          onClick={handleToggleWatchlist}
          disabled={isSubmitting}
          className={`min-h-[46px] px-4 py-2.5 rounded-2xl border font-semibold text-xs sm:text-sm flex items-center gap-2 active:scale-95 transition-all shadow-sm ${
            isWatchlistActive
              ? "bg-purple-950/60 border-purple-500/40 text-purple-300 shadow-inner"
              : "bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:bg-surface-3 hover:border-purple-500/30"
          }`}
        >
          <span>🔖</span>
          <span>{isWatchlistActive ? "✓ İzleme Listemde" : "İzleme Listeme Ekle"}</span>
        </button>

        {/* Favorite Action Button */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          disabled={isSubmitting}
          className={`min-h-[46px] px-3.5 py-2.5 rounded-2xl border font-semibold text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 transition-all shadow-sm ${
            isFavorite
              ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
              : "bg-surface-2 border-border text-text-muted hover:text-rose-400 hover:border-rose-500/30"
          }`}
          title={isFavorite ? "Favorilerimden Çıkar" : "Favorilere Ekle"}
        >
          <span>{isFavorite ? "★" : "⭐"}</span>
          <span>{isFavorite ? "Favorilerimde" : "Favori"}</span>
        </button>

        {/* Movie Night (Shared Watch) Link */}
        <Link
          href={`/night`}
          className="min-h-[46px] px-3.5 py-2.5 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border text-text-secondary hover:text-text-primary font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm"
        >
          <span>🍿</span>
          <span>Ortak İzle</span>
        </Link>
      </div>

      {/* Interactive Rating Drawer */}
      {activeRatingMode && (
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-2/95 border border-border/90 shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-accent text-sm">⭐</span>
              <p className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                {title} — Değerlendirmeniz
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveRatingMode(false)}
              className="text-xs text-text-muted hover:text-text-primary px-2 py-1 rounded-lg hover:bg-surface-3 transition-colors"
            >
              Kapat ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {Object.entries(RATING_LABELS).map(([ratingKey, ratingVal]) => {
              const isSelected = currentRating === ratingKey;
              return (
                <button
                  key={ratingKey}
                  type="button"
                  onClick={() => handleSetWatched(ratingKey)}
                  disabled={isSubmitting}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1 active:scale-95 transition-all ${
                    isSelected
                      ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                      : "bg-surface-1/90 border-border hover:border-accent/40 text-text-primary hover:bg-surface-1"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">{ratingVal.emoji}</span>
                    {isSelected && <span className="text-xs font-bold font-mono">✓ SEÇİLDİ</span>}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">{ratingVal.label}</p>
                    <p className={`text-[10px] mt-0.5 ${isSelected ? "text-white/80" : "text-text-muted"}`}>
                      {ratingVal.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {isWatched && (
            <div className="pt-2 border-t border-border/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  handleSetNotWatched();
                  setActiveRatingMode(false);
                }}
                className="text-xs text-rose-400/90 hover:text-rose-300 hover:underline transition-colors"
              >
                İzleme kaydını ve değerlendirmeyi kaldır
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
