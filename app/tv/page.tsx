import React from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getCurrentUser } from "@/lib/auth/service";
import { db } from "@/lib/db/client";
import { getTvHomeModules } from "@/lib/tv/recommendation/service";

export const dynamic = "force-dynamic";

export default async function TvHomePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth?returnTo=/tv");
  }

  const [tvInteractionCount, watchedCount, partiallyWatchedCount, homeModules] = await Promise.all([
    db.tvInteraction.count({ where: { userId: currentUser.id } }),
    db.tvInteraction.count({
      where: { userId: currentUser.id, status: "WATCHED" },
    }),
    db.tvInteraction.count({
      where: { userId: currentUser.id, status: "PARTIALLY_WATCHED" },
    }),
    getTvHomeModules(currentUser.id),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-accent selection:text-white">
      <Header
        userName={currentUser.name || ""}
        userAvatar={currentUser.image || undefined}
        userEmail={currentUser.email || undefined}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 md:py-12 space-y-10 animate-fadeIn">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-surface border border-border/80 p-8 md:p-12 shadow-cinematic text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            SineAI TV Discovery
          </div>

          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-text-primary">
            Dizi Dünyanızı Keşfedin
          </h1>

          <p className="max-w-2xl mx-auto text-text-secondary text-sm md:text-base leading-relaxed">
            Film dünyanızdan tamamen bağımsız, size özel Dizi DNA profili ve deterministik eşleşme motoruyla
            yeni favori dizinizi bulun.
          </p>

          {/* Quick Stat Pill */}
          <div className="inline-flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-text-muted pt-2">
            <span className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border">
              📺 Kayıtlı Yanıtlar: <strong className="text-text-primary">{tvInteractionCount}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border">
              ✓ İzlenen: <strong className="text-text-primary">{watchedCount}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border">
              ⏳ Kısmen İzlenen: <strong className="text-text-primary">{partiallyWatchedCount}</strong>
            </span>
          </div>
        </div>

        {/* Feature Hub Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Dizi Kalibrasyonu */}
          <Link
            href="/tv/calibration"
            className="group block p-6 rounded-3xl bg-surface border border-border/80 hover:border-accent/50 transition-all shadow-cinematic hover:shadow-glow space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-lg font-bold font-mono group-hover:scale-105 transition-transform">
              🎯
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-text-primary group-hover:text-accent transition-colors">
                Dizi Kalibrasyonu
              </h2>
              <p className="text-text-secondary text-xs mt-1 leading-relaxed line-clamp-2">
                İzlediğiniz veya yarım bıraktığınız dizileri yanıtlayın.
              </p>
            </div>
            <div className="flex items-center text-xs font-mono text-accent font-semibold pt-1">
              Başla →
            </div>
          </Link>

          {/* Card 2: Dizi DNA */}
          <Link
            href="/tv/profile"
            className="group block p-6 rounded-3xl bg-surface border border-border/80 hover:border-accent/50 transition-all shadow-cinematic hover:shadow-glow space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-lg font-bold font-mono group-hover:scale-105 transition-transform">
              🧬
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-text-primary group-hover:text-accent transition-colors">
                Dizi DNA Profili
              </h2>
              <p className="text-text-secondary text-xs mt-1 leading-relaxed line-clamp-2">
                Tür, format, süre ve arketip analizinizi inceleyin.
              </p>
            </div>
            <div className="flex items-center text-xs font-mono text-accent font-semibold pt-1">
              İncele →
            </div>
          </Link>

          {/* Card 3: Öneriler */}
          <Link
            href="/tv/recommendations"
            className="group block p-6 rounded-3xl bg-surface border border-border/80 hover:border-accent/50 transition-all shadow-cinematic hover:shadow-glow space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-lg font-bold font-mono group-hover:scale-105 transition-transform">
              ✨
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-text-primary group-hover:text-accent transition-colors">
                Dizi Önerileri
              </h2>
              <p className="text-text-secondary text-xs mt-1 leading-relaxed line-clamp-2">
                Kişisel eşleşme puanlarıyla dizileri keşfedin.
              </p>
            </div>
            <div className="flex items-center text-xs font-mono text-accent font-semibold pt-1">
              Keşfet →
            </div>
          </Link>

          {/* Card 4: Dizilerim */}
          <Link
            href="/tv/library"
            className="group block p-6 rounded-3xl bg-surface border border-border/80 hover:border-accent/50 transition-all shadow-cinematic hover:shadow-glow space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-lg font-bold font-mono group-hover:scale-105 transition-transform">
              📚
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-text-primary group-hover:text-accent transition-colors">
                Dizi Kütüphanesi
              </h2>
              <p className="text-text-secondary text-xs mt-1 leading-relaxed line-clamp-2">
                Kayıtlı ve izlenen tüm dizileriniz.
              </p>
            </div>
            <div className="flex items-center text-xs font-mono text-accent font-semibold pt-1">
              Aç →
            </div>
          </Link>
        </div>

        {/* Editorial Rows Section */}
        {homeModules.length > 0 && (
          <div className="space-y-10 pt-4">
            {homeModules.map((module) => (
              <section key={module.id} className="space-y-4">
                <div className="flex items-baseline justify-between border-b border-border/60 pb-2">
                  <div>
                    <h2 className="font-display text-xl font-bold text-text-primary">{module.title}</h2>
                    <p className="text-xs text-text-secondary">{module.subtitle}</p>
                  </div>
                  <Link
                    href="/tv/recommendations"
                    className="text-xs font-mono text-accent hover:underline flex items-center gap-1"
                  >
                    Tümünü Gör →
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {module.items.slice(0, 6).map((item) => {
                    const show = item.tvShow;
                    const posterUrl = show.posterPath
                      ? show.posterPath.startsWith("http")
                        ? show.posterPath
                        : `https://image.tmdb.org/t/p/w500${show.posterPath}`
                      : "/placeholder-poster.png";

                    const year = show.firstAirDate?.slice(0, 4);

                    return (
                      <Link
                        key={show.id}
                        href="/tv/recommendations"
                        className="group relative flex flex-col rounded-2xl bg-surface border border-border/70 hover:border-accent/50 overflow-hidden shadow-sm hover:shadow-cinematic transition-all"
                      >
                        <div className="relative aspect-[2/3] w-full bg-surface-elevated overflow-hidden">
                          <Image
                            src={posterUrl}
                            alt={show.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-background/85 backdrop-blur-md border border-accent/30 text-accent font-mono text-[11px] font-bold">
                            %{item.matchScore}
                          </div>
                        </div>

                        <div className="p-2.5 space-y-1">
                          <div className="font-display text-xs font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                            {show.name}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                            <span>{year || "—"}</span>
                            {show.voteAverage > 0 && <span>★ {show.voteAverage.toFixed(1)}</span>}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
