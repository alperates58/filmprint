"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import { useModalHistory } from "@/lib/hooks/useModalHistory";
import { generateMovieSlug } from "@/lib/growth/seo/slug";

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
    userStatus?: string | null;
    userRating?: string | null;
    state?: string | null;
    isFavorite?: boolean;
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
  isFavorite?: boolean;
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

function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining} dk`;
  return `${hours} sa ${remaining > 0 ? `${remaining} dk` : ""}`.trim();
}

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
  const [isOverviewExpanded, setIsOverviewExpanded] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [currentStatus, setCurrentStatus] = useState<string | null>(
    initialData?.userStatus || initialData?.state || null
  );
  const [currentRating, setCurrentRating] = useState<string | null>(
    initialData?.userRating || null
  );
  const [isFavorite, setIsFavorite] = useState<boolean>(
    Boolean(initialData?.isFavorite)
  );

  const modalContainerRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Hook integrations
  useScrollLock(Boolean(movieId));
  useModalHistory({ isOpen: Boolean(movieId), onClose, modalRef: modalContainerRef });

  // Touch swipe-to-dismiss (isolated strictly to drag handle)
  const touchStartY = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleDragTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleDragTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    if (deltaY > 0) {
      setDragOffset(deltaY);
    } else {
      setDragOffset(0);
    }
  };

  const handleDragTouchEnd = () => {
    setIsDragging(false);
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
    setIsOverviewExpanded(false);

    try {
      const res = await fetch(`/api/movies/${movieId}`);
      if (!res.ok) throw new Error("Film detayları yüklenemedi.");
      const data: FullMovieDetails = await res.json();
      setDetails(data);
      setCurrentStatus(data.userStatus);
      setCurrentRating(data.userRating);
      setIsFavorite(Boolean(data.isFavorite));
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
    if (!movieId || isSubmitting) return;
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleWatchlist = async () => {
    if (!movieId || isSubmitting) return;
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!movieId || isSubmitting) return;
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!movieId) return null;

  const displayTitle = details?.title || initialData?.title || "Film Detayı";
  const displayBackdrop = details?.backdropUrl || (initialData?.backdropPath ? getTmdbImageUrl(initialData.backdropPath, "w1280") : null);
  const displayYear = details?.releaseYear || initialData?.releaseYear;
  const displayGenres = details?.genres || initialData?.genres || [];
  const displayScore = details?.personalMatch?.displayScore ?? initialData?.matchScore;
  const displayHeadline = details?.personalMatch?.headline || initialData?.headline;
  const displayReasons = details?.personalMatch?.reasons || initialData?.reasons || [];
  const trailerKey = details?.trailer?.key || details?.trailer?.youtubeKey || null;
  const formattedRuntime = formatRuntime(details?.runtime);

  const isWatchlistActive = currentStatus === "WATCHLIST" || currentStatus === "WATCH_LATER";
  const overviewText = details?.overview || "";
  const isLongOverview = overviewText.length > 220;

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
        className="w-full md:max-w-3xl lg:max-w-4xl bg-surface-1 border-t md:border border-border/80 rounded-t-[28px] md:rounded-3xl shadow-2xl overflow-hidden text-text-primary h-auto max-h-[94dvh] md:max-h-[min(90dvh,820px)] flex flex-col relative pb-[env(safe-area-inset-bottom)]"
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? "none" : "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Bar (Min 48px touch target area) */}
        <div
          className="w-full h-12 pt-3 pb-2 md:hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none flex-shrink-0"
          onTouchStart={handleDragTouchStart}
          onTouchMove={handleDragTouchMove}
          onTouchEnd={handleDragTouchEnd}
          aria-hidden="true"
        >
          <div className="w-12 h-1.5 rounded-full bg-white/25 hover:bg-white/40 transition-colors" />
        </div>

        {/* Top Header Actions (Film Page Link & Close) */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-2">
          {(details?.tmdbId || (movieId && !isNaN(Number(movieId)))) && (
            <Link
              href={`/film/${generateMovieSlug(displayTitle, details?.tmdbId || Number(movieId))}`}
              onClick={onClose}
              className="px-3.5 py-2 rounded-full bg-surface-1/90 hover:bg-surface-2 border border-border/80 text-xs text-text-secondary hover:text-text-primary font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all active:scale-95"
              title="Filmin Özel Sayfasına Git"
            >
              <span>🔗 Film Sayfası</span>
              <span className="text-[10px]">↗</span>
            </Link>
          )}

          <button
            onClick={onClose}
            aria-label="Kapat"
            className="w-10 h-10 rounded-full bg-surface-1/90 hover:bg-surface-2 border border-border/80 flex items-center justify-center text-text-muted hover:text-text-primary text-sm transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-accent"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Container (Isolated single scroll element) */}
        <div
          ref={contentScrollRef}
          className="overflow-y-auto flex-1 overscroll-contain touch-pan-y scrollbar-none"
        >
          {/* Backdrop Header Media */}
          <div className="relative h-48 sm:h-56 md:h-64 max-h-[260px] w-full bg-surface-2 overflow-hidden flex-shrink-0">
            {isPlayingTrailer && trailerKey ? (
              <div className="relative w-full h-full bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
                  title={displayTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
                <button
                  onClick={() => setIsPlayingTrailer(false)}
                  className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 border border-white/20 text-xs font-medium text-white backdrop-blur-md transition-colors"
                >
                  ✕ Fragmanı Kapat
                </button>
              </div>
            ) : (
              <>
                {displayBackdrop ? (
                  <Image
                    src={displayBackdrop}
                    alt={displayTitle}
                    fill
                    className="object-cover object-center filter brightness-90"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-text-muted bg-surface-2">
                    <span className="text-4xl mb-1">🎬</span>
                    <span className="text-xs font-sans">Görsel bulunamadı</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-surface-1/40 to-transparent pointer-events-none" />

                {trailerKey ? (
                  <button
                    onClick={() => setIsPlayingTrailer(true)}
                    aria-label="Fragmanı Oynat"
                    className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-accent/90 hover:bg-accent text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all z-10"
                  >
                    <span className="text-xl ml-0.5">▶</span>
                  </button>
                ) : (
                  <div className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-surface-1/80 backdrop-blur-md border border-border/60 text-[11px] text-text-muted flex items-center gap-1.5 shadow-sm">
                    <span>🎬</span>
                    <span>Fragman bulunamadı</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 md:p-8 space-y-6">
            {/* Title & Metadata Strip */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
                  {displayYear && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-surface-2 border border-border font-semibold text-text-secondary">
                      {displayYear}
                    </span>
                  )}
                  {formattedRuntime && (
                    <span className="text-text-muted font-medium">
                      {formattedRuntime}
                    </span>
                  )}
                  {details?.voteAverage ? (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 font-bold flex items-center gap-1 text-xs">
                      <span>★</span>
                      <span>{details.voteAverage.toFixed(1)}</span>
                    </span>
                  ) : null}
                </div>

                <h2
                  id="movie-details-title"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary break-words"
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
                        className="px-2.5 py-0.5 rounded-lg bg-surface-2/80 border border-border/60 text-text-secondary text-xs font-sans"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Match Score Badge */}
              {displayScore !== undefined && displayScore > 0 && (
                <div className="self-start sm:self-auto flex-shrink-0">
                  <ScoreBadge score={displayScore} size="lg" showLabel />
                </div>
              )}
            </div>

            {/* Personal Match / "Neden Sana Uygun?" Section */}
            {(displayHeadline || (displayReasons && displayReasons.length > 0)) && (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-base">✨</span>
                  <h4 className="font-sans font-bold text-xs sm:text-sm text-emerald-400">
                    {displayHeadline || "Neden Sana Uygun?"}
                  </h4>
                </div>
                {displayReasons.length > 0 && (
                  <ul className="space-y-1.5 text-xs text-text-secondary font-sans leading-relaxed">
                    {displayReasons.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Quick Primary Action Buttons (48dp Touch Target) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 font-sans text-xs">
              {/* Watched / Rating Button */}
              {currentStatus === "WATCHED" ? (
                <button
                  onClick={() => setActiveRatingMode((prev) => !prev)}
                  disabled={isSubmitting}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-2 hover:bg-emerald-500/20 active:scale-95 transition-all"
                >
                  <span>{currentRating ? RATING_LABELS[currentRating]?.emoji || "✓" : "✓"}</span>
                  <span>{currentRating ? RATING_LABELS[currentRating]?.label || "İzledim" : "İzledim"}</span>
                </button>
              ) : (
                <button
                  onClick={() => setActiveRatingMode(true)}
                  disabled={isSubmitting}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-surface-2 border border-border hover:border-emerald-500/40 text-text-primary font-semibold flex items-center gap-2 hover:bg-surface-3 active:scale-95 transition-all"
                >
                  <span>👁️</span>
                  <span>Artık İzledim</span>
                </button>
              )}

              {/* Watchlist Button */}
              <button
                onClick={handleToggleWatchlist}
                disabled={isSubmitting}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl border font-semibold flex items-center gap-2 active:scale-95 transition-all ${
                  isWatchlistActive
                    ? "bg-accent-subtle border-accent/40 text-accent"
                    : "bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:border-border-strong"
                }`}
              >
                <span>🔖</span>
                <span>{isWatchlistActive ? "✓ İzleme Listemde" : "İzleme Listesine Ekle"}</span>
              </button>

              {/* Favorite Button */}
              <button
                onClick={handleToggleFavorite}
                disabled={isSubmitting}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl border font-semibold flex items-center gap-2 active:scale-95 transition-all ${
                  isFavorite
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                    : "bg-surface-2 border-border text-text-muted hover:text-rose-400 hover:border-rose-500/30"
                }`}
              >
                <span>{isFavorite ? "★" : "⭐"}</span>
                <span>{isFavorite ? "★ Favorilerimde" : "Favorilere Ekle"}</span>
              </button>

              {/* Dedicated Full Page Button */}
              {(details?.tmdbId || (movieId && !isNaN(Number(movieId)))) && (
                <Link
                  href={`/film/${generateMovieSlug(displayTitle, details?.tmdbId || Number(movieId))}`}
                  onClick={onClose}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl border border-purple-500/30 hover:border-purple-500/60 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-white font-semibold flex items-center gap-2 active:scale-95 transition-all"
                  title="Filmin Özel Sayfasına Git"
                >
                  <span>📄</span>
                  <span>Tüm Sayfayı Aç</span>
                  <span className="text-[10px]">↗</span>
                </Link>
              )}
            </div>

            {/* Rating Flow Drawer */}
            {activeRatingMode && (
              <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    FİLM DEĞERLENDİRMENİZ
                  </p>
                  <button
                    onClick={() => setActiveRatingMode(false)}
                    className="text-xs text-text-muted hover:text-text-primary"
                  >
                    Kapat ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(RATING_LABELS).map(([ratingKey, ratingVal]) => (
                    <button
                      key={ratingKey}
                      onClick={() => handleSetWatched(ratingKey)}
                      disabled={isSubmitting}
                      className={`min-h-[48px] p-2.5 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
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

            {/* Overview / Synopsis with Expandable Text */}
            {overviewText && (
              <div className="space-y-1.5 font-sans">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  ÖZET
                </h4>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {isLongOverview && !isOverviewExpanded
                    ? `${overviewText.slice(0, 200)}...`
                    : overviewText}
                </p>
                {isLongOverview && (
                  <button
                    onClick={() => setIsOverviewExpanded((prev) => !prev)}
                    className="text-xs font-semibold text-accent hover:underline pt-0.5"
                  >
                    {isOverviewExpanded ? "Daha az göster" : "Devamını göster →"}
                  </button>
                )}
              </div>
            )}

            {/* Extra Information Grid */}
            {details && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/60 font-sans text-xs">
                {details.director && (
                  <div className="p-3 rounded-xl bg-surface-2/50 border border-border/40 space-y-0.5">
                    <span className="text-text-muted block text-[11px] font-medium">YÖNETMEN</span>
                    <span className="font-semibold text-text-primary">{details.director}</span>
                  </div>
                )}
                {details.cast && details.cast.length > 0 && (
                  <div className="p-3 rounded-xl bg-surface-2/50 border border-border/40 space-y-0.5">
                    <span className="text-text-muted block text-[11px] font-medium">BAŞROL OYUNCULARI</span>
                    <span className="font-semibold text-text-primary">
                      {details.cast.slice(0, 4).map((c) => c.name).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Loading Shimmer Placeholder */}
            {isLoading && !details && (
              <div className="space-y-3 animate-pulse pt-2">
                <div className="h-4 bg-surface-2 rounded-lg w-3/4" />
                <div className="h-3 bg-surface-2 rounded-lg w-full" />
                <div className="h-3 bg-surface-2 rounded-lg w-5/6" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
