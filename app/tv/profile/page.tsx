import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getCurrentUser } from "@/lib/auth/service";
import { getOrRecalculateTvTasteProfile } from "@/lib/tv/profile/service";
import { db } from "@/lib/db/client";
import { TvJourney } from "@/components/profile/TvJourney";


export const dynamic = "force-dynamic";

export default async function TvProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth?returnTo=/tv/profile");
  }

  const [tvProfileData, counts] = await Promise.all([
    getOrRecalculateTvTasteProfile(currentUser.id),
    Promise.all([
      db.tvInteraction.count({ where: { userId: currentUser.id, status: "WATCHED" } }),
      db.tvInteraction.count({ where: { userId: currentUser.id, status: "PARTIALLY_WATCHED" } }),
      db.tvInteraction.count({ where: { userId: currentUser.id, status: "NOT_WATCHED" } }),
      db.tvInteraction.count({ where: { userId: currentUser.id, status: "UNSURE" } }),
      db.tvRecommendationFeedback.count({ where: { userId: currentUser.id, action: "WATCH_LATER" } }),
    ]),
  ]);

  const [watchedCount, partialCount, notWatchedCount, unsureCount, watchLaterCount] = counts;
  const { profile, evidenceCount, evaluatedCount, confidence, maturity, maturityLabel, ready } = tvProfileData;

  const isLowEvidence = evidenceCount < 5;

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-accent selection:text-white">
      <Header
        userName={currentUser.name || ""}
        userAvatar={currentUser.image || undefined}
        userEmail={currentUser.email || undefined}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 space-y-8 animate-fadeIn">
        {/* Breadcrumb / Mode Switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <Link href="/tv" className="text-text-muted hover:text-text-primary transition-colors">
              DİZİLER
            </Link>
            <span className="text-text-muted">/</span>
            <span className="text-accent font-semibold">DİZİ DNA</span>
          </div>

          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated border border-border hover:border-text-muted text-text-secondary hover:text-text-primary text-xs font-mono transition-colors"
          >
            <span>🎬</span> Film DNA'ya Geç
          </Link>
        </div>

        {/* Low Evidence / Forming State */}
        {isLowEvidence || !profile ? (
          <div className="space-y-8">
            <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface border border-border/80 rounded-3xl p-8 md:p-12 shadow-cinematic">
            <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto text-2xl font-bold font-mono">
              📺
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                Dizi DNA'n Henüz Şekilleniyor
              </h1>
              <p className="text-text-secondary text-sm leading-relaxed">
                Kişisel Dizi DNA profilinin netleşmesi için izlediğin veya yarım bıraktığın dizileri puanlamaya devam et.
              </p>
            </div>

            {/* Evidence & Evaluation Status */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-surface-elevated border border-border text-left">
              <div>
                <div className="text-[10px] font-mono text-text-muted uppercase">Değerlendirilen</div>
                <div className="text-lg font-bold text-text-primary">{evaluatedCount} Dizi</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-text-muted uppercase">Güçlü Zevk Sinyali</div>
                <div className="text-lg font-bold text-accent">{evidenceCount} / 5 Min</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/tv/calibration"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent text-white font-mono text-xs font-semibold shadow-cinematic hover:bg-accent/90 active:scale-95 transition-all"
              >
                Dizi Değerlendirmeye Devam Et →
              </Link>
              <Link
                href="/tv/library"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface-elevated border border-border hover:border-text-muted text-text-secondary font-mono text-xs font-semibold transition-colors"
              >
                Dizi Kütüphanem ({watchedCount + partialCount})
              </Link>
            </div>
          </div>
          <TvJourney evaluatedCount={evaluatedCount} />
        </div>
        ) : (
          /* Full Dizi DNA Profile Screen */
          <div className="space-y-8">
            {/* HERO SECTION */}
            <div className="relative overflow-hidden p-6 md:p-10 rounded-3xl bg-surface border border-border/80 shadow-cinematic">
              <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10 pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-medium">
                    <span>🧬 DİZİ DNA PROFİLİ</span>
                    <span>•</span>
                    <span>{maturityLabel}</span>
                  </div>
                  <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
                    Dizi Zevkiniz
                  </h1>
                  <p className="text-text-secondary text-sm max-w-xl leading-relaxed">
                    {evaluatedCount} dizi etkileşiminiz ve {evidenceCount} güçlü zevk sinyaliniz analiz edilerek deterministik olarak hesaplandı.
                  </p>
                </div>

                {/* Stat Badges */}
                <div className="flex flex-wrap md:flex-col gap-3 min-w-[180px]">
                  <div className="flex-1 p-3 rounded-2xl bg-surface-elevated border border-border">
                    <div className="text-[10px] font-mono text-text-muted uppercase">Profil Güveni</div>
                    <div className="text-xl font-bold text-accent flex items-center gap-1.5">
                      %{Math.round(confidence * 100)}
                      <span className="text-xs font-normal text-text-secondary font-sans">
                        ({profile.confidenceLabel})
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 p-3 rounded-2xl bg-surface-elevated border border-border">
                    <div className="text-[10px] font-mono text-text-muted uppercase">Zevk Kanıtı</div>
                    <div className="text-xl font-bold text-text-primary">
                      {evidenceCount} <span className="text-xs font-normal text-text-muted font-sans">kayıt</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Archetypes */}
              {profile.archetypes.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border/80 space-y-3">
                  <div className="text-xs font-mono text-text-muted uppercase tracking-wider">
                    ÖNE ÇIKAN DİZİ ARKETİPLERİNİZ
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {profile.archetypes.map((arch) => (
                      <div
                        key={arch.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          arch.isPrimary
                            ? "bg-accent/5 border-accent/40 shadow-sm"
                            : "bg-surface-elevated border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="text-2xl">{arch.icon}</span>
                          <div>
                            <div className="font-bold text-sm text-text-primary">{arch.name}</div>
                            <div className="text-[10px] font-mono text-accent">
                              {arch.isPrimary ? "Ana Arketip" : "İkincil"} • Uyum: %{arch.score}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed">{arch.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* HUMAN INSIGHTS BANNER */}
            {profile.humanInsights.length > 0 && (
              <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-2.5">
                <div className="text-xs font-mono text-accent uppercase tracking-wider flex items-center gap-1.5">
                  <span>💡</span> BELİRGİN DİZİ ALIŞKANLIKLARINIZ
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-text-secondary leading-relaxed">
                  {profile.humanInsights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-accent">•</span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2-COLUMN DIMENSIONS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SECTION 1: GENRE PREFERENCES */}
              <div className="p-6 rounded-3xl bg-surface border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-accent uppercase tracking-widest font-semibold">
                      TÜR İMZASI
                    </span>
                    <h3 className="font-display text-lg font-bold text-text-primary">En Güçlü Türlerin</h3>
                  </div>
                  <span className="text-xs font-mono text-text-muted">Tercih Gücü</span>
                </div>

                <div className="space-y-3">
                  {profile.genres
                    .filter((g) => g.state !== "UNOBSERVED")
                    .slice(0, 6)
                    .map((genre) => (
                      <div key={genre.genreId} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-text-primary flex items-center gap-1.5">
                            {genre.name}
                            {genre.state === "POSITIVE" && (
                              <span className="text-[10px] font-mono text-accent bg-accent/15 px-1.5 py-0.2 rounded">
                                Sevilen
                              </span>
                            )}
                            {genre.state === "NEGATIVE" && (
                              <span className="text-[10px] font-mono text-text-muted bg-surface-elevated px-1.5 py-0.2 rounded">
                                Mesafeli
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-text-muted">%{Math.round(genre.score * 100)}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden border border-border/60">
                          <div
                            className={`h-full rounded-full transition-all ${
                              genre.state === "POSITIVE"
                                ? "bg-accent"
                                : genre.state === "NEGATIVE"
                                ? "bg-text-muted/40"
                                : "bg-text-muted"
                            }`}
                            style={{ width: `${Math.round(genre.score * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* SECTION 2: FORMAT & SERIES LENGTH */}
              <div className="p-6 rounded-3xl bg-surface border border-border/80 space-y-5">
                <div>
                  <span className="text-[10px] font-mono text-accent uppercase tracking-widest font-semibold">
                    FORMAT & UZUNLUK
                  </span>
                  <h3 className="font-display text-lg font-bold text-text-primary">Nasıl Diziler Sana Uygun?</h3>
                </div>

                {/* Format Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div
                    className={`p-3 rounded-2xl border text-center space-y-1 ${
                      profile.formatPreference.preference === "MINISERIES"
                        ? "bg-accent/10 border-accent/40"
                        : "bg-surface-elevated border-border"
                    }`}
                  >
                    <div className="text-xl">⏱️</div>
                    <div className="text-xs font-bold text-text-primary">Mini Dizi</div>
                    <div className="text-[10px] font-mono text-text-muted">
                      %{Math.round(profile.formatPreference.miniseriesScore * 100)}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-2xl border text-center space-y-1 ${
                      profile.formatPreference.preference === "MULTI_SEASON"
                        ? "bg-accent/10 border-accent/40"
                        : "bg-surface-elevated border-border"
                    }`}
                  >
                    <div className="text-xl">📺</div>
                    <div className="text-xs font-bold text-text-primary">2–4 Sezon</div>
                    <div className="text-[10px] font-mono text-text-muted">
                      %{Math.round(profile.formatPreference.multiSeasonScore * 100)}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-2xl border text-center space-y-1 ${
                      profile.formatPreference.preference === "LONG_RUNNING"
                        ? "bg-accent/10 border-accent/40"
                        : "bg-surface-elevated border-border"
                    }`}
                  >
                    <div className="text-xl">📚</div>
                    <div className="text-xs font-bold text-text-primary">5+ Sezon</div>
                    <div className="text-[10px] font-mono text-text-muted">
                      %{Math.round(profile.formatPreference.longRunningScore * 100)}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  {profile.formatPreference.description}
                </p>

                {/* Series Length Insight */}
                <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border flex items-center justify-between text-xs">
                  <span className="text-text-muted">Ortalama Tercih Sezonu:</span>
                  <span className="font-bold text-text-primary font-mono">
                    {profile.seriesLengthPreference.avgSeasons} Sezon ({profile.seriesLengthPreference.preference})
                  </span>
                </div>
              </div>

              {/* SECTION 3: RUNTIME & STATUS */}
              <div className="p-6 rounded-3xl bg-surface border border-border/80 space-y-4">
                <div>
                  <span className="text-[10px] font-mono text-accent uppercase tracking-widest font-semibold">
                    SÜRE & YAYIN DURUMU
                  </span>
                  <h3 className="font-display text-lg font-bold text-text-primary">İdeal Bölüm Süren & Durum</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border space-y-1">
                    <div className="text-[10px] font-mono text-text-muted uppercase">İdeal Bölüm Süresi</div>
                    <div className="text-base font-bold text-accent">
                      {profile.episodeRuntimePreference.avgMinutes
                        ? `${profile.episodeRuntimePreference.avgMinutes} Dakika`
                        : "Belirgin Değil"}
                    </div>
                    <div className="text-[11px] text-text-secondary leading-tight">
                      {profile.episodeRuntimePreference.description}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border space-y-1">
                    <div className="text-[10px] font-mono text-text-muted uppercase">Yayın Durumu</div>
                    <div className="text-base font-bold text-text-primary">
                      {profile.statusPreference.preference === "ENDED"
                        ? "Final Yapmış"
                        : profile.statusPreference.preference === "RETURNING"
                        ? "Devam Eden"
                        : "Esnek"}
                    </div>
                    <div className="text-[11px] text-text-secondary leading-tight">
                      {profile.statusPreference.description}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: INTERNATIONAL & ERAS */}
              <div className="p-6 rounded-3xl bg-surface border border-border/80 space-y-4">
                <div>
                  <span className="text-[10px] font-mono text-accent uppercase tracking-widest font-semibold">
                    DÜNYA & DÖNEMLER
                  </span>
                  <h3 className="font-display text-lg font-bold text-text-primary">Dünya Dizileri & Dönemler</h3>
                </div>

                {/* International Insight */}
                <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary">
                      {profile.internationalOrientation.orientation === "GLOBAL_EXPLORER"
                        ? "🌍 Global Dizi Kaşifi"
                        : "📺 Ana Akım & İngilizce"}
                    </span>
                    <span className="font-mono text-accent text-[11px]">
                      %{Math.round(profile.internationalOrientation.nonEnglishRatio * 100)} Yabancı Dil
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {profile.internationalOrientation.description}
                  </p>
                </div>

                {/* Era Compact Tags */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono text-text-muted uppercase">En Çok Hangi Dönem?</div>
                  <div className="flex flex-wrap gap-2">
                    {profile.eras
                      .filter((e) => e.ratedCount > 0)
                      .slice(0, 4)
                      .map((era) => (
                        <span
                          key={era.key}
                          className="px-3 py-1 rounded-xl bg-surface-elevated border border-border text-xs font-mono text-text-primary"
                        >
                          {era.label} (%{Math.round(era.score * 100)})
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* TV Journey & Rank Progression Section */}
            <TvJourney evaluatedCount={evaluatedCount} />

            {/* TV LIBRARY STATS SUMMARY */}
            <div className="p-6 rounded-3xl bg-surface border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-accent uppercase tracking-widest font-semibold">
                    KİŞİSEL DİZİ KÜTÜPHANESİ
                  </span>
                  <h3 className="font-display text-lg font-bold text-text-primary">Dizilerim</h3>
                </div>
                <Link
                  href="/tv/library"
                  className="text-xs font-mono text-accent hover:underline flex items-center gap-1"
                >
                  Tümünü Gör →
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-surface-elevated border border-border">
                  <div className="text-lg font-bold text-text-primary font-mono">{watchedCount}</div>
                  <div className="text-[10px] font-mono text-text-muted">İZLEDİM</div>
                </div>
                <div className="p-3 rounded-2xl bg-surface-elevated border border-border">
                  <div className="text-lg font-bold text-accent font-mono">{partialCount}</div>
                  <div className="text-[10px] font-mono text-accent">YARIM KALDI</div>
                </div>
                <div className="p-3 rounded-2xl bg-surface-elevated border border-border">
                  <div className="text-lg font-bold text-text-muted font-mono">{notWatchedCount}</div>
                  <div className="text-[10px] font-mono text-text-muted">İZLEMEDİM</div>
                </div>
                <div className="p-3 rounded-2xl bg-surface-elevated border border-border">
                  <div className="text-lg font-bold text-text-muted font-mono">{unsureCount}</div>
                  <div className="text-[10px] font-mono text-text-muted">EMİN DEĞİLİM</div>
                </div>
                <div className="p-3 rounded-2xl bg-surface-elevated border border-border col-span-2 sm:col-span-1">
                  <div className="text-lg font-bold text-text-primary font-mono">{watchLaterCount}</div>
                  <div className="text-[10px] font-mono text-text-muted">LİSTEDEKİLER</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
