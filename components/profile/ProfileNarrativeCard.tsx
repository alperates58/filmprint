"use client";

import React from "react";
import type { CompoundInsight } from "@/lib/profile/dna-insights";

interface ProfileNarrativeCardProps {
  insights: CompoundInsight[];
  mediaType?: "FILM" | "TV";
}

export function ProfileNarrativeCard({
  insights,
  mediaType = "FILM",
}: ProfileNarrativeCardProps) {
  if (!insights || insights.length === 0) return null;
  const isFilm = mediaType === "FILM";

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6 shadow-md">
      <div className="border-b border-border/60 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-400 text-xs font-semibold mb-1">
          <span>🧠 EDİTÖRYEL ZEVK İÇGÖRÜLERİ</span>
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
          {isFilm ? "Derinlemesine Sinema Profili Analizi" : "Derinlemesine Dizi Profili Analizi"}
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary font-sans mt-0.5">
          Etkileşimleriniz arasındaki çapraz örüntülerden derlenen kişiselleştirilmiş içgörüler.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-surface-2 border border-border/80 hover:border-accent/40 transition-all duration-300 space-y-3 flex flex-col justify-between shadow-sm group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${insight.badgeColor}`}
                >
                  {insight.badge}
                </span>
                <span className="text-xl select-none">{insight.icon}</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-text-muted">
                  {insight.subtitle}
                </span>
                <h3 className="text-base font-bold text-text-primary group-hover:text-accent transition-colors">
                  {insight.title}
                </h3>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                {insight.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
