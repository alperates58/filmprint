"use client";

import React from "react";
import Link from "next/link";
import { ShareModal } from "../share/ShareModal";

export interface ProfileHeroCardProps {
  mediaType: "FILM" | "TV";
  userId?: string;
  userName: string;
  userAvatar?: string;
  userEmail?: string;
  confidenceScore: number;
  confidenceLabel?: string;
  sampleCount: number;
  summaryText: string;
  rankLabel?: string;
  rankBadgeIcon?: string;
  maturityLabel?: string;
  archetypes?: Array<{ name: string; isPrimary?: boolean; icon?: string }>;
  genres?: Array<{ name: string; score: number }>;
  topEra?: string;
  lovedMovies?: Array<{ title: string; releaseYear?: number | null }>;
  ctaHref?: string;
  ctaLabel?: string;
}

export function ProfileHeroCard({
  mediaType,
  userId,
  userName,
  userAvatar,
  userEmail,
  confidenceScore,
  confidenceLabel = "Yüksek",
  sampleCount,
  summaryText,
  rankLabel,
  rankBadgeIcon,
  maturityLabel,
  archetypes = [],
  genres = [],
  topEra,
  lovedMovies = [],
  ctaHref = "/",
  ctaLabel = "DNA'yı Keskinleştir",
}: ProfileHeroCardProps) {
  const isFilm = mediaType === "FILM";
  const confidencePercent = Math.round(confidenceScore * 100);

  const [liveSummary, setLiveSummary] = React.useState(summaryText);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);

  React.useEffect(() => {
    setLiveSummary(summaryText);
  }, [summaryText]);

  const handleRefreshAi = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    try {
      const endpoint = isFilm ? "/api/profile/refresh-ai" : "/api/profile/refresh-ai";
      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.profile?.summary) {
          setLiveSummary(data.profile.summary);
        }
      }
    } catch (e) {
      console.error("[ProfileHeroCard] Failed to regenerate AI summary:", e);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-1 via-surface-1 to-surface-2 border border-border/80 p-4 sm:p-7 md:p-10 shadow-xl space-y-6 md:space-y-8 group">
      {/* Cinematic Ambient Glow Overlay */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-accent/10 blur-3xl pointer-events-none group-hover:bg-accent/15 transition-all duration-700" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Top Bar: Identity & Badges */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 border-b border-border/60 pb-6">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          {/* Avatar with Prestige Frame */}
          <div className="relative flex-shrink-0">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName || "Kullanıcı"}
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-border shadow-md"
              />
            ) : (
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-accent-subtle to-surface-2 border-2 border-accent/30 flex items-center justify-center text-accent font-bold text-xl sm:text-3xl shadow-inner">
                {userName ? userName.charAt(0).toUpperCase() : isFilm ? "🎬" : "📺"}
              </div>
            )}
            {rankBadgeIcon && (
              <div className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-surface-1 border border-border shadow-sm flex items-center justify-center text-xs sm:text-sm select-none">
                {rankBadgeIcon}
              </div>
            )}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-[10px] sm:text-[11px] font-sans font-bold tracking-wide uppercase">
                <span>{isFilm ? "🧬 SİNEMA DNA KİMLİĞİ" : "📺 DİZİ DNA KİMLİĞİ"}</span>
              </span>
              {maturityLabel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-2 border border-border text-text-secondary text-[10px] sm:text-[11px] font-sans font-medium">
                  {maturityLabel}
                </span>
              )}
              {rankLabel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] sm:text-[11px] font-sans font-bold">
                  <span>🏆</span>
                  <span>{rankLabel}</span>
                </span>
              )}
            </div>

            <h1 className="font-display text-xl sm:text-3xl md:text-4xl font-bold tracking-tight text-text-primary truncate">
              {userName || "SineAI Kullanıcısı"}
            </h1>

            {userEmail && (
              <p className="text-xs text-text-secondary font-sans tracking-tight truncate">{userEmail}</p>
            )}
          </div>
        </div>

        {/* Confidence & Sample Badges + Account Actions */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-start md:self-auto font-sans w-full md:w-auto justify-between md:justify-end">
          <div className="px-3.5 py-2.5 rounded-2xl bg-surface-2/80 backdrop-blur-md border border-border flex items-center gap-2.5 shadow-sm">
            <div className="relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
              <div className="w-2 h-2 rounded-full bg-emerald-400 relative" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] uppercase font-bold text-text-muted tracking-wider">
                PROFİL GÜVENİ
              </p>
              <p className="text-xs sm:text-sm font-bold text-text-primary">
                %{confidencePercent}{" "}
                <span className="text-[10px] sm:text-[11px] text-text-muted font-normal">
                  ({sampleCount} {isFilm ? "Film" : "Dizi"})
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-violet-500/25 active:scale-95 cursor-pointer min-h-[40px]"
              title="Sinematik DNA Kartını Paylaş"
            >
              <span className="animate-pulse">✨</span>
              <span>DNA Kartını Paylaş</span>
            </button>

            <Link
              href="/account"
              className="px-3 py-2.5 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 min-h-[40px]"
              title="Hesap Ayarları"
            >
              <span>⚙️</span>
              <span>Hesap</span>
            </Link>

            <a
              href="/api/auth/logout"
              className="px-3 py-2.5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 min-h-[40px]"
              title="Oturumu Kapat"
            >
              <span>🚪</span>
              <span>Çıkış</span>
            </a>
          </div>
        </div>
      </div>

      {/* Archetypes Strip */}
      {archetypes.length > 0 && (
        <div className="relative z-10 space-y-2">
          <p className="text-[11px] uppercase font-sans font-bold text-text-muted tracking-wider">
            ÖNE ÇIKAN SİNEMATİK ARKETİPLER
          </p>
          <div className="flex flex-wrap gap-2">
            {archetypes.map((arch, idx) => (
              <div
                key={idx}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-sans font-semibold flex items-center gap-2 transition-all ${
                  arch.isPrimary
                    ? "bg-accent/15 border-accent/40 text-accent shadow-sm"
                    : "bg-surface-2 border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                {arch.icon && <span>{arch.icon}</span>}
                <span>{arch.name}</span>
                {arch.isPrimary && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent/20 text-accent font-bold">
                    Ana
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editorial AI Narrative Synthesis */}
      <div className="relative z-10 p-5 sm:p-7 rounded-2xl bg-surface-2/95 border border-border/80 shadow-md space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider">
            <span className="animate-pulse text-sm">✨</span>
            <span>Yapay Zekâ Sinefil Analiz Raporu</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAi}
              disabled={isRegenerating}
              className="text-[11px] font-sans font-medium px-2.5 py-1 rounded-lg bg-surface-1 hover:bg-surface-3 border border-border text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              title="Yapay zekâ analizini yeniden üret"
            >
              <span className={isRegenerating ? "animate-spin" : ""}>🔄</span>
              <span>{isRegenerating ? "Analiz Ediliyor..." : "Yeniden Analiz Et"}</span>
            </button>
            <span className="hidden sm:inline-block text-[10px] font-mono text-accent/90 font-bold px-2 py-0.5 rounded-md bg-accent-subtle border border-accent/30">
              SİNEAI LLM ENGINE
            </span>
          </div>
        </div>

        <div className="space-y-3.5">
          {liveSummary.split("\n\n").map((paragraph, pIdx) => (
            <p key={pIdx} className="text-xs sm:text-sm text-text-primary/90 leading-relaxed font-sans">
              {paragraph.split(/(\*\*.*?\*\*)/g).map((part, idx) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <strong key={idx} className="text-accent font-semibold">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </p>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <div className="relative z-10 pt-1 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-text-muted font-sans italic">
          💡 Daha fazla {isFilm ? "film" : "dizi"} değerlendirdikçe DNA profilin katmanlaşır ve öneri hassasiyeti artar.
        </p>
        <Link
          href={ctaHref}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-hover active:scale-95 transition-all shadow-md text-center min-h-[44px] flex items-center justify-center flex-shrink-0"
        >
          {ctaLabel} →
        </Link>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        data={{
          userId,
          userName: userName || "SineAI Kullanıcısı",
          userAvatar,
          rankLabel,
          rankBadgeIcon,
          confidencePercent,
          sampleCount,
          archetypes,
          genres,
          topEra,
          aiQuote: liveSummary ? liveSummary.split("\n\n")[0] : undefined,
          lovedMovies,
          isTv: !isFilm,
        }}
      />
    </div>
  );
}
