"use client";

import React from "react";
import { EraPreference } from "@/lib/profile/types";

interface EraSignatureProps {
  eras: EraPreference[];
}

export function EraSignature({ eras }: EraSignatureProps) {
  const activeEras = eras.filter((e) => e.ratedCount > 0);

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6 shadow-md">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold mb-1">
          <span>⌛ DÖNEM İMZASI</span>
        </div>
        <h3 className="font-display text-xl font-bold text-text-primary tracking-tight">
          En Güçlü Sinema Dönemleriniz
        </h3>
        <p className="text-xs text-text-secondary font-sans mt-0.5">
          Etkileşime girdiğiniz ve yüksek puan verdiğiniz yapım dönemleri.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeEras.map((era) => {
          const scorePct = Math.round(era.score * 100);
          return (
            <div
              key={era.key}
              className="p-4 rounded-2xl bg-surface-2 border border-border space-y-3 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] uppercase font-sans font-semibold text-text-muted">
                  {era.key}
                </span>
                <p className="text-sm font-semibold text-text-primary mt-0.5">
                  {era.label}
                </p>
              </div>

              <div className="flex items-end justify-between pt-2 border-t border-border/60">
                <span className="text-xs text-text-secondary font-sans">
                  {era.ratedCount} Film
                </span>
                <span className="text-sm font-sans font-bold text-accent">
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
