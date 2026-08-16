"use client";

import React from "react";
import Link from "next/link";

interface SectionHeaderProps {
  badge?: string;
  badgeIcon?: string;
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export function SectionHeader({
  badge,
  badgeIcon,
  title,
  subtitle,
  actionHref,
  actionLabel,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 ${className}`}>
      <div className="space-y-1">
        {badge && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-2 border border-border text-[11px] font-sans font-semibold text-accent tracking-wide uppercase">
            {badgeIcon && <span>{badgeIcon}</span>}
            <span>{badge}</span>
          </div>
        )}
        <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight text-text-primary">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs md:text-sm text-text-secondary max-w-2xl leading-relaxed font-sans">
            {subtitle}
          </p>
        )}
      </div>

      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1 text-xs md:text-sm font-sans font-medium text-accent hover:text-accent-hover hover:underline transition-colors flex-shrink-0 self-start sm:self-auto py-1"
        >
          <span>{actionLabel}</span>
          <span>→</span>
        </Link>
      )}
    </div>
  );
}
