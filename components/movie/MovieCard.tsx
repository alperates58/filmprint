"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { getTmdbImageUrl } from "@/lib/tmdb/image";

export interface MovieItem {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  releaseYear: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  overview: string;
  genres: string[];
}

interface MovieCardProps {
  movie: MovieItem;
  onAnswer: (
    status: "WATCHED" | "NOT_WATCHED" | "UNSURE",
    rating: "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE" | null
  ) => void;
  isTransitioning?: boolean;
}

export function MovieCard({ movie, onAnswer, isTransitioning = false }: MovieCardProps) {
  const [step, setStep] = useState<"step1" | "step2">("step1");
  const [imgError, setImgError] = useState(false);

  // Reset card state when movie changes
  useEffect(() => {
    setStep("step1");
    setImgError(false);
  }, [movie.id]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (step === "step1") {
        if (e.key === "1") setStep("step2");
        else if (e.key === "2") onAnswer("NOT_WATCHED", null);
        else if (e.key === "3") onAnswer("UNSURE", null);
      } else if (step === "step2") {
        if (e.key === "1") onAnswer("WATCHED", "LOVE");
        else if (e.key === "2") onAnswer("WATCHED", "LIKE");
        else if (e.key === "3") onAnswer("WATCHED", "NEUTRAL");
        else if (e.key === "4") onAnswer("WATCHED", "DISLIKE");
        else if (e.key === "Escape" || e.key === "Backspace") setStep("step1");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, movie.id, onAnswer]);

  const posterUrl = getTmdbImageUrl(movie.posterPath, "w500");
  const backdropUrl = getTmdbImageUrl(movie.backdropPath, "w1280");

  return (
    <div
      className={`w-full max-w-4xl mx-auto rounded-3xl bg-surface border border-border/80 p-3.5 sm:p-5 md:p-8 shadow-cinematic relative overflow-hidden transition-all duration-200 ${
        isTransitioning ? "opacity-40 scale-[0.98] filter blur-[1px]" : "opacity-100 scale-100"
      }`}
    >
      {/* Subtle Background Vignette Layer */}
      {backdropUrl && (
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none overflow-hidden">
          <Image
            src={backdropUrl}
            alt=""
            fill
            className="object-cover filter blur-xl scale-110"
            priority={false}
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE COMPACT LAYOUT (block md:hidden) — GUARANTEED ABOVE-THE-FOLD       */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex flex-col md:hidden space-y-3">
        {/* Top Info Row: Side-by-side Poster + Title & Metadata */}
        <div className="flex gap-3.5 items-start">
          {/* Compact Mobile Poster */}
          <div className="w-24 sm:w-28 aspect-[2/3] rounded-xl bg-surface-elevated border border-border/80 flex-shrink-0 relative overflow-hidden shadow-md group">
            {posterUrl && !imgError ? (
              <Image
                src={posterUrl}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="112px"
                priority
                unoptimized
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col justify-between p-2 bg-gradient-to-b from-surface-elevated via-background to-surface text-center">
                <span className="text-xl mt-2">🎬</span>
                <span className="text-[9px] font-mono text-text-muted mb-1 line-clamp-2">{movie.title}</span>
              </div>
            )}

            {movie.voteAverage > 0 && (
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-background/90 backdrop-blur-md border border-border text-[10px] font-mono font-bold text-text-primary flex items-center gap-0.5 shadow-sm">
                <span className="text-warning text-[9px]">★</span>
                <span>{movie.voteAverage.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Compact Info Column */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              {movie.releaseYear && (
                <span className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border/80 font-mono text-text-secondary font-medium">
                  {movie.releaseYear}
                </span>
              )}
              {movie.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-0.5 rounded-md bg-surface-elevated/70 border border-border/60 text-text-muted truncate max-w-[90px]"
                >
                  {genre}
                </span>
              ))}
            </div>

            <div>
              <h2 className="font-display text-base sm:text-lg font-bold tracking-tight text-text-primary leading-tight line-clamp-2">
                {movie.title}
              </h2>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="text-[10px] text-text-muted font-mono italic truncate mt-0.5">
                  {movie.originalTitle}
                </p>
              )}
            </div>

            {movie.overview && (
              <p className="text-text-secondary text-xs leading-snug line-clamp-2">
                {movie.overview}
              </p>
            )}
          </div>
        </div>

        {/* Mobile Interaction Controls */}
        <div className="pt-2.5 border-t border-border/60 space-y-2">
          {step === "step1" ? (
            <div className="space-y-2 animate-fadeIn">
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-mono font-semibold">
                BUNU İZLEDİN Mİ?
              </p>

              <button
                onClick={() => setStep("step2")}
                className="w-full min-h-[48px] px-4 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>İzledim</span>
                <span className="text-xs opacity-75 font-mono">→</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAnswer("NOT_WATCHED", null)}
                  className="min-h-[44px] px-3 rounded-xl bg-surface-elevated border border-border text-text-primary font-medium text-xs hover:bg-border/60 active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  İzlemedim
                </button>

                <button
                  onClick={() => onAnswer("UNSURE", null)}
                  className="min-h-[44px] px-3 rounded-xl bg-surface-elevated/60 border border-border/60 text-text-muted font-medium text-xs hover:text-text-secondary active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  Emin Değilim
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 animate-fadeIn">
              <div className="flex justify-between items-center">
                <p className="text-[10px] uppercase tracking-wider text-text-muted font-mono font-semibold">
                  NASIL BULDUN?
                </p>
                <button
                  onClick={() => setStep("step1")}
                  className="text-[11px] text-text-muted hover:text-text-primary font-mono underline transition-colors"
                >
                  ← Geri
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAnswer("WATCHED", "LOVE")}
                  className="min-h-[48px] px-3 rounded-xl bg-success/15 border border-success/40 text-success font-medium text-xs hover:bg-success/25 active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  <span className="font-semibold">😍 Çok Sevdim</span>
                </button>

                <button
                  onClick={() => onAnswer("WATCHED", "LIKE")}
                  className="min-h-[48px] px-3 rounded-xl bg-surface-elevated border border-success/30 text-text-primary font-medium text-xs hover:border-success/60 active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  <span className="font-semibold">👍 Beğendim</span>
                </button>

                <button
                  onClick={() => onAnswer("WATCHED", "NEUTRAL")}
                  className="min-h-[48px] px-3 rounded-xl bg-warning/10 border border-warning/30 text-warning font-medium text-xs hover:bg-warning/20 active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  <span className="font-semibold">😐 Ortalama</span>
                </button>

                <button
                  onClick={() => onAnswer("WATCHED", "DISLIKE")}
                  className="min-h-[48px] px-3 rounded-xl bg-destructive/15 border border-destructive/40 text-destructive font-medium text-xs hover:bg-destructive/25 active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  <span className="font-semibold">👎 Sevmedim</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP CINEMATIC LAYOUT (hidden md:flex) — FULL FEATURED                 */}
      {/* ========================================================================= */}
      <div className="relative z-10 hidden md:flex flex-row gap-10 items-start">
        {/* Poster Frame (Fixed 2:3 Aspect Ratio) */}
        <div className="w-64 aspect-[2/3] rounded-2xl bg-surface-elevated border border-border/80 flex-shrink-0 relative overflow-hidden shadow-2xl group">
          {posterUrl && !imgError ? (
            <Image
              src={posterUrl}
              alt={movie.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="256px"
              priority
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col justify-between p-5 bg-gradient-to-b from-surface-elevated via-background to-surface border border-accent/20 text-center relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent font-bold flex items-center justify-center mx-auto mt-4">
                🎬
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-accent uppercase tracking-widest font-semibold">
                  SINEAI
                </span>
                <h3 className="font-display text-sm font-bold text-text-primary line-clamp-2 px-1">
                  {movie.title}
                </h3>
                {movie.releaseYear && (
                  <p className="text-[10px] font-mono text-text-muted">{movie.releaseYear}</p>
                )}
              </div>
              <div className="w-full h-1 bg-accent/20 rounded-full mb-2" />
            </div>
          )}

          {/* Vote Rating Badge */}
          {movie.voteAverage > 0 && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-background/85 backdrop-blur-md border border-border text-xs font-mono font-semibold text-text-primary flex items-center gap-1 shadow-md">
              <span className="text-warning">★</span>
              <span>{movie.voteAverage.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Info & Interaction Controls */}
        <div className="flex-1 flex flex-col justify-between w-full min-h-[320px] space-y-6">
          {/* Metadata Block */}
          <div className="space-y-3 text-left">
            <div className="flex flex-wrap items-center justify-start gap-2">
              {movie.releaseYear && (
                <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border text-xs font-mono text-text-secondary font-medium">
                  {movie.releaseYear}
                </span>
              )}
              {movie.genres.map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-0.5 rounded-full bg-surface-elevated/70 border border-border/60 text-xs font-sans text-text-muted"
                >
                  {genre}
                </span>
              ))}
            </div>

            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary leading-snug">
                {movie.title}
              </h2>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="text-xs text-text-muted font-mono italic mt-0.5">
                  {movie.originalTitle}
                </p>
              )}
            </div>

            {movie.overview && (
              <p className="text-text-secondary text-sm leading-relaxed line-clamp-4">
                {movie.overview}
              </p>
            )}
          </div>

          {/* Dynamic Interaction Controls Container */}
          <div className="pt-4 border-t border-border/60 space-y-4">
            {step === "step1" ? (
              /* Step 1: "BUNU İZLEDİN Mİ?" */
              <div className="space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <p className="text-xs uppercase tracking-widest text-text-muted font-mono">
                    BUNU İZLEDİN Mİ?
                  </p>
                  <span className="text-[10px] font-mono text-text-muted">
                    Kısayol: [1] Evet, [2] Hayır, [3] Emin Değilim
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setStep("step2")}
                    className="min-h-[48px] px-4 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-hover active:scale-[0.98] transition-all duration-150 shadow-md flex items-center justify-center gap-2 group"
                  >
                    <span>İzledim</span>
                    <span className="text-xs opacity-75 font-mono group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                  </button>

                  <button
                    onClick={() => onAnswer("NOT_WATCHED", null)}
                    className="min-h-[48px] px-4 rounded-xl bg-surface-elevated border border-border text-text-primary font-medium text-sm hover:bg-border/60 active:scale-[0.98] transition-all duration-150 flex items-center justify-center"
                  >
                    İzlemedim
                  </button>

                  <button
                    onClick={() => onAnswer("UNSURE", null)}
                    className="min-h-[48px] px-4 rounded-xl bg-surface-elevated/50 border border-border/60 text-text-muted font-medium text-sm hover:text-text-secondary hover:bg-surface-elevated active:scale-[0.98] transition-all duration-150 flex items-center justify-center"
                  >
                    Emin Değilim
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: "NASIL BULDUN?" */
              <div className="space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <p className="text-xs uppercase tracking-widest text-text-muted font-mono">
                    NASIL BULDUN?
                  </p>
                  <button
                    onClick={() => setStep("step1")}
                    className="text-xs text-text-muted hover:text-text-secondary font-mono underline underline-offset-2 transition-colors"
                  >
                    ← Geri
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  <button
                    onClick={() => onAnswer("WATCHED", "LOVE")}
                    className="min-h-[48px] px-3 rounded-xl bg-success/15 border border-success/40 text-success font-medium text-sm hover:bg-success/25 active:scale-[0.98] transition-all duration-150 flex flex-col items-center justify-center py-2"
                  >
                    <span className="font-semibold">Çok Sevdim</span>
                    <span className="text-[10px] opacity-75 font-mono">[1]</span>
                  </button>

                  <button
                    onClick={() => onAnswer("WATCHED", "LIKE")}
                    className="min-h-[48px] px-3 rounded-xl bg-surface-elevated border border-success/30 text-text-primary font-medium text-sm hover:border-success/60 active:scale-[0.98] transition-all duration-150 flex flex-col items-center justify-center py-2"
                  >
                    <span className="font-semibold">Beğendim</span>
                    <span className="text-[10px] opacity-75 font-mono">[2]</span>
                  </button>

                  <button
                    onClick={() => onAnswer("WATCHED", "NEUTRAL")}
                    className="min-h-[48px] px-3 rounded-xl bg-warning/10 border border-warning/30 text-warning font-medium text-sm hover:bg-warning/20 active:scale-[0.98] transition-all duration-150 flex flex-col items-center justify-center py-2"
                  >
                    <span className="font-semibold">Ortalama</span>
                    <span className="text-[10px] opacity-75 font-mono">[3]</span>
                  </button>

                  <button
                    onClick={() => onAnswer("WATCHED", "DISLIKE")}
                    className="min-h-[48px] px-3 rounded-xl bg-destructive/15 border border-destructive/40 text-destructive font-medium text-sm hover:bg-destructive/25 active:scale-[0.98] transition-all duration-150 flex flex-col items-center justify-center py-2"
                  >
                    <span className="font-semibold">Sevmedim</span>
                    <span className="text-[10px] opacity-75 font-mono">[4]</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
