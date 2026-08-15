import React from "react";
import Link from "next/link";

export function FinalCta() {
  return (
    <section className="text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-surface via-surface-elevated to-background border border-accent/30 space-y-6 shadow-cinematic relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-gradient from-accent/5 via-transparent to-transparent pointer-events-none" />

      <div className="space-y-3 max-w-xl mx-auto">
        <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
          Deneyimi Yaşa
        </span>
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-text-primary">
          Şimdi SineAI’ın seni ne kadar iyi tanıdığını gör.
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
          Birkaç dakikalık kalibrasyonla kişiselleştirilmiş film evrenine adım at.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href="/recommendations"
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-accent/20 hover:shadow-accent/30 text-center"
        >
          Önerilerime Git →
        </Link>
        <Link
          href="/calibrate"
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-surface-elevated hover:bg-surface border border-border hover:border-accent/40 text-text-primary text-sm font-semibold transition-all duration-200 text-center"
        >
          Kalibrasyona Devam Et
        </Link>
        <Link
          href="/profile"
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-surface-elevated hover:bg-surface border border-border hover:border-accent/40 text-text-primary text-sm font-semibold transition-all duration-200 text-center"
        >
          Film DNA’mı Gör
        </Link>
      </div>
    </section>
  );
}
