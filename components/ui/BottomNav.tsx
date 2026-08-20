"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const isTvMode = pathname.startsWith("/tv");

  // Do not render BottomNav on public shared profile or immersive movie night room pages
  if (pathname.startsWith("/p/") || pathname.startsWith("/night/")) {
    return null;
  }

  // Active state links
  const homeHref = isTvMode ? "/tv" : "/";
  const recsHref = isTvMode ? "/tv/recommendations" : "/recommendations";
  const calibHref = isTvMode ? "/tv/calibration" : "/calibrate";
  const aiHref = "/kesfet";
  const nightHref = "/night";
  const libraryHref = isTvMode ? "/library?mediaType=TV" : "/library?mediaType=FILM";
  const profileHref = isTvMode ? "/tv/profile" : "/profile";

  const isHomeActive = isTvMode
    ? pathname === "/tv"
    : pathname === "/" || pathname === "";
  const isRecsActive = pathname.includes("/recommendations");
  const isCalibActive = pathname.includes("/calibrat");
  const isAiActive = pathname === "/kesfet";
  const isNightActive = pathname.startsWith("/night");
  const isLibraryActive = pathname.startsWith("/library") || pathname.startsWith("/watch-later");
  const isProfileActive = pathname.includes("/profile");

  const tabs = [
    {
      id: "home",
      label: "Ana Sayfa",
      href: homeHref,
      isActive: isHomeActive,
      icon: (active: boolean) => (
        <svg
          className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? "2.5" : "2"}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      id: "recommendations",
      label: "Öneriler",
      href: recsHref,
      isActive: isRecsActive,
      icon: (active: boolean) => (
        <svg
          className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? "2.5" : "2"}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      id: "calibrate",
      label: "Kalibrasyon",
      href: calibHref,
      isActive: isCalibActive,
      icon: (active: boolean) => (
        <svg
          className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? "2.5" : "2"}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: "ai",
      label: "AI Keşfet",
      href: aiHref,
      isActive: isAiActive,
      isCenterAction: true,
      icon: (active: boolean) => (
        <span className="text-xl animate-pulse">✨</span>
      ),
    },
    {
      id: "night",
      label: "Movie Night",
      href: nightHref,
      isActive: isNightActive,
      icon: (active: boolean) => (
        <span className={`text-base transition-transform duration-200 ${active ? "scale-110" : ""}`}>
          🍿
        </span>
      ),
    },
    {
      id: "library",
      label: "Kütüphane",
      href: libraryHref,
      isActive: isLibraryActive,
      icon: (active: boolean) => (
        <svg
          className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? "2.5" : "2"}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      ),
    },
    {
      id: "profile",
      label: isTvMode ? "Dizi DNA" : "Film DNA",
      href: profileHref,
      isActive: isProfileActive,
      icon: (active: boolean) => (
        <svg
          className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? "2.5" : "2"}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Mobil Alt Navigasyon"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-1/95 backdrop-blur-2xl border-t border-border/80 pb-[env(safe-area-inset-bottom,0px)] shadow-2xl"
    >
      <div className="flex items-center justify-between h-16 px-1.5 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = tab.isActive;

          if (tab.isCenterAction) {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className="relative flex flex-col items-center justify-center -mt-5 group min-w-[48px] min-h-[48px]"
                aria-label={tab.label}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 border ${
                    active
                      ? "bg-gradient-to-tr from-purple-600 via-violet-600 to-fuchsia-500 text-white border-purple-300/60 shadow-purple-500/40 ring-2 ring-purple-400/40 scale-105"
                      : "bg-gradient-to-tr from-purple-950 via-surface-2 to-purple-900/80 text-purple-300 border-purple-500/40 hover:scale-105 shadow-purple-900/30"
                  }`}
                >
                  {tab.icon(active)}
                </div>
                <span
                  className={`text-[9px] font-sans font-bold tracking-tight mt-1 transition-colors ${
                    active ? "text-purple-300" : "text-text-muted group-hover:text-purple-300"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 group transition-all min-w-0 ${
                active ? "text-accent" : "text-text-muted hover:text-text-primary"
              }`}
              aria-label={tab.label}
            >
              <div className="relative p-1">
                {tab.icon(active)}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                )}
              </div>
              <span
                className={`text-[8.5px] sm:text-[9px] font-sans font-medium tracking-tighter truncate max-w-[48px] transition-colors ${
                  active ? "font-bold text-text-primary" : "text-text-muted group-hover:text-text-secondary"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
