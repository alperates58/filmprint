"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { TvShowItem, TvInteractionStatusType, TvRatingStatusType } from "./types";

interface TvCardProps {
  tvShow: TvShowItem;
  onAnswer: (
    status: TvInteractionStatusType,
    rating: TvRatingStatusType | null
  ) => void;
  isTransitioning?: boolean;
}

export function TvCard({ tvShow, onAnswer, isTransitioning = false }: TvCardProps) {
  const [step, setStep] = useState<"step1" | "step2">("step1");
  const [chosenStatus, setChosenStatus] = useState<"WATCHED" | "PARTIALLY_WATCHED">("WATCHED");
  const [imgError, setImgError] = useState(false);

  // Reset card state when show changes
  useEffect(() => {
    setStep("step1");
    setChosenStatus("WATCHED");
    setImgError(false);
  }, [tvShow.id]);

  const handleStatusClick = (status: "WATCHED" | "PARTIALLY_WATCHED") => {
    setChosenStatus(status);
    setStep("step2");
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (step === "step1") {
        if (e.key === "1") handleStatusClick("WATCHED");
        else if (e.key === "2") handleStatusClick("PARTIALLY_WATCHED");
        else if (e.key === "3") onAnswer("NOT_WATCHED", null);
        else if (e.key === "4") onAnswer("UNSURE", null);
      } else if (step === "step2") {
        if (e.key === "1") onAnswer(chosenStatus, "LOVE");
        else if (e.key === "2") onAnswer(chosenStatus, "LIKE");
        else if (e.key === "3") onAnswer(chosenStatus, "NEUTRAL");
        else if (e.key === "4") onAnswer(chosenStatus, "DISLIKE");
        else if (e.key === "Escape" || e.key === "Backspace") setStep("step1");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, chosenStatus, tvShow.id, onAnswer]);

  const posterUrl = getTmdbImageUrl(tvShow.posterPath, "w500");
  const backdropUrl = getTmdbImageUrl(tvShow.backdropPath, "w1280");

  const startYear = tvShow.firstAirDate ? tvShow.firstAirDate.substring(0, 4) : "";
  const endYear = tvShow.lastAirDate ? tvShow.lastAirDate.substring(0, 4) : "";
  const isEnded = tvShow.status === "Ended" || tvShow.status === "Canceled";
  const airYears = startYear
    ? isEnded
      ? startYear === endYear || !endYear
        ? startYear
        : `${startYear}–${endYear}`
      : `${startYear}–`
    : "";

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
              alt={tvShow.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 128px, (max-width: 768px) 176px, 224px"
              priority
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-text-muted bg-surface-2">
              <span className="text-3xl mb-1">📺</span>
              <span className="text-xs font-sans font-medium line-clamp-2">{tvShow.name}</span>
            </div>
          )}

          {tvShow.voteAverage > 0 && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-surface-1/90 backdrop-blur-md border border-border text-xs font-sans font-bold text-text-primary flex items-center gap-1 shadow-sm">
              <span className="text-amber-400 text-xs">★</span>
              <span className="font-mono">{tvShow.voteAverage.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Info & Decision Column */}
        <div className="flex-1 w-full flex flex-col justify-between self-stretch space-y-4">
          <div className="space-y-2 text-center md:text-left flex-1 flex flex-col justify-start">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
              {airYears && (
                <span className="px-2.5 py-0.5 rounded-lg bg-surface-2 border border-border font-sans font-semibold text-text-secondary">
                  {airYears}
                </span>
              )}
              {tvShow.numberOfSeasons && (
                <span className="px-2.5 py-0.5 rounded-lg bg-surface-2/80 border border-border/70 text-text-secondary font-sans text-xs">
                  {tvShow.numberOfSeasons} Sezon
                </span>
              )}
              {tvShow.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-0.5 rounded-lg bg-surface-2/70 border border-border/60 text-text-muted font-sans text-xs"
                >
                  {genre}
                </span>
              ))}
            </div>

            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-text-primary line-clamp-2">
              {tvShow.name}
            </h1>

            {tvShow.originalName && tvShow.originalName !== tvShow.name && (
              <p className="text-xs text-text-muted italic font-sans truncate">{tvShow.originalName}</p>
            )}

            {/* Fixed-Height Overview Slot to Anchor Action Buttons */}
            <div className="min-h-[4.2rem] sm:min-h-[4.8rem] flex items-start pt-1">
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed line-clamp-3 md:line-clamp-4 font-sans">
                {tvShow.overview || "Bu dizi için henüz Türkçe özet bilgisi eklenmedi."}
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
                  BU DİZİYİ İZLEDİNİZ Mİ?
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => handleStatusClick("WATCHED")}
                    className="min-h-[48px] px-3 py-3 rounded-2xl bg-accent text-white font-sans font-semibold text-xs sm:text-sm hover:bg-accent-hover active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>👁️</span>
                    <span>İzledim</span>
                    <span className="hidden md:inline-block ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">
                      1
                    </span>
                  </button>

                  <button
                    onClick={() => handleStatusClick("PARTIALLY_WATCHED")}
                    className="min-h-[48px] px-3 py-3 rounded-2xl bg-surface-2 border border-border hover:border-accent text-text-primary font-sans font-medium text-xs sm:text-sm hover:bg-surface-3 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>⏳</span>
                    <span>Kısmen</span>
                    <span className="hidden md:inline-block ml-1 px-1.5 py-0.5 rounded bg-surface-1 text-text-muted text-[10px] font-mono">
                      2
                    </span>
                  </button>

                  <button
                    onClick={() => onAnswer("NOT_WATCHED", null)}
                    className="min-h-[48px] px-3 py-3 rounded-2xl bg-surface-2 border border-border hover:border-border-strong text-text-secondary font-sans font-medium text-xs sm:text-sm hover:bg-surface-3 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>✕</span>
                    <span>İzlemedim</span>
                    <span className="hidden md:inline-block ml-1 px-1.5 py-0.5 rounded bg-surface-1 text-text-muted text-[10px] font-mono">
                      3
                    </span>
                  </button>

                  <button
                    onClick={() => onAnswer("UNSURE", null)}
                    className="min-h-[48px] px-3 py-3 rounded-2xl bg-surface-2 border border-border hover:border-border-strong text-text-secondary font-sans font-medium text-xs sm:text-sm hover:bg-surface-3 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>🤔</span>
                    <span>Emin Değilim</span>
                    <span className="hidden md:inline-block ml-1 px-1.5 py-0.5 rounded bg-surface-1 text-text-muted text-[10px] font-mono">
                      4
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-sans font-semibold text-accent uppercase tracking-wider">
                    {chosenStatus === "PARTIALLY_WATCHED" ? "İZLEDİĞİNİZ KISMI NASIL BULDUNUZ?" : "DİZİYİ NASIL BULDUNUZ?"}
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
                    onClick={() => onAnswer(chosenStatus, "LOVE")}
                    className="min-h-[48px] p-3 rounded-2xl bg-surface-2 border border-border hover:border-pink-500/50 hover:bg-pink-500/10 text-pink-400 font-sans font-semibold text-xs sm:text-sm active:scale-95 transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5"
                  >
                    <span className="text-base">❤️</span>
                    <span>Çok Sevdim</span>
                    <span className="hidden md:inline-block text-[10px] font-mono opacity-60">1</span>
                  </button>

                  <button
                    onClick={() => onAnswer(chosenStatus, "LIKE")}
                    className="min-h-[48px] p-3 rounded-2xl bg-surface-2 border border-border hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400 font-sans font-semibold text-xs sm:text-sm active:scale-95 transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5"
                  >
                    <span className="text-base">👍</span>
                    <span>Beğendim</span>
                    <span className="hidden md:inline-block text-[10px] font-mono opacity-60">2</span>
                  </button>

                  <button
                    onClick={() => onAnswer(chosenStatus, "NEUTRAL")}
                    className="min-h-[48px] p-3 rounded-2xl bg-surface-2 border border-border hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-400 font-sans font-semibold text-xs sm:text-sm active:scale-95 transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5"
                  >
                    <span className="text-base">😐</span>
                    <span>Ortalama</span>
                    <span className="hidden md:inline-block text-[10px] font-mono opacity-60">3</span>
                  </button>

                  <button
                    onClick={() => onAnswer(chosenStatus, "DISLIKE")}
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
