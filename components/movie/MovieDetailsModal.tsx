"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import { useModalHistory } from "@/lib/hooks/useModalHistory";

export interface MovieDetailsModalProps {
  movieId: string | null;
  onClose: () => void;
  initialData?: {
    title?: string;
    posterPath?: string | null;
    backdropPath?: string | null;
    releaseYear?: number | null;
    genres?: string[];
    matchScore?: number;
    headline?: string;
    reasons?: string[];
  };
  onInteractionUpdate?: (movieId: string, status: string, rating: string | null) => void;
}

interface FullMovieDetails {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  overview: string;
  releaseYear: number | null;
  runtime: number | null;
  genres: string[];
  voteAverage: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  director: string | null;
  cast: { name: string; character: string; profilePath: string | null }[];
  trailer: { provider: "youtube"; key: string; youtubeKey?: string } | null;
  userStatus: "WATCHED" | "NOT_WATCHED" | "UNSURE" | "WATCH_LATER" | "WATCHLIST" | null;
  userRating: "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE" | null;
  personalMatch?: {
    movieId: string;
    rawScore: number;
    displayScore: number;
    label: string;
    evidenceStrength: string;
    available: boolean;
    reasons: string[];
    headline?: string;
  } | null;
}

const RATING_LABELS: Record<string, { label: string; emoji: string }> = {
  LOVE: { label: "Çok Sevdim", emoji: "❤️" },
  LIKE: { label: "Beğendim", emoji: "👍" },
  NEUTRAL: { label: "Ortalama", emoji: "😐" },
  DISLIKE: { label: "Sevmedim", emoji: "👎" },
};

