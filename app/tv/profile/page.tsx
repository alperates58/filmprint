import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getCurrentUser } from "@/lib/auth/service";
import { getOrRecalculateTvTasteProfile } from "@/lib/tv/profile/service";
import { getTvProgressionForCount } from "@/lib/progression/service";
import { deriveTvCompoundInsights, CompoundInsight } from "@/lib/profile/dna-insights";
import { ProfileHeroCard } from "@/components/profile/ProfileHeroCard";
import { ProfileStatGrid, ProfileStatItem } from "@/components/profile/ProfileStatGrid";
import { ProfileNarrativeCard } from "@/components/profile/ProfileNarrativeCard";
import { GenreSignature } from "@/components/profile/GenreSignature";
import { EraSignature } from "@/components/profile/EraSignature";
import { LibrarySnapshotCard } from "@/components/profile/LibrarySnapshotCard";
import { TvJourney } from "@/components/profile/TvJourney";
import { db } from "@/lib/db/client";

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
      db.userContentLibrary.count({ where: { userId: currentUser.id, mediaType: "TV", isFavorite: true } }),
    ]),
  ]);

  const [watchedCount, partialCount, notWatchedCount, unsureCount, watchLaterCount, favoriteCount] = counts;
  const { profile, evidenceCount, evaluatedCount, confidence, maturityLabel } = tvProfileData;
  const isLowEvidence = evidenceCount < 5;
  const progression = getTvProgressionForCount(evaluatedCount);

  // Prepare Stat Grid items if profile is ready
  let statItems: ProfileStatItem[] = [];
  let compoundInsights: CompoundInsight[] = [];

  if (!isLowEvidence && profile) {
    compoundInsights = deriveTvCompoundInsights(profile);
    const topPositiveGenre = (profile.genres || []).find((g) => g.state === "POSITIVE") || profile.genres?.[0];
    const topEra = profile.eras?.[0];

    statItems = [
      {
        id: "tv-stat-genre",
        icon: "📺",
        category: "Baskın Dizi Türü",
        value: topPositiveGenre?.name || "Dram",
        subValue: topPositiveGenre ? `%${Math.round(topPositiveGenre.score * 100)}` : undefined,
        description: topPositiveGenre
          ? `${topPositiveGenre.name} türünde güçlü zevk rezonansı tespit edildi.`
          : "Değerlendirmelere göre güncellenir.",
        metricPct: topPositiveGenre ? Math.round(topPositiveGenre.score * 100) : 75,
        genreName: topPositiveGenre?.name,
      },
      {
        id: "tv-stat-format",
        icon: "⏱️",
        category: "Format Tercihi",
        value:
          profile.formatPreference.preference === "MINISERIES"
            ? "Mini Dizi Odaklı"
            : profile.formatPreference.preference === "MULTI_SEASON"
            ? "2-4 Sezonluk Seriler"
            : profile.formatPreference.preference === "LONG_RUNNING"
            ? "Uzun Soluklu Seriler"
            : "Esnek Format",
        subValue: profile.seriesLengthPreference.avgSeasons ? `${profile.seriesLengthPreference.avgSeasons} Sezon` : undefined,
        description: profile.formatPreference.description,
        metricPct: Math.round(
          Math.max(
            profile.formatPreference.miniseriesScore,
            profile.formatPreference.multiSeasonScore,
            profile.formatPreference.longRunningScore
          ) * 100
        ),
      },
      {
        id: "tv-stat-runtime",
        icon: "⏳",
        category: "Bölüm Süresi & Durum",
        value: profile.episodeRuntimePreference.avgMinutes
          ? `${profile.episodeRuntimePreference.avgMinutes} Dk / Bölüm`
          : "Esnek Süre",
        subValue:
          profile.statusPreference.preference === "ENDED"
            ? "Final Yapmış"
            : profile.statusPreference.preference === "RETURNING"
            ? "Devam Eden"
            : "Esnek",
        description: profile.episodeRuntimePreference.description,
        metricPct: 80,
      },
      {
        id: "tv-stat-intl",
        icon: "🌍",
        category: "Küresel Açıklık",
        value:
          profile.internationalOrientation.orientation === "GLOBAL_EXPLORER"
            ? "Dünya Dizileri Kaşifi"
            : "Ana Akım & İngilizce",
        subValue: `%{Math.round(profile.internationalOrientation.nonEnglishRatio * 100)} Yabancı Dil`,
        description: profile.internationalOrientation.description,
        metricPct: Math.round(profile.internationalOrientation.nonEnglishRatio * 100),
      },
    ];
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text-primary selection:bg-accent selection:text-white">
      <Header
        userName={currentUser.name || ""}
        userAvatar={currentUser.image || undefined}
        userEmail={currentUser.email || undefined}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-fadeIn">
        {/* Top Header Mode Switcher */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-sans font-bold tracking-wide">
            <span>📺 DİZİ DNA PROFİLİ</span>
          </div>

          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-secondary hover:text-text-primary text-xs font-sans font-semibold transition-all min-h-[38px] shadow-sm"
          >
            <span>🎬</span>
            <span>Film DNA&apos;ya Geç</span>
          </Link>
        </div>

        {isLowEvidence || !profile ? (
          /* Low Evidence / Forming State */
          <div className="space-y-8 animate-fadeIn">
            <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface-1 border border-border/80 rounded-3xl p-8 md:p-12 shadow-lg my-4 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

              <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto text-3xl font-bold shadow-inner">
                📺
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                  Dizi DNA&apos;nız Henüz Şekilleniyor
                </h1>
                <p className="text-text-secondary text-sm leading-relaxed font-sans max-w-md mx-auto">
                  Kişisel Dizi DNA profilinizin netleşmesi için izlediğiniz veya yarım bıraktığınız dizileri değerlendirmeye devam edin.
                </p>
              </div>

              {/* Evidence Status */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-surface-2 border border-border text-left font-sans">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">DEĞERLENDİRİLEN</div>
                  <div className="text-lg font-bold text-text-primary">{evaluatedCount} Dizi</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">GÜÇLÜ ZEVK SİNYALİ</div>
                  <div className="text-lg font-bold text-accent">{evidenceCount} / 5 Min</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/tv/calibration"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent text-white font-semibold text-xs shadow-md hover:bg-accent-hover active:scale-95 transition-all min-h-[44px] flex items-center justify-center"
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
          <div className="space-y-8 animate-fadeIn">
            {/* 1. Ultra-Premium Hero Card */}
            <ProfileHeroCard
              mediaType="TV"
              userName={currentUser.name || "SineAI Kullanıcısı"}
              userAvatar={currentUser.image || undefined}
              userEmail={currentUser.email || undefined}
              confidenceScore={confidence}
              confidenceLabel={profile.confidenceLabel}
              sampleCount={evaluatedCount}
              summaryText={profile.humanInsights?.[0] || `${evaluatedCount} dizi etkileşiminiz deterministik olarak modellendi.`}
              rankLabel={progression.currentRank.label}
              rankBadgeIcon={progression.currentRank.badgeIcon}
              maturityLabel={maturityLabel}
              archetypes={profile.archetypes.map((arch) => ({
                name: arch.name,
                isPrimary: arch.isPrimary,
                icon: arch.icon,
              }))}
              ctaHref="/tv/calibration"
              ctaLabel="Dizi DNA'mı Keskinleştir"
            />

            {/* 2. Top Analytical Stat Grid */}
            <ProfileStatGrid items={statItems} />

            {/* 3. Compound Editorial Narrative Insights */}
            <ProfileNarrativeCard insights={compoundInsights} mediaType="TV" />

            {/* 4. Multi-Accent Genre Spectrum */}
            <GenreSignature
              genres={profile.genres.map((g) => ({
                name: g.name,
                score: g.score > 0 ? g.score : 0,
                ratedCount: g.ratedCount,
                exposureCount: g.exposure,
              }))}
              mediaType="TV"
            />

            {/* 5. Era Heatmap & Timeline */}
            <EraSignature
              eras={profile.eras.map((e) => ({
                key: e.key,
                label: e.label,
                score: e.score,
                ratedCount: e.ratedCount,
              }))}
              mediaType="TV"
            />

            {/* 6. TV Format & Narrative Structure Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
              {/* Format & Length */}
              <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-4 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
                    <span>⏱️ FORMAT VE SEZON TERCİHİ</span>
                  </div>
                </div>
                <h3 className="font-display text-lg font-bold text-text-primary">
                  Nasıl Bir Dizi Akışı Tercih Ediyorsun?
                </h3>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div
                    className={`p-3 rounded-2xl border text-center space-y-1 ${
                      profile.formatPreference.preference === "MINISERIES"
                        ? "bg-cyan-500/15 border-cyan-500/40 shadow-sm"
                        : "bg-surface-2 border-border"
                    }`}
                  >
                    <div className="text-xl">⏱️</div>
                    <div className="text-xs font-bold text-text-primary">Mini Dizi</div>
                    <div className="text-[10px] text-text-muted">
                      %{Math.round(profile.formatPreference.miniseriesScore * 100)} Uyum
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-2xl border text-center space-y-1 ${
                      profile.formatPreference.preference === "MULTI_SEASON"
                        ? "bg-cyan-500/15 border-cyan-500/40 shadow-sm"
                        : "bg-surface-2 border-border"
                    }`}
                  >
                    <div className="text-xl">📺</div>
                    <div className="text-xs font-bold text-text-primary">2–4 Sezon</div>
                    <div className="text-[10px] text-text-muted">
                      %{Math.round(profile.formatPreference.multiSeasonScore * 100)} Uyum
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-2xl border text-center space-y-1 ${
                      profile.formatPreference.preference === "LONG_RUNNING"
                        ? "bg-cyan-500/15 border-cyan-500/40 shadow-sm"
                        : "bg-surface-2 border-border"
                    }`}
                  >
                    <div className="text-xl">📚</div>
                    <div className="text-xs font-bold text-text-primary">5+ Sezon</div>
                    <div className="text-[10px] text-text-muted">
                      %{Math.round(profile.formatPreference.longRunningScore * 100)} Uyum
                    </div>
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  {profile.formatPreference.description}
                </p>
              </div>

              {/* Episode Runtime & Status */}
              <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-4 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <span>⏳ SÜRE VE YAYIN DURUMU</span>
                  </div>
                </div>
                <h3 className="font-display text-lg font-bold text-text-primary">
                  Bölüm Süresi ve Yayın Eşiği
                </h3>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      İDEAL BÖLÜM SÜRESİ
                    </p>
                    <p className="text-base font-bold text-accent">
                      {profile.episodeRuntimePreference.avgMinutes
                        ? `${profile.episodeRuntimePreference.avgMinutes} Dakika`
                        : "Esnek"}
                    </p>
                    <p className="text-[11px] text-text-secondary line-clamp-2">
                      {profile.episodeRuntimePreference.description}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      YAYIN DURUMU
                    </p>
                    <p className="text-base font-bold text-text-primary">
                      {profile.statusPreference.preference === "ENDED"
                        ? "Final Yapmış"
                        : profile.statusPreference.preference === "RETURNING"
                        ? "Devam Eden"
                        : "Esnek"}
                    </p>
                    <p className="text-[11px] text-text-secondary line-clamp-2">
                      {profile.statusPreference.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Personal Library Snapshot */}
            <LibrarySnapshotCard
              mediaType="TV"
              watchedCount={watchedCount}
              notWatchedCount={notWatchedCount}
              unsureCount={unsureCount}
              watchLaterCount={watchLaterCount}
              partialCount={partialCount}
              favoriteCount={favoriteCount}
            />

            {/* 8. TV Journey & Rank Roadmap */}
            <TvJourney evaluatedCount={evaluatedCount} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
