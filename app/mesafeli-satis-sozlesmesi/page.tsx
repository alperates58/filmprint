import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getLegalOperatorProfile } from "@/lib/legal/operator";

export const metadata = {
  title: "Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme — SINEAI",
  description: "SINEAI Premium dijital abonelik mesafeli satış sözleşmesi ve ön bilgilendirme metni.",
};

export default function MesafeliSatisPage() {
  const operator = getLegalOperatorProfile();

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-8 w-full">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            📜 6502 Sayılı TKHK Uyarınca
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text-primary">
            Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme
          </h1>
          <p className="text-xs font-mono text-text-muted">Son Güncelleme: Eylül 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-8 text-xs md:text-sm text-text-secondary leading-relaxed shadow-cinematic">
          <section className="space-y-3">
            <h2 className="font-display text-base font-bold text-text-primary">1. Taraflar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-background border border-border/60 space-y-2">
                <h3 className="font-bold text-accent text-xs uppercase font-mono">Hizmet Sağlayıcı (Satıcı)</h3>
                <p><strong>Platform:</strong> {operator.brandName}</p>
                <p><strong>Hizmet Türü:</strong> Bireysel Dijital Hizmet Sağlayıcı</p>
                <p><strong>Web Sitesi:</strong> {operator.websiteUrl}</p>
                <p><strong>E-Posta:</strong> {operator.supportEmail}</p>
              </div>

              <div className="p-4 rounded-2xl bg-background border border-border/60 space-y-2">
                <h3 className="font-bold text-accent text-xs uppercase font-mono">Alıcı (Tüketici / Kullanıcı)</h3>
                <p>SINEAI platformuna kayıt olan ve dijital Premium abonelik satın alan kullanıcı.</p>
                <p className="text-text-muted text-[11px]">Kullanıcının kayıt esnasında bildirdiği ad, soyad ve e-posta bilgileri esas alınır.</p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">2. Sözleşmenin Konusu ve Kapsamı</h2>
            <p>
              İşbu sözleşmenin konusu, Alıcı&apos;nın SINEAI platformu üzerinden elektronik ortamda satın aldığı &quot;SINEAI Premium&quot; dijital abonelik hizmetinin satışı, dijital teslimatı ve ifası ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">3. Hizmet Tanımı ve Dijital Teslimat</h2>
            <p>
              Sözleşme konusu hizmet; kişiselleştirilmiş film ve dizi tat analizi, gelişmiş yapay zekâ keşif motoru, yüksek analiz limitleri ve reklamsız arayüzden oluşan <strong>tamamen dijital nitelikte bir yazılım/platform erişim hizmetidir.</strong>
            </p>
            <p className="text-text-muted">
              Fiziksel ürün satışı, kargo gönderimi veya posta yoluyla teslimat kesinlikle bulunmamaktadır. Hizmet, lisanslı ödeme kuruluşu (PayTR) tarafından ödeme işlemi sunucu tarafında onaylandığı anda kullanıcının hesabına otomatik ve anında tanımlanarak ifa edilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">4. Ücretlendirme ve Ödeme Koşulları</h2>
            <p>
              Premium abonelik bedeli, Alıcı tarafından seçilen paket (Aylık veya Yıllık) için platformun ilgili sayfasında ilan edilen güncel tutardır (Tüm vergiler dahildir).
            </p>
            <p>
              Ödemeler, BDDK/TCMB lisanslı yetkili ödeme kuruluşu PayTR altyapısı üzerinden 256-bit SSL şifreleme ve 3D Secure güvencesiyle kredi kartı/banka kartı aracılığıyla tahsil edilir. SINEAI hiçbir şekilde kart bilgisi saklamaz.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">5. Abonelik Süresi, Yenileme ve İptal</h2>
            <p>
              Abonelik, Alıcı tarafından iptal edilmediği sürece seçilen periyot (Aylık/Yıllık) sonunda otomatik olarak yenilenir. Alıcı dilediği zaman platformdaki hesap yönetim panelinden aboneliğini tek tıkla iptal edebilir.
            </p>
            <p className="text-text-muted">
              İptal işlemi bir sonraki fatura döneminden itibaren geçerli olur; Alıcı mevcut ödenmiş dönemin sonuna kadar Premium haklarından kesintisiz yararlanmaya devam eder.
            </p>
          </section>

          <section className="space-y-2 p-6 rounded-2xl bg-background border border-accent/25">
            <h2 className="font-display text-base font-bold text-text-primary">6. Cayma Hakkı ve İstisnası Bildirimi</h2>
            <p>
              Mesafeli Sözleşmeler Yönetmeliği&apos;nin 15. maddesinin 1. fıkrasının (ğ) bendi gereğince:
            </p>
            <blockquote className="border-l-2 border-accent pl-3 text-xs italic text-text-secondary my-2">
              &quot;Elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayrimaddi mallara ilişkin sözleşmelerde cayma hakkı kullanılamaz.&quot;
            </blockquote>
            <p className="text-xs text-text-muted">
              Alıcı, ödemenin tamamlanmasıyla birlikte dijital hizmetin derhal ifa edileceğini ve bu kapsamda cayma hakkının istisna kapsamında kaldığını kabul eder. Bununla birlikte teknik hata, mükerrer tahsilat veya sistemsel aksaklıklardan kaynaklanan durumlarda Alıcı&apos;nın hakları saklıdır ve <a href={`mailto:${operator.supportEmail}`} className="text-accent underline font-mono">{operator.supportEmail}</a> üzerinden iade talepleri incelenir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">7. Uyuşmazlıkların Çözümü</h2>
            <p>
              İşbu sözleşmeden doğabilecek uyuşmazlıklarda, Ticaret Bakanlığı&apos;nca her yıl belirlenen parasal sınırlar dahilinde Alıcı&apos;nın ikametgâhının bulunduğu yerdeki Tüketici Hakem Heyetleri veya Tüketici Mahkemeleri yetkilidir.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

