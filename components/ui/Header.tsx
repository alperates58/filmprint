import React from "react";

interface HeaderProps {
  progressCount?: number;
  progressTarget?: number;
}

export function Header({ progressCount = 0, progressTarget = 30 }: HeaderProps) {
  return (
    <header className="w-full border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
          </div>
          <span className="font-display text-xl font-bold tracking-wider text-text-primary">
            FILMPRINT
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-surface-elevated text-text-muted border border-border font-mono">
            PHASE 0
          </span>
        </div>

        {/* Progress Counter Pill */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border text-xs text-text-secondary font-mono">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span>CALIBRATION ACTIVE</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-surface-elevated border border-border text-xs font-mono font-medium text-text-primary">
            <span className="text-accent">{progressCount}</span> / {progressTarget} FILMS
          </div>
        </div>
      </div>
    </header>
  );
}
