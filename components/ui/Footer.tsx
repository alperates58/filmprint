"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const isTvMode = pathname?.startsWith("/tv");

  return (
    <footer className="w-full border-t border-border/80 bg-surface-1/80 backdrop-blur-md mt-16 text-text-secondary">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-xl bg-accent-subtle border border-accent/30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              </div>
              <span className="font-display text-lg font-bold tracking-wider text-text-primary group-hover:text-accent transition-colors">
                SINEAI
              </span>
            </Link>
            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              Zevkini öğrenen yapay zekâ destekli film ve dizi rehberi. Şişirilmiş puanlar ve reklam sponsorlu listeler olmadan tarafsız analiz motoru.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-border text-[11px] font-mono text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span>{isTvMode ? "TV Match Engine v1 + Hybrid AI" : "Match Engine v3.2 + Hybrid AI"}</span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold text-text-primary uppercase tracking-wider">
              Keşfet
            </h4>
            <ul className="space-y-2 text-xs font-sans font-medium">
              <li>
                <Link href={isTvMode ? "/tv/calibration" : "/calibrate"} className="hover:text-accent transition-colors">
                  🎯 Kalibrasyon Motoru
                </Link>
              </li>
              <li>
                <Link href={isTvMode ? "/tv/profile" : "/profile"} className="hover:text-accent transition-colors">
                  🧬 {isTvMode ? "Dizi DNA Profilim" : "Film DNA Profilim"}
                </Link>
              </li>
              <li>
                <Link href={isTvMode ? "/tv/recommendations" : "/recommendations"} className="hover:text-accent transition-colors">
                  ✨ Kişisel Öneriler
                </Link>
              </li>
              <li>
                <Link href="/night" className="hover:text-accent transition-colors">
                  🍿 Movie Night (Ortak Film)
                </Link>
              </li>
              <li>
                <Link href={isTvMode ? "/library?mediaType=TV" : "/library?mediaType=FILM"} className="hover:text-accent transition-colors">
                  📚 {isTvMode ? "Dizilerim" : "Filmlerim"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Engine & Science */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold text-text-primary uppercase tracking-wider">
              Sistem & Bilim
            </h4>
            <ul className="space-y-2 text-xs font-sans font-medium">
              <li>
                <Link href="/how-it-works" className="hover:text-accent transition-colors font-semibold text-accent">
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
            <ul className="space-y-2 text-xs font-sans font-medium">
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
        <div className="pt-6 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-sans text-text-muted">
          <div>
            SINEAI &copy; {new Date().getFullYear()} — Tüm Hakları Saklıdır.
          </div>
          <div className="text-xs text-text-muted text-center md:text-right font-mono">
            Matematiksel Modeller • Şeffaf Algoritma • Kişiselleştirilmiş Öneri
          </div>
        </div>
      </div>
    </footer>
  );
}
