import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getLegalOperatorProfile } from "@/lib/legal/operator";

export const metadata = {
  title: "KVKK Aydınlatma Metni — SINEAI",
  description: "6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca aydınlatma metni ve haklarınız.",
};

export default function KvkkPage() {
  const operator = getLegalOperatorProfile();

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-8 w-full">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            📜 6698 Sayılı Kanun Kapsamında
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text-primary">
            KVKK Aydınlatma Metni
          </h1>
          <p className="text-xs font-mono text-text-muted">Yürürlük Tarihi: Eylül 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-8 text-xs md:text-sm text-text-secondary leading-relaxed shadow-cinematic">
          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">1. Veri Sorumlusu</h2>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla <strong className="text-text-primary">{operator.brandName} Platformu</strong> (Bireysel Hizmet Sağlayıcı) tarafından aşağıda açıklanan kapsamda işlenmektedir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-base font-bold text-text-primary">2. İşlenen Kişisel Veriler ve Elde Edilme Yöntemleri</h2>
            <p>
              Kişisel verileriniz, platforma üye olurken ve platformu kullanırken elektronik ortamda doğrudan sizden elde edilmektedir:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-text-muted font-sans text-xs pl-2">
              <li><strong className="text-text-primary">Kimlik ve İletişim Bilgileri:</strong> Ad, soyad, e-posta adresi.</li>
              <li><strong className="text-text-primary">Müşteri İşlem ve Kullanım Verileri:</strong> Film/dizi etkileşimleri, puanlamalar, tat kalibrasyon verileri, favoriler, izleme listesi, tavsiye geri bildirimleri.</li>
              <li><strong className="text-text-primary">İşlem Güvenliği Verileri:</strong> IP adresi, oturum çerezleri, cihaz/tarayıcı bilgileri.</li>
              <li><strong className="text-text-primary">Abonelik & Fatura Metadata:</strong> Seçilen paket, ödeme onay durumu, PayTR işlem kodu. (Ödeme kartı PAN/CVV bilgileri platformumuzda ASLA tutulmaz).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">3. Kişisel Veri İşlemenin Hukuki Sebepleri</h2>
            <p>
              Kişisel verileriniz, KVKK&apos;nın 5. maddesinde yer alan aşağıdaki hukuki sebeplere dayanılarak işlenmektedir:
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted font-sans text-xs pl-2">
              <li>Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması (KVKK m.5/2-c),</li>
              <li>Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi (KVKK m.5/2-ç),</li>
              <li>İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması (KVKK m.5/2-f).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">4. Kişisel Verilerin Aktarılması</h2>
            <p>
              Kişisel verileriniz, yasal zorunluluklar gereği yetkili adli/idari makamlar ve ödeme işleminin güvenle tamamlanabilmesi için BDDK/TCMB lisanslı ödeme kuruluşu PayTR haricinde hiçbir üçüncü kişi veya kuruma aktarılmamakta ve reklam amaçlı satılmamaktadır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">5. İlgili Kişinin (Veri Sahibinin) Hakları (KVKK Madde 11)</h2>
            <p>
              KVKK&apos;nın 11. maddesi uyarınca herkes veri sorumlusuna başvurarak kendisiyle ilgili;
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted font-sans text-xs pl-2">
              <li>Kişisel veri işlenip işlenmediğini öğrenme,</li>
              <li>Kişisel verileri işlenmişse buna ilişkin bilgi talep etme,</li>
              <li>Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
              <li>Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme,</li>
              <li>Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme,</li>
              <li>KVKK 7. maddede öngörülen şartlar çerçevesinde kişisel verilerin silinmesini veya yok edilmesini isteme,</li>
              <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle kişinin kendisi aleyhine bir sonucun ortaya çıkmasına itiraz etme haklarına sahiptir.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-bold text-text-primary">6. Başvuru Yöntemi</h2>
            <p>
              Yukarıda belirtilen haklarınızı kullanmak için kayıtlı e-posta adresiniz üzerinden <a href={`mailto:${operator.supportEmail}`} className="text-accent underline font-mono">{operator.supportEmail}</a> adresine yazılı bildirimde bulunabilirsiniz. Talebiniz en geç 30 gün içinde sonuçlandırılacaktır.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

