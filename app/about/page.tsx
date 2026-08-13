import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

export const metadata = {
  title: "Biz Kimiz? — Filmprint",
  description:
    "Filmprint kişisel sinema deneyimini şeffaf, reklam sponsorluğu olmadan ve matematiksel formüllerle yeniden tanımlayan yeni nesil tat kalibrasyon platformudur.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-12 w-full">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            🏢 Biz Kimiz? — Filmprint Sinema Laboratuvarı
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary">
            Sinema Zevkinizi Matematiksel Kesinlikle Şifreleyen Platform
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Filmprint, popüler kültür dayatmalarına ve sponsorlu reklam listelerine karşı, sinefillerin gerçek kişisel zevklerini vektörel algoritma ve Bayesyen istatistik ile modelleyen tarafsız bir film öneri motorudur.
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
              Her izleyicinin kendine özgü bir "Film DNA"sı vardır. Amacımız, dakikalar süren karmaşık anketler yerine tekil film kararlarıyla bu DNA'yı çıkarmak ve kullanıcının izlemekten gerçekten keyif alacağı filmleri %100 tarafsız matematik formülleriyle sunmaktır.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-surface border border-border/80 space-y-4 shadow-cinematic">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-2xl">
              🚀
            </div>
            <h2 className="font-display text-xl font-bold text-text-primary">Vizyonumuz</h2>
            <p className="text-xs md:text-sm text-text-muted leading-relaxed">
              Sinema dünyasındaki "Ne izlesem?" kararsızlığını sona erdirmek. Yayın platformlarının tıklama odaklı algoritmalarının ötesine geçerek, izleyicinin kendi zevkini keşfetmesini ve ortak izleme oturumlarında (Movie Night) ortak paydayı saniyeler içinde bulmasını sağlamak.
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

        {/* System Architecture Showcase */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-surface to-surface-elevated border border-accent/30 space-y-6 text-center">
          <h2 className="font-display text-2xl font-bold text-text-primary">
            Match Engine v3.1 Mimarisi
          </h2>
          <p className="text-xs text-text-muted max-w-xl mx-auto leading-relaxed">
            Filmprint, TMDB (The Movie Database) veri havuzu üzerinde çalışan gelişmiş bir dinamik kalibrasyon ve gerekçelendirme katmanına sahiptir.
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
