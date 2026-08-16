import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getCurrentUser } from "@/lib/auth/service";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { GenreSignature } from "@/components/profile/GenreSignature";
import { EraSignature } from "@/components/profile/EraSignature";
import { TasteTraits } from "@/components/profile/TasteTraits";
import { FilmJourney } from "@/components/profile/FilmJourney";
import { db } from "@/lib/db/client";
import { InteractionStatus } from "@prisma/client";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth");
  }
  const [data, watchedCount, notWatchedCount, unsureCount, watchLaterCount] = await Promise.all([
    getOrCalculateUserProfile(currentUser.id),
    db.movieInteraction.count({ where: { userId: currentUser.id, status: InteractionStatus.WATCHED } }),
    db.movieInteraction.count({ where: { userId: currentUser.id, status: InteractionStatus.NOT_WATCHED } }),
    db.movieInteraction.count({ where: { userId: currentUser.id, status: InteractionStatus.UNSURE } }),
    db.recommendationFeedback.count({ where: { userId: currentUser.id, action: "WATCH_LATER" } }),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text-primary selection:bg-accent selection:text-white">
      <Header
        progressCount={data.current}
        progressTarget={data.required}
        userName={currentUser.name || ""}
        userAvatar={currentUser.image || undefined}
        userEmail={currentUser.email || undefined}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8">
        {!data.ready || !data.profile ? (
          /* Profile Not Ready State */
          <div className="space-y-8 animate-fadeIn">
            <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface-1 border border-border rounded-3xl p-8 md:p-12 shadow-md my-8">
              <div className="w-16 h-16 rounded-2xl bg-accent-subtle border border-accent/30 text-accent flex items-center justify-center mx-auto text-2xl font-bold">
                🧬
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                  Film DNA&apos;nız Henüz Hazır Değil
                </h1>
                <p className="text-text-secondary text-sm leading-relaxed font-sans">
                  Kişisel Film DNA profilinizin oluşması için en az{" "}
                  <strong className="text-text-primary">{data.required} filmi</strong>{" "}
                  değerlendirmeniz gerekmektedir.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 pt-2 font-sans">
                <div className="flex justify-between text-xs text-text-muted">
                  <span className="font-semibold">KALİBRASYON İLERLEMESİ</span>
                  <span className="font-bold text-text-primary">
                    {data.current} / {data.required} Film
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-surface-2 overflow-hidden border border-border">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        Math.round((data.current / data.required) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-hover active:scale-95 transition-all shadow-sm min-h-[44px]"
                >
                  Filmleri Değerlendirmeye Başla →
                </Link>
              </div>
            </div>

            <FilmJourney evaluatedCount={data.current} />
          </div>
        ) : (
          /* Ready Film DNA Profile View */
          <div className="space-y-8 animate-fadeIn">
            {/* Profile Hero Header */}
            <div className="p-6 md:p-10 rounded-3xl bg-surface-1 border border-border space-y-6 shadow-md relative overflow-hidden">
              {/* User Identity Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
                <div className="flex items-center gap-4">
                  {currentUser.image ? (
                    <img
                      src={currentUser.image}
                      alt={currentUser.name || "Avatar"}
                      className="w-14 h-14 rounded-2xl object-cover border border-border shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent font-bold text-xl">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "👤"}
                    </div>
                  )}

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold">
                      <span>🧬 KİŞİSEL SİNEMA KİMLİĞİ</span>
                    </div>
                    <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary mt-1">
                      {currentUser.name || "SineAI Kullanıcısı"}
                    </h1>
                    {currentUser.email && (
                      <p className="text-xs text-text-secondary font-sans">{currentUser.email}</p>
                    )}
                  </div>
                </div>

                {/* Confidence Badge */}
                <div className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-surface-2 border border-border flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="font-sans">
                    <p className="text-[10px] uppercase font-semibold text-text-muted">PROFİL GÜVENİ</p>
                    <p className="text-xs font-bold text-text-primary">
                      %{Math.round(data.profile.confidence * 100)}{" "}
                      <span className="text-[11px] text-text-muted font-normal">
                        ({data.profile.sample.ratedMovies} Film)
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Natural Turkish Summary Paragraph */}
              <div className="p-5 rounded-2xl bg-surface-2 border border-border/70 text-sm md:text-base text-text-primary leading-relaxed font-sans">
                <p>{data.profile.summary.replace(/\*\*(.*?)\*\*/g, "$1")}</p>
              </div>

              {/* Top Quick Insight Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-sans">
                <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-1">
                  <p className="text-[11px] font-semibold text-accent">🍿 BASKIN TÜR</p>
                  <p className="text-sm font-bold text-text-primary">
                    {data.profile.genres[0]?.name || "Sinema"}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    %{Math.round((data.profile.genres[0]?.score || 0) * 100)} Yoğunluk
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-1">
                  <p className="text-[11px] font-semibold text-accent">⌛ EN GÜÇLÜ DÖNEM</p>
                  <p className="text-sm font-bold text-text-primary">
                    {data.profile.eras[0]?.label || "Günümüz Sineması"}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    {data.profile.eras[0]?.key || "2010s"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-1">
                  <p className="text-[11px] font-semibold text-accent">🎭 İZLEME TARZI</p>
                  <p className="text-sm font-bold text-text-primary line-clamp-1">
                    {data.profile.traits[0] || "Dengeli Sinefil"}
                  </p>
                  <p className="text-[11px] text-text-muted">Karakter Özelliği</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-1">
                  <p className="text-[11px] font-semibold text-accent">🧭 KEŞİF SEVİYESİ</p>
                  <p className="text-sm font-bold text-text-primary line-clamp-1">
                    {data.profile.popularity.label || "Dengeli"}
                  </p>
                  <p className="text-[11px] text-text-muted">Popülerlik Dengesi</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/"
                  className="px-6 py-3 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-hover active:scale-95 transition-all shadow-sm text-center min-h-[44px] flex items-center justify-center"
                >
                  Film DNA&apos;mı Keskinleştir (Değerlendirmeye Devam Et) →
                </Link>
              </div>
            </div>

            {/* Film Journey & Rank Progression Section */}
            <FilmJourney evaluatedCount={data.current} />

            {/* Filmlerim Summary Card (Preserving Navigation Semantics: /library?mediaType=FILM) */}
            <div className="p-6 rounded-3xl bg-surface-1 border border-border space-y-4 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-accent text-xs font-semibold mb-1">
                    <span>🎬 KİŞİSEL KÜTÜPHANE</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-text-primary">
                    Filmlerim
                  </h3>
                </div>
                <Link
                  href="/library?mediaType=FILM"
                  className="px-4 py-2 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-primary text-xs font-semibold hover:bg-surface-3 transition-all min-h-[40px] flex items-center"
                >
                  Tüm Filmlerim ➔
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 font-sans">
                <Link href="/library?mediaType=FILM&tab=watched" className="p-4 rounded-2xl bg-surface-2 border border-border hover:border-accent transition-all space-y-1">
                  <p className="text-2xl font-bold text-text-primary">{watchedCount}</p>
                  <p className="text-xs text-text-secondary">🎬 İzledim</p>
                </Link>
                <Link href="/library?mediaType=FILM&tab=not_watched" className="p-4 rounded-2xl bg-surface-2 border border-border hover:border-accent transition-all space-y-1">
                  <p className="text-2xl font-bold text-text-primary">{notWatchedCount}</p>
                  <p className="text-xs text-text-secondary">🙈 İzlemedim</p>
                </Link>
                <Link href="/library?mediaType=FILM&tab=unsure" className="p-4 rounded-2xl bg-surface-2 border border-border hover:border-accent transition-all space-y-1">
                  <p className="text-2xl font-bold text-text-primary">{unsureCount}</p>
                  <p className="text-xs text-text-secondary">🤔 Emin Değilim</p>
                </Link>
                <Link href="/library?mediaType=FILM&tab=watch_later" className="p-4 rounded-2xl bg-surface-2 border border-border hover:border-accent transition-all space-y-1">
                  <p className="text-2xl font-bold text-text-primary">{watchLaterCount}</p>
                  <p className="text-xs text-text-secondary">🔖 Daha Sonra</p>
                </Link>
              </div>
            </div>

            {/* Visual Signatures */}
            <GenreSignature genres={data.profile.genres} />
            <EraSignature eras={data.profile.eras} />
            <TasteTraits
              traits={data.profile.traits}
              popularityLabel={data.profile.popularity.label}
              familiarityDesc={data.profile.familiarity.description}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
