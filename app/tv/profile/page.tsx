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
  const { profile, evidenceCount, evaluatedCount, confidence, maturityLabel } = tvProfileData;

  const isLowEvidence = evidenceCount < 5;

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text-primary selection:bg-accent selection:text-white">
      <Header
        userName={currentUser.name || ""}
        userAvatar={currentUser.image || undefined}
        userEmail={currentUser.email || undefined}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-fadeIn">
        {/* Breadcrumb / Mode Switcher */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold">
            <span>📺 DİZİ DNA PROFİLİ</span>
          </div>

          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-secondary hover:text-text-primary text-xs font-sans transition-all min-h-[38px]"
          >
            <span>🎬</span>
            <span>Film DNA&apos;ya Geç</span>
          </Link>
        </div>

        {/* Low Evidence / Forming State */}
        {isLowEvidence || !profile ? (
          <div className="space-y-8">
            <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface-1 border border-border rounded-3xl p-8 md:p-12 shadow-md">
              <div className="w-16 h-16 rounded-2xl bg-accent-subtle border border-accent/30 text-accent flex items-center justify-center mx-auto text-2xl font-bold">
                📺
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                  Dizi DNA&apos;nız Henüz Şekilleniyor
                </h1>
                <p className="text-text-secondary text-sm leading-relaxed font-sans">
                  Kişisel Dizi DNA profilinizin netleşmesi için izlediğiniz veya yarım bıraktığınız dizileri değerlendirmeye devam edin.
                </p>
              </div>

              {/* Evidence & Evaluation Status */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-surface-2 border border-border text-left font-sans">
                <div>
                  <div className="text-[11px] font-semibold text-text-muted">DEĞERLENDİRİLEN</div>
                  <div className="text-lg font-bold text-text-primary">{evaluatedCount} Dizi</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-text-muted">GÜÇLÜ ZEVK SİNYALİ</div>
                  <div className="text-lg font-bold text-accent">{evidenceCount} / 5 Min</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/tv/calibration"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent text-white font-semibold text-xs shadow-sm hover:bg-accent-hover active:scale-95 transition-all min-h-[44px] flex items-center justify-center"
                >
                  Dizi Değerlendirmeye Devam Et →
                </Link>
                <Link
                  href="/library?mediaType=TV"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-secondary hover:text-text-primary text-xs font-semibold transition-all min-h-[44px] flex items-center justify-center"
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
            <div className="relative overflow-hidden p-6 md:p-10 rounded-3xl bg-surface-1 border border-border shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold">
                    <span>🧬 DİZİ DNA PROFİLİ</span>
                    <span>•</span>
                    <span>{maturityLabel}</span>
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
                    Dizi Zevkiniz
                  </h1>
                  <p className="text-text-secondary text-xs sm:text-sm max-w-xl leading-relaxed font-sans">
                    {evaluatedCount} dizi etkileşiminiz ve {evidenceCount} güçlü zevk sinyaliniz analiz edilerek deterministik olarak hesaplandı.
                  </p>
                </div>

                {/* Stat Badges */}
                <div className="flex flex-wrap md:flex-col gap-3 min-w-[180px] font-sans">
                  <div className="flex-1 p-3.5 rounded-2xl bg-surface-2 border border-border">
                    <div className="text-[11px] font-semibold text-text-muted">PROFİL GÜVENİ</div>
                    <div className="text-xl font-bold text-accent flex items-center gap-1.5">
                      %{Math.round(confidence * 100)}
                      <span className="text-xs font-normal text-text-secondary">
                        ({profile.confidenceLabel})
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 p-3.5 rounded-2xl bg-surface-2 border border-border">
                    <div className="text-[11px] font-semibold text-text-muted">ZEVK KANITI</div>
                    <div className="text-xl font-bold text-text-primary">
                      {evidenceCount} <span className="text-xs font-normal text-text-muted font-sans">kayıt</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Archetypes */}
              {profile.archetypes.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border/80 space-y-3 font-sans">
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    ÖNE ÇIKAN DİZİ ARKETİPLERİNİZ
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {profile.archetypes.map((arch) => (
                      <div
                        key={arch.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          arch.isPrimary
                            ? "bg-accent-subtle border-accent/40 shadow-sm"
                            : "bg-surface-2 border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="text-2xl">{arch.icon}</span>
                          <div>
                            <div className="font-bold text-sm text-text-primary">{arch.name}</div>
                            <div className="text-[11px] text-accent font-medium">
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
              <div className="p-5 rounded-2xl bg-surface-1 border border-border space-y-2.5 font-sans">
                <div className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1.5">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
              {/* SECTION 1: GENRE PREFERENCES */}
              <div className="p-6 rounded-3xl bg-surface-1 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold mb-1">
                      <span>🍿 TÜR İMZASI</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-text-primary">En Güçlü Türleriniz</h3>
                  </div>
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
                              <span className="text-[10px] text-accent bg-accent-subtle px-2 py-0.5 rounded-md font-semibold">
                                Sevilen
                              </span>
                            )}
                            {genre.state === "NEGATIVE" && (
                              <span className="text-[10px] text-text-muted bg-surface-2 px-2 py-0.5 rounded-md">
                                Mesafeli
                              </span>
                            )}
                          </span>
                          <span className="text-text-muted">%{Math.round(genre.score * 100)}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden border border-border">
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
              <div className="p-6 rounded-3xl bg-surface-1 border border-border space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold mb-1">
                    <span>⏱️ FORMAT & UZUNLUK</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-text-primary">Nasıl Diziler Uygun?</h3>
                </div>

                {/* Format Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div
                    className={`p-3 rounded-2xl border text-center space-y-1 ${
                      profile.formatPreference.preference === "MINISERIES"
                        ? "bg-accent-subtle border-accent/40"
                        : "bg-surface-2 border-border"
                    }`}
                  >
                    <div className="text-xl">⏱️</div>
                    <div className="text-xs font-bold text-text-primary">Mini Dizi</div>
                    <div className="text-[11px] text-text-muted">
                      %{Math.round(profile.formatPreference.miniseriesScore * 100)}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-2xl border text-center space-y-1 ${
                      profile.formatPreference.preference === "MULTI_SEASON"
                        ? "bg-accent-subtle border-accent/40"
                        : "bg-surface-2 border-border"
                    }`}
                  >
                    <div className="text-xl">📺</div>
                    <div className="text-xs font-bold text-text-primary">2–4 Sezon</div>
                    <div className="text-[11px] text-text-muted">
                      %{Math.round(profile.formatPreference.multiSeasonScore * 100)}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-2xl border text-center space-y-1 ${
                      profile.formatPreference.preference === "LONG_RUNNING"
                        ? "bg-accent-subtle border-accent/40"
                        : "bg-surface-2 border-border"
                    }`}
                  >
                    <div className="text-xl">📚</div>
                    <div className="text-xs font-bold text-text-primary">5+ Sezon</div>
                    <div className="text-[11px] text-text-muted">
                      %{Math.round(profile.formatPreference.longRunningScore * 100)}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  {profile.formatPreference.description}
                </p>

                {/* Series Length Insight */}
                <div className="p-3.5 rounded-2xl bg-surface-2 border border-border flex items-center justify-between text-xs">
                  <span className="text-text-muted">Ortalama Tercih Sezonu:</span>
                  <span className="font-bold text-text-primary">
                    {profile.seriesLengthPreference.avgSeasons} Sezon ({profile.seriesLengthPreference.preference})
                  </span>
                </div>
              </div>

              {/* SECTION 3: RUNTIME & STATUS */}
              <div className="p-6 rounded-3xl bg-surface-1 border border-border space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold mb-1">
                    <span>⏳ SÜRE & YAYIN DURUMU</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-text-primary">İdeal Bölüm Süresi & Durum</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <div className="text-[11px] font-semibold text-text-muted uppercase">İdeal Bölüm Süresi</div>
                    <div className="text-base font-bold text-accent">
                      {profile.episodeRuntimePreference.avgMinutes
                        ? `${profile.episodeRuntimePreference.avgMinutes} Dakika`
                        : "Belirgin Değil"}
                    </div>
                    <div className="text-[11px] text-text-secondary leading-tight">
                      {profile.episodeRuntimePreference.description}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <div className="text-[11px] font-semibold text-text-muted uppercase">Yayın Durumu</div>
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
              <div className="p-6 rounded-3xl bg-surface-1 border border-border space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold mb-1">
                    <span>🌍 DÜNYA & DÖNEMLER</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-text-primary">Dünya Dizileri & Dönemler</h3>
                </div>

                {/* International Insight */}
                <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary">
                      {profile.internationalOrientation.orientation === "GLOBAL_EXPLORER"
                        ? "🌍 Global Dizi Kaşifi"
                        : "📺 Ana Akım & İngilizce"}
                    </span>
                    <span className="text-accent text-xs font-semibold">
                      %{Math.round(profile.internationalOrientation.nonEnglishRatio * 100)} Yabancı Dil
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {profile.internationalOrientation.description}
                  </p>
                </div>

                {/* Era Compact Tags */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-text-muted uppercase">En Çok Hangi Dönem?</div>
                  <div className="flex flex-wrap gap-2">
                    {profile.eras
                      .filter((e) => e.ratedCount > 0)
                      .slice(0, 4)
                      .map((era) => (
                        <span
                          key={era.key}
                          className="px-3 py-1 rounded-xl bg-surface-2 border border-border text-xs text-text-primary"
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

            {/* TV LIBRARY STATS SUMMARY (Preserving Navigation Semantics: /library?mediaType=TV) */}
            <div className="p-6 rounded-3xl bg-surface-1 border border-border space-y-4 shadow-md font-sans">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold mb-1">
                    <span>📺 KİŞİSEL KÜTÜPHANE</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-text-primary">Dizilerim</h3>
                </div>
                <Link
                  href="/library?mediaType=TV"
                  className="px-4 py-2 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-primary text-xs font-semibold hover:bg-surface-3 transition-all min-h-[40px] flex items-center"
                >
                  Tüm Dizilerim ➔
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <Link href="/library?mediaType=TV&tab=watched" className="p-3.5 rounded-2xl bg-surface-2 border border-border hover:border-accent transition-all">
                  <div className="text-lg font-bold text-text-primary">{watchedCount}</div>
                  <div className="text-[11px] text-text-muted font-medium">İZLEDİM</div>
                </Link>
                <Link href="/library?mediaType=TV&tab=dropped" className="p-3.5 rounded-2xl bg-surface-2 border border-border hover:border-accent transition-all">
                  <div className="text-lg font-bold text-accent">{partialCount}</div>
                  <div className="text-[11px] text-accent font-medium">YARIM KALDI</div>
                </Link>
                <Link href="/library?mediaType=TV&tab=not_watched" className="p-3.5 rounded-2xl bg-surface-2 border border-border hover:border-accent transition-all">
                  <div className="text-lg font-bold text-text-muted">{notWatchedCount}</div>
                  <div className="text-[11px] text-text-muted font-medium">İZLEMEDİM</div>
                </Link>
                <Link href="/library?mediaType=TV&tab=unsure" className="p-3.5 rounded-2xl bg-surface-2 border border-border hover:border-accent transition-all">
                  <div className="text-lg font-bold text-text-muted">{unsureCount}</div>
                  <div className="text-[11px] text-text-muted font-medium">EMİN DEĞİLİM</div>
                </Link>
                <Link href="/library?mediaType=TV&tab=watchlist" className="p-3.5 rounded-2xl bg-surface-2 border border-border hover:border-accent transition-all col-span-2 sm:col-span-1">
                  <div className="text-lg font-bold text-text-primary">{watchLaterCount}</div>
                  <div className="text-[11px] text-text-muted font-medium">LİSTEDEKİLER</div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
