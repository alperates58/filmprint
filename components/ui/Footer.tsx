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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
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

          {/* Keşfet */}
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
                <Link href="/premium" className="hover:text-accent transition-colors text-accent font-semibold">
                  👑 SINEAI Premium
                </Link>
              </li>
            </ul>
          </div>

          {/* Kurumsal */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold text-text-primary uppercase tracking-wider">
              Kurumsal
            </h4>
            <ul className="space-y-2 text-xs font-sans font-medium">
              <li>
                <Link href="/hakkimizda" className="hover:text-accent transition-colors">
                  🏢 Hakkımızda
                </Link>
              </li>
              <li>
                <Link href="/iletisim" className="hover:text-accent transition-colors">
                  📬 İletişim & Destek
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-accent transition-colors">
                  🧪 Nasıl Çalışıyor? (Formüller)
                </Link>
              </li>
            </ul>
          </div>

          {/* Yasal */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold text-text-primary uppercase tracking-wider">
              Yasal
            </h4>
            <ul className="space-y-2 text-xs font-sans font-medium">
              <li>
                <Link href="/kullanim-kosullari" className="hover:text-accent transition-colors">
                  📜 Kullanım Koşulları
                </Link>
              </li>
              <li>
                <Link href="/gizlilik" className="hover:text-accent transition-colors">
                  🔒 Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link href="/kvkk" className="hover:text-accent transition-colors">
                  ⚖️ KVKK Aydınlatma Metni
                </Link>
              </li>
              <li>
                <Link href="/mesafeli-satis-sozlesmesi" className="hover:text-accent transition-colors">
                  📋 Mesafeli Satış Sözleşmesi
                </Link>
              </li>
              <li>
                <Link href="/iptal-iade" className="hover:text-accent transition-colors">
                  🔄 İptal ve İade Koşulları
                </Link>
              </li>
              <li>
                <Link href="/teslimat" className="hover:text-accent transition-colors">
                  ⚡ Dijital Hizmet Teslimatı
                </Link>
              </li>
              <li>
                <Link href="/cerez-politikasi" className="hover:text-accent transition-colors">
                  🍪 Çerez Politikası
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-sans text-text-muted">
          <div>
            SINEAI &copy; {new Date().getFullYear()} — Bireysel Dijital Hizmet Platformu. Tüm Hakları Saklıdır.
          </div>
          <div className="text-xs text-text-muted text-center md:text-right font-mono">
            Matematiksel Modeller • Şeffaf Algoritma • Kişiselleştirilmiş Öneri
          </div>
        </div>
      </div>
    </footer>
  );
}

