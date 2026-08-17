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
      className={`w-full max-w-4xl mx-auto rounded-3xl bg-surface-1 border border-border/80 p-4 sm:p-6 md:p-8 shadow-md relative overflow-hidden transition-all duration-200 min-h-[480px] sm:min-h-[440px] md:min-h-[360px] flex flex-col justify-center ${
        isTransitioning ? "opacity-40 scale-[0.98] filter blur-[1px]" : "opacity-100 scale-100"
      }`}
    >
      {/* Subtle Background Ambience */}
      {backdropUrl && (
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none overflow-hidden">
          <Image
            src={backdropUrl}
            alt=""
            fill
            className="object-cover filter blur-2xl scale-110"
            priority={false}
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-surface-1 via-surface-1/90 to-surface-1/50" />
        </div>
      )}

      {/* Main Content Layout */}
      <div className="relative z-10 flex flex-col md:flex-row gap-5 md:gap-8 items-center md:items-stretch flex-1">
        {/* Poster Column */}
        <div className="w-32 sm:w-44 md:w-56 aspect-[2/3] rounded-2xl overflow-hidden bg-surface-2 border border-border-strong relative flex-shrink-0 shadow-md self-center md:self-auto">
          {posterUrl && !imgError ? (
            <Image
              src={posterUrl}
              alt={movie.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 128px, (max-width: 768px) 176px, 224px"
              priority
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-text-muted bg-surface-2">
              <span className="text-3xl mb-1">🎬</span>
              <span className="text-xs font-sans font-medium line-clamp-2">{movie.title}</span>
            </div>
          )}

          {movie.voteAverage > 0 && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-surface-1/90 backdrop-blur-md border border-border text-xs font-sans font-bold text-text-primary flex items-center gap-1 shadow-sm">
              <span className="text-amber-400 text-xs">★</span>
              <span className="font-mono">{movie.voteAverage.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Info & Decision Column */}
        <div className="flex-1 w-full flex flex-col justify-between self-stretch space-y-4">
          <div className="space-y-2 text-center md:text-left flex-1 flex flex-col justify-start">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
              {movie.releaseYear && (
                <span className="px-2.5 py-0.5 rounded-lg bg-surface-2 border border-border font-sans font-semibold text-text-secondary">
                  {movie.releaseYear}
                </span>
              )}
              {movie.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-0.5 rounded-lg bg-surface-2/70 border border-border/60 text-text-muted font-sans text-xs"
                >
                  {genre}
                </span>
              ))}
            </div>

            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-text-primary line-clamp-2">
              {movie.title}
            </h1>

            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p className="text-xs text-text-muted italic font-sans truncate">{movie.originalTitle}</p>
            )}

            {/* Fixed-Height Overview Slot to Anchor Action Buttons */}
            <div className="min-h-[4.2rem] sm:min-h-[4.8rem] flex items-start pt-1">
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed line-clamp-3 md:line-clamp-4 font-sans">
                {movie.overview || "Bu yapım için henüz Türkçe özet bilgisi eklenmedi."}
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DECISION ACTION BUTTONS (48dp TOUCH TARGETS)                              */}
          {/* ========================================================================= */}
          <div className="mt-auto pt-2 flex-shrink-0">
            {step === "step1" ? (
              <div className="space-y-3">
                <p className="text-xs font-sans font-semibold text-text-muted text-center md:text-left uppercase tracking-wider">
                  BU FİLMİ İZLEDİNİZ Mİ?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setStep("step2")}
                    className="min-h-[48px] px-4 py-3 rounded-2xl bg-accent text-white font-sans font-semibold text-sm hover:bg-accent-hover active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 group"
                  >
                    <span>👁️</span>
                    <span>İzledim</span>
                    <span className="hidden md:inline-block ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">
                      1
                    </span>
                  </button>

                  <button
                    onClick={() => onAnswer("NOT_WATCHED", null)}
                    className="min-h-[48px] px-4 py-3 rounded-2xl bg-surface-2 border border-border hover:border-border-strong text-text-primary font-sans font-medium text-sm hover:bg-surface-3 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span>✕</span>
                    <span>İzlemedim</span>
                    <span className="hidden md:inline-block ml-1 px-1.5 py-0.5 rounded bg-surface-1 text-text-muted text-[10px] font-mono">
                      2
                    </span>
                  </button>

                  <button
                    onClick={() => onAnswer("UNSURE", null)}
                    className="min-h-[48px] px-4 py-3 rounded-2xl bg-surface-2 border border-border hover:border-border-strong text-text-secondary font-sans font-medium text-sm hover:bg-surface-3 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span>🤔</span>
                    <span>Emin Değilim</span>
                    <span className="hidden md:inline-block ml-1 px-1.5 py-0.5 rounded bg-surface-1 text-text-muted text-[10px] font-mono">
                      3
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-sans font-semibold text-accent uppercase tracking-wider">
                    FİLMİ NASIL BULDUNUZ?
                  </p>
                  <button
                    onClick={() => setStep("step1")}
                    className="text-xs font-sans text-text-muted hover:text-text-primary underline"
                  >
                    ← Geri Dön (Esc)
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => onAnswer("WATCHED", "LOVE")}
                    className="min-h-[48px] p-3 rounded-2xl bg-surface-2 border border-border hover:border-pink-500/50 hover:bg-pink-500/10 text-pink-400 font-sans font-semibold text-xs sm:text-sm active:scale-95 transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5"
                  >
                    <span className="text-base">❤️</span>
                    <span>Çok Sevdim</span>
                    <span className="hidden md:inline-block text-[10px] font-mono opacity-60">1</span>
                  </button>

                  <button
                    onClick={() => onAnswer("WATCHED", "LIKE")}
                    className="min-h-[48px] p-3 rounded-2xl bg-surface-2 border border-border hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400 font-sans font-semibold text-xs sm:text-sm active:scale-95 transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5"
                  >
                    <span className="text-base">👍</span>
                    <span>Beğendim</span>
                    <span className="hidden md:inline-block text-[10px] font-mono opacity-60">2</span>
                  </button>

                  <button
                    onClick={() => onAnswer("WATCHED", "NEUTRAL")}
                    className="min-h-[48px] p-3 rounded-2xl bg-surface-2 border border-border hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-400 font-sans font-semibold text-xs sm:text-sm active:scale-95 transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5"
                  >
                    <span className="text-base">😐</span>
                    <span>Ortalama</span>
                    <span className="hidden md:inline-block text-[10px] font-mono opacity-60">3</span>
                  </button>

                  <button
                    onClick={() => onAnswer("WATCHED", "DISLIKE")}
                    className="min-h-[48px] p-3 rounded-2xl bg-surface-2 border border-border hover:border-destructive/50 hover:bg-destructive/10 text-destructive font-sans font-semibold text-xs sm:text-sm active:scale-95 transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5"
                  >
                    <span className="text-base">👎</span>
                    <span>Sevmedim</span>
                    <span className="hidden md:inline-block text-[10px] font-mono opacity-60">4</span>
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
