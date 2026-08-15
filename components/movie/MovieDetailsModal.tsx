"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { getTmdbImageUrl } from "@/lib/tmdb/image";

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
  trailer: { provider: "youtube"; key: string } | null;
  userStatus: "WATCHED" | "NOT_WATCHED" | "UNSURE" | "WATCH_LATER" | null;
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

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (movieId) {
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [movieId]);

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
    if (!movieId) return;
    setIsLoading(true);
    setError(null);
    setIsPlayingTrailer(false);
    setActiveRatingMode(false);

    try {
      const res = await fetch(`/api/movies/${movieId}`);
      if (!res.ok) throw new Error("Film detayları yüklenemedi.");
      const data: FullMovieDetails = await res.json();
      setDetails(data);
      setCurrentStatus(data.userStatus);
      setCurrentRating(data.userRating);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Handle interaction update
  const handleUpdateInteraction = async (
    targetStatus: "WATCHED" | "NOT_WATCHED" | "UNSURE",
    targetRating: "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE" | null = null
  ) => {
    if (!movieId) return;
    setCurrentStatus(targetStatus);
    setCurrentRating(targetRating);
    setActiveRatingMode(false);

    try {
      const res = await fetch(`/api/interactions/${movieId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, rating: targetRating }),
      });

      if (res.ok && onInteractionUpdate) {
        onInteractionUpdate(movieId, targetStatus, targetRating);
      }
    } catch (e) {
      console.error("[Interaction Update Error]:", e);
    }
  };

  const handleSaveWatchLater = async () => {
    if (!movieId) return;
    setCurrentStatus("WATCH_LATER");
    try {
      await fetch("/api/recommendations/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId, action: "WATCH_LATER" }),
      });
      if (onInteractionUpdate) {
        onInteractionUpdate(movieId, "WATCH_LATER", null);
      }
    } catch (e) {
      console.error("[Watch Later Save Error]:", e);
    }
  };

  const handleRemoveWatchLater = async () => {
    if (!movieId) return;
    setCurrentStatus(null);
    try {
      await fetch(`/api/interactions/${movieId}`, { method: "DELETE" });
      if (onInteractionUpdate) {
        onInteractionUpdate(movieId, "REMOVED", null);
      }
    } catch (e) {
      console.error("[Watch Later Remove Error]:", e);
    }
  };

  if (!movieId) return null;

  // Format runtime (e.g. 148 -> "2 sa 28 dk")
  const formatRuntime = (mins: number | null) => {
    if (!mins) return null;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours === 0) return `${remainingMins} dk`;
    return `${hours} sa ${remainingMins} dk`;
  };

  const posterUrl =
    details?.posterUrl || getTmdbImageUrl(initialData?.posterPath, "w500");

  const backdropUrl = details?.backdropUrl;

  return (
    <div
      className="fixed inset-0 bg-background/85 backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-6 overflow-hidden animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-modal-title"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full md:h-auto md:max-h-[90vh] max-w-4xl bg-surface border border-border/80 md:rounded-3xl shadow-cinematic flex flex-col overflow-hidden relative"
      >
        {/* Sticky / Absolute Close Button (X) */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-4 right-4 z-40 w-11 h-11 rounded-full bg-background/80 backdrop-blur-md border border-border/80 text-text-primary hover:text-accent hover:border-accent flex items-center justify-center font-mono text-lg font-bold shadow-lg transition-all active:scale-95"
          aria-label="Kapat"
        >
          ✕
        </button>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-8">
          {/* Hero Section with Backdrop */}
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-surface-elevated overflow-hidden flex items-end p-4 md:p-8">
            {backdropUrl ? (
              <Image
                src={backdropUrl}
                alt={details?.title || initialData?.title || "Backdrop"}
                fill
                priority
                className="object-cover object-top opacity-60"
                sizes="(max-width: 768px) 100vw, 1000px"
              />
            ) : null}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-transparent" />

            {/* Hero Details Header */}
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6 w-full">
              {/* Poster thumbnail */}
              {posterUrl && (
                <div className="w-24 md:w-36 aspect-[2/3] rounded-2xl overflow-hidden border border-border/80 shadow-2xl relative flex-shrink-0 hidden sm:block">
                  <Image
                    src={posterUrl}
                    alt={details?.title || initialData?.title || "Poster"}
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                </div>
              )}

              {/* Title & Metadata */}
              <div className="space-y-2 flex-1">
                {(() => {
                  const matchScore = initialData?.matchScore || (details?.personalMatch?.available ? details.personalMatch.displayScore : null);
                  const matchLabel = details?.personalMatch?.label || null;

                  return (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-text-muted">
                      {details?.voteAverage ? (
                        <span className="px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-md border border-accent/40 text-text-primary font-bold">
                          ⭐ {details.voteAverage.toFixed(1)}/10
                        </span>
                      ) : null}

                      {matchScore ? (
                        <span className="px-2.5 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent font-bold">
                          ❤️ %{matchScore} UYUM {matchLabel ? `(${matchLabel})` : ""}
                        </span>
                      ) : null}

                      {(details?.releaseYear || initialData?.releaseYear) && (
                        <span>{details?.releaseYear || initialData?.releaseYear}</span>
                      )}

                      {details?.runtime && (
                        <span>• {formatRuntime(details.runtime)}</span>
                      )}
                    </div>
                  );
                })()}

                <h2
                  id="movie-modal-title"
                  className="font-display text-2xl md:text-4xl font-bold text-text-primary tracking-tight"
                >
                  {details?.title || initialData?.title || "Yükleniyor..."}
                </h2>

                {details?.originalTitle && details.originalTitle !== details.title && (
                  <p className="text-xs font-mono text-text-muted italic">
                    {details.originalTitle}
                  </p>
                )}

                {/* Genre Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(details?.genres || initialData?.genres || []).map((g, idx) => (
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

          {/* Main Body Grid */}
          <div className="px-4 md:px-8 space-y-6">
            {/* User Interaction Action Bar */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">
                  DURUMUNUZ:{" "}
                  <strong className="text-text-primary uppercase">
                    {currentStatus === "WATCHED"
                      ? `İzledin (${RATING_LABELS[currentRating || ""]?.label || "Değerlendirildi"})`
                      : currentStatus === "NOT_WATCHED"
                      ? "İzlemedin"
                      : currentStatus === "UNSURE"
                      ? "Emin Değilsin"
                      : currentStatus === "WATCH_LATER"
                      ? "Daha Sonra Listende"
                      : "Değerlendirilmedi"}
                  </strong>
                </span>

                {activeRatingMode && (
                  <button
                    onClick={() => setActiveRatingMode(false)}
                    className="text-xs font-mono text-text-muted hover:text-text-primary"
                  >
                    İptal
                  </button>
                )}
              </div>

              {/* Inline Rating Options */}
              {activeRatingMode ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    onClick={() => handleUpdateInteraction("WATCHED", "LOVE")}
                    className="py-2.5 rounded-xl bg-accent/20 border border-accent/40 text-text-primary font-mono text-xs font-semibold hover:bg-accent/30 transition-all"
                  >
                    ❤️ Çok Sevdim
                  </button>
                  <button
                    onClick={() => handleUpdateInteraction("WATCHED", "LIKE")}
                    className="py-2.5 rounded-xl bg-surface border border-border text-text-primary font-mono text-xs font-semibold hover:bg-border/60 transition-all"
                  >
                    👍 Beğendim
                  </button>
                  <button
                    onClick={() => handleUpdateInteraction("WATCHED", "NEUTRAL")}
                    className="py-2.5 rounded-xl bg-surface border border-border text-text-secondary font-mono text-xs hover:bg-border/60 transition-all"
                  >
                    😐 Ortalama
                  </button>
                  <button
                    onClick={() => handleUpdateInteraction("WATCHED", "DISLIKE")}
                    className="py-2.5 rounded-xl bg-surface border border-border text-text-muted font-mono text-xs hover:bg-border/60 transition-all"
                  >
                    👎 Sevmedim
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => setActiveRatingMode(true)}
                    className="px-5 py-2.5 rounded-xl bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-all shadow-sm"
                  >
                    {currentStatus === "WATCHED" ? "Puanı Değiştir" : "Artık İzledim ➔"}
                  </button>

                  {currentStatus !== "WATCH_LATER" ? (
                    <button
                      onClick={handleSaveWatchLater}
                      className="px-4 py-2.5 rounded-xl bg-surface border border-border/80 hover:border-accent text-text-primary font-mono text-xs transition-all"
                    >
                      🔖 Daha Sonra
                    </button>
                  ) : (
                    <button
                      onClick={handleRemoveWatchLater}
                      className="px-4 py-2.5 rounded-xl bg-surface border border-border/80 text-text-muted hover:text-text-primary font-mono text-xs transition-all"
                    >
                      Kaldır
                    </button>
                  )}

                  {currentStatus !== "NOT_WATCHED" && (
                    <button
                      onClick={() => handleUpdateInteraction("NOT_WATCHED", null)}
                      className="px-4 py-2.5 rounded-xl bg-surface border border-border/80 text-text-muted hover:text-text-primary font-mono text-xs transition-all"
                    >
                      İzlemedim
                    </button>
                  )}

                  {currentStatus !== "UNSURE" && (
                    <button
                      onClick={() => handleUpdateInteraction("UNSURE", null)}
                      className="px-4 py-2.5 rounded-xl bg-surface border border-border/80 text-text-muted hover:text-text-primary font-mono text-xs transition-all"
                    >
                      Emin Değilim
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Why Recommended Section (Universal Match Context) */}
            {(() => {
              const reasons = initialData?.reasons || details?.personalMatch?.reasons || [];
              const headline = initialData?.headline || details?.personalMatch?.headline || "Neden Sana Uygun?";
              if (!reasons || reasons.length === 0) return null;

              return (
                <div className="p-5 rounded-2xl bg-surface-elevated/80 border border-border/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-text-primary">
                      {headline}
                    </h3>
                    <span className="text-[10px] font-mono text-text-muted bg-surface border border-border/60 px-2 py-0.5 rounded-full">
                      SineAI yorumu
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-text-secondary pt-1 border-t border-border/40">
                    {reasons.map((r: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-accent font-bold">•</span>
                        <span>{r.replace(/\*\*(.*?)\*\*/g, "$1")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* Full Overview */}
            <div className="space-y-2">
              <h3 className="font-display text-sm font-bold text-text-primary uppercase tracking-wider">
                Film Özeti
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed font-sans">
                {details?.overview || initialData?.title || "Özet yükleniyor..."}
              </p>
            </div>

            {/* Trailer Section */}
            {details?.trailer && details.trailer.key ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-text-primary uppercase tracking-wider">
                    Fragman
                  </h3>

                  {!isPlayingTrailer && (
                    <button
                      onClick={() => setIsPlayingTrailer(true)}
                      className="px-4 py-2 rounded-xl bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-all flex items-center gap-2"
                    >
                      <span>🎬 Fragmanı İzle</span>
                    </button>
                  )}
                </div>

                {/* Inline YouTube Player */}
                {isPlayingTrailer ? (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-border/80 shadow-2xl">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${details.trailer.key}?autoplay=1`}
                      title={`${details.title} Fragman`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                    <button
                      onClick={() => setIsPlayingTrailer(false)}
                      className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-black/80 text-white font-mono text-xs border border-white/20 hover:bg-black"
                    >
                      Kapat ✕
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Director & Cast Section */}
            {(details?.director || (details?.cast && details.cast.length > 0)) && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                {details?.director && (
                  <div className="text-xs font-mono">
                    <span className="text-text-muted">YÖNETMEN: </span>
                    <strong className="text-text-primary">{details.director}</strong>
                  </div>
                )}

                {details?.cast && details.cast.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-display text-xs font-bold text-text-primary uppercase tracking-wider">
                      Oyuncular
                    </h4>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                      {details.cast.map((actor, idx) => (
                        <div
                          key={idx}
                          className="flex-shrink-0 w-24 p-2 rounded-xl bg-surface-elevated border border-border/60 text-center space-y-1.5"
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-surface mx-auto relative border border-border/60">
                            {getTmdbImageUrl(actor.profilePath, "w185") ? (
                              <Image
                                src={getTmdbImageUrl(actor.profilePath, "w185")!}
                                alt={actor.name}
                                fill
                                className="object-cover"
                                sizes="50px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-text-muted text-[10px] font-mono">
                                👤
                              </div>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-text-primary line-clamp-1">
                              {actor.name}
                            </p>
                            <p className="text-[9px] text-text-muted font-mono line-clamp-1">
                              {actor.character}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
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
