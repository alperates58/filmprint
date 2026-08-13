import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

export const metadata = {
  title: "Telif Hakları & Yasal Haklar — Filmprint",
  description: "Filmprint telif hakları bildirimi, TMDB API kullanımı ve DMCA telif bildirim kanalı.",
};

export default function CopyrightPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-8 w-full">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            ⚖️ Telif & Attribution
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text-primary">
            Telif Hakları ve Yasal Bildirimler
          </h1>
          <p className="text-xs font-mono text-text-muted">Son Güncelleme: 13 Ağustos 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-6 text-xs md:text-sm text-text-secondary leading-relaxed shadow-cinematic">
          {/* TMDB Attribution Card */}
          <div className="p-6 rounded-2xl bg-background border border-accent/30 space-y-3">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-lg bg-accent/20 text-accent font-bold font-mono text-xs">
                TMDB API
              </div>
              <h2 className="font-display text-base font-bold text-text-primary">
                The Movie Database (TMDB) Lisans Bildirimi
              </h2>
            </div>
            <p className="text-text-muted leading-relaxed">
              Filmprint platformundaki film afişleri, fragman bağlantıları, oyuncu/yönetmen kadroları ve genel sinema metadataları TMDB API hizmeti aracılığıyla temin edilmektedir.
            </p>
            <p className="text-accent font-mono text-xs italic">
              "This product uses the TMDB API but is not endorsed or certified by TMDB."
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">1. Film Görselleri ve Materyalleri</h2>
            <p>
              Platformda sergilenen film posterleri, afişler ve sinematografik tanım metinleri hak sahiplerinin mülkiyetindedir. Filmprint bu materyalleri tanıtım ve akademik/istatistiki öneri amacıyla "Adil Kullanım" (Fair Use) kapsamında sunmaktadır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">2. Filmprint Algoritma ve Marka Hakları</h2>
            <p>
              "Filmprint", "Film DNA", "Match Engine v3.1" markaları, vektörel eşleşme yazılımları, veri kalibrasyon formülleri ve özgün arayüz tasarımları Filmprint'e aittir. İzinsiz kopyalanamaz veya ticari amaçla kullanılamaz.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">3. DMCA ve Telif Hakkı İhlali Bildirimleri</h2>
            <p>
              Telif hakkı sahibi olduğunuz bir materyalin platformumuzda uygunsuz şekilde yer aldığını düşünüyorsanız, lütfen aşağıdaki bilgileri içeren resmi bildirimi <a href="mailto:legal@filmprint.app" className="text-accent underline font-mono">legal@filmprint.app</a> adresine iletiniz:
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted font-mono text-xs">
              <li>Telif hakkı sahibinin veya yetkili temsilcisinin imzası.</li>
              <li>İhlal edildiği iddia edilen eserin tanımı ve ilgili URL bağlantısı.</li>
              <li>İletişim bilgileriniz (telefon, e-posta).</li>
            </ul>
            <p className="text-text-muted pt-1">
              Hak ihlali bildirimleri incelenerek haklı görülen içerikler 48 saat içerisinde sistemden kaldırılır.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
