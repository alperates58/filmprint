import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

export const metadata = {
  title: "Gizlilik Politikası & KVKK — SineAI",
  description: "SineAI kişisel veri güvenliği, KVKK aydınlatma metni ve gizlilik ilkeleri.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-8 w-full">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            🔒 Veri Güvenliği
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text-primary">
            Gizlilik Politikası & KVKK Aydınlatma Metni
          </h1>
          <p className="text-xs font-mono text-text-muted">Son Güncelleme: 15 Ağustos 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-6 text-xs md:text-sm text-text-secondary leading-relaxed shadow-cinematic">
          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">1. Toplanan Kişisel Veriler</h2>
            <p>
              SineAI, hizmet kalitesini sağlamak amacıyla sadece gerekli olan verileri toplar:
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted font-mono text-xs">
              <li>Hesap Bilgileri: Ad, soyad, e-posta adresi, profil resmi (varsa OAuth).</li>
              <li>Etkileşim Verileri: Kalibre edilen filmler, izlendi/izlenmedi işaretlemeleri, geri bildirimler.</li>
              <li>Teknik Veriler: Oturum çerezleri (cookies), IP adresi (güvenlik logları için).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">2. Verilerin İşlenme Amacı</h2>
            <p>
              Toplanan veriler yalnızca kişisel Film DNA profilinizin hesaplanması, size en uygun film önerilerinin sunulması ve ortak izleme oturumlarının (Movie Night) gerçekleştirilmesi amacıyla işlenir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">3. Veri Paylaşımı ve Mahremiyet</h2>
            <p className="font-semibold text-accent">
              Kişisel verileriniz kesinlikle 3. taraf reklam verenlere satılmaz, kiralanmaz veya ticari amaçlarla paylaşılmaz.
            </p>
            <p className="text-text-muted">
              Verileriniz güvenli veritabanı sunucularında şifrelenerek saklanır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">4. KVKK Kapsamındaki Haklarınız</h2>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, verilerinizin silinmesini, düzeltilmesini veya işlenip işlenmediğini öğrenmeyi talep etme hakkına sahipsiniz. Talepleriniz için <Link href="/contact" className="text-accent underline font-mono">İletişim</Link> sayfasını kullanabilirsiniz.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">5. Çerez (Cookie) Kullanımı</h2>
            <p>
              Platform, kullanıcı oturumunu aktif tutmak ve tercihlerinizi hatırlamak için zorunlu teknik çerezler kullanır.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
