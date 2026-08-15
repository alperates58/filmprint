import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getCurrentUser } from "@/lib/auth/service";
import { getPersonalizedTvRecommendations } from "@/lib/tv/recommendation/service";
import { TvRecommendationGrid } from "@/components/tv/TvRecommendationGrid";

export const dynamic = "force-dynamic";

export default async function TvRecommendationsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth?returnTo=/tv/recommendations");
  }

  const data = await getPersonalizedTvRecommendations(currentUser.id, {
    limit: 28,
  });

  const isLowEvidence = data.recommendations.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-accent selection:text-white">
      <Header
        userName={currentUser.name || ""}
        userAvatar={currentUser.image || undefined}
        userEmail={currentUser.email || undefined}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 md:py-12 space-y-8 animate-fadeIn">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-mono">
              <Link href="/tv" className="text-text-muted hover:text-text-primary transition-colors">
                DİZİLER
              </Link>
              <span className="text-text-muted">/</span>
              <span className="text-accent font-semibold">ÖNERİLER</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
              Kişisel Dizi Önerileriniz
            </h1>
            <p className="text-xs text-text-secondary">
              Dizi DNA profilinize göre deterministik olarak eşleştirilen yapımlar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tv/profile"
              className="px-3.5 py-2 rounded-xl bg-surface-elevated border border-border hover:border-accent/40 text-text-secondary hover:text-text-primary text-xs font-mono transition-colors flex items-center gap-1.5"
            >
              <span>🧬</span> Dizi DNA
            </Link>
            <Link
              href="/recommendations"
              className="px-3.5 py-2 rounded-xl bg-surface-elevated border border-border hover:border-text-muted text-text-secondary hover:text-text-primary text-xs font-mono transition-colors flex items-center gap-1.5"
            >
              <span>🎬</span> Film Önerileri
            </Link>
          </div>
        </div>

        {/* Low Evidence / Calibration Required State */}
        {isLowEvidence ? (
          <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface border border-border/80 rounded-3xl p-8 md:p-12 shadow-cinematic my-8">
            <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto text-2xl font-bold font-mono">
              📺
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold tracking-tight text-text-primary">
                Öneriler İçin Dizi DNA Oluşturun
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                Size özel dizi önerileri üretebilmemiz için en az birkaç diziyi izledim, yarım bıraktım veya
                izlemedim şeklinde yanıtlamanız gerekmektedir.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/tv/calibration"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-accent text-white font-mono text-xs font-semibold shadow-cinematic hover:bg-accent/90 transition-all"
              >
                Dizi Kalibrasyonuna Başla →
              </Link>
            </div>
          </div>
        ) : (
          /* Recommendation Grid & Status */
          <div className="space-y-8">
            {/* Hero Insight Pill */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border/80 text-xs font-mono">
              <div className="flex items-center gap-2 text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span>Toplam {data.totalEligible} uygun dizi analiz edildi</span>
              </div>
              <div className="flex items-center gap-3 text-text-muted">
                <span>Profil Güveni: <strong className="text-accent">%{Math.round(data.profileConfidence * 100)}</strong> ({data.confidenceLabel})</span>
                <span>•</span>
                <span>Olgunluk: <strong className="text-text-primary">{data.maturityLabel}</strong></span>
              </div>
            </div>

            {/* Recommendations Grid */}
            <TvRecommendationGrid items={data.recommendations} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
