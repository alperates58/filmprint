import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

export const metadata = {
  title: "Biz Kimiz? & Veri Kaynakları — SineAI",
  description:
    "SineAI kişisel sinema deneyimini şeffaf, reklam sponsorluğu olmadan ve matematiksel formüllerle yeniden tanımlayan yeni nesil tat kalibrasyon platformudur.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-12 w-full">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            🏢 Biz Kimiz? — SineAI Sinema Laboratuvarı
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary">
            Sinema Zevkinizi Matematiksel Kesinlikle Şifreleyen Platform
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
            SineAI, popüler kültür dayatmalarına ve sponsorlu reklam listelerine karşı, sinefillerin gerçek kişisel zevklerini vektörel algoritma ve Bayesyen istatistik ile modelleyen tarafsız bir film ve dizi öneri motorudur.
          </p>
        </div>

        {/* Mission & Vision Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-4 shadow-cinematic">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-2xl">
              🎯
            </div>
            <h2 className="font-display text-xl font-bold text-text-primary">Misyonumuz</h2>
            <p className="text-xs md:text-sm text-text-muted leading-relaxed">
              Her izleyicinin kendine özgü bir "Film DNA"sı vardır. Amacımız, dakikalar süren karmaşık anketler yerine tekil film kararlarıyla bu DNA&apos;yı çıkarmak ve kullanıcının izlemekten gerçekten keyif alacağı filmleri %100 tarafsız matematik formülleriyle sunmaktır.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-4 shadow-cinematic">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-2xl">
              🚀
            </div>
            <h2 className="font-display text-xl font-bold text-text-primary">Vizyonumuz</h2>
            <p className="text-xs md:text-sm text-text-muted leading-relaxed">
              Sinema dünyasındaki &quot;Ne izlesem?&quot; kararsızlığını sona erdirmek. Yayın platformlarının tıklama odaklı algoritmalarının ötesine geçerek, izleyicinin kendi zevkini keşfetmesini ve ortak izleme oturumlarında (Movie Night) ortak paydayı saniyeler içinde bulmasını sağlamak.
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
              <div className="text-accent font-mono font-bold text-xs uppercase">03 / Veri Mahremiyeti</div>
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
              SineAI platformunda yer alan film ve dizi afişleri, özet metinleri, oyuncu ve teknik kadro bilgileri ile sinematik metaveriler <strong className="text-text-primary">The Movie Database (TMDB)</strong> API&apos;si aracılığıyla sağlanmaktadır.
            </p>

            <div className="p-4 rounded-xl bg-surface-2 border border-border text-xs font-mono text-text-secondary">
              <p className="text-emerald-400 font-bold mb-1">Resmi Attribution Bildirimi / Mandatory Notice:</p>
              <p>&quot;This product uses the TMDB API but is not endorsed or certified by TMDB.&quot;</p>
            </div>

            <p className="text-[11px] text-text-muted leading-relaxed">
              SineAI, TMDB veri tabanını akademik ve istatistiki öneri modellerinde kullanmakta olup; TMDB tarafından doğrudan onaylanmış, yetkilendirilmiş veya sertifikalandırılmış olduğu izlenimi taşımaz. Detaylı telif ve lisans bilgileri için <Link href="/legal/copyright" className="text-accent underline">Telif Hakları & Bildirimler</Link> sayfamızı inceleyebilirsiniz.
            </p>
          </div>
        </section>

        {/* System Architecture Showcase */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-surface to-surface-elevated border border-accent/30 space-y-6 text-center">
          <h2 className="font-display text-2xl font-bold text-text-primary">
            Match Engine v3.2 Mimarisi
          </h2>
          <p className="text-xs text-text-muted max-w-xl mx-auto leading-relaxed">
            SineAI, küresel film ve dizi veri havuzu üzerinde çalışan gelişmiş bir dinamik kalibrasyon ve gerekçelendirme katmanına sahiptir.
          </p>

          <div className="pt-2">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-mono font-bold text-xs hover:bg-accent-hover transition-colors shadow-md"
            >
              🧪 Matematiksel Formülleri İncele
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
