"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const isTvMode = pathname.startsWith("/tv");

  // Do not render BottomNav on public shared profile or immersive movie night pages
  if (pathname.startsWith("/p/") || pathname.startsWith("/night/")) {
    return null;
  }

  // Determine active states
  const homeHref = isTvMode ? "/tv" : "/";
  const recsHref = isTvMode ? "/tv/recommendations" : "/recommendations";
  const calibHref = isTvMode ? "/tv/calibration" : "/calibrate";
  const libraryHref = isTvMode ? "/library?mediaType=TV" : "/library?mediaType=FILM";
  const profileHref = isTvMode ? "/tv/profile" : "/profile";

  const isHomeActive = isTvMode
    ? pathname === "/tv"
    : pathname === "/" || pathname === "";
  const isRecsActive = pathname.includes("/recommendations");
  const isCalibActive = pathname.includes("/calibrat");
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
          className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
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
          className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
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
      label: "Kalibre Et",
      href: calibHref,
      isActive: isCalibActive,
      isCenterAction: true,
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
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
      id: "library",
      label: "Kütüphane",
      href: libraryHref,
      isActive: isLibraryActive,
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
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
          className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-1/90 backdrop-blur-xl border-t border-border/80 pb-[env(safe-area-inset-bottom,0px)] shadow-lg"
    >
      <div className="flex items-center justify-around h-16 px-1 max-w-md mx-auto">
        {tabs.map((tab) => {
          const active = tab.isActive;

          if (tab.isCenterAction) {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className="relative flex flex-col items-center justify-center -mt-4 group min-w-[56px] min-h-[56px]"
                aria-label={tab.label}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-200 active:scale-95 ${
                    active
                      ? "bg-accent text-white shadow-glow"
                      : "bg-surface-2 border border-border-strong text-text-primary hover:border-accent"
                  }`}
                >
                  {tab.icon(active)}
                </div>
                <span
                  className={`text-[10px] font-sans font-medium mt-1 transition-colors ${
                    active ? "text-accent font-semibold" : "text-text-secondary"
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
              className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 transition-all duration-200 active:scale-95 ${
                active ? "text-accent" : "text-text-muted hover:text-text-secondary"
              }`}
              aria-label={tab.label}
            >
              <div className="relative">
                {tab.icon(active)}
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                )}
              </div>
              <span
                className={`text-[10px] font-sans transition-colors mt-0.5 ${
                  active ? "text-accent font-semibold" : "text-text-secondary"
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
