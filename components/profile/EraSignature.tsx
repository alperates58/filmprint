"use client";

import React from "react";
import { EraPreference } from "@/lib/profile/types";

interface EraSignatureProps {
  eras: EraPreference[];
}

export function EraSignature({ eras }: EraSignatureProps) {
  const activeEras = eras.filter((e) => e.ratedCount > 0);

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface border border-border/80 space-y-6 shadow-cinematic">
      <div>
        <h3 className="font-display text-lg font-bold text-text-primary tracking-tight">
          ⌛ En Güçlü Dönemlerin
        </h3>
        <p className="text-xs text-text-muted font-mono mt-0.5">
          Sinema yolculuğunda en çok etkileşime girdiğin ve yüksek puan verdiğin yapım yılları.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeEras.map((era) => {
          const scorePct = Math.round(era.score * 100);
          return (
            <div
              key={era.key}
              className="p-4 rounded-2xl bg-surface-elevated border border-border/70 space-y-2 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] uppercase font-mono text-text-muted">
                  {era.key}
                </span>
                <p className="text-xs font-semibold text-text-primary mt-0.5">
                  {era.label}
                </p>
              </div>

              <div className="flex items-end justify-between pt-2">
                <span className="text-[10px] font-mono text-text-muted">
                  {era.ratedCount} Değerlendirme
                </span>
                <span className="text-sm font-mono font-bold text-accent">
                  %{scorePct}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
