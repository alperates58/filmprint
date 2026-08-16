"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { RatingStatus, TvInteractionStatus } from "@prisma/client";

export interface FullTvDetails {
  id: string;
  tmdbId: number;
  name: string;
  originalName: string | null;
  overview: string;
  firstAirDate: string | null;
  lastAirDate: string | null;
  status: string | null;
  originalLanguage: string | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  genres: string[];
  voteAverage: number;
  voteCount: number | null;
  popularity: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  creators: string[];
  cast: Array<{ name: string; character?: string; profilePath?: string | null }>;
  trailer: { youtubeKey: string; name: string } | null;
  userStatus: string | null;
  userRating: RatingStatus | null;
  isFavorite?: boolean;
}

interface TvDetailsModalProps {
  tvShowId: string | null;
  onClose: () => void;
  initialData?: any;
  onInteractionUpdate?: (
    tvShowId: string,
    status: string,
    rating: RatingStatus | null
  ) => void;
}

const RATING_LABELS: Record<string, { label: string; emoji: string }> = {
  LOVE: { label: "Çok Sevdim", emoji: "❤️" },
  LIKE: { label: "Beğendim", emoji: "👍" },
  NEUTRAL: { label: "Ortalama", emoji: "😐" },
  DISLIKE: { label: "Sevmedim", emoji: "👎" },
  PARTIALLY_WATCHED: { label: "Kısmen İzledim", emoji: "🎬" },
};

