"use client";

import React, { useState } from "react";
import { getProgressionForCount } from "@/lib/progression/service";
import { RANK_DEFINITIONS } from "@/lib/progression/constants";

interface FilmJourneyProps {
  evaluatedCount: number;
}

export function FilmJourney({ evaluatedCount }: FilmJourneyProps) {
  const [showAllRanks, setShowAllRanks] = useState(false);
  const progression = getProgressionForCount(evaluatedCount);
  const { currentRank, nextRank, upcomingRanks, remaining, progress, isMaxRank } = progression;

  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 shadow-md space-y-6">
      {/* Header & Main Rank Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <span>🏆 SİNEMA YOLCULUĞU & RÜTBE</span>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-3xl sm:text-4xl select-none p-2 rounded-2xl bg-surface-2 border border-border shadow-sm">
              {currentRank.badgeIcon}
            </span>
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                {currentRank.label}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary font-sans mt-0.5">
                {currentRank.description}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 rounded-2xl bg-surface-2 border border-border text-right self-start md:self-auto min-w-[160px] font-sans shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">DEĞERLENDİRİLEN</p>
          <p className="text-xl font-bold text-text-primary">
            {evaluatedCount} <span className="text-xs font-normal text-text-muted">Film</span>
          </p>
        </div>
      </div>

      {/* Progress Bar & Next Target */}
      <div className="space-y-3 font-sans">
        <div className="flex justify-between items-center text-xs">
          <span className="text-text-muted">
            {isMaxRank
              ? "👑 En yüksek sinema rütbesine ulaştınız!"
              : `${evaluatedCount} / ${nextRank?.minimum} Film`}
          </span>
          {!isMaxRank && nextRank && (
            <span className="text-text-primary font-medium">
              Sıradaki: <span className="text-accent font-bold">{nextRank.label}</span> ({remaining} film kaldı)
            </span>
          )}
        </div>

        {/* Accessible Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Film Yolculuğu İlerlemesi"
          className="w-full h-3 rounded-full bg-surface-2 overflow-hidden border border-border/70"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-accent transition-all duration-700 shadow-sm"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Upcoming Next 3 Ranks Preview */}
      {!isMaxRank && upcomingRanks && upcomingRanks.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-display text-sm font-bold text-text-primary flex items-center gap-1.5">
            <span>🎯</span> Sıradaki Hedef Rütbeler
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {upcomingRanks.map((rank) => (
              <div
                key={rank.key}
                className="p-4 rounded-2xl bg-surface-2 border border-border space-y-1.5 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl select-none">{rank.badgeIcon}</span>
                  <div>
                    <p className="text-xs font-bold text-text-primary">{rank.label}</p>
                    <span className="text-[10px] text-text-muted font-sans font-medium">
                      {rank.minimum} Film Hedefi
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">
                  {rank.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View All Ranks Accordion */}
      <div className="pt-2 border-t border-border/50">
        <button
          onClick={() => setShowAllRanks((prev) => !prev)}
          className="text-xs font-sans font-semibold text-accent hover:text-accent-hover hover:underline transition-colors flex items-center gap-1.5"
        >
          <span>{showAllRanks ? "▲ Rütbeler Tablosunu Gizle" : "▼ Tüm Rütbe Sistemini Gör (1 - 1000+ Film)"}</span>
        </button>

        {showAllRanks && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-4 animate-fadeIn">
            {RANK_DEFINITIONS.map((r) => {
              const isAchieved = evaluatedCount >= r.minimum;
              const isCurrent = r.key === currentRank.key;

              return (
                <div
                  key={r.key}
                  className={`p-3 rounded-xl border text-xs font-sans transition-all ${
                    isCurrent
                      ? "bg-amber-500/15 border-amber-500/50 text-amber-300 font-bold shadow-sm"
                      : isAchieved
                      ? "bg-surface-2/80 border-border text-text-primary"
                      : "bg-surface-2/30 border-border/40 text-text-muted opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{r.badgeIcon}</span>
                      <span>{r.label}</span>
                    </div>
                    <span className="text-[10px] font-mono">
                      {r.minimum}+ Film
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
