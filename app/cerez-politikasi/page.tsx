import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getLegalOperatorProfile } from "@/lib/legal/operator";

export const metadata = {
  title: "Çerez Politikası — SINEAI",
  description: "SINEAI platformunda kullanılan çerezler, oturum yönetimi ve çerez tercihleri.",
};

export default function CerezPolitikasiPage() {
  const operator = getLegalOperatorProfile();

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-8 w-full">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            🍪 Çerez Bilgilendirmesi
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text-primary">
            Çerez Politikası (Cookie Policy)
          </h1>
          <p className="text-xs font-mono text-text-muted">Son Güncelleme: Eylül 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-8 text-xs md:text-sm text-text-secondary leading-relaxed shadow-cinematic">
          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">1. Çerez Nedir?</h2>
            <p>
              Çerezler (cookies), web sitelerini ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza kaydedilen küçük metin dosyalarıdır. Çerezler web sitesinin düzgün çalışmasını, oturumunuzun korunmasını ve kullanıcı deneyiminizin iyileştirilmesini sağlar.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-base font-bold text-text-primary">2. Platformumuzda Kullanılan Çerez Türleri</h2>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-background border border-border/60 space-y-1">
                <div className="font-bold text-accent text-xs font-mono">ZORUNLU OTURUM ÇEREZLERİ (Essential Cookies)</div>
                <p className="text-text-muted text-xs">
                  Kullanıcı hesabınıza güvenli giriş yapmanızı, oturumunuzu sürdürmenizi (<code className="text-text-primary">filmprint_user_session</code>) ve platform güvenliğini sağlayan teknik çerezlerdir. Bu çerezler olmadan temel özellikler çalışamaz.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-background border border-border/60 space-y-1">
                <div className="font-bold text-accent text-xs font-mono">TERCİH VE FONKSİYONELLİK ÇEREZLERİ</div>
                <p className="text-text-muted text-xs">
                  Film/Dizi modu tercihlerinizi, dil veya tema seçimlerinizi hatırlayarak size özel bir deneyim sunar.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-background border border-border/60 space-y-1">
                <div className="font-bold text-accent text-xs font-mono">PERFORMANS VE ANALİTİK ÇEREZLERİ</div>
                <p className="text-text-muted text-xs">
                  Platformun sayfa yükleme sürelerini ve hata oranlarını anonim olarak ölçümleyerek teknik optimizasyon yapmamıza yardımcı olur.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">3. Çerezlerin Yönetimi ve Devre Dışı Bırakılması</h2>
            <p>
              Tarayıcınızın ayarlarından çerez tercihlerinizi değiştirebilir, mevcut çerezleri silebilir veya çerez kullanımını engelleyebilirsiniz. Ancak zorunlu çerezlerin engellenmesi durumunda SINEAI hesabınıza giriş yapılamayabilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">4. İletişim</h2>
            <p>
              Çerez politikamız hakkında sorularınız için <a href={`mailto:${operator.supportEmail}`} className="text-accent underline font-mono">{operator.supportEmail}</a> üzerinden bize ulaşabilirsiniz.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

