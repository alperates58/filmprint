"use client";

import React from "react";
import { GenrePreference } from "@/lib/profile/types";

interface GenreSignatureProps {
  genres: GenrePreference[];
}

export function GenreSignature({ genres }: GenreSignatureProps) {
  const topGenres = genres.slice(0, 6);

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold mb-1">
            <span>🍿 TÜR SPEKTRUMU</span>
          </div>
          <h3 className="font-display text-xl font-bold text-text-primary tracking-tight">
            Baskın Sinema Türleriniz
          </h3>
          <p className="text-xs text-text-secondary font-sans mt-0.5">
            Oylamalarınız ve beğeni yoğunluğunuzdan çıkarılan tür afiniteleri.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-1">
        {topGenres.map((g) => {
          const percentage = Math.round(g.score * 100);
          return (
            <div key={g.name} className="space-y-1.5 font-sans">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-text-primary">{g.name}</span>
                <span className="text-text-secondary font-medium">
                  <strong className="text-text-primary">%{percentage}</strong> Uyum ({g.ratedCount} film)
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-surface-2 overflow-hidden border border-border">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-700 shadow-sm"
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
