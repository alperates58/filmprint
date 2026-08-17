"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { TvDetailsModal } from "./TvDetailsModal";
import { MediaCard } from "@/components/ui/MediaCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { getTvProgressionForCount } from "@/lib/progression/service";
import type { TvHomeModuleItem, PersonalizedTvRecommendationItem } from "@/lib/tv/recommendation/types";

interface TvDiscoveryHomeProps {
  userName: string;
  userAvatar?: string;
  userEmail?: string;
  answeredCount: number;
  watchedCount?: number;
  partiallyWatchedCount?: number;
  homeModules: TvHomeModuleItem[];
  topHeroMatch: PersonalizedTvRecommendationItem | null;
  profileConfidence?: number;
  maturityLabel?: string;
}

const TV_MOOD_SHORTCUTS = [
  { id: "top-recs", targetModuleId: "tv-top-hero", label: "Günün Dizileri", icon: "✨", fallbackHref: "/tv/recommendations" },
  { id: "watchlist", targetModuleId: "USER_WATCHLIST", label: "İzleme Listem", icon: "🔖", fallbackHref: "/library?mediaType=TV&state=WATCHLIST" },
  { id: "thriller", targetModuleId: "MYSTERY_CRIME", label: "Sürükleyici Gerilim", icon: "⚡", fallbackHref: "/tv/recommendations" },
  { id: "mini-series", targetModuleId: "MINISERIES", label: "Mini Diziler", icon: "⏳", fallbackHref: "/tv/recommendations" },
  { id: "sci-fi", targetModuleId: "FOR_YOU", label: "Bilimkurgu & Gizem", icon: "🌀", fallbackHref: "/tv/recommendations" },
  { id: "masterpiece", targetModuleId: "COMPLETED_GEMS", label: "Ödüllü Başyapıtlar", icon: "👑", fallbackHref: "/tv/recommendations" },
];

