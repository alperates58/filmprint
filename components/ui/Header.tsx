"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  progressCount?: number;
  progressTarget?: number;
}

export function Header({ progressCount = 0, progressTarget = 30 }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shadow-sm group-hover:bg-accent/25 transition-colors">
            <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
          </div>
          <span className="font-display text-xl font-bold tracking-wider text-text-primary">
            FILMPRINT
          </span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                pathname === "/"
                  ? "bg-surface-elevated text-text-primary font-semibold border border-border"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Kalibrasyon
            </Link>

            <Link
              href="/profile"
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                pathname === "/profile"
                  ? "bg-accent/15 text-text-primary font-semibold border border-accent/30"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Film DNA
            </Link>

            <Link
              href="/recommendations"
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                pathname === "/recommendations"
                  ? "bg-accent/15 text-text-primary font-semibold border border-accent/30"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Öneriler
            </Link>

            <Link
              href="/watch-later"
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                pathname === "/watch-later"
                  ? "bg-accent/15 text-text-primary font-semibold border border-accent/30"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Daha Sonra
            </Link>

            <Link
              href="/night"
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                pathname.startsWith("/night")
                  ? "bg-accent text-white font-semibold shadow-sm"
                  : "text-accent hover:bg-accent/10 border border-accent/30"
              }`}
            >
              🎬 Movie Night
            </Link>
          </nav>

          {/* Minimal Progress Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated border border-border text-xs font-mono font-medium text-text-primary">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-text-secondary">{Math.min(progressCount, progressTarget)} / {progressTarget}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
