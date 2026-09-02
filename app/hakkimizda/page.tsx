import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getLegalOperatorProfile } from "@/lib/legal/operator";

export const metadata = {
  title: "Hakkımızda — SINEAI Sinema & Dizi Keşif Laboratuvarı",
  description:
    "SINEAI, kullanıcıların film ve dizi zevklerini analiz eden, kişiselleştirilmiş öneriler ve yapay zekâ destekli keşif özellikleri sunan dijital bir platformdur.",
};

export default function AboutPage() {
  const operator = getLegalOperatorProfile();

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-12 w-full">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            🏢 Hakkımızda — SINEAI Sinema Laboratuvarı
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary">
            Sinema & Dizi Zevkinizi Matematiksel Kesinlikle Analiz Eden Platform
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
            SINEAI, popüler kültür dayatmalarına ve sponsorlu reklam listelerine karşı, sinefillerin gerçek kişisel zevklerini vektörel algoritma ve Bayesyen istatistik ile modelleyen tarafsız bir film ve dizi öneri motorudur.
          </p>
        </div>

        {/* Faaliyet Alanı ve Dijital Hizmet Niteliği — PayTR Zorunlu Açıklama */}
        <section className="p-8 rounded-3xl bg-surface border border-accent/30 space-y-6 shadow-cinematic">
          <div className="flex items-center gap-3 border-b border-border/80 pb-4">
            <span className="text-2xl">📋</span>
            <div>
              <h2 className="font-display text-lg font-bold text-text-primary">
                Faaliyet Alanımız ve Hizmet Kapsamı
              </h2>
              <p className="text-xs text-text-muted">
                SINEAI platformunun çalışma modeli ve dijital hizmet sınırları
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
            <div className="p-4 rounded-2xl bg-background border border-destructive/25 space-y-2">
              <div className="font-bold text-destructive font-mono text-xs flex items-center gap-1.5">
                <span>❌</span>
                <span>FİZİKSEL ÜRÜN SATIŞI YOKTUR</span>
              </div>
              <p className="text-text-muted leading-relaxed">
                Platformumuz üzerinden fiziki herhangi bir ürün, eşya, materyal satışı yapılmamaktadır. Kargo gönderimi, depo veya stok faaliyetimiz bulunmamaktadır.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-destructive/25 space-y-2">
              <div className="font-bold text-destructive font-mono text-xs flex items-center gap-1.5">
                <span>❌</span>
                <span>STREAMING / MEDYA SATIŞI DEĞİLDİR</span>
              </div>
              <p className="text-text-muted leading-relaxed">
                SINEAI bir video barındırma ya da streaming (yayın) platformu değildir. Film veya dizi video/ses dosyaları satılmaz, kiralanmaz veya doğrudan oynatılmaz.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-emerald-500/25 space-y-2">
              <div className="font-bold text-emerald-400 font-mono text-xs flex items-center gap-1.5">
                <span>✅</span>
                <span>NE SUNUYORUZ? (DİJİTAL HİZMET)</span>
              </div>
              <p className="text-text-muted leading-relaxed">
                Kullanıcılara tat profilleme (Film/Dizi DNA), Bayesyen eşleşme algoritmalarıyla tarafsız öneriler, ortak izleme oturumları (Movie Night) ve yapay zekâ destekli sinematik keşif araçları sunuyoruz.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-emerald-500/25 space-y-2">
              <div className="font-bold text-emerald-400 font-mono text-xs flex items-center gap-1.5">
                <span>✅</span>
                <span>ÜCRETSİZ VE PREMIUM MODELİ</span>
              </div>
              <p className="text-text-muted leading-relaxed">
                Temel keşif ve öneri özellikleri tamamen ücretsizdir. Genişletilmiş kota, gelişmiş AI analizleri ve reklamsız deneyim için isteğe bağlı Premium dijital abonelik seçeneği sunulmaktadır.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-4 shadow-cinematic">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-2xl">
              🎯
            </div>
            <h2 className="font-display text-xl font-bold text-text-primary">Misyonumuz</h2>
            <p className="text-xs md:text-sm text-text-muted leading-relaxed">
              Her izleyicinin kendine özgü bir &quot;Film & Dizi DNA&quot;sı vardır. Amacımız, dakikalar süren karmaşık anketler yerine tekil yapım kararlarıyla bu DNA&apos;yı çıkarmak ve kullanıcının izlemekten gerçekten keyif alacağı yapımları %100 tarafsız matematik formülleriyle sunmaktır.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-4 shadow-cinematic">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-2xl">
              🚀
            </div>
            <h2 className="font-display text-xl font-bold text-text-primary">Vizyonumuz</h2>
            <p className="text-xs md:text-sm text-text-muted leading-relaxed">
              Sinema ve dizi dünyasındaki &quot;Ne izlesem?&quot; kararsızlığını sona erdirmek. Yayın platformlarının tıklama odaklı algoritmalarının ötesine geçerek, izleyicinin kendi zevkini keşfetmesini ve ortak izleme oturumlarında ortak paydayı saniyeler içinde bulmasını sağlamak.
            </p>
          </div>
        </div>

        {/* Core Values */}
        <section className="p-8 rounded-3xl bg-surface border border-border/80 space-y-6">
          <h2 className="font-display text-2xl font-bold text-text-primary text-center">
            İlkelerimiz ve Değerlerimiz
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="space-y-2 p-5 rounded-2xl bg-background border border-border/60">
              <div className="text-accent font-mono font-bold text-xs uppercase">01 / Şeffaflık</div>
              <h3 className="font-bold text-sm text-text-primary">Gizli Öne Çıkarma Yok</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Hiçbir yapım ya da stüdyo para ödeyerek öneri listelerinde üst sıraya çıkamaz. Skorlar sadece zevkinizle ve kaliteyle belirlenir.
              </p>
            </div>

            <div className="space-y-2 p-5 rounded-2xl bg-background border border-border/60">
              <div className="text-accent font-mono font-bold text-xs uppercase">02 / Bilimsellik</div>
              <h3 className="font-bold text-sm text-text-primary">Bayesyen & Vektörel Model</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Rastgele tavsiyeler yerine kosinüs benzerliği, dönem tercihleri ve Bayesyen oy ağırlıklandırması kullanılır.
              </p>
            </div>

            <div className="space-y-2 p-5 rounded-2xl bg-background border border-border/60">
              <div className="text-accent font-mono font-bold text-xs uppercase">03 / Mahremiyet</div>
              <h3 className="font-bold text-sm text-text-primary">Kişisel Veri Güvenliği</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Kullanıcı etkileşim verileriniz ve zevk haritanız kesinlikle 3. taraf reklam şirketleriyle paylaşılmaz.
              </p>
            </div>
          </div>
        </section>

        {/* Data Sources & Official TMDB Attribution Section */}
        <section className="p-8 rounded-3xl bg-surface border border-border/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400 mb-1">
                🌐 Veri Kaynakları & Lisans
              </div>
              <h2 className="font-display text-xl font-bold text-text-primary">
                Film ve Dizi Kataloğu & Attribution
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold font-mono text-emerald-400">TMDB Data & Attribution</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-background border border-border/60 space-y-4">
            <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
              SINEAI platformunda yer alan film ve dizi afişleri, özet metinleri, oyuncu ve teknik kadro bilgileri ile sinematik metaveriler <strong className="text-text-primary">The Movie Database (TMDB)</strong> API&apos;si aracılığıyla sağlanmaktadır.
            </p>

            <div className="p-4 rounded-xl bg-surface-2 border border-border text-xs font-mono text-text-secondary">
              <p className="text-emerald-400 font-bold mb-1">Resmi Attribution Bildirimi / Mandatory Notice:</p>
              <p>&quot;This product uses the TMDB API but is not endorsed or certified by TMDB.&quot;</p>
            </div>

            <p className="text-[11px] text-text-muted leading-relaxed">
              SINEAI, TMDB veri tabanını istatistiki öneri modellerinde kullanmakta olup; TMDB tarafından doğrudan onaylanmış, yetkilendirilmiş veya sertifikalandırılmış olduğu izlenimi taşımaz.
            </p>
          </div>
        </section>

        {/* Hizmet Sağlayıcı İletişim Bilgileri */}
        <div className="p-6 rounded-2xl bg-surface-2 border border-border text-xs font-sans text-text-secondary flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-text-primary">Hizmet Sağlayıcı: </span>
            <span>{operator.brandName} Platformu (Bireysel Hizmet Sağlayıcı)</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/iletisim" className="text-accent hover:underline font-mono">
              İletişim & Destek: {operator.supportEmail}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

