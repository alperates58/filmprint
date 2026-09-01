"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { MovieDetailsModal } from "@/components/movie/MovieDetailsModal";
import { MediaCard } from "@/components/ui/MediaCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { getProgressionForCount } from "@/lib/progression/service";
import { getTmdbImageUrl } from "@/lib/tmdb/image";

interface HomeMovie {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  popularity: number;
  voteAverage: number;
  genres: string[];
  overview: string;
  runtime: number | null;
  matchScore?: number;
  matchLabel?: string;
  reasonHeadline?: string;
}

interface HomeModule {
  id: string;
  title: string;
  icon: string;
  description: string;
  movies: HomeMovie[];
}

interface DiscoveryHomeProps {
  userName: string;
  answeredCount: number;
  initialShowMilestone?: boolean;
}

const MOOD_SHORTCUTS = [
  { id: "top-picks", targetModuleId: "top-picks", label: "Günün Önerileri", icon: "✨", fallbackHref: "/recommendations" },
  { id: "watchlist", targetModuleId: "user_watchlist", label: "İzleme Listem", icon: "🔖", fallbackHref: "/library?mediaType=FILM&state=WATCHLIST" },
  { id: "mind-bending", targetModuleId: "mind-bending", label: "Zihin Büken", icon: "🌀", fallbackHref: "/recommendations" },
  { id: "hidden-gems", targetModuleId: "gems", label: "Gizli Kalmışlar", icon: "💎", fallbackHref: "/recommendations" },
  { id: "night-watch", targetModuleId: "night", label: "Gece Seansı", icon: "🍿", fallbackHref: "/recommendations" },
  { id: "rainy-day", targetModuleId: "rainy", label: "Yağmurlu Hava", icon: "🌧️", fallbackHref: "/recommendations" },
];

