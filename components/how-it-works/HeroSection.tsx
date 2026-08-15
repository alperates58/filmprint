import React from "react";
import Link from "next/link";

export function HeroSection() {
  const trustBadges = [
    { icon: "🔍", label: "%100 Şeffaf" },
    { icon: "🎯", label: "Kanıta Dayalı" },
    { icon: "🛡️", label: "Kalite Filtreli" },
    { icon: "⚡", label: "Sürekli Öğrenen" },
  ];

  return (
    <section className="text-center space-y-6 pt-4 pb-8 max-w-3xl mx-auto px-2">
      {/* Version Tag */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-xs font-mono font-semibold text-accent backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        Match Engine v3.2 — Şeffaf Algoritmik Mimari
      </div>

      {/* Main Title */}
      <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-text-primary leading-[1.15]">
        Filmprint <span className="text-accent">Nasıl Çalışıyor?</span>
      </h1>

      {/* Subtitle */}
      <p className="text-sm sm:text-base md:text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto font-normal">
        Şişirilmiş puanlar, sponsorlu listeler ve rastgele öneriler yok. Filmprint, film zevkini verdiğin gerçek sinyallerden matematiksel olarak modeller ve sana neden bir filmi önerdiğini açıklayabilir.
      </p>

      {/* Trust Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 max-w-xl mx-auto">
        {trustBadges.map((badge, idx) => (
          <div
            key={idx}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface/80 border border-border/80 text-xs font-medium text-text-primary shadow-sm hover:border-accent/40 transition-colors"
          >
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        ))}
      </div>

      {/* Hero CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
        <Link
          href="/recommendations"
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-accent/20 hover:shadow-accent/30 text-center"
        >
          Önerilerime Git →
        </Link>
        <Link
          href="/profile"
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-surface-elevated hover:bg-surface border border-border hover:border-accent/50 text-text-primary text-sm font-semibold transition-all duration-200 text-center"
        >
          Film DNA’mı Gör
        </Link>
      </div>
    </section>
  );
}
