"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
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

  // Reset card state when show changes
  useEffect(() => {
    setStep("step1");
    setChosenStatus("WATCHED");
  }, [tvShow.id]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (step === "step1") {
        if (e.key === "1") {
          setChosenStatus("WATCHED");
          setStep("step2");
        } else if (e.key === "2") {
          setChosenStatus("PARTIALLY_WATCHED");
          setStep("step2");
        } else if (e.key === "3") {
          onAnswer("NOT_WATCHED", null);
        } else if (e.key === "4") {
          onAnswer("UNSURE", null);
        }
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

  const posterUrl = tvShow.posterPath
    ? tvShow.posterPath.startsWith("http")
      ? tvShow.posterPath
      : `https://image.tmdb.org/t/p/w500${tvShow.posterPath}`
    : null;

  const backdropUrl = tvShow.backdropPath
    ? tvShow.backdropPath.startsWith("http")
      ? tvShow.backdropPath
      : `https://image.tmdb.org/t/p/w1280${tvShow.backdropPath}`
    : null;

  // Format air years
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

  // Normalize status label
  const isMiniSeries =
    (tvShow.numberOfSeasons === 1 && (tvShow.numberOfEpisodes || 0) <= 10) ||
    tvShow.status === "Mini Series";

  const statusLabel = isMiniSeries
    ? "Mini Dizi"
    : tvShow.status === "Ended"
    ? "Final Yaptı"
    : tvShow.status === "Returning Series"
    ? "Devam Ediyor"
    : tvShow.status === "Canceled"
    ? "İptal Edildi"
    : null;

  return (
    <div
      className={`w-full max-w-4xl mx-auto rounded-3xl bg-surface border border-border/80 p-3.5 sm:p-5 md:p-8 shadow-cinematic relative overflow-hidden transition-all duration-200 ${
        isTransitioning ? "opacity-40 scale-[0.98] filter blur-[1px]" : "opacity-100 scale-100"
      }`}
    >
      {/* Background Backdrop Vignette */}
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
        {/* Top Info Row */}
        <div className="flex gap-3.5 items-start">
          {/* Poster */}
          <div className="w-24 sm:w-28 aspect-[2/3] rounded-xl bg-surface-elevated border border-border/80 flex-shrink-0 relative overflow-hidden shadow-md">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={tvShow.name}
                className="w-full h-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted text-[10px] p-2 text-center font-mono">
                {tvShow.name}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 min-w-0 space-y-1">
            <h2 className="font-display text-lg sm:text-xl font-bold text-text-primary leading-tight line-clamp-2">
              {tvShow.name}
            </h2>

            {tvShow.originalName && tvShow.originalName !== tvShow.name && (
              <p className="text-[11px] text-text-muted italic truncate">
                {tvShow.originalName}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-text-secondary pt-0.5">
              {airYears && <span className="font-medium text-text-primary">{airYears}</span>}
              {tvShow.numberOfSeasons && (
                <>
                  <span className="text-text-muted">•</span>
                  <span>{tvShow.numberOfSeasons} Sezon</span>
                </>
              )}
              {statusLabel && (
                <>
                  <span className="text-text-muted">•</span>
                  <span className="text-accent">{statusLabel}</span>
                </>
              )}
              {tvShow.voteAverage > 0 && (
                <>
                  <span className="text-text-muted">•</span>
                  <span className="text-accent font-bold">★ {tvShow.voteAverage.toFixed(1)}</span>
                </>
              )}
            </div>

            {/* Genre Chips */}
            <div className="flex flex-wrap gap-1 pt-1">
              {tvShow.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border/60 text-[10px] font-mono text-text-secondary"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Overview Clamped */}
        {tvShow.overview && (
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 sm:line-clamp-3 bg-surface-elevated/40 p-2.5 rounded-xl border border-border/40">
            {tvShow.overview}
          </p>
        )}

        {/* Actions Container */}
        <div className="pt-1">
          {step === "step1" ? (
            <div className="space-y-2">
              <div className="text-center text-xs font-mono text-text-secondary font-medium">
                Bu diziyi izledin mi?
              </div>

              {/* Primary Action Button */}
              <button
                onClick={() => {
                  setChosenStatus("WATCHED");
                  setStep("step2");
                }}
                className="w-full py-3 px-4 rounded-xl bg-accent text-white font-mono text-xs font-bold shadow-cinematic hover:bg-accent/90 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>✓ İzledim</span>
                <span className="text-[10px] opacity-75 font-normal">(& Puanla)</span>
              </button>

              {/* Secondary Actions Row */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setChosenStatus("PARTIALLY_WATCHED");
                    setStep("step2");
                  }}
                  className="py-2.5 px-2 rounded-xl bg-surface-elevated border border-accent/40 text-accent font-mono text-[11px] font-semibold hover:bg-accent/10 transition-all active:scale-[0.98] text-center"
                >
                  ⏳ Kısmen
                </button>

                <button
                  onClick={() => onAnswer("NOT_WATCHED", null)}
                  className="py-2.5 px-2 rounded-xl bg-surface-elevated border border-border text-text-secondary font-mono text-[11px] font-medium hover:text-text-primary hover:border-text-muted transition-all active:scale-[0.98] text-center"
                >
                  ✕ İzlemedim
                </button>

                <button
                  onClick={() => onAnswer("UNSURE", null)}
                  className="py-2.5 px-2 rounded-xl bg-surface-elevated border border-border text-text-muted font-mono text-[11px] font-medium hover:text-text-secondary transition-all active:scale-[0.98] text-center"
                >
                  ? Emin Değilim
                </button>
              </div>
            </div>
          ) : (
            /* Mobile Step 2: Rating Flow */
            <div className="space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-text-primary font-bold">
                  {chosenStatus === "PARTIALLY_WATCHED"
                    ? "Kısmen izlediğin diziyi puanla:"
                    : "Diziyi nasıl buldun?"}
                </div>
                <button
                  onClick={() => setStep("step1")}
                  className="text-[11px] font-mono text-text-muted hover:text-text-primary underline"
                >
                  ← Geri
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAnswer(chosenStatus, "LOVE")}
                  className="py-2.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold hover:bg-emerald-500/25 transition-all text-center"
                >
                  🔥 Çok Sevdim
                </button>
                <button
                  onClick={() => onAnswer(chosenStatus, "LIKE")}
                  className="py-2.5 px-3 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-300 font-mono text-xs font-bold hover:bg-blue-500/25 transition-all text-center"
                >
                  👍 Beğendim
                </button>
                <button
                  onClick={() => onAnswer(chosenStatus, "NEUTRAL")}
                  className="py-2.5 px-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold hover:bg-amber-500/25 transition-all text-center"
                >
                  😐 Ortalama
                </button>
                <button
                  onClick={() => onAnswer(chosenStatus, "DISLIKE")}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold hover:bg-rose-500/25 transition-all text-center"
                >
                  👎 Sevmedim
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP LAYOUT (hidden md:flex)                                           */}
      {/* ========================================================================= */}
      <div className="relative z-10 hidden md:flex gap-8 items-stretch">
        {/* Left Column: Big Poster */}
        <div className="w-56 aspect-[2/3] rounded-2xl bg-surface-elevated border border-border/80 flex-shrink-0 relative overflow-hidden shadow-cinematic group">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={tvShow.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-mono p-4 text-center">
              {tvShow.name}
            </div>
          )}
          {tvShow.voteAverage > 0 && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-xs font-mono text-accent font-bold">
              ★ {tvShow.voteAverage.toFixed(1)}
            </div>
          )}
        </div>

        {/* Right Column: Metadata + Actions */}
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            {/* Title & Original Title */}
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
                {tvShow.name}
              </h2>
              {tvShow.originalName && tvShow.originalName !== tvShow.name && (
                <p className="text-xs text-text-muted italic mt-0.5">
                  {tvShow.originalName}
                </p>
              )}
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              {airYears && (
                <span className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-text-primary font-medium">
                  {airYears}
                </span>
              )}
              {tvShow.numberOfSeasons && (
                <span className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-text-secondary">
                  {tvShow.numberOfSeasons} Sezon
                  {tvShow.numberOfEpisodes ? ` (${tvShow.numberOfEpisodes} Bölüm)` : ""}
                </span>
              )}
              {statusLabel && (
                <span className="px-2.5 py-1 rounded-lg bg-accent/15 border border-accent/30 text-accent font-semibold">
                  {statusLabel}
                </span>
              )}
            </div>

            {/* Genre Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tvShow.genres.map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border/80 text-xs font-mono text-text-secondary"
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Overview */}
            {tvShow.overview && (
              <p className="text-sm text-text-secondary leading-relaxed line-clamp-4 pt-1">
                {tvShow.overview}
              </p>
            )}
          </div>

          {/* Desktop Actions */}
          <div className="border-t border-border/60 pt-5">
            {step === "step1" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                  <span>Bu diziyi izledin mi?</span>
                  <span className="text-[11px] opacity-75">Klavye: [1-4]</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {/* Action 1: İzledim */}
                  <button
                    onClick={() => {
                      setChosenStatus("WATCHED");
                      setStep("step2");
                    }}
                    className="py-3 px-3 rounded-xl bg-accent text-white font-mono text-xs font-bold shadow-cinematic hover:bg-accent/90 transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
                  >
                    ✓ İzledim <span className="text-[10px] opacity-75 block font-normal">[1]</span>
                  </button>

                  {/* Action 2: Kısmen İzledim */}
                  <button
                    onClick={() => {
                      setChosenStatus("PARTIALLY_WATCHED");
                      setStep("step2");
                    }}
                    className="py-3 px-3 rounded-xl bg-surface-elevated border border-accent/40 text-accent font-mono text-xs font-semibold hover:bg-accent/15 transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
                  >
                    ⏳ Kısmen İzledim <span className="text-[10px] opacity-75 block font-normal">[2]</span>
                  </button>

                  {/* Action 3: İzlemedim */}
                  <button
                    onClick={() => onAnswer("NOT_WATCHED", null)}
                    className="py-3 px-3 rounded-xl bg-surface-elevated border border-border text-text-secondary font-mono text-xs font-medium hover:text-text-primary hover:border-text-muted transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
                  >
                    ✕ İzlemedim <span className="text-[10px] opacity-75 block font-normal">[3]</span>
                  </button>

                  {/* Action 4: Emin Değilim */}
                  <button
                    onClick={() => onAnswer("UNSURE", null)}
                    className="py-3 px-3 rounded-xl bg-surface-elevated border border-border text-text-muted font-mono text-xs font-medium hover:text-text-secondary transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
                  >
                    ? Emin Değilim <span className="text-[10px] opacity-75 block font-normal">[4]</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Desktop Step 2: Rating Flow */
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-primary font-bold">
                    {chosenStatus === "PARTIALLY_WATCHED"
                      ? "Kısmen izlediğin bu diziyi nasıl buldun?"
                      : "Bu diziyi nasıl buldun?"}
                  </span>
                  <button
                    onClick={() => setStep("step1")}
                    className="text-[11px] text-text-muted hover:text-text-primary underline flex items-center gap-1"
                  >
                    ← Geri Dön [Esc]
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => onAnswer(chosenStatus, "LOVE")}
                    className="py-3 px-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold hover:bg-emerald-500/25 transition-all hover:scale-[1.02] text-center"
                  >
                    🔥 Çok Sevdim <span className="text-[10px] opacity-75 block font-normal">[1]</span>
                  </button>
                  <button
                    onClick={() => onAnswer(chosenStatus, "LIKE")}
                    className="py-3 px-2 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-300 font-mono text-xs font-bold hover:bg-blue-500/25 transition-all hover:scale-[1.02] text-center"
                  >
                    👍 Beğendim <span className="text-[10px] opacity-75 block font-normal">[2]</span>
                  </button>
                  <button
                    onClick={() => onAnswer(chosenStatus, "NEUTRAL")}
                    className="py-3 px-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold hover:bg-amber-500/25 transition-all hover:scale-[1.02] text-center"
                  >
                    😐 Ortalama <span className="text-[10px] opacity-75 block font-normal">[3]</span>
                  </button>
                  <button
                    onClick={() => onAnswer(chosenStatus, "DISLIKE")}
                    className="py-3 px-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold hover:bg-rose-500/25 transition-all hover:scale-[1.02] text-center"
                  >
                    👎 Sevmedim <span className="text-[10px] opacity-75 block font-normal">[4]</span>
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
