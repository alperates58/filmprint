"use client";

import React from "react";
import { getGenreColor } from "@/lib/profile/dna-insights";

export interface ProfileStatItem {
  id: string;
  icon: string;
  category: string;
  value: string;
  subValue?: string;
  description: string;
  metricPct?: number;
  themeColor?: "violet" | "cyan" | "emerald" | "amber" | "rose" | "blue";
  genreName?: string;
}

export interface ProfileStatGridProps {
  items: ProfileStatItem[];
}

export function ProfileStatGrid({ items }: ProfileStatGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 font-sans">
      {items.map((item) => {
        const genreColor = item.genreName ? getGenreColor(item.genreName) : null;

        return (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-surface-1 border border-border/80 hover:border-accent/40 transition-all duration-300 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md group"
          >
            <div className="space-y-2">
              {/* Category Pill */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    genreColor ? `${genreColor.bg} ${genreColor.border} border ${genreColor.text}` : "bg-surface-2 border border-border text-text-muted"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.category}</span>
                </span>

                {item.subValue && (
                  <span className="text-[11px] font-semibold text-text-muted">
                    {item.subValue}
                  </span>
                )}
              </div>

              {/* Main Headline Value */}
              <h3 className="font-display text-lg font-bold text-text-primary tracking-tight group-hover:text-accent transition-colors">
                {item.value}
              </h3>

              {/* Context Description */}
              <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                {item.description}
              </p>
            </div>

            {/* Micro Visual Progress Bar */}
            {typeof item.metricPct === "number" && (
              <div className="pt-2 border-t border-border/50 space-y-1">
                <div className="flex justify-between text-[10px] font-medium text-text-muted">
                  <span>Afinite</span>
                  <span className="font-bold text-text-primary">%{Math.round(item.metricPct)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden border border-border/60">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      genreColor ? genreColor.barColor : "bg-accent"
                    }`}
                    style={{ width: `${Math.max(5, Math.min(100, item.metricPct))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
