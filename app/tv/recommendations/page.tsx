import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getCurrentUser } from "@/lib/auth/service";

export default async function TvRecommendationsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth?returnTo=/tv/recommendations");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-accent selection:text-white">
      <Header
        userName={currentUser.name || ""}
        userAvatar={currentUser.image || undefined}
        userEmail={currentUser.email || undefined}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center animate-fadeIn">
        <div className="w-full max-w-xl text-center space-y-6 bg-surface border border-border/80 rounded-3xl p-8 md:p-12 shadow-cinematic">
          <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto text-2xl font-bold font-mono">
            ✨
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
              Kişisel Dizi Önerileri
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed">
              Dizi öneri motoru ve uyum skorları (Match Engine) TV Phase 3 ile birlikte aktif olacaktır.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-elevated border border-border/80 text-xs font-mono text-text-muted space-y-1">
            <div>TV Recommendation Feedback & Candidate Pool altyapısı hazır.</div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/tv"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-accent text-white font-mono text-xs font-semibold shadow-cinematic hover:bg-accent/90 transition-colors"
            >
              TV Ana Sayfasına Dön
            </Link>
            <Link
              href="/recommendations"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-surface-elevated border border-border hover:border-text-muted text-text-secondary font-mono text-xs font-semibold transition-colors"
            >
              🎬 Film Önerilerine Git
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
