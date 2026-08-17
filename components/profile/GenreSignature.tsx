"use client";

import React from "react";
import { GenrePreference } from "@/lib/profile/types";
import { getGenreColor } from "@/lib/profile/dna-insights";

interface GenreSignatureProps {
  genres: GenrePreference[];
  mediaType?: "FILM" | "TV";
}

export function GenreSignature({ genres, mediaType = "FILM" }: GenreSignatureProps) {
  const topGenres = genres.filter((g) => g.score > 0).slice(0, 8);
  const isFilm = mediaType === "FILM";

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold mb-1">
            <span>🍿 TÜR SPEKTRUMU</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            {isFilm ? "Baskın Sinema Türleriniz" : "Baskın Dizi Türleriniz"}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary font-sans mt-0.5">
            Değerlendirmeleriniz ve beğeni yoğunluğunuzdan hesaplanan tür afinite spektrumu.
          </p>
        </div>

        <div className="text-xs font-sans text-text-muted self-start sm:self-auto px-3 py-1.5 rounded-xl bg-surface-2 border border-border">
          <span>{topGenres.length} Aktif Tür İncelendi</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-sans">
        {topGenres.map((g, idx) => {
          const percentage = Math.round(g.score * 100);
          const colorToken = getGenreColor(g.name);
          const intensityLabel =
            percentage >= 85
              ? "Baskın Tutku"
              : percentage >= 70
              ? "Güçlü Uyum"
              : percentage >= 50
              ? "Dengeli İlgi"
              : "Keşif Alanı";

          return (
            <div
              key={g.name}
              className="p-4 rounded-2xl bg-surface-2 border border-border/80 hover:border-border-strong transition-all space-y-2.5 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-text-muted w-4">{idx + 1}.</span>
                  <span className="font-bold text-sm text-text-primary group-hover:text-accent transition-colors">
                    {g.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${colorToken.bg} ${colorToken.border} ${colorToken.text}`}
                  >
                    {intensityLabel}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-text-primary">%{percentage}</span>
                  <span className="text-[11px] text-text-muted ml-1">({g.ratedCount} {isFilm ? "film" : "dizi"})</span>
                </div>
              </div>

              {/* Colorful Distinct Affinity Bar */}
              <div className="w-full h-2 rounded-full bg-surface-3 overflow-hidden border border-border/50">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${colorToken.gradient} transition-all duration-700 shadow-sm`}
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
