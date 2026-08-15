import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

export const metadata = {
  title: "Kullanım Koşulları — SineAI",
  description: "SineAI platformu kullanım koşulları, kullanıcı hakları ve hizmet şartları.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-8 w-full">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            📜 Yasal Sözleşme
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text-primary">
            Kullanım Koşulları (Terms of Service)
          </h1>
          <p className="text-xs font-mono text-text-muted">Son Güncelleme: 15 Ağustos 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-6 text-xs md:text-sm text-text-secondary leading-relaxed shadow-cinematic">
          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">1. Hizmet Şartlarının Kabulü</h2>
            <p>
              SineAI platformuna erişerek veya platformu kullanarak, işbu Kullanım Koşulları'nı okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz. Koşulları kabul etmiyorsanız lütfen platformu kullanmayınız.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">2. Hizmetin Tanımı ve Kapsamı</h2>
            <p>
              SineAI; kullanıcıların film etkileşimlerini (izlendi, izlenmedi, beğeni vb.) analiz ederek kişiselleştirilmiş "Film DNA" profili oluşturan ve matematiksel algoritmalar vasıtasıyla film önerileri sunan bir kalibrasyon platformudur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">3. Hesap Güvenliği ve Kullanıcı Sorumlulukları</h2>
            <p>
              Kullanıcılar platforma oluşturdukları hesap bilgileri ve oturum anahtarlarının güvenliğinden sorumludur. Hesabınız üzerinden gerçekleştirilen tüm işlemlerden siz sorumlu tutulursunuz. Platformun işleyişini bozacak veya veri çekmeyi (scraping) hedefleyen otomasyon araçları kullanılamaz.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">4. Fikri Mülkiyet Hakları</h2>
            <p>
              SineAI algoritması, kaynak kodları, Match Engine v3.2 matematiksel modelleri ve arayüz tasarımları SineAI'a aittir. Film ve dizi metadataları, poster görselleri ve yapım bilgileri lisanslı katalog veri sağlayıcıları üzerinden sağlanmakta olup ilgili telif sahiplerinin mülkiyetindedir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">5. Hizmet Değişiklikleri ve Sorumluluk Sınırlaması</h2>
            <p>
              SineAI, sunulan hizmetleri önceden haber vermeksizin değiştirme veya durdurma hakkını saklı tutar. Platform üzerinden sunulan öneriler kişiselleştirilmiş istatistiki tahminler olup %100 memnuniyet garantisi taahhüt etmez.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">6. İletişim</h2>
            <p>
              Kullanım koşullarıyla ilgili sorularınız için <Link href="/contact" className="text-accent underline font-mono">İletişim</Link> sayfamız üzerinden bize ulaşabilirsiniz.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
