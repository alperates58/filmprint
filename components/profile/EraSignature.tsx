"use client";

import React from "react";
import { EraPreference } from "@/lib/profile/types";

interface EraSignatureProps {
  eras: EraPreference[];
  mediaType?: "FILM" | "TV";
}

export function EraSignature({ eras, mediaType = "FILM" }: EraSignatureProps) {
  const activeEras = eras.filter((e) => e.ratedCount > 0 || e.score > 0);
  const isFilm = mediaType === "FILM";
  const strongestEra = activeEras[0] || null;

  // Calculate modern vs classical ratio
  let modernScoreSum = 0;
  let classicalScoreSum = 0;
  activeEras.forEach((era) => {
    if (era.key.includes("202") || era.key.includes("201") || era.key.includes("200")) {
      modernScoreSum += era.score;
    } else {
      classicalScoreSum += era.score;
    }
  });
  const totalWeight = modernScoreSum + classicalScoreSum || 1;
  const modernPct = Math.round((modernScoreSum / totalWeight) * 100);
  const classicalPct = 100 - modernPct;

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-1">
            <span>⌛ DÖNEM HARİTASI</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            {isFilm ? "Sinema Dönemi Tercihleriniz" : "Dizi Dönemi Tercihleriniz"}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary font-sans mt-0.5">
            Zaman tünelinde en yüksek tatmini aldığınız yapım yılları ve estetik dönemler.
          </p>
        </div>

        {strongestEra && (
          <div className="px-3.5 py-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-sans font-bold flex items-center gap-2 self-start sm:self-auto">
            <span>🌟 Zirve Dönem:</span>
            <span>{strongestEra.label}</span>
          </div>
        )}
      </div>

      {/* Modern vs Classical Balance Bar */}
      <div className="p-5 rounded-2xl bg-surface-2 border border-border space-y-2.5 font-sans">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-cyan-400 flex items-center gap-1.5">
            <span>🚀</span>
            <span>Çağdaş & Modern (%{modernPct})</span>
          </span>
          <span className="text-amber-400 flex items-center gap-1.5">
            <span>Klasik & Nostalji (%{classicalPct})</span>
            <span>🏛️</span>
          </span>
        </div>

        <div className="w-full h-3 rounded-full bg-surface-3 overflow-hidden border border-border/60 flex">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
            style={{ width: `${modernPct}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
            style={{ width: `${classicalPct}%` }}
          />
        </div>
      </div>

      {/* Decade Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 font-sans">
        {activeEras.map((era, idx) => {
          const scorePct = Math.round(era.score * 100);
          const isTop = idx === 0;

          return (
            <div
              key={era.key}
              className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-3 ${
                isTop
                  ? "bg-cyan-500/10 border-cyan-500/40 shadow-sm"
                  : "bg-surface-2 border-border hover:border-border-strong"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                    {era.key}
                  </span>
                  <h3 className="text-sm font-bold text-text-primary mt-0.5">
                    {era.label}
                  </h3>
                </div>

                {isTop && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                    #1 Zirve
                  </span>
                )}
              </div>

              <div className="space-y-1.5 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">{era.ratedCount} {isFilm ? "Film" : "Dizi"}</span>
                  <span className="font-bold text-text-primary">%{scorePct} Uyum</span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isTop ? "bg-cyan-400" : "bg-accent"
                    }`}
                    style={{ width: `${scorePct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
