"use client";

import React from "react";
import { getProgressionForCount } from "@/lib/progression/service";
import { RANK_DEFINITIONS } from "@/lib/progression/constants";

interface FilmJourneyProps {
  evaluatedCount: number;
}

export function FilmJourney({ evaluatedCount }: FilmJourneyProps) {
  const progression = getProgressionForCount(evaluatedCount);
  const { currentRank, nextRank, remaining, progress, isMaxRank } = progression;

  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface border border-border/80 shadow-cinematic space-y-6">
      {/* Header & Main Rank Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            FİLM YOLCULUĞUN & PRESTİJ
          </span>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentRank.badgeIcon}</span>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                {currentRank.label}
              </h2>
              <p className="text-xs text-text-secondary font-mono">
                {currentRank.description}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 rounded-2xl bg-surface-elevated border border-border text-right self-start md:self-auto min-w-[160px]">
          <p className="text-[10px] uppercase font-mono text-text-muted">DEĞERLENDİRİLEN</p>
          <p className="text-lg font-mono font-bold text-text-primary">
            {evaluatedCount} <span className="text-xs font-normal text-text-muted">Film</span>
          </p>
        </div>
      </div>

      {/* Progress Bar & Next Target */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-text-muted">
            {isMaxRank
              ? "En yüksek rütbeye ulaştınız!"
              : `${evaluatedCount} / ${nextRank?.minimum} Film`}
          </span>
          {!isMaxRank && nextRank && (
            <span className="text-text-primary font-semibold">
              Sıradaki rütbe: <span className="text-accent">{nextRank.label}</span> ({remaining} film kaldı)
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
          className="w-full h-3.5 rounded-full bg-surface-elevated overflow-hidden border border-border/80 p-0.5"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent/80 to-accent transition-all duration-500 shadow-sm"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="text-xs text-text-muted font-mono italic">
          Film DNA&apos;n daha fazla film değerlendirdikçe netleşmeye devam eder.
        </p>
      </div>

      {/* Stepper / Rank Path */}
      <div className="pt-4 border-t border-border/60 space-y-3">
        <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
          RÜTBE YOLCULUĞU (PATH)
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {RANK_DEFINITIONS.map((r) => {
            const isCurrent = r.key === currentRank.key;
            const isPassed = evaluatedCount >= r.minimum;

            return (
              <div
                key={r.key}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col justify-between space-y-1 ${
                  isCurrent
                    ? "bg-accent/15 border-accent text-text-primary shadow-md ring-1 ring-accent/40"
                    : isPassed
                    ? "bg-surface-elevated/80 border-border text-text-secondary"
                    : "bg-surface-elevated/30 border-border/40 text-text-muted opacity-60"
                }`}
              >
                <div className="text-xl">{r.badgeIcon}</div>
                <div>
                  <p className={`text-xs font-mono font-bold truncate ${isCurrent ? "text-accent" : ""}`}>
                    {r.label}
                  </p>
                  <p className="text-[10px] font-mono text-text-muted">
                    {r.minimum}+ Film
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
