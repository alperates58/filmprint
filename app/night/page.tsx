"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";

export default function MovieNightLandingPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSession = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/movie-night", { method: "POST" });
      if (!res.ok) throw new Error("Seans oluşturulamadı.");
      const data = await res.json();
      router.push(`/night/${data.code}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode || inviteCode.trim().length !== 6) {
      setError("Lütfen 6 haneli davet kodunu giriniz.");
      return;
    }

    setIsJoining(true);
    setError(null);
    try {
      const code = inviteCode.trim().toUpperCase();
      const res = await fetch(`/api/movie-night/${code}/join`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Seansa katılım sağlanamadı.");
      }
      router.push(`/night/${code}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-12 flex flex-col justify-center">
        {/* Header Title */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            ORTAK FİLM SEÇİMİ
          </span>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-text-primary">
            Movie Night
          </h1>
          <p className="text-sm md:text-base text-text-secondary leading-relaxed">
            Arkadaşlarınızla (2–6 kişi) Film DNA profillerinizi birleştirin; hiç kimsenin dışlanmadığı ve sevmeyeceği bir filmin seçilmediği tam adil ortak öneriler bulun.
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
          {/* Create Session Card */}
          <div className="p-8 rounded-3xl bg-surface border border-border/80 shadow-cinematic flex flex-col justify-between space-y-6 hover:border-accent/40 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent text-lg font-bold">
                🎬
              </div>
              <h2 className="font-display text-xl font-bold text-text-primary">
                Yeni Movie Night Başlat
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                Bir seans kodu oluşturun ve arkadaşlarınızla paylaşın. Katılan kişilerin Film DNA&apos;ları otomatik eşleşecektir.
              </p>
            </div>

            <button
              onClick={handleCreateSession}
              disabled={isCreating}
              className="w-full py-3.5 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-all shadow-md disabled:opacity-50"
            >
              {isCreating ? "Seans Oluşturuluyor..." : "Movie Night Oluştur"}
            </button>
          </div>

          {/* Join Session Card */}
          <div className="p-8 rounded-3xl bg-surface border border-border/80 shadow-cinematic flex flex-col justify-between space-y-6 hover:border-accent/40 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent text-lg font-bold">
                🔑
              </div>
              <h2 className="font-display text-xl font-bold text-text-primary">
                Seansa Katıl
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                Size gönderilen 6 haneli davet kodunu girerek mevcut bir Movie Night seansına katılın.
              </p>
            </div>

            <form onSubmit={handleJoinSession} className="space-y-3">
              <input
                type="text"
                maxLength={6}
                placeholder="Örn: AB7KQ2"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl bg-surface-elevated border border-border text-center font-mono text-base font-bold text-text-primary uppercase tracking-widest focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="submit"
                disabled={isJoining}
                className="w-full py-3.5 rounded-xl bg-surface-elevated hover:bg-border border border-border text-text-primary font-mono text-xs font-semibold transition-all disabled:opacity-50"
              >
                {isJoining ? "Katılınıyor..." : "Seansa Katıl"}
              </button>
            </form>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-2xl bg-surface border border-border text-xs font-mono text-text-primary text-center max-w-md mx-auto">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
