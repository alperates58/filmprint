import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getLegalOperatorProfile } from "@/lib/legal/operator";

export const metadata = {
  title: "İptal ve İade Koşulları — SINEAI",
  description: "SINEAI Premium dijital abonelik iptal süreçleri, iade şartları ve tüketici hakları.",
};

export default function IptalIadePage() {
  const operator = getLegalOperatorProfile();

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-8 w-full">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            🔄 Abonelik & İade Politikası
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text-primary">
            İptal ve İade Koşulları
          </h1>
          <p className="text-xs font-mono text-text-muted">Son Güncelleme: Eylül 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-8 text-xs md:text-sm text-text-secondary leading-relaxed shadow-cinematic">
          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">1. Dijital Abonelik İptal Politikası</h2>
            <p>
              SINEAI Premium aboneliğinizi dilediğiniz an hiçbir gerekçe göstermeksizin ve ceza ödemeksizin profilinizdeki <strong className="text-text-primary">Hesap Ayarları</strong> veya <strong className="text-text-primary">Faturalandırma</strong> sekmesinden tek tıkla iptal edebilirsiniz.
            </p>
            <p className="text-text-muted">
              İptal talebiniz alındığında otomatik yenileme derhal durdurulur. Mevcut ödenmiş periyodunuzun son gününe kadar (current period end) Premium ayrıcalıklarınızdan kesintisiz yararlanmaya devam edersiniz. Süre bitiminde hesabınız otomatik olarak ücretsiz Temel plana geçer.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">2. Otomatik Yenileme Bildirimi</h2>
            <p>
              Abonelikler, kullanıcı tarafından iptal edilmediği müddetçe seçilen dönem (Aylık veya Yıllık) sonunda otomatik olarak yenilenir. Yenileme işlemleri lisanslı ödeme kuruluşu PayTR altyapısı üzerinden güvenli şekilde gerçekleştirilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">3. İade Değerlendirmesi ve Şartları</h2>
            <p>
              SINEAI Premium, ödeme onayını takiben elektronik ortamda anında ifa edilen dijital bir hizmettir. Bu doğrultuda;
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-muted font-sans text-xs pl-2">
              <li><strong className="text-text-primary">Mükerrer veya Hatalı Tahsilatlar:</strong> Sistemsel veya bankacılık kaynaklı mükerrer çekimlerde durum tespit edildiği anda fazla tahsil edilen tutar gecikmeksizin kartınıza iade edilir.</li>
              <li><strong className="text-text-primary">Teknik Hizmet Kesintileri:</strong> SINEAI platformundan kaynaklanan ve 48 saati aşan süreklilikteki teknik erişim engellerinde kullanıcı talepleri hakkaniyet çerçevesinde incelenir ve orantılı iade sağlanır.</li>
              <li><strong className="text-text-primary">İade Başvuru Kanalı:</strong> İade veya faturalandırma inceleme talepleriniz için sipariş/işlem numaranız ile birlikte <a href={`mailto:${operator.supportEmail}`} className="text-accent underline font-mono">{operator.supportEmail}</a> adresine e-posta gönderebilirsiniz.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">4. İade Tutarlarının Hesaba Yansıma Süresi</h2>
            <p>
              Onaylanan iade işlemleri PayTR ödeme altyapısı üzerinden derhal kartınıza iletilir. İade edilen tutarın kredi kartı ekstrenize yansıması bankanızın işlem süreçlerine bağlı olarak genellikle <strong className="text-text-primary">3 ile 7 iş günü</strong> sürmektedir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">5. Tüketici Mevzuatı ve Haklar</h2>
            <p>
              İşbu iptal ve iade politikası 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve ilgili mevzuata uygun olarak hazırlanmış olup, tüketicinin kanundan doğan yasal hakları saklıdır.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