export function MovieDetailsModal({
  movieId,
  onClose,
  initialData,
  onInteractionUpdate,
}: MovieDetailsModalProps) {
  const [details, setDetails] = useState<FullMovieDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState<boolean>(false);
  const [activeRatingMode, setActiveRatingMode] = useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [currentRating, setCurrentRating] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  const modalContainerRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Hook integrations
  useScrollLock(Boolean(movieId));
  useModalHistory({ isOpen: Boolean(movieId), onClose, modalRef: modalContainerRef });

  // Touch swipe-to-dismiss (isolated strictly to drag handle)
  const touchStartY = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);

  const handleDragTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleDragTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  };

  const handleDragTouchEnd = () => {
    if (dragOffset > 80) {
      onClose();
    } else {
      setDragOffset(0);
    }
  };

  // Fetch full details
  const fetchDetails = useCallback(async () => {
    if (!movieId) return;
    setIsLoading(true);
    setError(null);
    setIsPlayingTrailer(false);
    setActiveRatingMode(false);

    try {
      const [res, libRes] = await Promise.all([
        fetch(`/api/movies/${movieId}`),
        fetch(`/api/library?contentId=${movieId}`).catch(() => null),
      ]);
      if (!res.ok) throw new Error("Film detayları yüklenemedi.");
      const data: FullMovieDetails = await res.json();
      setDetails(data);
      setCurrentStatus(data.userStatus);
      setCurrentRating(data.userRating);

      if (libRes && libRes.ok) {
        const libData = await libRes.json();
        if (libData.items && libData.items.length > 0) {
          setIsFavorite(!!libData.items[0].isFavorite);
          if (libData.items[0].state) {
            setCurrentStatus(libData.items[0].state);
          }
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Canonical Library Interactions
  const handleSetWatched = async (rating: string | null = null) => {
    if (!movieId) return;
    setCurrentStatus("WATCHED");
    setCurrentRating(rating);
    setActiveRatingMode(false);

    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "FILM",
          contentId: movieId,
          action: "MARK_WATCHED",
          rating: rating || undefined,
        }),
      });
      if (onInteractionUpdate) {
        onInteractionUpdate(movieId, "WATCHED", rating);
      }
    } catch (e) {
      console.error("Set watched error:", e);
    }
  };

  const handleToggleWatchlist = async () => {
    if (!movieId) return;
    const isCurrentlyInWatchlist = currentStatus === "WATCHLIST" || currentStatus === "WATCH_LATER";
    const nextStatus = isCurrentlyInWatchlist ? null : "WATCHLIST";
    setCurrentStatus(nextStatus);

    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "FILM",
          contentId: movieId,
          action: isCurrentlyInWatchlist ? "REMOVE_WATCHLIST" : "ADD_WATCHLIST",
        }),
      });
      if (onInteractionUpdate) {
        onInteractionUpdate(movieId, nextStatus || "REMOVED", null);
      }
    } catch (e) {
      console.error("Watchlist toggle error:", e);
    }
  };

  const handleToggleFavorite = async () => {
    if (!movieId) return;
    const nextFav = !isFavorite;
    setIsFavorite(nextFav);

    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "FILM",
          contentId: movieId,
          action: nextFav ? "ADD_FAVORITE" : "REMOVE_FAVORITE",
        }),
      });
      if (onInteractionUpdate) {
        onInteractionUpdate(movieId, currentStatus || "UNTOUCHED", currentRating);
      }
    } catch (e) {
      console.error("Favorite toggle error:", e);
    }
  };

  if (!movieId) return null;

  const displayTitle = details?.title || initialData?.title || "Film Detayı";
  const displayPoster = details?.posterUrl || (initialData?.posterPath ? getTmdbImageUrl(initialData.posterPath, "w500") : null);
  const displayBackdrop = details?.backdropUrl || (initialData?.backdropPath ? getTmdbImageUrl(initialData.backdropPath, "w1280") : null);
  const displayYear = details?.releaseYear || initialData?.releaseYear;
  const displayGenres = details?.genres || initialData?.genres || [];
  const displayScore = details?.personalMatch?.displayScore || initialData?.matchScore;
  const displayHeadline = details?.personalMatch?.headline || initialData?.headline;
  const displayReasons = details?.personalMatch?.reasons || initialData?.reasons || [];
  const trailerKey = details?.trailer?.key || details?.trailer?.youtubeKey || null;

  const isWatchlistActive = currentStatus === "WATCHLIST" || currentStatus === "WATCH_LATER";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-details-title"
    >
      {/* Mobile Bottom Sheet & Desktop Dialog Container */}
      <div
        ref={modalContainerRef}
        className="w-full md:max-w-3xl lg:max-w-4xl bg-surface-1 border-t md:border border-border/80 rounded-t-[28px] md:rounded-3xl shadow-2xl overflow-hidden text-text-primary h-auto max-h-[92dvh] md:max-h-[min(92dvh,820px)] flex flex-col transition-transform duration-150 relative pb-[env(safe-area-inset-bottom)]"
        style={{ transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Bar */}
        <div
          className="w-full pt-3 pb-2 md:hidden flex justify-center cursor-grab active:cursor-grabbing touch-none select-none"
          onTouchStart={handleDragTouchStart}
          onTouchMove={handleDragTouchMove}
          onTouchEnd={handleDragTouchEnd}
        >
          <div className="w-12 h-1.5 rounded-full bg-border-strong" />
        </div>

        {/* Close Button Desktop */}
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-surface-1/90 hover:bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary text-xs transition-colors shadow-sm"
        >
          ✕
        </button>

        {/* Scrollable Content Container (Isolated single scroll element) */}
        <div
          ref={contentScrollRef}
          className="overflow-y-auto flex-1 overscroll-contain touch-pan-y scrollbar-none"
        >
          {/* Backdrop Header Media */}
          <div className="relative h-44 sm:h-52 md:h-60 max-h-[260px] w-full bg-surface-2 overflow-hidden flex-shrink-0">
            {isPlayingTrailer && trailerKey ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
                title={displayTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : (
              <>
                {displayBackdrop ? (
                  <Image
                    src={displayBackdrop}
                    alt={displayTitle}
                    fill
                    className="object-cover object-center filter brightness-90"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-surface-1/40 to-transparent" />

                {trailerKey ? (
                  <button
                    onClick={() => setIsPlayingTrailer(true)}
                    aria-label="Fragmanı Oynat"
                    className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-accent/90 hover:bg-accent text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 z-10"
                  >
                    <span className="text-xl ml-0.5">▶</span>
                  </button>
                ) : (
                  <div className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-surface-1/80 backdrop-blur-md border border-border/60 text-[11px] text-text-muted">
                    Fragman bulunamadı
                  </div>
                )}
              </>
            )}
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 md:p-8 space-y-6">
            {/* Title & Metadata Strip */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
                  {displayYear && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-surface-2 border border-border font-semibold text-text-secondary">
                      {displayYear}
                    </span>
                  )}
                  {details?.runtime && (
                    <span className="text-text-muted">
                      {Math.floor(details.runtime / 60)}s {details.runtime % 60}dk
                    </span>
                  )}
                  {details?.voteAverage ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      ★ {details.voteAverage.toFixed(1)}
                    </span>
                  ) : null}
                </div>

                <h2
                  id="movie-details-title"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary"
                >
                  {displayTitle}
                </h2>

                {details?.originalTitle && details.originalTitle !== displayTitle && (
                  <p className="text-xs text-text-muted italic font-sans">{details.originalTitle}</p>
                )}

                {displayGenres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {displayGenres.map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-0.5 rounded-lg bg-surface-2/70 border border-border/60 text-text-muted text-xs font-sans"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Match Score Badge */}
              {displayScore !== undefined && (
                <div className="self-start sm:self-auto flex-shrink-0">
                  <ScoreBadge score={displayScore} />
                </div>
              )}
            </div>

            {/* Quick Action Buttons (User Intent Semantics) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 font-sans text-xs">
              {/* Watched / Rating Button */}
              {currentStatus === "WATCHED" ? (
                <button
                  onClick={() => setActiveRatingMode((prev) => !prev)}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-2 hover:bg-emerald-500/20 transition-all"
                >
                  <span>{currentRating ? RATING_LABELS[currentRating]?.emoji || "✓" : "✓"}</span>
                  <span>{currentRating ? RATING_LABELS[currentRating]?.label || "✓ İzledim" : "✓ İzledim"}</span>
                </button>
              ) : (
                <button
                  onClick={() => setActiveRatingMode(true)}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-surface-2 border border-border hover:border-emerald-500/40 text-text-primary font-semibold flex items-center gap-2 hover:bg-surface-3 transition-all"
                >
                  <span>👁️</span>
                  <span>Artık İzledim</span>
                </button>
              )}

              {/* Watchlist Button */}
              <button
                onClick={handleToggleWatchlist}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl border font-semibold flex items-center gap-2 transition-all ${
                  isWatchlistActive
                    ? "bg-accent-subtle border-accent/40 text-accent"
                    : "bg-surface-2 border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                <span>🔖</span>
                <span>{isWatchlistActive ? "✓ İzleme Listemde" : "İzleme Listesine Ekle"}</span>
              </button>

              {/* Favorite Star */}
              <button
                onClick={handleToggleFavorite}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl border font-semibold flex items-center gap-2 transition-all ${
                  isFavorite
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                    : "bg-surface-2 border-border text-text-muted hover:text-amber-400"
                }`}
              >
                <span>⭐</span>
                <span>{isFavorite ? "★ Favorilerimde" : "Favorilere Ekle"}</span>
              </button>
            </div>

            {/* Rating Selector Drawer */}
            {activeRatingMode && (
              <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-2.5 animate-fadeIn">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  FİLM DEĞERLENDİRMENİZ
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(RATING_LABELS).map(([ratingKey, ratingVal]) => (
                    <button
                      key={ratingKey}
                      onClick={() => handleSetWatched(ratingKey)}
                      className={`min-h-[44px] p-2 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        currentRating === ratingKey
                          ? "bg-accent text-white border-accent shadow-sm"
                          : "bg-surface-1 border-border text-text-primary hover:border-border-strong"
                      }`}
                    >
                      <span>{ratingVal.emoji}</span>
                      <span>{ratingVal.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Recommendation Insights Box */}
            {(displayHeadline || (displayReasons && displayReasons.length > 0)) && (
              <div className="p-4 sm:p-5 rounded-2xl bg-accent-subtle/50 border border-accent/25 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-accent text-base">✨</span>
                  <h4 className="font-sans font-bold text-xs sm:text-sm text-accent">
                    {displayHeadline || "Film DNA Uyumu"}
                  </h4>
                </div>
                {displayReasons.length > 0 && (
                  <ul className="space-y-1 text-xs text-text-secondary font-sans leading-relaxed">
                    {displayReasons.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-accent mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Overview / Synopsis */}
            {details?.overview && (
              <div className="space-y-1.5 font-sans">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  ÖZET
                </h4>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {details.overview}
                </p>
              </div>
            )}

            {/* Director & Cast Strip */}
            {details && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60 font-sans text-xs">
                {details.director && (
                  <div>
                    <span className="text-text-muted block text-[11px]">YÖNETMEN</span>
                    <span className="font-semibold text-text-primary">{details.director}</span>
                  </div>
                )}
                {details.cast && details.cast.length > 0 && (
                  <div>
                    <span className="text-text-muted block text-[11px]">BAŞROL OYUNCULARI</span>
                    <span className="font-semibold text-text-primary">
                      {details.cast.slice(0, 3).map((c) => c.name).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
