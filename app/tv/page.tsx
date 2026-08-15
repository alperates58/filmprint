import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getCurrentUser } from "@/lib/auth/service";
import { db } from "@/lib/db/client";
export default async function TvHomePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth?returnTo=/tv");
  }

  const [tvInteractionCount, watchedCount, partiallyWatchedCount] = await Promise.all([
    db.tvInteraction.count({ where: { userId: currentUser.id } }),
    db.tvInteraction.count({
      where: { userId: currentUser.id, status: "WATCHED" },
    }),
    db.tvInteraction.count({
      where: { userId: currentUser.id, status: "PARTIALLY_WATCHED" },
    }),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-accent selection:text-white">
      <Header
        userName={currentUser.name || ""}
        userAvatar={currentUser.image || undefined}
        userEmail={currentUser.email || undefined}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 space-y-10 animate-fadeIn">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-surface border border-border/80 p-8 md:p-12 shadow-cinematic text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Filmprint TV Foundation
          </div>

          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-text-primary">
            Dizi Dünyanızı Keşfedin
          </h1>

          <p className="max-w-2xl mx-auto text-text-secondary text-sm md:text-base leading-relaxed">
            Filmprint artık dizi zevkinizi de modelliyor. Film dünyanızdan tamamen bağımsız,
            size özel Dizi DNA profili ve öneri altyapısı kuruluyor.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Dizi Kalibrasyonu */}
          <Link
            href="/tv/calibration"
            className="group block p-6 md:p-8 rounded-3xl bg-surface border border-border/80 hover:border-accent/50 transition-all shadow-cinematic hover:shadow-glow space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-xl font-bold font-mono group-hover:scale-105 transition-transform">
              🎯
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-text-primary group-hover:text-accent transition-colors">
                Dizi Kalibrasyonu
              </h2>
              <p className="text-text-secondary text-xs md:text-sm mt-1 leading-relaxed">
                İzlediğiniz, kısmen bıraktığınız veya henüz görmediğiniz dizileri yanıtlayarak zevk profilinizi oluşturun.
              </p>
            </div>
            <div className="flex items-center text-xs font-mono text-accent font-semibold pt-2">
              Kalibrasyona Başla →
            </div>
          </Link>

          {/* Card 2: Dizi DNA */}
          <Link
            href="/tv/profile"
            className="group block p-6 md:p-8 rounded-3xl bg-surface border border-border/80 hover:border-accent/50 transition-all shadow-cinematic hover:shadow-glow space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-xl font-bold font-mono group-hover:scale-105 transition-transform">
              🧬
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-text-primary group-hover:text-accent transition-colors">
                Dizi DNA Profili
              </h2>
              <p className="text-text-secondary text-xs md:text-sm mt-1 leading-relaxed">
                Tür tercihleriniz, dizi alışkanlıklarınız ve dizi zevk arketipinizi inceleyin.
              </p>
            </div>
            <div className="flex items-center text-xs font-mono text-accent font-semibold pt-2">
              Dizi DNA'sını Gör →
            </div>
          </Link>

          {/* Card 3: Öneriler */}
          <Link
            href="/tv/recommendations"
            className="group block p-6 md:p-8 rounded-3xl bg-surface border border-border/80 hover:border-accent/50 transition-all shadow-cinematic hover:shadow-glow space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-xl font-bold font-mono group-hover:scale-105 transition-transform">
              ✨
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-text-primary group-hover:text-accent transition-colors">
                Kişisel Dizi Önerileri
              </h2>
              <p className="text-text-secondary text-xs md:text-sm mt-1 leading-relaxed">
                Dizi DNA profilinize göre matematiksel uyum puanı hesaplanan özel dizi akışı.
              </p>
            </div>
            <div className="flex items-center text-xs font-mono text-accent font-semibold pt-2">
              Önerileri Keşfet →
            </div>
          </Link>

          {/* Card 4: Dizilerim */}
          <Link
            href="/tv/library"
            className="group block p-6 md:p-8 rounded-3xl bg-surface border border-border/80 hover:border-accent/50 transition-all shadow-cinematic hover:shadow-glow space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-xl font-bold font-mono group-hover:scale-105 transition-transform">
              📚
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-text-primary group-hover:text-accent transition-colors">
                Dizilerim Kütüphanesi
              </h2>
              <p className="text-text-secondary text-xs md:text-sm mt-1 leading-relaxed">
                İzlediğiniz, kısmen izlediğiniz veya daha sonra izlemek üzere kaydettiğiniz tüm diziler.
              </p>
            </div>
            <div className="flex items-center text-xs font-mono text-accent font-semibold pt-2">
              Kütüphaneyi Aç →
            </div>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