export function TvDetailsModal({
  tvShowId,
  onClose,
  initialData,
  onInteractionUpdate,
}: TvDetailsModalProps) {
  const [details, setDetails] = useState<FullTvDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState<boolean>(false);
  const [activeRatingMode, setActiveRatingMode] = useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [currentRating, setCurrentRating] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (tvShowId) {
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [tvShowId]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fetch full details
  const fetchDetails = useCallback(async () => {
    if (!tvShowId) return;
    setIsLoading(true);
    setError(null);
    setIsPlayingTrailer(false);
    setActiveRatingMode(false);

    try {
      const [res, libRes] = await Promise.all([
        fetch(`/api/tv/${tvShowId}`),
        fetch(`/api/library?mediaType=TV&contentId=${tvShowId}`).catch(() => null),
      ]);

      if (!res.ok) throw new Error("Dizi detayları yüklenemedi.");
      const data: FullTvDetails = await res.json();
      setDetails(data);
      setCurrentStatus(data.userStatus);
      setCurrentRating(data.userRating);

      if (libRes && libRes.ok) {
        const libData = await libRes.json();
        const found = libData.items?.find((i: any) => i.contentId === tvShowId);
        if (found) {
          setIsFavorite(Boolean(found.isFavorite));
          if (found.state) setCurrentStatus(found.state);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [tvShowId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Handle Mark Watched with Rating
  const handleMarkWatched = async (targetRating: RatingStatus) => {
    if (!tvShowId) return;
    setCurrentStatus("WATCHED");
    setCurrentRating(targetRating);
    setActiveRatingMode(false);

    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "TV",
          tvShowId,
          action: "MARK_WATCHED",
          rating: targetRating,
        }),
      });

      if (onInteractionUpdate) {
        onInteractionUpdate(tvShowId, "WATCHED", targetRating);
      }
    } catch (e) {
      console.error("[TV Mark Watched Error]:", e);
    }
  };

  // Handle Toggle Watchlist
  const handleToggleWatchlist = async () => {
    if (!tvShowId) return;
    const isCurrentlyWatchlist = currentStatus === "WATCH_LATER" || currentStatus === "WATCHLIST";
    const nextAction = isCurrentlyWatchlist ? "CLEAR_STATE" : "ADD_WATCHLIST";
    setCurrentStatus(isCurrentlyWatchlist ? null : "WATCHLIST");

    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "TV",
          tvShowId,
          action: nextAction,
        }),
      });
      if (onInteractionUpdate) {
        onInteractionUpdate(tvShowId, nextAction, null);
      }
    } catch (e) {
      console.error("[TV Watchlist Toggle Error]:", e);
    }
  };

  // Handle Toggle Favorite
  const handleToggleFavorite = async () => {
    if (!tvShowId) return;
    const nextFav = !isFavorite;
    setIsFavorite(nextFav);

    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "TV",
          tvShowId,
          action: nextFav ? "ADD_FAVORITE" : "REMOVE_FAVORITE",
        }),
      });
    } catch (e) {
      console.error("[TV Favorite Toggle Error]:", e);
    }
  };

  // Handle Mark Dropped
  const handleMarkDropped = async () => {
    if (!tvShowId) return;
    setCurrentStatus("DROPPED");
    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "TV",
          tvShowId,
          action: "MARK_DROPPED",
        }),
      });
      if (onInteractionUpdate) {
        onInteractionUpdate(tvShowId, "DROPPED", null);
      }
    } catch (e) {
      console.error("[TV Mark Dropped Error]:", e);
    }
  };

  if (!tvShowId) return null;

  const posterUrl = details?.posterUrl || getTmdbImageUrl(initialData?.posterPath, "w500");
  const backdropUrl = details?.backdropUrl || getTmdbImageUrl(initialData?.backdropPath, "w1280");
  const airYear = details?.firstAirDate ? details.firstAirDate.slice(0, 4) : null;

  return (
    <div
      className="fixed inset-0 bg-background/85 backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-6 overflow-hidden animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-modal-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full md:h-auto md:max-h-[90vh] max-w-4xl bg-surface border border-border/80 md:rounded-3xl shadow-cinematic flex flex-col overflow-hidden relative"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-4 right-4 z-40 w-11 h-11 rounded-full bg-background/80 backdrop-blur-md border border-border/80 text-text-primary hover:text-accent hover:border-accent flex items-center justify-center font-mono text-lg font-bold shadow-lg transition-all active:scale-95"
          aria-label="Kapat"
        >
          ✕
        </button>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto space-y-6 pb-8">
          {/* Hero Backdrop Banner */}
          <div className="relative w-full h-64 md:h-80 bg-surface-elevated overflow-hidden">
            {isPlayingTrailer && details?.trailer?.youtubeKey ? (
              <div className="relative w-full h-full">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${details.trailer.youtubeKey}?autoplay=1&rel=0`}
                  title={details?.trailer?.name || "Fragman"}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <button
                  onClick={() => setIsPlayingTrailer(false)}
                  className="absolute top-4 left-4 z-30 px-3 py-1.5 rounded-full bg-background/90 text-text-primary text-xs font-mono border border-border/80 hover:bg-background"
                >
                  ✕ Fragmanı Kapat
                </button>
              </div>
            ) : (
              <>
                {backdropUrl ? (
                  <Image
                    src={backdropUrl}
                    alt={details?.name || initialData?.name || "Dizi Görseli"}
                    fill
                    priority
                    className="object-cover object-center brightness-75"
                    sizes="(max-width: 768px) 100vw, 896px"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-elevated flex items-center justify-center font-mono text-xs text-text-muted">
                    Arka Plan Görseli Yok
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />

                {details?.trailer?.youtubeKey && (
                  <button
                    onClick={() => setIsPlayingTrailer(true)}
                    className="absolute bottom-6 right-6 px-4 py-2 rounded-xl bg-accent text-white font-mono text-xs font-bold hover:bg-accent-hover transition-all flex items-center gap-2 shadow-lg z-20 group"
                  >
                    <span>▶</span>
                    <span>Fragmanı İzle</span>
                  </button>
                )}
              </>
            )}

            {/* Poster and Title Info Over Banner */}
            <div className="absolute bottom-4 left-4 md:left-8 flex items-end gap-4 md:gap-6 z-10">
              <div className="relative w-24 h-36 md:w-32 md:h-48 rounded-xl overflow-hidden bg-surface-elevated border-2 border-border/80 shadow-2xl flex-shrink-0">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={details?.name || "Poster"}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-text-muted font-mono text-center p-1">
                    Görsel Yok
                  </div>
                )}
              </div>

              <div className="space-y-1 pb-1">
                <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
                  <span className="px-2 py-0.5 rounded-md bg-accent/20 text-accent font-bold">
                    DİZİ
                  </span>
                  {airYear && <span>{airYear}</span>}
                  {details?.numberOfSeasons && (
                    <span>• {details.numberOfSeasons} Sezon</span>
                  )}
                  {details?.voteAverage ? (
                    <span className="text-amber-400 font-bold">
                      ⭐ {details.voteAverage.toFixed(1)}
                    </span>
                  ) : null}
                </div>

                <h2
                  id="tv-modal-title"
                  className="font-display text-2xl md:text-4xl font-bold text-text-primary tracking-tight"
                >
                  {details?.name || initialData?.name || "Yükleniyor..."}
                </h2>

                {details?.originalName && details.originalName !== details.name && (
                  <p className="text-xs font-mono text-text-muted italic">
                    {details.originalName}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(details?.genres || initialData?.genres || []).map((g: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full bg-surface-elevated/80 border border-border/60 text-[10px] font-mono text-text-secondary"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar & Body */}
          <div className="px-4 md:px-8 space-y-6">
            {/* Interaction Action Bar */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleFavorite}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-all ${
                      isFavorite
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-400 font-bold"
                        : "bg-surface border-border/80 text-text-muted hover:text-amber-400"
                    }`}
                    title={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
                  >
                    <span>★</span>
                    <span>{isFavorite ? "Favorilerimde" : "Favoriye Ekle"}</span>
                  </button>

                  <span className="text-xs font-mono text-text-muted">
                    DURUM:{" "}
                    <strong className="text-text-primary uppercase">
                      {currentStatus === "WATCHED"
                        ? `İzlendi (${RATING_LABELS[currentRating || ""]?.label || "Puanlandı"})`
                        : currentStatus === "WATCHLIST"
                        ? "İzleme Listende"
                        : currentStatus === "DROPPED"
                        ? "Bırakıldı"
                        : currentStatus === "PARTIALLY_WATCHED"
                        ? "Kısmen İzlendi"
                        : currentStatus === "NOT_WATCHED"
                        ? "İzlemedin"
                        : currentStatus === "UNSURE"
                        ? "Emin Değilsin"
                        : "Listelenmedi"}
                    </strong>
                  </span>
                </div>

                {activeRatingMode && (
                  <button
                    onClick={() => setActiveRatingMode(false)}
                    className="text-xs font-mono text-text-muted hover:text-text-primary"
                  >
                    İptal
                  </button>
                )}
              </div>

              {/* Inline Rating Mode */}
              {activeRatingMode ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    onClick={() => handleMarkWatched("LOVE")}
                    className="py-2.5 rounded-xl bg-accent/20 border border-accent/40 text-text-primary font-mono text-xs font-semibold hover:bg-accent/30 transition-all"
                  >
                    ❤️ Çok Sevdim
                  </button>
                  <button
                    onClick={() => handleMarkWatched("LIKE")}
                    className="py-2.5 rounded-xl bg-surface border border-border text-text-primary font-mono text-xs font-semibold hover:bg-border/60 transition-all"
                  >
                    👍 Beğendim
                  </button>
                  <button
                    onClick={() => handleMarkWatched("NEUTRAL")}
                    className="py-2.5 rounded-xl bg-surface border border-border text-text-secondary font-mono text-xs hover:bg-border/60 transition-all"
                  >
                    😐 Ortalama
                  </button>
                  <button
                    onClick={() => handleMarkWatched("DISLIKE")}
                    className="py-2.5 rounded-xl bg-surface border border-border text-text-muted font-mono text-xs hover:bg-border/60 transition-all"
                  >
                    👎 Sevmedim
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => setActiveRatingMode(true)}
                    className="px-5 py-2.5 rounded-xl bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span>👁️</span>
                    <span>{currentStatus === "WATCHED" ? "Puanı Değiştir" : "Artık İzledim (Puanla) ➔"}</span>
                  </button>

                  <button
                    onClick={handleToggleWatchlist}
                    className={`px-4 py-2.5 rounded-xl border font-mono text-xs transition-all flex items-center gap-1.5 ${
                      currentStatus === "WATCHLIST"
                        ? "bg-accent/15 border-accent/40 text-accent font-bold"
                        : "bg-surface border-border/80 hover:border-accent text-text-primary"
                    }`}
                  >
                    <span>🔖</span>
                    <span>{currentStatus === "WATCHLIST" ? "Listede ✓" : "İzleme Listeme Ekle"}</span>
                  </button>

                  {currentStatus !== "DROPPED" && (
                    <button
                      onClick={handleMarkDropped}
                      className="px-3.5 py-2.5 rounded-xl bg-surface border border-border/80 text-text-muted hover:text-red-400 hover:border-red-400/40 font-mono text-xs transition-all flex items-center gap-1"
                      title="İzlemeyi yarıda bıraktım"
                    >
                      <span>🚫</span>
                      <span>Bıraktım</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Overview / Summary */}
            <div className="space-y-2">
              <h3 className="font-display text-sm font-bold text-text-primary">
                Dizi Hakkında
              </h3>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed font-sans">
                {details?.overview || "Bu dizi için henüz bir özet bulunmuyor."}
              </p>
            </div>

            {/* Creators & Cast */}
            {details?.creators && details.creators.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                  YARATICILAR:
                </span>
                <p className="text-xs font-mono text-text-primary">
                  {details.creators.join(", ")}
                </p>
              </div>
            )}

            {details?.cast && details.cast.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                  OYUNCULAR:
                </span>
                <div className="flex flex-wrap gap-2">
                  {details.cast.slice(0, 8).map((c, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-surface border border-border/60 text-xs font-mono text-text-secondary"
                    >
                      {c.name} {c.character ? `(${c.character})` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
