"use client";

import React from "react";

interface TasteTraitsProps {
  traits: string[];
  popularityLabel: string;
  familiarityDesc: string;
}

export function TasteTraits({ traits, popularityLabel, familiarityDesc }: TasteTraitsProps) {
  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6 shadow-md">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold mb-1">
          <span>🎭 ZEVK KARAKTERİ</span>
        </div>
        <h3 className="font-display text-xl font-bold text-text-primary tracking-tight">
          Sinematik Kimlik Özellikleriniz
        </h3>
        <p className="text-xs text-text-secondary font-sans mt-0.5">
          İzleme alışkanlıklarınız, atmosfer tercihiniz ve hikaye yaklaşımınız.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {traits.map((trait) => (
          <div
            key={trait}
            className="px-3.5 py-2 rounded-xl bg-surface-2 border border-border hover:border-accent/40 text-text-primary text-xs font-sans font-medium flex items-center gap-2 shadow-sm transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>{trait}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-1">
          <p className="text-[11px] font-sans font-semibold text-text-muted">POPÜLERLİK EĞİLİMİ</p>
          <p className="text-sm font-semibold text-text-primary">{popularityLabel}</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-1">
          <p className="text-[11px] font-sans font-semibold text-text-muted">KEŞİF DÜZEYİ</p>
          <p className="text-sm font-semibold text-text-primary">{familiarityDesc}</p>
        </div>
      </div>
    </div>
  );
}
