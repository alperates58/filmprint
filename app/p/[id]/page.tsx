import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { db } from "@/lib/db/client";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { ProfileHeroCard } from "@/components/profile/ProfileHeroCard";
import { ProfileStatGrid } from "@/components/profile/ProfileStatGrid";
import { GenreSignature } from "@/components/profile/GenreSignature";
import { EraSignature } from "@/components/profile/EraSignature";
import { TasteTraits } from "@/components/profile/TasteTraits";
import { ProfileNarrativeCard } from "@/components/profile/ProfileNarrativeCard";
import { deriveFilmCompoundInsights } from "@/lib/profile/dna-insights";
import { getProgressionForCount } from "@/lib/progression/service";

interface PublicProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { name: true, image: true },
  });

  const userName = user?.name || "SineAI Kullanıcısı";
  const title = `${userName} — Film DNA Kimliği & Sinefil Profili | SineAI`;
  const description = `${userName} kullanıcısının yapay zekâ ile çıkarılmış kişisel Film DNA profilini, sinematik arketipini ve en sevdiği tür rezonansını inceleyin.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "SineAI",
      images: [
        {
          url: `/api/og/profile/${id}`,
          width: 1200,
          height: 630,
          alt: `${userName} Film DNA`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/profile/${id}`],
    },
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      accountType: true,
      createdAt: true,
    },
  });

  if (!user) {
    notFound();
  }

  const profileData = await getOrCalculateUserProfile(user.id);

  if (!profileData.ready || !profileData.profile) {
    return (
      <div className="min-h-screen flex flex-col bg-bg-base text-text-primary">
        <Header />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-16 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-surface-2 border border-border flex items-center justify-center mx-auto text-4xl shadow-inner">
            🧬
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary">
              {user.name || "Kullanıcı"} Henüz Film DNA&apos;sını Tamamlamadı
            </h1>
            <p className="text-text-secondary text-sm max-w-md mx-auto">
              Bu kullanıcının kişisel Film DNA profilinin kristalleşmesi için biraz daha film değerlendirmesi gerekiyor.
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-accent text-white font-bold text-sm hover:bg-accent-hover active:scale-95 transition-all shadow-lg shadow-accent/20"
            >
              <span>✨</span>
              <span>Kendi Film DNA&apos;nı 2 Dakikada Çıkar</span>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const profile = profileData.profile;
  const progression = getProgressionForCount(profileData.current);
  const compoundInsights = deriveFilmCompoundInsights(profile);

  const topGenre = profile.genres[0];
  const topEra = profile.eras[0];

  const statItems = [
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
      value: profile.traits[0] || "Dengeli Sinefil",
      subValue: profile.traits[1],
      description: "İzleme kararlarındaki belirgin anlatı ve atmosfer eğilimi.",
      metricPct: 85,
    },
    {
      id: "stat-discovery",
      icon: "🧭",
      category: "Keşif Dengesi",
      value: profile.popularity.label || "Dengeli",
      subValue: profile.familiarity.label === "discovery_heavy" ? "Kaşif" : "Seçici",
      description: profile.familiarity.description || "Ana akım ile bağımsız sinema arasında dengeli dağılım.",
      metricPct: Math.round((profile.familiarity.score || 0.6) * 100),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text-primary selection:bg-accent selection:text-white">
      <Header />

      {/* Guest Growth Header Banner */}
      <div className="bg-gradient-to-r from-violet-950/80 via-purple-950/80 to-indigo-950/80 border-b border-violet-500/30 px-4 py-2.5 text-center text-xs font-sans">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-violet-200">
            ✨ <strong>{user.name || "SineAI Kullanıcısı"}</strong> kullanıcısının resmi Film DNA profilini inceliyorsun.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/compare/${user.id}`}
              className="px-3 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 font-bold transition-all text-[11px]"
            >
              ⚔️ Zevkini Karşılaştır
            </Link>
            <Link
              href="/"
              className="px-3.5 py-1 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold transition-all text-[11px] shadow-sm"
            >
              Kendi DNA&apos;nı Keşfet →
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-fadeIn pb-28">
        {/* Top Tag */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-sans font-bold tracking-wide">
            <span>🧬 HERKESE AÇIK SİNEMA DNA KİMLİĞİ</span>
          </div>

          <Link
            href={`/compare/${user.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-violet-500/20 transition-all active:scale-95"
          >
            <span>⚔️</span>
            <span>{user.name || "Kullanıcı"} ile Zevkini Karşılaştır</span>
          </Link>
        </div>

        {/* 1. Hero Card */}
        <ProfileHeroCard
          mediaType="FILM"
          userId={user.id}
          userName={user.name || "SineAI Kullanıcısı"}
          userAvatar={user.image || undefined}
          confidenceScore={profile.confidence}
          confidenceLabel={profile.confidenceLabel}
          sampleCount={profile.sample.ratedMovies}
          summaryText={profile.summary}
          rankLabel={progression.currentRank.label}
          rankBadgeIcon={progression.currentRank.badgeIcon}
          maturityLabel={`${profileData.current} Film Analiz Edildi`}
          archetypes={profile.traits.slice(0, 3).map((t, idx) => ({
            name: t,
            isPrimary: idx === 0,
            icon: idx === 0 ? "👑" : "✨",
          }))}
          genres={profile.genres}
          topEra={profile.eras[0]?.label}
          ctaHref="/"
          ctaLabel="Kendi Film DNA'nı Başlat"
        />

        {/* 2. Stat Grid */}
        <ProfileStatGrid items={statItems} />

        {/* 3. Compound Insights */}
        {compoundInsights.length > 0 && (
          <ProfileNarrativeCard insights={compoundInsights} mediaType="FILM" />
        )}

        {/* 4. Genre Signature */}
        <GenreSignature
          genres={profile.genres.map((g) => ({
            name: g.name,
            score: g.score,
            ratedCount: g.ratedCount,
            exposureCount: g.exposureCount,
          }))}
          mediaType="FILM"
        />

        {/* 5. Era Signature */}
        <EraSignature eras={profile.eras} mediaType="FILM" />

        {/* 6. Taste Traits */}
        <TasteTraits
          traits={profile.traits}
          popularityLabel={profile.popularity.label}
          familiarityDesc={profile.familiarity.description}
          mediaType="FILM"
        />

        {/* 7. Duel CTA Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-surface-1 via-purple-950/40 to-surface-1 border border-purple-500/30 p-8 sm:p-10 text-center space-y-5 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold font-mono">
            <span>⚔️ SİNEFİL ZEVK DÜELLOSU</span>
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-text-primary">
              {user.name || "Bu Kullanıcı"} ile Film Zevkin Ne Kadar Uyumlu?
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              Kendi film zevkini kıyasla; ortak sevdiğiniz türleri, zevk ayrışmalarınızı ve birlikte izlemeniz gereken 3 ortak başyapıtı keşfet.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={`/compare/${user.id}`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-500/25 active:scale-95 transition-all"
            >
              <span>⚔️</span>
              <span>Hemen Zevkini Karşılaştır</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Guest Growth Conversion Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-1/95 backdrop-blur-xl border-t border-border/80 p-3.5 sm:p-4 shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/30 text-accent font-bold flex items-center justify-center text-xl flex-shrink-0">
              🧬
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-text-primary">
                Senin sinema zevkin ne söylüyor?
              </p>
              <p className="text-[11px] text-text-muted">
                2 dakikada ücretsiz kişisel Film DNA profilini keşfet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href={`/compare/${user.id}`}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-text-primary font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>⚔️</span>
              <span>Zevkini Kıyasla</span>
            </Link>
            <Link
              href="/"
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>✨</span>
              <span>Kendi DNA&apos;nı Başlat</span>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
