"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { TvDetailsModal } from "./TvDetailsModal";
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

export function TvDiscoveryHome({
  userName,
  userAvatar,
  userEmail,
  answeredCount,
  homeModules,
  topHeroMatch,
  maturityLabel = "Dizi Kaşifi",
}: TvDiscoveryHomeProps) {
  const [selectedTvModal, setSelectedTvModal] = useState<{
    tvShowId: string;
    initialData?: any;
  } | null>(null);

  const progression = getTvProgressionForCount(answeredCount);
  const scrollToModule = (moduleId: string) => {
    const el = document.getElementById(`module-${moduleId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const heroShow = topHeroMatch?.tvShow;
  const heroYear = heroShow?.firstAirDate ? heroShow.firstAirDate.slice(0, 4) : "";
  const heroGenres = heroShow?.metadata?.genres || [];
  const heroSeasons = heroShow?.metadata?.numberOfSeasons;
  const heroStatus = heroShow?.status || heroShow?.metadata?.status;
  const statusLabel = heroStatus === "Ended" ? "Final Yaptı" : heroStatus === "Returning Series" ? "Devam Ediyor" : "";

  const heroHeadline = topHeroMatch
    ? topHeroMatch.matchLabel || (topHeroMatch.evidenceShows?.length ? `${topHeroMatch.evidenceShows[0].name} sevdiğiniz için` : "Dizi DNA Uyumu")
    : "";
  const heroExplanation = topHeroMatch?.deterministicExplanation || (topHeroMatch?.aiSignals?.length ? topHeroMatch.aiSignals[0] : "");

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header
        userName={userName}
        userAvatar={userAvatar}
        userEmail={userEmail}
        progressCount={answeredCount}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 space-y-12">
        {/* Welcome Hero Banner */}
        <div className="p-8 md:p-12 rounded-3xl bg-surface border border-border/80 shadow-cinematic space-y-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent font-mono text-xs font-bold uppercase tracking-wider">
                  {progression.currentRank.badgeIcon} {progression.currentRank.label}
                </span>
                <span className="text-xs font-mono text-text-muted">
                  • {answeredCount} Dizi Değerlendirildi
                </span>
              </div>


              <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-text-primary">
                Hoş Geldin{userName ? `, ${userName}` : ""}.
              </h1>

              <p className="text-sm md:text-base text-text-secondary leading-relaxed">
                Dizi DNA profilinize ve izleme alışkanlıklarınıza göre hazırlanan bugünün özel keşif seçkisi.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 self-start md:self-auto">
              <Link
                href="/tv/recommendations"
                className="px-6 py-3 rounded-2xl bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-all text-center shadow-md"
              >
                ✨ Önerilerime Git →
              </Link>
              <Link
                href="/tv/calibration"
                className="px-6 py-3 rounded-2xl bg-surface-elevated border border-border/80 hover:border-accent text-text-primary font-mono text-xs font-medium transition-all text-center"
              >
                ➕ Değerlendirmeye Devam Et
              </Link>
            </div>
          </div>

          {/* Quick TV Mood Pills */}
          <div className="pt-4 border-t border-border/60 space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              BU AKŞAM SANA UYGUN DİZİ MODLARI
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "FOR_YOU", label: "👀 İzlemediğin" },
                { id: "MINISERIES", label: "⚡ Mini Dizi" },
                { id: "MYSTERY_CRIME", label: "🔍 Gizem & Suç" },
                { id: "GLOBAL_DISCOVERY", label: "🌍 Dünya Dizileri" },
                { id: "SHORT_EPISODES", label: "⏱️ Kısa Bölümlükler" },
                { id: "LONG_RUNNING", label: "🏛️ Uzun Soluklu" },
                { id: "COMPLETED_GEMS", label: "🏁 Final Yapmış" },
                { id: "COMEDY", label: "🍿 Komedi" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => scrollToModule(m.id)}
                  className="px-3.5 py-1.5 rounded-full bg-surface-elevated/80 border border-border/60 hover:border-accent hover:bg-accent/10 text-xs font-mono text-text-secondary transition-all"
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top Hero Match ("Sana Özel Bugünkü Dizi") */}
        {topHeroMatch && heroShow && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                SANA ÖZEL BUGÜNKÜ DİZİ (TOP MATCH)
              </span>
              <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-mono font-bold">
                %{topHeroMatch.matchScore} UYUM
              </span>
            </div>

            <div className="p-6 md:p-8 rounded-3xl bg-surface border border-border/80 shadow-cinematic flex flex-col md:flex-row gap-6 items-start">
              {/* Poster */}
              <Link
                href="/tv/recommendations"
                className="w-32 md:w-44 aspect-[2/3] rounded-2xl overflow-hidden bg-surface-elevated relative border border-border/80 shadow-lg cursor-pointer group flex-shrink-0"
              >
                {getTmdbImageUrl(heroShow.posterPath, "w500") ? (
                  <Image
                    src={getTmdbImageUrl(heroShow.posterPath, "w500")!}
                    alt={heroShow.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="176px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-xs">
                    Görsel Yok
                  </div>
                )}
              </Link>

              {/* Info */}
              <div className="space-y-4 flex-1">
                <div>
                  <span className="text-xs font-mono text-text-muted">
                    {heroYear || "Tarihsiz"}
                    {heroGenres.length > 0 ? ` • ${heroGenres.slice(0, 3).join(", ")}` : ""}
                    {heroSeasons ? ` • ${heroSeasons} Sezon` : ""}
                    {statusLabel ? ` • ${statusLabel}` : ""}
                  </span>
                  <Link href="/tv/recommendations">
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary hover:text-accent transition-colors mt-0.5">
                      {heroShow.name}
                    </h2>
                  </Link>
                </div>

                {heroHeadline && (
                  <div className="p-4 rounded-2xl bg-surface-elevated/80 border border-border/60 space-y-2">
                    <p className="text-xs font-mono font-bold text-text-primary">
                      {heroHeadline}
                    </p>
                    {heroExplanation && (
                      <p className="text-xs text-text-secondary leading-relaxed">
                        • {heroExplanation.replace(/\*\*(.*?)\*\*/g, "$1")}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => heroShow && setSelectedTvModal({ tvShowId: heroShow.id })}
                    className="px-5 py-2.5 rounded-xl bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span>👁️</span>
                    <span>Diziyi İncele / İzledim Olarak İşaretle ➔</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editorial Horizontal Rows Section */}
        {homeModules.length > 0 ? (
          <div className="space-y-12">
            {homeModules.map((module) => (
              <section
                key={module.id}
                id={`module-${module.id}`}
                className="space-y-4 pt-2 scroll-mt-20"
              >
                <div className="flex items-end justify-between border-b border-border/60 pb-3">
                  <div className="space-y-0.5">
                    <h3 className="font-display text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
                      <span>{getModuleIcon(module.id)}</span>
                      <span>{module.title}</span>
                    </h3>
                    <p className="text-xs text-text-secondary font-mono">
                      {module.subtitle}
                    </p>
                  </div>
                  <Link
                    href="/tv/recommendations"
                    className="text-xs font-mono text-accent hover:underline flex items-center gap-1 flex-shrink-0"
                  >
                    Tümünü Gör →
                  </Link>
                </div>

                {/* Horizontal Scroll TV Row */}
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 pt-1">
                  {module.items.map((item) => {
                    const show = item.tvShow;
                    const posterUrl = getTmdbImageUrl(show.posterPath, "w500");
                    const year = show.firstAirDate ? show.firstAirDate.slice(0, 4) : "";
                    const primaryGenre =
                      (show.metadata?.genres && show.metadata.genres[0]) ||
                      "Dizi";

                    return (
                      <div
                        key={show.id}
                        onClick={() => setSelectedTvModal({ tvShowId: show.id })}
                        className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer space-y-2"
                      >
                        {/* Poster Card */}
                        <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden bg-surface-elevated relative border border-border/60 shadow-sm group-hover:border-accent/60 transition-all duration-300">
                          {posterUrl ? (
                            <Image
                              src={posterUrl}
                              alt={show.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="176px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-[10px] p-2 text-center">
                              {show.name}
                            </div>
                          )}

                          {/* Top-Right Badge: Match % */}
                          {typeof item.matchScore === "number" && item.matchScore > 0 && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-background/90 backdrop-blur-md border border-accent/40 text-accent text-[10px] font-mono font-bold z-10">
                              ❤️ %{item.matchScore}
                            </div>
                          )}
                        </div>

                        {/* Info & Rating */}
                        <div>
                          <h4 className="font-display text-xs font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                            {show.name}
                          </h4>
                          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mt-0.5">
                            <span className="line-clamp-1">
                              {year || "Tarihsiz"} • {primaryGenre}
                            </span>
                            {show.voteAverage > 0 && (
                              <span className="text-text-secondary font-bold flex-shrink-0 ml-1">
                                ⭐ {show.voteAverage.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Empty / Uncalibrated Fallback State */
          <div className="p-12 rounded-3xl bg-surface border border-border/80 text-center space-y-6 max-w-xl mx-auto shadow-cinematic">
            <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto text-2xl font-bold font-mono">
              📺
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-text-primary">
                Dizi Seçkisi Hazırlanıyor
              </h2>
              <p className="text-sm text-text-secondary">
                Dizi DNA profilinize özel seçkilerin oluşması için kalibrasyona başlayın.
              </p>
            </div>
            <Link
              href="/tv/calibration"
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-all shadow-md"
            >
              Dizi Kalibrasyonuna Başla →
            </Link>
          </div>
        )}
      </main>

      {/* TV Details Modal */}
      {selectedTvModal && (
        <TvDetailsModal
          tvShowId={selectedTvModal.tvShowId}
          initialData={selectedTvModal.initialData}
          onClose={() => setSelectedTvModal(null)}
        />
      )}

      <Footer />
    </div>
  );
}

function getModuleIcon(id: string): string {
  switch (id) {
    case "FOR_YOU":
      return "✨";
    case "MINISERIES":
      return "⚡";
    case "MYSTERY_CRIME":
      return "🔍";
    case "GLOBAL_DISCOVERY":
      return "🌍";
    case "SHORT_EPISODES":
      return "⏱️";
    case "LONG_RUNNING":
      return "🏛️";
    case "COMPLETED_GEMS":
      return "🏁";
    case "COMEDY":
      return "🍿";
    default:
      return "📺";
  }
}
