import React from "react";

export function TvCardSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-surface border border-border/80 p-3.5 sm:p-5 md:p-8 shadow-cinematic animate-pulse">
      {/* ========================================================================= */}
      {/* MOBILE SKELETON (block md:hidden)                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:hidden space-y-3">
        {/* Top Info Row: Poster + Meta */}
        <div className="flex gap-3.5 items-start">
          <div className="w-24 sm:w-28 aspect-[2/3] rounded-xl bg-surface-elevated flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-1.5">
              <div className="h-4 w-12 rounded bg-surface-elevated" />
              <div className="h-4 w-10 rounded bg-surface-elevated" />
              <div className="h-4 w-16 rounded bg-surface-elevated" />
            </div>
            <div className="h-5 w-3/4 rounded-md bg-surface-elevated" />
            <div className="h-3 w-1/2 rounded bg-surface-elevated" />
            <div className="h-8 w-full rounded bg-surface-elevated/60" />
          </div>
        </div>

        {/* Interaction Controls Skeleton */}
        <div className="pt-2.5 border-t border-border/60 space-y-2">
          <div className="h-3 w-28 rounded bg-surface-elevated" />
          <div className="h-12 w-full rounded-xl bg-surface-elevated" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-11 rounded-xl bg-surface-elevated" />
            <div className="h-11 rounded-xl bg-surface-elevated" />
          </div>
          <div className="h-9 w-full rounded-xl bg-surface-elevated/60" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP SKELETON (hidden md:flex)                                         */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-row gap-10 items-start">
        {/* Poster Skeleton */}
        <div className="w-64 aspect-[2/3] rounded-2xl bg-surface-elevated flex-shrink-0 flex items-center justify-center relative overflow-hidden">
          <div className="text-text-muted text-xs font-mono uppercase tracking-widest">
            Poster Frame
          </div>
        </div>

        {/* Info & Action Buttons Skeleton */}
        <div className="flex-1 flex flex-col justify-between w-full min-h-[320px] space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 rounded-full bg-surface-elevated" />
              <div className="h-5 w-20 rounded-full bg-surface-elevated" />
              <div className="h-5 w-24 rounded-full bg-surface-elevated" />
            </div>
            <div className="h-8 w-3/4 rounded-lg bg-surface-elevated" />
            <div className="h-4 w-1/3 rounded bg-surface-elevated" />
            <div className="h-14 w-full rounded-lg bg-surface-elevated/60" />
          </div>

          {/* Action Buttons Placeholder */}
          <div className="space-y-3 pt-4 border-t border-border/60">
            <div className="h-3 w-32 rounded bg-surface-elevated" />
            <div className="grid grid-cols-4 gap-3">
              <div className="h-12 rounded-xl bg-surface-elevated" />
              <div className="h-12 rounded-xl bg-surface-elevated" />
              <div className="h-12 rounded-xl bg-surface-elevated" />
              <div className="h-12 rounded-xl bg-surface-elevated" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