export function TvDiscoveryHome({
  userName,
  userAvatar,
  userEmail,
  answeredCount,
  homeModules,
  topHeroMatch,
}: TvDiscoveryHomeProps) {
  const router = useRouter();
  const [selectedTvModal, setSelectedTvModal] = useState<{
    tvShowId: string;
    initialData?: any;
  } | null>(null);

  const progression = getTvProgressionForCount(answeredCount);

  const handleShortcutClick = (shortcut: typeof TV_MOOD_SHORTCUTS[number]) => {
    if (shortcut.targetModuleId === "tv-top-hero") {
      const heroEl = document.getElementById("tv-top-hero-match");
      if (heroEl) {
        heroEl.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    const el = document.getElementById(`module-${shortcut.targetModuleId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else if (shortcut.fallbackHref) {
      router.push(shortcut.fallbackHref);
    }
  };

  const heroShow = topHeroMatch?.tvShow;
  const heroYear = heroShow?.firstAirDate ? heroShow.firstAirDate.slice(0, 4) : "";
  const heroGenres = heroShow?.metadata?.genres || [];
  const heroHeadline = topHeroMatch
    ? topHeroMatch.matchLabel || (topHeroMatch.evidenceShows?.length ? `${topHeroMatch.evidenceShows[0].name} sevdiğiniz için` : "Dizi DNA Uyumu")
    : "";

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header
        userName={userName}
        userAvatar={userAvatar}
        userEmail={userEmail}
        progressCount={answeredCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-10">
        {/* ========================================================================= */}
        {/* V2 EDITORIAL TV HERO SECTION                                              */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-1 via-surface-1 to-surface-2 border border-border/80 p-6 sm:p-8 md:p-10 shadow-md">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Column: Greeting & Stats */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold flex items-center gap-1.5">
                  <span>{progression.currentRank.badgeIcon}</span>
                  <span>{progression.currentRank.label}</span>
                </span>
                <span className="text-xs text-text-muted">
                  • {answeredCount} Dizi Değerlendirildi
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
                  {userName ? `İyi seyirler, ${userName}.` : "Dizi zevkine özel keşif vitrini."}
                </h1>
                <p className="text-sm md:text-base text-text-secondary leading-relaxed max-w-xl">
                  Dizi DNA profilinize ve izleme alışkanlıklarınıza göre hazırlanan bugünün özel dizi seçkisi.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/tv/recommendations"
                  className="px-5 py-3 rounded-xl bg-accent text-white font-semibold text-xs md:text-sm hover:bg-accent-hover active:scale-95 transition-all shadow-sm flex items-center gap-2 min-h-[44px]"
                >
                  <span>✨</span>
                  <span>Önerilerime Git</span>
                </Link>

                <Link
                  href="/tv/calibration"
                  className="px-5 py-3 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-primary font-medium text-xs md:text-sm active:scale-95 transition-all flex items-center gap-2 min-h-[44px]"
                >
                  <span>🎯</span>
                  <span>Değerlendirmeye Devam Et</span>
                </Link>
              </div>
            </div>

            {/* Right Column: TV Shortcuts */}
            <div className="lg:col-span-5 bg-surface-2/60 border border-border/70 rounded-2xl p-4 sm:p-5 space-y-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                ⚡ HIZLI DİZİ MODLARI
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {TV_MOOD_SHORTCUTS.map((mood) => (
                  <button
                    key={mood.id}
                    onClick={() => handleShortcutClick(mood)}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-1 hover:bg-surface-3 border border-border/60 hover:border-accent/40 text-text-secondary hover:text-text-primary transition-all text-left group"
                  >
                    <span className="text-base group-hover:scale-110 transition-transform">
                      {mood.icon}
                    </span>
                    <span className="font-medium truncate">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TOP MATCH TV HERO CARD (IF AVAILABLE)                                     */}
        {/* ========================================================================= */}
        {topHeroMatch && heroShow && (
          <section id="tv-top-hero-match" className="space-y-4">
            <SectionHeader
              badge="GÜNÜN ZİRVESİ"
              badgeIcon="⭐"
              title="Bugünün En Yüksek Dizi Eşleşmesi"
              subtitle="Dizi DNA profiliniz ve son beğenileriniz doğrultusunda seçildi."
            />

            <div
              onClick={() =>
                setSelectedTvModal({
                  tvShowId: heroShow.id,
                  initialData: {
                    title: heroShow.name,
                    posterPath: heroShow.posterPath,
                    backdropPath: heroShow.backdropPath,
                    firstAirDate: heroShow.firstAirDate,
                    genres: heroGenres,
                    matchScore: topHeroMatch.matchScore,
                    headline: heroHeadline,
                  },
                })
              }
              className="group relative overflow-hidden rounded-3xl bg-surface-1 border border-border/80 p-5 sm:p-7 md:p-8 shadow-sm hover:border-accent/40 transition-all duration-300 cursor-pointer"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 md:gap-7 items-center">
                {/* Poster */}
                <div className="sm:col-span-4 md:col-span-3 aspect-[2/3] w-36 sm:w-full mx-auto sm:mx-0 rounded-2xl overflow-hidden bg-surface-2 border border-border-strong relative flex-shrink-0 shadow-md">
                  {heroShow.posterPath ? (
                    <Image
                      src={getTmdbImageUrl(heroShow.posterPath, "w500")!}
                      alt={heroShow.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 144px, 240px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                      Görsel Yok
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="sm:col-span-8 md:col-span-9 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ScoreBadge score={topHeroMatch.matchScore} size="md" showLabel />
                    <span className="text-xs text-text-muted">
                      {heroYear} • {heroGenres.slice(0, 2).join(", ")}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-text-primary group-hover:text-accent transition-colors">
                      {heroShow.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-text-secondary line-clamp-2 sm:line-clamp-3 leading-relaxed">
                      {heroShow.overview || "Kişiselleştirilmiş dizi seçkisi."}
                    </p>
                  </div>

                  {heroHeadline && (
                    <div className="p-3.5 rounded-xl bg-surface-2 border border-border/80 text-xs text-accent font-medium flex items-center gap-2">
                      <span>✨</span>
                      <span>{heroHeadline}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <button className="px-4 py-2.5 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-hover transition-all shadow-sm">
                      Diziyi İncele & Fragman →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TV PERSONALIZATION MODULES                                                */}
        {/* ========================================================================= */}
        {homeModules && homeModules.length > 0 && (
          homeModules.map((module) => {
            if (!module.items || module.items.length === 0) return null;

            return (
              <section key={module.id} id={`module-${module.id}`} className="space-y-4 pt-2">
                <SectionHeader
                  badge={module.title}
                  badgeIcon="📺"
                  title={module.title}
                  subtitle={module.subtitle}
                  actionHref="/tv/recommendations"
                  actionLabel="Tümünü Gör"
                />

                {/* Horizontal Scroll on Mobile, Grid on Desktop */}
                <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-x-auto pb-3 sm:pb-0 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
                  {module.items.map((item) => {
                    const { tvShow, matchScore, matchLabel } = item;
                    const releaseYear = tvShow.firstAirDate ? tvShow.firstAirDate.slice(0, 4) : "";
                    const genres = tvShow.metadata?.genres || [];

                    return (
                      <div key={tvShow.id} className="min-w-[150px] sm:min-w-0 snap-start flex-shrink-0 sm:flex-shrink">
                        <MediaCard
                          id={tvShow.id}
                          mediaType="TV"
                          title={tvShow.name}
                          originalTitle={tvShow.originalName || undefined}
                          posterPath={tvShow.posterPath}
                          releaseYear={releaseYear}
                          genres={genres}
                          matchScore={matchScore}
                          matchLabel={matchLabel}
                          reasonHeadline={item.deterministicExplanation || matchLabel}
                          onClick={() =>
                            setSelectedTvModal({
                              tvShowId: tvShow.id,
                              initialData: {
                                title: tvShow.name,
                                posterPath: tvShow.posterPath,
                                backdropPath: tvShow.backdropPath,
                                firstAirDate: tvShow.firstAirDate,
                                genres,
                                matchScore,
                              },
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>

      <Footer />

      {/* TV Details Modal */}
      {selectedTvModal && (
        <TvDetailsModal
          tvShowId={selectedTvModal.tvShowId}
          initialData={selectedTvModal.initialData}
          onClose={() => setSelectedTvModal(null)}
        />
      )}
    </div>
  );
}
