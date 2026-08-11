"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

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

  // Reset card state when movie changes
  useEffect(() => {
    setStep("step1");
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

  const posterUrl = movie.posterPath
    ? movie.posterPath.startsWith("http")
      ? movie.posterPath
      : `https://image.tmdb.org/t/p/w500${movie.posterPath}`
    : null;

  const backdropUrl = movie.backdropPath
    ? movie.backdropPath.startsWith("http")
      ? movie.backdropPath
      : `https://image.tmdb.org/t/p/w1280${movie.backdropPath}`
    : null;

  return (
    <div
      className={`w-full max-w-4xl mx-auto rounded-3xl bg-surface border border-border/80 p-5 md:p-8 shadow-cinematic relative overflow-hidden transition-all duration-200 ${
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

      <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start">
        {/* Poster Frame (Fixed 2:3 Aspect Ratio) */}
        <div className="w-48 sm:w-56 md:w-64 aspect-[2/3] rounded-2xl bg-surface-elevated border border-border/80 flex-shrink-0 relative overflow-hidden shadow-2xl group">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={movie.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 224px, 256px"
              priority
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-surface-elevated text-text-muted">
              <svg
                className="w-12 h-12 mb-2 text-text-muted/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 4v16M17 4v16M3 8h18M3 16h18"
                />
              </svg>
              <span className="text-xs font-mono">{movie.title}</span>
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
          <div className="space-y-3 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
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
              <p className="text-text-secondary text-sm leading-relaxed line-clamp-3 md:line-clamp-4">
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
                  <span className="hidden md:inline-block text-[10px] font-mono text-text-muted">
                    Kısayol: [1] Evet, [2] Hayır, [3] Emin Değilim
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
