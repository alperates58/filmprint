import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getLegalOperatorProfile } from "@/lib/legal/operator";

export const metadata = {
  title: "Kullanım Koşulları — SINEAI",
  description: "SINEAI platformu kullanım koşulları, kullanıcı hakları ve hizmet şartları.",
};

export default function KullanimKosullariPage() {
  const operator = getLegalOperatorProfile();

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-8 w-full">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            📜 Hizmet Şartları
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text-primary">
            Kullanım Koşulları
          </h1>
          <p className="text-xs font-mono text-text-muted">Son Güncelleme: Eylül 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-6 text-xs md:text-sm text-text-secondary leading-relaxed shadow-cinematic">
          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">1. Hizmet Şartlarının Kabulü</h2>
            <p>
              SINEAI platformuna ({operator.websiteUrl}) erişerek veya platformu kullanarak, işbu Kullanım Koşulları&apos;nı okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz. Koşulları kabul etmiyorsanız lütfen platformu kullanmayınız.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">2. Hizmetin Tanımı ve Kapsamı</h2>
            <p>
              SINEAI; kullanıcıların film ve dizi etkileşimlerini (izlendi, beğenildi, puanlama) analiz ederek kişiselleştirilmiş &quot;Film/Dizi DNA&quot; profili oluşturan, Bayesyen istatistik ve vektörel algoritmalar vasıtasıyla yapım önerileri sunan bir dijital kalibrasyon platformudur.
            </p>
            <p className="text-text-muted">
              SINEAI platformunda herhangi bir fiziksel ürün satışı, kargo gönderimi, video/ses dosyası barındırma veya doğrudan medya yayını (streaming) hizmeti bulunmamaktadır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">3. Kullanıcı Hesap Güvenliği ve Sorumluluklar</h2>
            <p>
              Kullanıcılar platformda oluşturdukları oturum anahtarlarının ve hesap erişimlerinin güvenliğinden bizzat sorumludur. Platformun işleyişini bozacak, sistem güvenliğini tehdit edecek veya otomasyonla yetkisiz veri çekmeyi (scraping) hedefleyen girişimlerde bulunulamaz.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">4. Fikri Mülkiyet ve Lisanslar</h2>
            <p>
              SINEAI markası, Match Engine algoritmaları, yazılım kaynak kodları ve arayüz tasarımları platform sağlayıcısına aittir. Film ve dizi afişleri, özet metinleri ve yapım metadataları TMDB API&apos;si aracılığıyla sağlanmakta olup ilgili hak sahiplerinin mülkiyetindedir. (&quot;This product uses the TMDB API but is not endorsed or certified by TMDB.&quot;)
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">5. Sorumluluk Sınırı</h2>
            <p>
              SINEAI platformunda sunulan eşleşme skorları ve öneriler matematiksel tahmin modellerine dayanmaktadır ve %100 beğeni garantisi taahhüt etmez. Platform, teknik bakım veya güncelleme nedeniyle hizmetlerde geçici kesintiler yapma hakkını saklı tutar.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">6. İletişim</h2>
            <p>
              Kullanım koşullarıyla ilgili her türlü bildirim için <a href={`mailto:${operator.supportEmail}`} className="text-accent underline font-mono">{operator.supportEmail}</a> adresinden bize ulaşabilirsiniz.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

