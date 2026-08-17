import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getCurrentUser } from "@/lib/auth/service";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { getProgressionForCount } from "@/lib/progression/service";
import { deriveFilmCompoundInsights, CompoundInsight } from "@/lib/profile/dna-insights";
import { ProfileHeroCard } from "@/components/profile/ProfileHeroCard";
import { ProfileStatGrid, ProfileStatItem } from "@/components/profile/ProfileStatGrid";
import { ProfileNarrativeCard } from "@/components/profile/ProfileNarrativeCard";
import { GenreSignature } from "@/components/profile/GenreSignature";
import { EraSignature } from "@/components/profile/EraSignature";
import { TasteTraits } from "@/components/profile/TasteTraits";
import { LibrarySnapshotCard } from "@/components/profile/LibrarySnapshotCard";
import { FilmJourney } from "@/components/profile/FilmJourney";
import { db } from "@/lib/db/client";
import { InteractionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth?returnTo=/profile");
  }

  const [data, counts] = await Promise.all([
    getOrCalculateUserProfile(currentUser.id),
    Promise.all([
      db.movieInteraction.count({ where: { userId: currentUser.id, status: InteractionStatus.WATCHED } }),
      db.movieInteraction.count({ where: { userId: currentUser.id, status: InteractionStatus.NOT_WATCHED } }),
      db.movieInteraction.count({ where: { userId: currentUser.id, status: InteractionStatus.UNSURE } }),
      db.recommendationFeedback.count({ where: { userId: currentUser.id, action: "WATCH_LATER" } }),
      db.userContentLibrary.count({ where: { userId: currentUser.id, mediaType: "FILM", isFavorite: true } }),
    ]),
  ]);

  const [watchedCount, notWatchedCount, unsureCount, watchLaterCount, favoriteCount] = counts;
  const progression = getProgressionForCount(data.current);

  // Prepare Stat Grid items if profile is ready
  let statItems: ProfileStatItem[] = [];
  let compoundInsights: CompoundInsight[] = [];

  if (data.ready && data.profile) {
    compoundInsights = deriveFilmCompoundInsights(data.profile);
    const topGenre = data.profile.genres[0];
    const topEra = data.profile.eras[0];

    statItems = [
      {
        id: "stat-genre",
        icon: "🍿",
        category: "Baskın Tür",
        value: topGenre?.name || "Sinema",
        subValue: topGenre ? `%${Math.round(topGenre.score * 100)}` : undefined,
        description: topGenre
          ? `Toplam ${topGenre.ratedCount} oylama ile zevkinin en güçlü çekim merkezi.`
          : "Değerlendirmelerinize göre şekilleniyor.",
        metricPct: topGenre ? Math.round(topGenre.score * 100) : 75,
        genreName: topGenre?.name,
      },
      {
        id: "stat-era",
        icon: "⌛",
        category: "Zirve Dönem",
        value: topEra?.label || "Çağdaş Sinema",
        subValue: topEra?.key.toUpperCase(),
        description: topEra
          ? `${topEra.key} dönemi yapımlarında en yüksek izleme doyumuna ulaşıyorsun.`
          : "Farklı dönemlerden filmler izlendikçe netleşir.",
        metricPct: topEra ? Math.round(topEra.score * 100) : 80,
      },
      {
        id: "stat-taste",
        icon: "🎭",
        category: "Karakter Eğilimi",
        value: data.profile.traits[0] || "Dengeli Sinefil",
        subValue: data.profile.traits[1],
        description: "İzleme kararlarındaki belirgin anlatı ve atmosfer eğilimi.",
        metricPct: 85,
      },
      {
        id: "stat-discovery",
        icon: "🧭",
        category: "Keşif Dengesi",
        value: data.profile.popularity.label || "Dengeli",
        subValue: data.profile.familiarity.label === "discovery_heavy" ? "Kaşif" : "Seçici",
        description: data.profile.familiarity.description || "Ana akım ile bağımsız sinema arasında dengeli dağılım.",
        metricPct: Math.round((data.profile.familiarity.score || 0.6) * 100),
      },
    ];
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text-primary selection:bg-accent selection:text-white">
      <Header
        progressCount={data.current}
        progressTarget={data.required}
        userName={currentUser.name || ""}
        userAvatar={currentUser.image || undefined}
        userEmail={currentUser.email || undefined}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-fadeIn">
        {/* Top Header Mode Switcher */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-sans font-bold tracking-wide">
            <span>🧬 SİNEMA DNA PROFİLİ</span>
          </div>

          <Link
            href="/tv/profile"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-secondary hover:text-text-primary text-xs font-sans font-semibold transition-all min-h-[38px] shadow-sm"
          >
            <span>📺</span>
            <span>Dizi DNA&apos;ya Geç</span>
          </Link>
        </div>

        {!data.ready || !data.profile ? (
          /* Calibration In-Progress View */
          <div className="space-y-8 animate-fadeIn">
            <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface-1 border border-border/80 rounded-3xl p-8 md:p-12 shadow-lg my-4 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

              <div className="w-16 h-16 rounded-2xl bg-accent-subtle border border-accent/30 text-accent flex items-center justify-center mx-auto text-3xl font-bold shadow-inner">
                🧬
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                  Film DNA&apos;nız Şekilleniyor
                </h1>
                <p className="text-text-secondary text-sm leading-relaxed font-sans max-w-md mx-auto">
                  Kişisel Film DNA profilinizin kristalleşmesi için en az{" "}
                  <strong className="text-text-primary">{data.required} filmi</strong>{" "}
                  değerlendirmeniz gerekmektedir.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 pt-2 font-sans text-left">
                <div className="flex justify-between text-xs text-text-muted">
                  <span className="font-bold uppercase tracking-wider">KALİBRASYON İLERLEMESİ</span>
                  <span className="font-bold text-text-primary">
                    {data.current} / {data.required} Film
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-surface-2 overflow-hidden border border-border">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-700 shadow-sm"
                    style={{
                      width: `${Math.min(
                        Math.round((data.current / data.required) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-hover active:scale-95 transition-all shadow-md min-h-[44px] flex items-center justify-center"
                >
                  Filmleri Değerlendirmeye Başla →
                </Link>
                <Link
                  href="/library?mediaType=FILM"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-secondary hover:text-text-primary text-xs font-semibold transition-all min-h-[44px] flex items-center justify-center"
                >
                  Film Kütüphanem ({watchedCount})
                </Link>
              </div>
            </div>

            <FilmJourney evaluatedCount={data.current} />
          </div>
        ) : (
          /* Full Film DNA Profile View */
          <div className="space-y-8 animate-fadeIn">
            {/* 1. Ultra-Premium Hero Card */}
            <ProfileHeroCard
              mediaType="FILM"
              userName={currentUser.name || "SineAI Kullanıcısı"}
              userAvatar={currentUser.image || undefined}
              userEmail={currentUser.email || undefined}
              confidenceScore={data.profile.confidence}
              confidenceLabel={data.profile.confidenceLabel}
              sampleCount={data.profile.sample.ratedMovies}
              summaryText={data.profile.summary}
              rankLabel={progression.currentRank.label}
              rankBadgeIcon={progression.currentRank.badgeIcon}
              maturityLabel={`${data.current} Film Analiz Edildi`}
              archetypes={data.profile.traits.slice(0, 3).map((t, idx) => ({
                name: t,
                isPrimary: idx === 0,
                icon: idx === 0 ? "👑" : "✨",
              }))}
              ctaHref="/"
              ctaLabel="Film DNA'mı Keskinleştir"
            />

            {/* 2. Top Analytical Stat Grid */}
            <ProfileStatGrid items={statItems} />

            {/* 3. Compound Editorial Narrative Insights */}
            <ProfileNarrativeCard insights={compoundInsights} mediaType="FILM" />

            {/* 4. Multi-Accent Genre Spectrum */}
            <GenreSignature genres={data.profile.genres} mediaType="FILM" />

            {/* 5. Era Heatmap & Timeline */}
            <EraSignature eras={data.profile.eras} mediaType="FILM" />

            {/* 6. Taste Character & Aesthetic Fingerprint */}
            <TasteTraits
              traits={data.profile.traits}
              popularityLabel={data.profile.popularity.label}
              familiarityDesc={data.profile.familiarity.description}
              mediaType="FILM"
            />

            {/* 7. Personal Library Snapshot */}
            <LibrarySnapshotCard
              mediaType="FILM"
              watchedCount={watchedCount}
              notWatchedCount={notWatchedCount}
              unsureCount={unsureCount}
              watchLaterCount={watchLaterCount}
              favoriteCount={favoriteCount}
            />

            {/* 8. Film Journey & Rank Roadmap */}
            <FilmJourney evaluatedCount={data.current} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
