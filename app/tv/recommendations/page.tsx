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
    <div className="min-h-screen flex flex-col bg-bg-base text-text-primary selection:bg-accent selection:text-white">
      <Header
        userName={currentUser.name || ""}
        userAvatar={currentUser.image || undefined}
        userEmail={currentUser.email || undefined}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-fadeIn">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold">
              <span>✨ KİŞİSEL DİZİ SEÇKİSİ</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
              Kişisel Dizi Önerileriniz
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed font-sans">
              Dizi DNA profilinize ve değerlendirdiğiniz yapımlara göre eşleştirilen yapımlar.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/tv/profile"
              className="px-4 py-2.5 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-primary text-xs font-sans font-medium transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <span>🧬</span>
              <span>Dizi DNA</span>
            </Link>
            <Link
              href="/recommendations"
              className="px-4 py-2.5 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-secondary hover:text-text-primary text-xs font-sans font-medium transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <span>🎬</span>
              <span>Film Önerileri</span>
            </Link>
          </div>
        </div>

        {/* Low Evidence / Calibration Required State */}
        {isLowEvidence ? (
          <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface-1 border border-border rounded-3xl p-8 md:p-12 shadow-md my-8">
            <div className="w-14 h-14 rounded-2xl bg-accent-subtle border border-accent/30 text-accent flex items-center justify-center mx-auto text-2xl font-bold">
              📺
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold tracking-tight text-text-primary">
                Öneriler İçin Dizi DNA Oluşturun
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed font-sans">
                Size özel dizi önerileri üretebilmemiz için en az birkaç diziyi izledim, yarım bıraktım veya
                izlemedim şeklinde oylamanız gerekmektedir.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/tv/calibration"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-accent text-white font-sans text-xs font-semibold shadow-sm hover:bg-accent-hover transition-all"
              >
                Dizi Kalibrasyonuna Başla →
              </Link>
            </div>
          </div>
        ) : (
          /* Recommendation Grid & Status */
          <div className="space-y-6">
            {/* Hero Insight Pill */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-surface-1 border border-border/80 text-xs font-sans">
              <div className="flex items-center gap-2.5 text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span>Toplam <strong className="text-text-primary">{data.totalEligible}</strong> uygun dizi analiz edildi</span>
              </div>
              <span className="text-[11px] text-text-muted">
                {data.profileConfidence ? `Güven: %${Math.round(data.profileConfidence * 100)}` : ""}
              </span>
            </div>

            <TvRecommendationGrid
              items={data.recommendations}
              hybridPending={data.hybridPending}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
