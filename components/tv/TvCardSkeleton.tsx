import React from "react";

export function TvCardSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-surface border border-border/80 p-4 sm:p-6 md:p-8 shadow-cinematic animate-pulse">
      {/* Mobile Skeleton */}
      <div className="flex flex-col md:hidden space-y-3">
        <div className="flex gap-3.5 items-start">
          <div className="w-24 sm:w-28 aspect-[2/3] rounded-xl bg-surface-elevated flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-surface-elevated rounded-md w-3/4" />
            <div className="h-3 bg-surface-elevated rounded-md w-1/2" />
            <div className="flex gap-1 pt-2">
              <div className="h-4 w-12 bg-surface-elevated rounded-md" />
              <div className="h-4 w-16 bg-surface-elevated rounded-md" />
            </div>
          </div>
        </div>
        <div className="h-12 bg-surface-elevated/50 rounded-xl w-full" />
        <div className="h-10 bg-surface-elevated rounded-xl w-full" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-9 bg-surface-elevated rounded-xl" />
          <div className="h-9 bg-surface-elevated rounded-xl" />
          <div className="h-9 bg-surface-elevated rounded-xl" />
        </div>
      </div>

      {/* Desktop Skeleton */}
      <div className="hidden md:flex gap-8 items-stretch">
        <div className="w-56 aspect-[2/3] rounded-2xl bg-surface-elevated flex-shrink-0" />
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="h-8 bg-surface-elevated rounded-lg w-2/3" />
            <div className="h-4 bg-surface-elevated rounded-md w-1/3" />
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-surface-elevated rounded-lg" />
              <div className="h-6 w-20 bg-surface-elevated rounded-lg" />
              <div className="h-6 w-24 bg-surface-elevated rounded-lg" />
            </div>
            <div className="h-20 bg-surface-elevated/40 rounded-xl w-full" />
          </div>
          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-border/60">
            <div className="h-12 bg-surface-elevated rounded-xl" />
            <div className="h-12 bg-surface-elevated rounded-xl" />
            <div className="h-12 bg-surface-elevated rounded-xl" />
            <div className="h-12 bg-surface-elevated rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
