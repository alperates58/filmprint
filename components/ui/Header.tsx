"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProgressionForCount } from "@/lib/progression/service";

interface HeaderProps {
  progressCount?: number;
  progressTarget?: number;
  userName?: string;
  userAvatar?: string;
  userEmail?: string;
}

export function Header({
  progressCount,
  progressTarget = 30,
  userName = "",
  userAvatar = "",
  userEmail = "",
}: HeaderProps) {
  const pathname = usePathname();
  const isTvMode = pathname.startsWith("/tv");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [displayName, setDisplayName] = useState(userName);
  const [avatar, setAvatar] = useState(userAvatar);
  const [email, setEmail] = useState(userEmail);
  const [fetchedCount, setFetchedCount] = useState<number | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    if (userName) setDisplayName(userName);
    if (userAvatar) setAvatar(userAvatar);
    if (userEmail) setEmail(userEmail);
  }, [userName, userAvatar, userEmail]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setDisplayName(data.user.name || data.user.email?.split("@")[0] || "SineAI Kullanıcısı");
          setAvatar(data.user.image || "");
          setEmail(data.user.email || "");
        }
        if (data?.progression) {
          setFetchedCount(data.progression.evaluatedCount);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingUser(false));
  }, []);

  const activeCount =
    typeof progressCount === "number" && progressCount > 0
      ? progressCount
      : fetchedCount ?? (typeof progressCount === "number" ? progressCount : 0);

  const progression = getProgressionForCount(activeCount);  return (
    <header className="w-full border-b border-border/60 bg-background/90 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-2 lg:gap-4">
        {/* Brand Logo & Mode Switcher */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <Link href={isTvMode ? "/tv" : "/"} className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shadow-sm group-hover:bg-accent/25 transition-colors flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
            </div>
            <span className="font-display text-xl font-bold tracking-wider text-text-primary">
              SINEAI
            </span>
          </Link>

          {/* Desktop Mode Switcher */}
          <div className="hidden sm:flex items-center p-1 rounded-xl bg-surface-elevated border border-border/80 text-xs font-mono flex-shrink-0">
            <Link
              href="/"
              className={`px-3 py-1 rounded-lg transition-all ${
                !isTvMode
                  ? "bg-accent text-white font-bold shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Filmler
            </Link>
            <Link
              href="/tv"
              className={`px-3 py-1 rounded-lg transition-all ${
                isTvMode
                  ? "bg-accent text-white font-bold shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Diziler
            </Link>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4 flex-shrink-0">
          <nav className="flex items-center gap-1">
            {!isTvMode ? (
              // Movie Mode Navigation Links
              <>
                <Link
                  href="/"
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                    pathname === "/"
                      ? "bg-surface-elevated text-text-primary font-semibold border border-border"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Ana Sayfa
                </Link>

                <Link
                  href="/calibrate"
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                    pathname === "/calibrate"
                      ? "bg-surface-elevated text-text-primary font-semibold border border-border"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Kalibrasyon
                </Link>

                <Link
                  href="/profile"
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                    pathname === "/profile"
                      ? "bg-accent/15 text-text-primary font-semibold border border-accent/30"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Film DNA
                </Link>

                <Link
                  href="/recommendations"
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                    pathname === "/recommendations"
                      ? "bg-accent/15 text-text-primary font-semibold border border-accent/30"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Öneriler
                </Link>

                <Link
                  href="/library"
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                    pathname.startsWith("/library")
                      ? "bg-accent/15 text-text-primary font-semibold border border-accent/30"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Filmlerim
                </Link>

                <Link
                  href="/night"
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                    pathname.startsWith("/night")
                      ? "bg-accent text-white font-semibold shadow-sm"
                      : "text-accent hover:bg-accent/10 border border-accent/30"
                  }`}
                >
                  🎬 Movie Night
                </Link>
              </>
            ) : (
              // TV Mode Navigation Links
              <>
                <Link
                  href="/tv"
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                    pathname === "/tv"
                      ? "bg-surface-elevated text-text-primary font-semibold border border-border"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Ana Sayfa
                </Link>

                <Link
                  href="/tv/calibration"
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                    pathname === "/tv/calibration"
                      ? "bg-surface-elevated text-text-primary font-semibold border border-border"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Kalibrasyon
                </Link>

                <Link
                  href="/tv/profile"
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                    pathname === "/tv/profile"
                      ? "bg-accent/15 text-text-primary font-semibold border border-accent/30"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Dizi DNA
                </Link>

                <Link
                  href="/tv/recommendations"
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                    pathname === "/tv/recommendations"
                      ? "bg-accent/15 text-text-primary font-semibold border border-accent/30"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Öneriler
                </Link>

                <Link
                  href="/tv/library"
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                    pathname.startsWith("/tv/library")
                      ? "bg-accent/15 text-text-primary font-semibold border border-accent/30"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Dizilerim
                </Link>
              </>
            )}
          </nav>

          {/* Progress Pill & User Identity Dropdown */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {isLoadingUser && fetchedCount === null && typeof progressCount !== "number" ? (
              <div className="w-32 h-7 rounded-full bg-surface-elevated border border-border animate-pulse flex-shrink-0" />
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated border border-border text-xs font-mono font-medium text-text-primary whitespace-nowrap flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                <span className="text-text-secondary whitespace-nowrap">
                  {isTvMode ? (
                    `${activeCount} dizi değerlendirildi`
                  ) : (
                    <>
                      <span className="hidden xl:inline">{progression.currentRank.label} • </span>
                      <span>
                        {activeCount}
                        {progression.nextRank ? `/${progression.nextRank.minimum}` : ""}
                      </span>
                    </>
                  )}
                </span>
              </div>
            )}

            <div className="relative flex-shrink-0">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2.5 lg:px-3 py-1.5 rounded-full bg-surface-elevated border border-border/80 text-xs font-mono hover:border-accent transition-colors whitespace-nowrap flex-shrink-0"
              >
                {avatar ? (
                  <img src={avatar} alt={displayName || "User"} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-accent/25 text-accent text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                    {(displayName || "F").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="font-semibold text-text-primary max-w-[120px] truncate">{displayName || "Hesabım"}</span>
                <span className="text-[10px] text-text-muted flex-shrink-0">▾</span>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-surface border border-border shadow-cinematic p-2 space-y-1 text-xs font-mono animate-fadeIn z-50">
                  {email && (
                    <div className="px-3 py-2 border-b border-border/60 text-[11px] text-text-muted truncate">
                      {email}
                    </div>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-elevated text-text-primary transition-colors"
                  >
                    👤 Film DNA Profilim
                  </Link>
                  <Link
                    href="/tv/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-elevated text-text-primary transition-colors"
                  >
                    📺 Dizi DNA Profilim
                  </Link>
                  <Link
                    href="/account"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-elevated text-text-primary transition-colors"
                  >
                    ⚙️ Hesabım
                  </Link>
                  <a
                    href="/api/auth/logout"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-danger/15 text-danger transition-colors"
                  >
                    🚪 Çıkış Yap
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Toggle Button */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="px-2.5 py-1 rounded-full bg-surface-elevated border border-border text-[10px] font-mono text-text-secondary whitespace-nowrap max-w-[200px] truncate">
            {isTvMode
              ? `${activeCount} dizi`
              : `${progression.currentRank.label} • ${activeCount}${progression.nextRank ? `/${progression.nextRank.minimum}` : ""}`}
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
        <div className="md:hidden border-b border-border/60 bg-surface p-4 space-y-3 animate-fadeIn">
          {/* Mobile Mode Switcher */}
          <div className="flex items-center justify-between p-1 rounded-xl bg-surface-elevated border border-border/80 text-xs font-mono">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex-1 text-center py-2 rounded-lg transition-all ${
                !isTvMode
                  ? "bg-accent text-white font-bold shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              🎬 Filmler
            </Link>
            <Link
              href="/tv"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex-1 text-center py-2 rounded-lg transition-all ${
                isTvMode
                  ? "bg-accent text-white font-bold shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              📺 Diziler
            </Link>
          </div>

          <nav className="flex flex-col gap-2">
            {displayName && (
              <div className="px-4 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-mono flex items-center gap-2">
                👤 <span className="font-bold text-text-primary">{displayName}</span>
              </div>
            )}

            {!isTvMode ? (
              // Active Mode: Movie Links
              <>
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                    pathname === "/" ? "bg-accent text-white font-bold" : "text-text-secondary bg-surface-elevated"
                  }`}
                >
                  Ana Sayfa
                </Link>

                <Link
                  href="/calibrate"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                    pathname === "/calibrate" ? "bg-accent text-white font-bold" : "text-text-secondary bg-surface-elevated"
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
                  href="/library"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                    pathname.startsWith("/library") ? "bg-accent text-white font-bold" : "text-text-secondary bg-surface-elevated"
                  }`}
                >
                  Filmlerim
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
              </>
            ) : (
              // Active Mode: TV Links
              <>
                <Link
                  href="/tv"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                    pathname === "/tv" ? "bg-accent text-white font-bold" : "text-text-secondary bg-surface-elevated"
                  }`}
                >
                  Ana Sayfa
                </Link>

                <Link
                  href="/tv/calibration"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                    pathname === "/tv/calibration" ? "bg-accent text-white font-bold" : "text-text-secondary bg-surface-elevated"
                  }`}
                >
                  Kalibrasyon
                </Link>

                <Link
                  href="/tv/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                    pathname === "/tv/profile" ? "bg-accent text-white font-bold" : "text-text-secondary bg-surface-elevated"
                  }`}
                >
                  Dizi DNA Profilim
                </Link>

                <Link
                  href="/tv/recommendations"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                    pathname === "/tv/recommendations" ? "bg-accent text-white font-bold" : "text-text-secondary bg-surface-elevated"
                  }`}
                >
                  Kişisel Dizi Önerileri
                </Link>

                <Link
                  href="/tv/library"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                    pathname.startsWith("/tv/library") ? "bg-accent text-white font-bold" : "text-text-secondary bg-surface-elevated"
                  }`}
                >
                  Dizilerim
                </Link>
              </>
            )}

            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-mono text-text-primary bg-surface-elevated"
            >
              ⚙️ Hesabım
            </Link>
            <a
              href="/api/auth/logout"
              className="px-4 py-2 rounded-xl text-xs font-mono text-danger bg-danger/10"
            >
              🚪 Çıkış Yap
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