export function DiscoveryHome({
  userName,
  answeredCount,
  initialShowMilestone = false,
}: DiscoveryHomeProps) {
  const router = useRouter();
  const [modules, setModules] = useState<HomeModule[]>([]);
  const [topHeroMatch, setTopHeroMatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMilestoneNotice, setShowMilestoneNotice] = useState(initialShowMilestone);
  const [selectedMovieModal, setSelectedMovieModal] = useState<{
    movieId: string;
    initialData?: any;
  } | null>(null);

  const progression = getProgressionForCount(answeredCount);

  useEffect(() => {
    fetch("/api/home")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setModules(data.modules || []);
          setTopHeroMatch(data.topHeroMatch || null);
        }
      })
      .catch((e) => console.error("[DiscoveryHome Fetch Error]:", e))
      .finally(() => setIsLoading(false));
  }, []);

  const handleDismissMilestone = () => {
    setShowMilestoneNotice(false);
    try {
      localStorage.setItem("filmprint_milestone_seen_30", "true");
      localStorage.setItem(`filmprint_milestone_FILM_${progression.currentRank.key}`, "true");
    } catch {}
  };

  const handleShortcutClick = (shortcut: typeof MOOD_SHORTCUTS[number]) => {
    const el = document.getElementById(`module-${shortcut.targetModuleId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (shortcut.targetModuleId === "top-picks" || shortcut.targetModuleId === "top-hero") {
      const heroEl = document.getElementById("top-hero-match");
      if (heroEl) {
        heroEl.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    if (shortcut.fallbackHref) {
      router.push(shortcut.fallbackHref);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header userName={userName} progressCount={answeredCount} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-10">
        {/* Milestone Celebration Banner */}
        {showMilestoneNotice && (
          <div className="p-6 rounded-3xl bg-surface-1 border border-accent/30 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-fadeIn relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-subtle border border-accent/30 text-accent flex items-center justify-center text-2xl flex-shrink-0">
                🎉
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-2 text-accent text-[11px] font-semibold">
                  <span>KALİBRASYON TAMAMLANDI (30/30)</span>
                </div>
                <h2 className="font-display text-lg md:text-xl font-bold text-text-primary">
                  Tebrikler {userName ? `, ${userName}` : ""}! İlk Film DNA Profiliniz Hazır
                </h2>
                <p className="text-xs text-text-secondary">
                  30 filmi değerlendirdiniz. Artık keşif ana sayfasındasınız.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto flex-shrink-0">
              <Link
                href="/profile"
                className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-all shadow-sm"
              >
                Profilimi Gör →
              </Link>
              <button
                onClick={handleDismissMilestone}
                className="px-4 py-2 rounded-xl bg-surface-2 border border-border text-text-muted hover:text-text-primary text-xs transition-all"
              >
                Kapat
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* V2 EDITORIAL HERO SECTION                                                  */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-1 via-surface-1 to-surface-2 border border-border/80 p-6 sm:p-8 md:p-10 shadow-md">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Column: Greeting & Status */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold flex items-center gap-1.5">
                  <span>{progression.currentRank.badgeIcon}</span>
                  <span>{progression.currentRank.label}</span>
                </span>
                <span className="text-xs text-text-muted">
                  • {answeredCount} Film Değerlendirildi
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
                  {userName ? `İyi seyirler, ${userName}.` : "Film zevkine özel sinema vitrini."}
                </h1>
                <p className="text-sm md:text-base text-text-secondary leading-relaxed max-w-xl">
                  Yapay zekâ karar motorunuz film zevkinizi analiz etti. Zevkinizle yüksek uyum sağlayan yapımları ve gizli kalmış cevherleri sizin için derledik.
                </p>
              </div>

              {/* Primary & Secondary Action CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/recommendations"
                  className="px-5 py-3 rounded-xl bg-accent text-white font-semibold text-xs md:text-sm hover:bg-accent-hover active:scale-95 transition-all shadow-sm flex items-center gap-2 min-h-[44px]"
                >
                  <span>✨</span>
                  <span>Önerilerime Git</span>
                </Link>

                <Link
                  href="/calibrate"
                  className="px-5 py-3 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-primary font-medium text-xs md:text-sm active:scale-95 transition-all flex items-center gap-2 min-h-[44px]"
                >
                  <span>🎯</span>
                  <span>Değerlendirmeye Devam Et</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Smart Mood & Preference Shortcuts */}
            <div className="lg:col-span-5 bg-surface-2/60 border border-border/70 rounded-2xl p-4 sm:p-5 space-y-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                ⚡ HIZLI KEŞİF MODLARI
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {MOOD_SHORTCUTS.map((mood) => (
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
        {/* ✨ AI KEŞFET PROMPT HERO BANNER                                           */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-zinc-900/90 border border-purple-500/30 p-6 sm:p-8 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/50 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span>Yapay Zekâ Keşif Motoru</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Bu gece ne izlemek istiyorsun?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300">
                Ruh halini veya aklındaki deneyimi yaz; yapay zekâ en uygun film ve dizileri Türkiye platform rozetleri ve özel gerekçeleriyle çıkarsın.
              </p>
            </div>

            <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/kesfet"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
              >
                <span>✨</span>
                <span>AI İle Keşfetmeye Başla</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TOP MATCH HERO CARD (IF AVAILABLE)                                        */}
        {/* ========================================================================= */}
        {topHeroMatch && topHeroMatch.movie && (
          <section id="top-hero-match" className="space-y-4 scroll-mt-24 md:scroll-mt-28">
            <SectionHeader
              badge="GÜNÜN ZİRVESİ"
              badgeIcon="⭐"
              title="Bugünün En Yüksek Eşleşmesi"
              subtitle="Film DNA profiliniz ve son tercihleriniz baz alınarak seçildi."
            />

            <div
              onClick={() =>
                setSelectedMovieModal({
                  movieId: topHeroMatch.movie.id,
                  initialData: {
                    title: topHeroMatch.movie.title,
                    posterPath: topHeroMatch.movie.posterPath,
                    backdropPath: topHeroMatch.movie.backdropPath,
                    releaseYear: topHeroMatch.movie.releaseYear,
                    genres: topHeroMatch.movie.genres || [],
                    matchScore: topHeroMatch.match,
                    headline: topHeroMatch.headline,
                    reasons: topHeroMatch.reasons,
                  },
                })
              }
              className="group relative overflow-hidden rounded-3xl bg-surface-1 border border-border/80 p-5 sm:p-7 md:p-8 shadow-sm hover:border-accent/40 transition-all duration-300 cursor-pointer"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 md:gap-7 items-center">
                {/* Poster */}
                <div className="sm:col-span-4 md:col-span-3 aspect-[2/3] w-36 sm:w-full mx-auto sm:mx-0 rounded-2xl overflow-hidden bg-surface-2 border border-border-strong relative flex-shrink-0 shadow-md">
                  {topHeroMatch.movie.posterPath ? (
                    <Image
                      src={getTmdbImageUrl(topHeroMatch.movie.posterPath, "w500")!}
                      alt={topHeroMatch.movie.title}
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
                    <ScoreBadge score={topHeroMatch.match} label={topHeroMatch.matchLabel} size="md" showLabel />
                    <span className="text-xs text-text-muted">
                      {topHeroMatch.movie.releaseYear || "—"} • {topHeroMatch.movie.genres?.slice(0, 2).join(", ")}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-text-primary group-hover:text-accent transition-colors">
                      {topHeroMatch.movie.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-text-secondary line-clamp-2 sm:line-clamp-3 leading-relaxed">
                      {topHeroMatch.movie.overview || "Özel yapay zekâ analizli sinema seçkisi."}
                    </p>
                  </div>

                  {topHeroMatch.headline && (
                    <div className="p-3.5 rounded-xl bg-surface-2 border border-border/80 text-xs text-accent font-medium flex items-center gap-2">
                      <span>✨</span>
                      <span>{topHeroMatch.headline}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <button className="px-4 py-2.5 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-hover transition-all shadow-sm">
                      Filmi İncele & Fragman →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* PERSONALIZATION MODULES / CURATED ROWS                                    */}
        {/* ========================================================================= */}
        {isLoading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="space-y-4 animate-pulse">
                <div className="h-6 w-48 bg-surface-2 rounded-lg" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((m) => (
                    <div key={m} className="aspect-[2/3] rounded-2xl bg-surface-2" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          modules.map((module) => {
            if (!module.movies || module.movies.length === 0) return null;

            return (
              <section key={module.id} id={`module-${module.id}`} className="space-y-4 pt-2 scroll-mt-24 md:scroll-mt-28">
                <SectionHeader
                  badge={module.title}
                  badgeIcon={module.icon}
                  title={module.title}
                  subtitle={module.description}
                  actionHref="/recommendations"
                  actionLabel="Tümünü Gör"
                />

                {/* Horizontal Scroll on Mobile, Grid on Desktop */}
                <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-x-auto pb-3 sm:pb-0 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0 items-stretch">
                  {module.movies.map((movie) => (
                    <div key={movie.id} className="w-[148px] sm:w-auto min-w-[148px] sm:min-w-0 max-w-[148px] sm:max-w-none snap-start flex-shrink-0 sm:flex-shrink flex flex-col">
                      <MediaCard
                        id={movie.id}
                        mediaType="FILM"
                        title={movie.title}
                        originalTitle={movie.originalTitle}
                        posterPath={movie.posterPath}
                        releaseYear={movie.releaseYear}
                        genres={movie.genres}
                        matchScore={movie.matchScore}
                        matchLabel={movie.matchLabel}
                        reasonHeadline={movie.reasonHeadline}
                        onClick={() =>
                          setSelectedMovieModal({
                            movieId: movie.id,
                            initialData: {
                              title: movie.title,
                              posterPath: movie.posterPath,
                              backdropPath: movie.backdropPath,
                              releaseYear: movie.releaseYear,
                              genres: movie.genres,
                              matchScore: movie.matchScore,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      <Footer />

      {/* Movie Details Modal */}
      {selectedMovieModal && (
        <MovieDetailsModal
          movieId={selectedMovieModal.movieId}
          initialData={selectedMovieModal.initialData}
          onClose={() => setSelectedMovieModal(null)}
        />
      )}
    </div>
  );
}
