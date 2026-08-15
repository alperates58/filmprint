"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const isTvMode = pathname?.startsWith("/tv");

  return (
    <footer className="w-full border-t border-border/60 bg-surface/80 backdrop-blur-md mt-16 text-text-muted">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
              </div>
              <span className="font-display text-lg font-bold tracking-wider text-text-primary group-hover:text-accent transition-colors">
                SINEAI
              </span>
            </Link>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              Zevkini öğrenen yapay zekâ destekli film ve dizi rehberi. Şişirilmiş puanlar ve reklam sponsorlu listeler olmadan tarafsız öneri ve analiz motoru.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-elevated border border-border/80 text-[10px] font-mono text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span>{isTvMode ? "TV Match Engine v1 + Hybrid AI" : "Match Engine v3.2 + Hybrid AI"}</span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold text-text-primary uppercase tracking-wider">
              Keşfet
            </h4>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  🎯 Kalibrasyon Motoru
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-accent transition-colors">
                  🧬 Film DNA Profilim
                </Link>
              </li>
              <li>
                <Link href="/recommendations" className="hover:text-accent transition-colors">
                  ✨ Kişisel Öneriler
                </Link>
              </li>
              <li>
                <Link href="/night" className="hover:text-accent transition-colors">
                  🎬 Movie Night (Ortak Film)
                </Link>
              </li>
              <li>
                <Link href="/library" className="hover:text-accent transition-colors">
                  📚 Film Kütüphanem
                </Link>
              </li>
            </ul>
          </div>

          {/* Engine & Science */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold text-text-primary uppercase tracking-wider">
              Sistem & Bilim
            </h4>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <Link href="/how-it-works" className="hover:text-accent transition-colors font-semibold text-accent/90">
                  🧪 Nasıl Çalışıyor? (Formüller)
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-accent transition-colors">
                  🏢 Biz Kimiz?
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-accent transition-colors">
                  📬 İletişim & Destek
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Copyright */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold text-text-primary uppercase tracking-wider">
              Yasal & Telif
            </h4>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <Link href="/legal/terms" className="hover:text-accent transition-colors">
                  📜 Kullanım Koşulları
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-accent transition-colors">
                  🔒 Gizlilik Politikası & KVKK
                </Link>
              </li>
              <li>
                <Link href="/legal/copyright" className="hover:text-accent transition-colors">
                  ⚖️ Telif Hakları & Bildirimler
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-mono text-text-muted">
          <div>
            SINEAI &copy; {new Date().getFullYear()} — Tüm Hakları Saklıdır.
          </div>
          <div className="text-[10px] text-text-muted text-center md:text-right">
            Matematiksel Modeller • Şeffaf Algoritma • Kişiselleştirilmiş Öneri
          </div>
        </div>
      </div>
    </footer>
  );
}
