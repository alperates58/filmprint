"use client";

import React from "react";
import { GenrePreference } from "@/lib/profile/types";

interface GenreSignatureProps {
  genres: GenrePreference[];
}

export function GenreSignature({ genres }: GenreSignatureProps) {
  const topGenres = genres.slice(0, 6);

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface border border-border/80 space-y-6 shadow-cinematic">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-text-primary tracking-tight">
            Tür İmzan (Genre Signature)
          </h3>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            Ağırlıklı değerlendirme puanına göre favori sinema türlerin
          </p>
        </div>
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
          SÜRÜM 1.0
        </span>
      </div>

      <div className="space-y-4">
        {topGenres.map((g) => {
          const percentage = Math.round(g.score * 100);
          return (
            <div key={g.name} className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="font-semibold text-text-primary">{g.name}</span>
                <span className="text-text-secondary">
                  %{percentage} ({g.ratedCount} film)
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-surface-elevated overflow-hidden border border-border/60 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent/80 to-accent transition-all duration-700 shadow-sm"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
