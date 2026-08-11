import React from "react";

export function MovieCardSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl bg-surface border border-border p-6 md:p-8 shadow-cinematic">
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
        {/* Poster Frame Skeleton */}
        <div className="w-64 h-96 rounded-xl bg-surface-elevated border border-border/80 animate-pulse flex-shrink-0 flex items-center justify-center relative overflow-hidden">
          <div className="text-text-muted text-xs font-mono uppercase tracking-widest">
            Poster Frame
          </div>
        </div>

        {/* Info & Action Buttons Skeleton */}
        <div className="flex-1 flex flex-col justify-between w-full space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 rounded bg-surface-elevated animate-pulse" />
              <div className="h-4 w-24 rounded bg-surface-elevated animate-pulse" />
            </div>
            <div className="h-8 w-3/4 rounded-lg bg-surface-elevated animate-pulse" />
            <div className="h-4 w-full rounded bg-surface-elevated animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-surface-elevated animate-pulse" />
          </div>

          {/* Core Response Options Placeholder */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <p className="text-xs uppercase tracking-widest text-text-muted font-mono text-center md:text-left">
              BUNU İZLEDİN Mİ?
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                disabled
                className="py-3 px-4 rounded-xl bg-surface-elevated border border-border text-text-secondary text-sm font-medium opacity-70 cursor-not-allowed"
              >
                İzledim
              </button>
              <button
                disabled
                className="py-3 px-4 rounded-xl bg-surface-elevated border border-border text-text-secondary text-sm font-medium opacity-70 cursor-not-allowed"
              >
                İzlemedim
              </button>
              <button
                disabled
                className="py-3 px-4 rounded-xl bg-surface-elevated border border-border text-text-secondary text-sm font-medium opacity-70 cursor-not-allowed"
              >
                Emin Değilim
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
