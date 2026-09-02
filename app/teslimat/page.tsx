import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getLegalOperatorProfile } from "@/lib/legal/operator";

export const metadata = {
  title: "Dijital Hizmet Teslimatı — SINEAI",
  description: "SINEAI Premium dijital hizmet teslimat ilkeleri, anında aktivasyon ve sunucu doğrulama süreci.",
};

export default function TeslimatPage() {
  const operator = getLegalOperatorProfile();

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-8 w-full">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            ⚡ Anında Elektronik Aktivasyon
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text-primary">
            Dijital Hizmet Teslimatı
          </h1>
          <p className="text-xs font-mono text-text-muted">Son Güncelleme: Eylül 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-8 text-xs md:text-sm text-text-secondary leading-relaxed shadow-cinematic">
          {/* Fiziksel Teslimat Yoktur Uyarısı */}
          <section className="p-6 rounded-2xl bg-background border border-accent/40 space-y-2">
            <div className="font-bold text-accent font-mono text-xs flex items-center gap-2">
              <span>📦</span>
              <span>FİZİKSEL ÜRÜN VE KARGO GÖNDERİMİ BULUNMAMAKTADIR</span>
            </div>
            <p className="text-text-muted text-xs leading-relaxed">
              SINEAI platformunda satışa sunulan tüm paketler ve Premium üyelikler <strong>tamamen dijital niteliktedir.</strong> Adrese fiziki teslimat, kargo, kurye veya posta ile materyal gönderimi yapılmaz.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-base font-bold text-text-primary">1. Teslimat Süreci ve Anında Aktivasyon</h2>
            <p>
              SINEAI Premium aboneliği satın alındığında teslimat süreci aşağıdaki adımlarla tam otomatik olarak gerçekleşir:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-text-muted font-sans text-xs pl-2">
              <li><strong className="text-text-primary">Güvenli Ödeme:</strong> Kullanıcı, lisanslı ödeme kuruluşu PayTR&apos;ın 256-bit SSL şifreli güvenli ödeme ekranında kart bilgilerini girer ve 3D Secure onayını tamamlar.</li>
              <li><strong className="text-text-primary">Sunucu Doğrulaması (Server-Side Verification):</strong> PayTR sunucuları, başarılı tahsilatı kriptografik HMAC-SHA256 imzası ile SINEAI backend sistemine webhook olarak iletir.</li>
              <li><strong className="text-text-primary">Anında Hesap Tanımlaması:</strong> Doğrulama sinyali alındığı milisaniyede kullanıcının hesabındaki yetki (UserEntitlement) otomatik olarak Premium seviyesine yükseltilir.</li>
              <li><strong className="text-text-primary">Kullanıma Hazır:</strong> Kullanıcı platforma giriş yaptığında veya sayfayı yenilediğinde tüm Premium özellikler, genişletilmiş AI kotaları ve reklamsız arayüz derhal aktif olur.</li>
            </ol>
          </section>

          <section className="space-y-2 p-6 rounded-2xl bg-surface-2 border border-border">
            <h2 className="font-display text-base font-bold text-text-primary">2. Doğrulama İlkesi (Source of Truth)</h2>
            <p className="text-xs text-text-secondary">
              Yalnızca tarayıcı yönlendirmesi (browser redirect) tek başına ödeme doğrulaması ve teslimat kanıtı değildir. SINEAI güvenliği gereği; <strong>lisanslı ödeme kuruluşundan alınan sunucu taraflı doğrulanmış geri bildirim (server-to-server verified callback)</strong> tek ve mutlak teslimat kaynağıdır. Bu sayede hiçbir kullanıcı mağduriyet yaşamaz.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">3. Teslimat Gecikmesi ve Destek</h2>
            <p>
              Nadir de olsa bankacılık iletişim protokollerinden kaynaklanan bir gecikme yaşanması ve ödemeniz tahsil edildiği halde üyeliğinizin 5 dakika içinde aktifleşmemesi durumunda; lütfen sipariş numaranız ile birlikte <a href={`mailto:${operator.supportEmail}`} className="text-accent underline font-mono">{operator.supportEmail}</a> üzerinden destek ekibimizle iletişime geçiniz. Durum ivedilikle kontrol edilerek yetkiniz derhal tanımlanacaktır.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

