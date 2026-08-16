"use client";

import React from "react";

interface ScoreBadgeProps {
  score?: number | null;
  label?: string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ScoreBadge({
  score,
  label,
  size = "md",
  showLabel = false,
  className = "",
}: ScoreBadgeProps) {
  if (typeof score !== "number" || isNaN(score) || score <= 0) {
    return null;
  }

  // Tier Color Mapping
  let tierClasses = "bg-surface-3/90 border-border text-text-secondary";
  let dotColor = "bg-text-muted";

  if (score >= 90) {
    tierClasses = "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
    dotColor = "bg-emerald-400";
  } else if (score >= 75) {
    tierClasses = "bg-accent/15 border-accent/30 text-accent";
    dotColor = "bg-accent";
  } else if (score >= 60) {
    tierClasses = "bg-amber-500/15 border-amber-500/30 text-amber-400";
    dotColor = "bg-amber-400";
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] rounded-lg gap-1",
    md: "px-2.5 py-1 text-xs rounded-xl gap-1.5",
    lg: "px-3.5 py-1.5 text-sm rounded-xl gap-2",
  }[size];

  return (
    <div
      className={`inline-flex items-center backdrop-blur-md border font-sans font-bold shadow-xs transition-all ${tierClasses} ${sizeClasses} ${className}`}
      title={label ? `${score}% Uyum — ${label}` : `${score}% Uyum`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0 animate-pulse`} />
      <span className="font-mono tracking-tight font-bold">%{score}</span>
      {showLabel && label && (
        <span className="font-sans font-medium text-text-muted text-[11px] truncate max-w-[120px]">
          {label}
        </span>
      )}
    </div>
  );
}
