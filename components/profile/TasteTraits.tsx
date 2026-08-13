"use client";

import React from "react";

interface TasteTraitsProps {
  traits: string[];
  popularityLabel: string;
  familiarityDesc: string;
}

export function TasteTraits({ traits, popularityLabel, familiarityDesc }: TasteTraitsProps) {
  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface border border-border/80 space-y-6 shadow-cinematic">
      <div>
        <h3 className="font-display text-lg font-bold text-text-primary tracking-tight">
          🎭 Seni Anlatan Sinema Kimlikleri
        </h3>
        <p className="text-xs text-text-muted font-mono mt-0.5">
          İzleme alışkanlıkların, atmosfer beklentin ve hikaye anlatımına yaklaşımın.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {traits.map((trait) => (
          <div
            key={trait}
            className="px-4 py-2 rounded-xl bg-accent/15 border border-accent/30 text-text-primary text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>{trait}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <div className="p-4 rounded-2xl bg-surface-elevated border border-border/60 space-y-1">
          <p className="text-[10px] uppercase font-mono text-text-muted">POPÜLERLİK YÖNELİMİ</p>
          <p className="text-xs font-bold text-text-primary">{popularityLabel}</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-elevated border border-border/60 space-y-1">
          <p className="text-[10px] uppercase font-mono text-text-muted">KULLANICI TANINIRLIĞI</p>
          <p className="text-xs font-bold text-text-primary">{familiarityDesc}</p>
        </div>
      </div>
    </div>
  );
}
