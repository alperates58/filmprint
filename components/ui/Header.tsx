"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  progressCount?: number;
  progressTarget?: number;
  userName?: string;
}

export function Header({ progressCount = 0, progressTarget = 30, userName = "" }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full border-b border-border/60 bg-background/90 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
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

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <nav className="flex items-center gap-1">
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

          {/* User Profile Identity & Progress Pill */}
          <div className="flex items-center gap-2">
            {userName && (
              <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent font-mono text-xs font-semibold">
                👤 {userName}
              </span>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated border border-border text-xs font-mono font-medium text-text-primary">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-text-secondary">{progressCount} film değerlendirildi</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Toggle Button */}
        <div className="flex items-center gap-2 md:hidden">
          {userName && (
            <span className="px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent font-mono text-[10px] font-semibold">
              👤 {userName}
            </span>
          )}
          <div className="px-2.5 py-1 rounded-full bg-surface-elevated border border-border text-[10px] font-mono text-text-secondary">
            {progressCount} film
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-surface-elevated border border-border text-text-primary text-xs font-mono"
            aria-label="Menüyü Aç"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border/60 bg-surface p-4 space-y-2 animate-fadeIn">
          <nav className="flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                pathname === "/" ? "bg-accent text-white font-bold" : "text-text-secondary bg-surface-elevated"
              }`}
            >
              Kalibrasyon
            </Link>

            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                pathname === "/profile" ? "bg-accent text-white font-bold" : "text-text-secondary bg-surface-elevated"
              }`}
            >
              Film DNA Profilim
            </Link>

            <Link
              href="/recommendations"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                pathname === "/recommendations" ? "bg-accent text-white font-bold" : "text-text-secondary bg-surface-elevated"
              }`}
            >
              Kişisel Öneriler
            </Link>

            <Link
              href="/watch-later"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                pathname === "/watch-later" ? "bg-accent text-white font-bold" : "text-text-secondary bg-surface-elevated"
              }`}
            >
              Daha Sonra İzlenecekler
            </Link>

            <Link
              href="/night"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                pathname.startsWith("/night") ? "bg-accent text-white font-bold" : "text-accent border border-accent/40"
              }`}
            >
              🎬 Movie Night (Ortak Film)
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
