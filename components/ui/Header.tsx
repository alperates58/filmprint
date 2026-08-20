"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProgressionForCount, getTvProgressionForCount } from "@/lib/progression/service";

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
    fetch(`/api/auth/me?mode=${isTvMode ? "tv" : "film"}`)
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
  }, [isTvMode]);

  const activeCount =
    typeof progressCount === "number" && progressCount > 0
      ? progressCount
      : fetchedCount ?? (typeof progressCount === "number" ? progressCount : 0);

  const progression = isTvMode
    ? getTvProgressionForCount(activeCount)
    : getProgressionForCount(activeCount);

  return (
    <header className="w-full border-b border-border/80 bg-surface-1/90 backdrop-blur-xl sticky top-0 z-40 transition-all duration-300">
      <div className="max-w-7xl w-full mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 min-w-0">
          <Link href={isTvMode ? "/tv" : "/"} className="flex items-center gap-1.5 sm:gap-2.5 group flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-accent-subtle border border-accent/30 flex items-center justify-center shadow-sm group-hover:bg-accent/20 transition-all">
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-accent animate-pulse" />
            </div>
            <span className="font-display text-base sm:text-xl font-bold tracking-wider text-text-primary">
              SINEAI
            </span>
          </Link>

          {/* Mode Switcher (Film / Dizi Segmented Control) */}
          <div className="flex items-center p-0.5 sm:p-1 rounded-xl bg-surface-2 border border-border text-[11px] sm:text-xs font-sans font-medium flex-shrink-0">
            <Link
              href="/"
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all ${
                !isTvMode
                  ? "bg-accent text-white font-semibold shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Filmler
            </Link>
            <Link
              href="/tv"
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all ${
                isTvMode
                  ? "bg-accent text-white font-semibold shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Diziler
            </Link>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4 flex-shrink-0">
          <nav className="flex items-center gap-1 text-sm font-sans font-medium">
            {!isTvMode ? (
              // Movie Mode Navigation Links
              <>
                <Link
                  href="/"
                  className={`px-3 py-2 rounded-xl transition-all ${
                    pathname === "/"
                      ? "bg-surface-2 text-text-primary font-semibold border border-border-strong"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Ana Sayfa
                </Link>

                <Link
                  href="/calibrate"
                  className={`px-3 py-2 rounded-xl transition-all ${
                    pathname === "/calibrate"
                      ? "bg-surface-2 text-text-primary font-semibold border border-border-strong"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Kalibrasyon
                </Link>

                <Link
                  href="/profile"
                  className={`px-3 py-2 rounded-xl transition-all ${
                    pathname === "/profile"
                      ? "bg-accent-subtle text-accent font-semibold border border-accent/30"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Film DNA
                </Link>

                <Link
                  href="/recommendations"
                  className={`px-3 py-2 rounded-xl transition-all ${
                    pathname === "/recommendations"
                      ? "bg-surface-2 text-text-primary font-semibold border border-border-strong"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Öneriler
                </Link>

                {/* Regression fixed: Filmlerim points to /library?mediaType=FILM */}
                <Link
                  href="/library?mediaType=FILM"
                  className={`px-3 py-2 rounded-xl transition-all ${
                    pathname.startsWith("/library")
                      ? "bg-surface-2 text-text-primary font-semibold border border-border-strong"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Filmlerim
                </Link>

                <Link
                  href="/night"
                  className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                    pathname.startsWith("/night")
                      ? "bg-accent-secondary-subtle text-accent-secondary font-semibold border border-accent-secondary/30"
                      : "text-accent-secondary hover:bg-accent-secondary-subtle/50"
                  }`}
                >
                  <span>🍿</span>
                  <span>Movie Night</span>
                </Link>

                <Link
                  href="/kesfet"
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-semibold text-xs tracking-wide ${
                    pathname === "/kesfet"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400"
                      : "bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-white border border-purple-500/30"
                  }`}
                >
                  <span className="animate-pulse">✨</span>
                  <span>AI İle Keşfet</span>
                </Link>
              </>
            ) : (
              // TV Mode Navigation Links
              <>
                <Link
                  href="/tv"
                  className={`px-3 py-2 rounded-xl transition-all ${
                    pathname === "/tv"
                      ? "bg-surface-2 text-text-primary font-semibold border border-border-strong"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Ana Sayfa
                </Link>

                <Link
                  href="/tv/calibration"
                  className={`px-3 py-2 rounded-xl transition-all ${
                    pathname === "/tv/calibration"
                      ? "bg-surface-2 text-text-primary font-semibold border border-border-strong"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Kalibrasyon
                </Link>

                <Link
                  href="/tv/profile"
                  className={`px-3 py-2 rounded-xl transition-all ${
                    pathname === "/tv/profile"
                      ? "bg-accent-subtle text-accent font-semibold border border-accent/30"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Dizi DNA
                </Link>

                <Link
                  href="/tv/recommendations"
                  className={`px-3 py-2 rounded-xl transition-all ${
                    pathname === "/tv/recommendations"
                      ? "bg-surface-2 text-text-primary font-semibold border border-border-strong"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Öneriler
                </Link>

                {/* Regression fixed: Dizilerim points to /library?mediaType=TV */}
                <Link
                  href="/library?mediaType=TV"
                  className={`px-3 py-2 rounded-xl transition-all ${
                    pathname.startsWith("/library")
                      ? "bg-surface-2 text-text-primary font-semibold border border-border-strong"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Dizilerim
                </Link>

                <Link
                  href="/kesfet"
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-semibold text-xs tracking-wide ${
                    pathname === "/kesfet"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400"
                      : "bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-white border border-purple-500/30"
                  }`}
                >
                  <span className="animate-pulse">✨</span>
                  <span>AI İle Keşfet</span>
                </Link>
              </>
            )}
          </nav>

          {/* User Profile & Rank Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-surface-2 border border-border hover:border-accent/40 transition-all text-xs font-sans"
              aria-label="Kullanıcı Menüsü"
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={displayName}
                  className="w-7 h-7 rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="w-7 h-7 rounded-xl bg-accent-subtle border border-accent/30 text-accent font-bold flex items-center justify-center">
                  {displayName ? displayName.charAt(0).toUpperCase() : "👤"}
                </div>
              )}

              <div className="flex flex-col items-start text-left">
                <span className="text-xs font-semibold text-text-primary line-clamp-1 max-w-[120px]">
                  {displayName || "Hesabım"}
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  {progression.currentRank.label}
                </span>
              </div>

              <span className="text-text-muted text-[10px] ml-0.5">▼</span>
            </button>

            {/* Backdrop for open dropdown */}
            {userDropdownOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/20"
                onClick={() => setUserDropdownOpen(false)}
              />
            )}

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-60 rounded-2xl bg-surface-2 border border-border-strong p-2 shadow-xl z-50 animate-fadeIn space-y-1 text-xs font-sans"
                onClick={() => setUserDropdownOpen(false)}
              >
                <div className="p-3 border-b border-border/80 space-y-1 bg-surface-1/50 rounded-xl">
                  <p className="font-semibold text-text-primary text-xs truncate">{displayName}</p>
                  {email && <p className="text-text-muted text-[11px] truncate">{email}</p>}
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="text-sm">{progression.currentRank.badgeIcon}</span>
                    <span className="text-[11px] font-semibold text-accent font-mono">
                      {progression.currentRank.label} ({activeCount} Puan)
                    </span>
                  </div>
                </div>

                <Link
                  href={isTvMode ? "/tv/profile" : "/profile"}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface-3 text-text-primary transition-colors"
                >
                  <span>🧬</span>
                  <span>{isTvMode ? "Dizi DNA Profilim" : "Film DNA Profilim"}</span>
                </Link>

                <Link
                  href="/library"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface-3 text-text-primary transition-colors"
                >
                  <span>📁</span>
                  <span>Tüm Kütüphanem</span>
                </Link>

                <Link
                  href="/account"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface-3 text-text-primary transition-colors"
                >
                  <span>⚙️</span>
                  <span>Hesap Ayarları</span>
                </Link>

                <div className="pt-1 border-t border-border/60">
                  <a
                    href="/api/auth/logout"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-destructive/15 text-destructive transition-colors"
                  >
                    <span>🚪</span>
                    <span>Çıkış Yap</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Header Right Profile & AI Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:hidden relative flex-shrink-0">
          <Link
            href="/kesfet"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 font-semibold text-[11px] sm:text-xs min-h-[34px] sm:min-h-[38px] flex-shrink-0"
            aria-label="AI İle Keşfet"
          >
            <span className="text-xs">✨</span>
            <span>AI<span className="hidden xs:inline"> Keşfet</span></span>
          </Link>

          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center justify-center p-0.5 sm:p-1 rounded-xl bg-surface-2 border border-border min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px] cursor-pointer flex-shrink-0 active:scale-95"
            aria-label="Profil Menüsü"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent-subtle border border-accent/30 text-accent font-bold text-xs flex items-center justify-center">
                {displayName ? displayName.charAt(0).toUpperCase() : "👤"}
              </div>
            )}
          </button>

          {/* Backdrop for open dropdown on mobile */}
          {userDropdownOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setUserDropdownOpen(false)}
            />
          )}

          {/* Mobile Dropdown Menu */}
          {userDropdownOpen && (
            <div
              className="absolute right-0 top-11 sm:top-12 w-60 rounded-2xl bg-surface-2 border border-border-strong p-2 shadow-2xl z-50 animate-fadeIn space-y-1 text-xs font-sans"
              onClick={() => setUserDropdownOpen(false)}
            >
              <div className="p-3 border-b border-border/80 space-y-1 bg-surface-1/50 rounded-xl">
                <p className="font-semibold text-text-primary text-xs truncate">{displayName}</p>
                {email && <p className="text-text-muted text-[11px] truncate">{email}</p>}
                <div className="pt-1 flex items-center gap-1.5">
                  <span className="text-sm">{progression.currentRank.badgeIcon}</span>
                  <span className="text-[11px] font-semibold text-accent font-mono">
                    {progression.currentRank.label} ({activeCount} Puan)
                  </span>
                </div>
              </div>

              <Link
                href={isTvMode ? "/tv/profile" : "/profile"}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface-3 text-text-primary transition-colors"
              >
                <span>🧬</span>
                <span>{isTvMode ? "Dizi DNA Profilim" : "Film DNA Profilim"}</span>
              </Link>

              <Link
                href="/library"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface-3 text-text-primary transition-colors"
              >
                <span>📁</span>
                <span>Tüm Kütüphanem</span>
              </Link>

              <Link
                href="/account"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface-3 text-text-primary transition-colors"
              >
                <span>⚙️</span>
                <span>Hesap Ayarları</span>
              </Link>

              <div className="pt-1 border-t border-border/60">
                <a
                  href="/api/auth/logout"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-destructive/15 text-destructive transition-colors"
                >
                  <span>🚪</span>
                  <span>Çıkış Yap</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
