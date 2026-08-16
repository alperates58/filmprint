"use client";

import React, { useState } from "react";
import { getTvProgressionForCount } from "@/lib/progression/service";
import { TV_RANK_DEFINITIONS } from "@/lib/progression/constants";

interface TvJourneyProps {
  evaluatedCount: number;
}

export function TvJourney({ evaluatedCount }: TvJourneyProps) {
  const [showAllRanks, setShowAllRanks] = useState(false);
  const progression = getTvProgressionForCount(evaluatedCount);
  const { currentRank, nextRank, upcomingRanks, remaining, progress, isMaxRank } = progression;

  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 shadow-md space-y-6">
      {/* Header & Main Rank Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold">
            <span>📺 DİZİ YOLCULUĞU & RÜTBE</span>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-3xl select-none">{currentRank.badgeIcon}</span>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                {currentRank.label}
              </h2>
              <p className="text-xs text-text-secondary font-sans">
                {currentRank.description}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 rounded-2xl bg-surface-2 border border-border text-right self-start md:self-auto min-w-[160px]">
          <p className="text-[11px] font-sans font-semibold text-text-muted">DEĞERLENDİRİLEN</p>
          <p className="text-lg font-sans font-bold text-text-primary">
            {evaluatedCount} <span className="text-xs font-normal text-text-muted">Dizi</span>
          </p>
        </div>
      </div>

      {/* Progress Bar & Next Target */}
      <div className="space-y-3 font-sans">
        <div className="flex justify-between items-center text-xs">
          <span className="text-text-muted">
            {isMaxRank
              ? "En yüksek rütbeye ulaştınız! (Yaşayan Dizi Arşivi)"
              : `${evaluatedCount} / ${nextRank?.minimum} Dizi`}
          </span>
          {!isMaxRank && nextRank && (
            <span className="text-text-primary font-medium">
              Sıradaki: <span className="text-accent font-semibold">{nextRank.label}</span> ({remaining} dizi kaldı)
            </span>
          )}
        </div>

        {/* Accessible Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Dizi Yolculuğu İlerlemesi"
          className="w-full h-3 rounded-full bg-surface-2 overflow-hidden border border-border"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500 shadow-sm"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="text-xs text-text-muted font-sans italic">
          Dizi DNA&apos;nız daha fazla dizi değerlendirdikçe derinleşmeye ve keskinleşmeye devam eder.
        </p>
      </div>

      {/* Upcoming Next 3 Ranks Preview */}
      {!isMaxRank && upcomingRanks && upcomingRanks.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="font-display text-sm font-bold text-text-primary flex items-center gap-1.5">
            <span>🎯</span> Sıradaki Hedef Rütbeler
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {upcomingRanks.map((rank) => (
              <div
                key={rank.key}
                className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl select-none">{rank.badgeIcon}</span>
                  <div>
                    <p className="text-xs font-bold text-text-primary">{rank.label}</p>
                    <span className="text-[10px] text-text-muted font-sans font-medium">
                      {rank.minimum} Dizi Hedefi
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toggle All 16 Ranks Matrix */}
      <div className="pt-2">
        <button
          onClick={() => setShowAllRanks((prev) => !prev)}
          className="text-xs font-sans text-accent hover:underline flex items-center gap-1"
        >
          <span>{showAllRanks ? "▲ Tüm Rütbeleri Gizle" : "▼ Tüm 16 Dizi Rütbesini Gör"}</span>
        </button>

        {showAllRanks && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1 animate-fadeIn font-sans">
            {TV_RANK_DEFINITIONS.map((r) => {
              const isCurrent = r.key === currentRank.key;
              const isUnlocked = evaluatedCount >= r.minimum;
              return (
                <div
                  key={r.key}
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
                    isCurrent
                      ? "bg-accent-subtle border-accent text-text-primary font-bold shadow-sm"
                      : isUnlocked
                      ? "bg-surface-2 border-border text-text-secondary"
                      : "bg-surface-2/40 border-border/40 text-text-muted opacity-60"
                  }`}
                >
                  <span className="text-lg select-none">{r.badgeIcon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold">{r.label}</p>
                    <span className="text-[10px] text-text-muted">
                      {r.minimum}+ Dizi
                    </span>
                  </div>
                  {isUnlocked && <span className="text-emerald-400 text-xs font-bold">✓</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
