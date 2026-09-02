import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getLegalOperatorProfile } from "@/lib/legal/operator";

export const metadata = {
  title: "Gizlilik Politikası — SINEAI",
  description: "SINEAI kişisel veri güvenliği, veri işleme ilkeleri ve ödeme güvenliği bildirimi.",
};

export default function GizlilikPage() {
  const operator = getLegalOperatorProfile();

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-8 w-full">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            🔒 Güvenlik & Gizlilik
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text-primary">
            Gizlilik Politikası
          </h1>
          <p className="text-xs font-mono text-text-muted">Son Güncelleme: Eylül 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-8 text-xs md:text-sm text-text-secondary leading-relaxed shadow-cinematic">
          {/* Ödeme Güvenliği ve Kart Verisi — PayTR Özel Vurgu */}
          <section className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-sm">
              <span>🛡️</span>
              <span>ÖDEME GÜVENLİĞİ VE KART VERİSİ SAKLANMAZ BİLDİRİMİ</span>
            </div>
            <p className="text-text-primary font-medium">
              SINEAI, kullanıcılarının kredi kartı / banka kartı numaralarını (PAN), son kullanma tarihlerini veya güvenlik kodlarını (CVV/CVC) <strong>ASLA saklamaz, işlemez ve kendi sunucularında tutmaz.</strong>
            </p>
            <p className="text-text-muted text-xs">
              Tüm ödeme işlemleri, Türkiye Cumhuriyet Merkez Bankası (TCMB) denetiminde lisanslı ödeme kuruluşu olan <strong className="text-text-primary">PayTR Ödeme ve Elektronik Para Kuruluşu A.Ş.</strong> altyapısı üzerinden 256-bit SSL şifreleme ve 3D Secure güvencesiyle doğrudan banka sistemleri arasında gerçekleştirilir. SINEAI veritabanında yalnızca PayTR tarafından iletilen sipariş numarası (merchant_oid), işlem durumu, tutar ve tarih gibi referans metadata bilgileri tutulur.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-base font-bold text-text-primary">1. Toplanan Veri Kategorileri ve Akışları</h2>
            <p>
              SINEAI platformunda sunulan kişiselleştirilmiş film ve dizi tavsiye hizmetlerinin sağlıklı yürütülmesi amacıyla aşağıdaki gerçek veri akışları işlenmektedir:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-muted font-sans text-xs pl-2">
              <li><strong className="text-text-primary">Hesap ve Kimlik Verileri:</strong> Ad, soyad, e-posta adresi ve Google OAuth ile giriş yapıldığında sağlanan temel profil tanımlayıcısı.</li>
              <li><strong className="text-text-primary">Sinematik Etkileşim Verileri:</strong> Kalibre edilen film ve diziler, verilen puanlar (ratings), izlendi / izlenecek listeleri, kütüphane kayıtları ve &quot;Ne İzlesem?&quot; etkileşimleri.</li>
              <li><strong className="text-text-primary">Tavsiye Geri Bildirimleri:</strong> Önerilen yapımlara verilen beğendim / beğenmedim / izlemek istemiyorum reaksiyonları (Recommendation feedback).</li>
              <li><strong className="text-text-primary">Yapay Zekâ Keşif Tercihleri:</strong> AI Discover / Akıllı Keşif motorunda aranan ruh hali (mood), tür ve dönem filtre promptları.</li>
              <li><strong className="text-text-primary">Teknik ve Güvenlik Logları:</strong> Oturum çerezleri (cookies), IP adresi, tarayıcı bilgisi ve güvenlik hata logları.</li>
              <li><strong className="text-text-primary">Ödeme Metadata Bilgileri:</strong> Abonelik paketi, başlangıç/bitiş tarihi ve PayTR işlem referans numarası (kart numarası kesinlikle yer almaz).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">2. Verilerin İşlenme Amaçları</h2>
            <p>
              Toplanan veriler yalnızca;
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted font-sans text-xs pl-2">
              <li>Kullanıcının özgün Film & Dizi DNA profilini hesaplamak ve matematiksel eşleşme skoru üretmek,</li>
              <li>Ortak izleme oturumlarında (Movie Night) grup ortak kesişim kümesini bulmak,</li>
              <li>Satın alınan Premium dijital aboneliklerin hesap tanımlamasını yapmak ve sürdürmek,</li>
              <li>Platformun teknik güvenliğini sağlamak ve yetkisiz erişimleri engellemek amaçlarıyla işlenir.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">3. Üçüncü Taraflarla Paylaşım Politikası</h2>
            <p className="font-semibold text-accent">
              Kişisel verileriniz ve izleme zevk haritanız kesinlikle hiçbir 3. taraf reklam şirketine satılmaz, kiralanmaz veya ticari kâr amacıyla devredilmez.
            </p>
            <p className="text-text-muted text-xs">
              Veriler yalnızca yasal zorunluluk halinde yetkili kamu kurumları ile ve ödeme işleminin ifası için lisanslı ödeme kuruluşu PayTR ile sınırlı olarak paylaşılır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">4. Çerez (Cookie) Politikası</h2>
            <p>
              Platform, kullanıcı oturumunu aktif tutmak ve temel tercihleri hatırlamak için zorunlu teknik oturum çerezleri kullanır. Detaylı bilgi için <Link href="/cerez-politikasi" className="text-accent underline font-mono">Çerez Politikası</Link> sayfamızı inceleyebilirsiniz.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">5. Veri Güvenliği ve Saklama</h2>
            <p>
              Verileriniz modern şifreleme standartları (AES-256 / TLS) ile korunan güvenli sunucu altyapısında saklanır. Kullanıcı dilediği an hesabını ve tüm etkileşim verilerini sildirme hakkına sahiptir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">6. İletişim</h2>
            <p>
              Gizlilik politikamız veya kişisel verilerinizle ilgili her türlü soru için <a href={`mailto:${operator.supportEmail}`} className="text-accent underline font-mono">{operator.supportEmail}</a> adresinden bize ulaşabilirsiniz.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

