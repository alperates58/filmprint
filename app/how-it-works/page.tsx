import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

export const metadata = {
  title: "Nasıl Çalışıyor? — Filmprint Algoritması ve Matematiksel Formüller",
  description:
    "Filmprint'in tarafsız ve bilimsel film öneri motorunun arkasındaki Bayesian kalite puanlaması, Film DNA vektörleşmesi ve skor kalibrasyon formüllerini inceleyin.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-12 w-full">
        {/* Header Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            🧪 Match Engine v3.1 — Algoritmik Şeffaflık
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary">
            Filmprint Nasıl Çalışıyor?
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Şişirilmiş puanlar, sponsorlu reklamlar ve yapay 100/100 eşleşmeler yok. Filmprint, kişisel sinema tercihinizi olasılıksal ve vektörel matematik formülleriyle modeller.
          </p>
        </div>

        {/* Core Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-2">
            <div className="text-2xl">📐</div>
            <h3 className="font-display text-base font-bold text-text-primary">100% Şeffaf Matematik</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Her match puanı ve kategori eşleşmesi açık formüllerle hesaplanır. Hiçbir film reklam amacıyla öne çıkarılmaz.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-2">
            <div className="text-2xl">⚖️</div>
            <h3 className="font-display text-base font-bold text-text-primary">Bayesian Kalite Dengesi</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Az sayıda yüksek oy almış bağımsız filmlerin ve popüler ana akım yapımların puanı küresel ortalamaya göre düzeltilir.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-2">
            <div className="text-2xl">🎯</div>
            <h3 className="font-display text-base font-bold text-text-primary">Kanıta Dayalı Kalibrasyon</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Skorlar %97 ile sınırlandırılır. %90 ve üzeri eşleşmeler için "LOVE" verdiğiniz filmlerle matematiksel referans kanıtı şart koşulur.
            </p>
          </div>
        </div>

        {/* Formula 1: Bayesian Quality Floor */}
        <section className="p-8 rounded-3xl bg-surface border border-border/80 space-y-6 shadow-cinematic">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-accent">FORMÜL 1</span>
              <h2 className="font-display text-xl font-bold text-text-primary">
                Bayesian Weighted Quality Score (W)
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
              Kalite Filtresi
            </span>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            Sadece 8 kişinin 10/10 oy verdiği bilinmeyen bir filmin, 500,000 kişinin 8.2 oy verdiği bir şaheserin üstüne çıkmasını önlemek amacıyla IMDB/TMDB küresel Bayesyen ağırlıklı kalite formülü uygulanır:
          </p>

          {/* Mathematical Formula Display Card */}
          <div className="p-6 rounded-2xl bg-background border border-accent/30 text-center font-mono space-y-3 shadow-inner">
            <div className="text-lg md:text-2xl font-bold text-accent tracking-wide">
              W = (v · R + m · C) / (v + m)
            </div>
            <div className="text-xs text-text-muted font-sans italic font-mono">
              {"W = (v · R + m · C) / (v + m)"}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-surface-elevated border border-border/60">
              <div className="text-text-muted font-bold">v (Vote Count)</div>
              <div className="text-text-primary mt-1">Filmin toplam oy sayısı</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-elevated border border-border/60">
              <div className="text-text-muted font-bold">R (Vote Average)</div>
              <div className="text-text-primary mt-1">Filmin ham TMDB puanı (0-10)</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-elevated border border-border/60">
              <div className="text-text-muted font-bold">m (Prior Weight = 50)</div>
              <div className="text-accent font-bold mt-1">Minimum güvenilirlik eşiği</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-elevated border border-border/60">
              <div className="text-text-muted font-bold">C (Global Mean = 6.8)</div>
              <div className="text-accent font-bold mt-1">Veritabanı ortalama puanı</div>
            </div>
          </div>
        </section>

        {/* Formula 2: Film DNA Vector Taste Score */}
        <section className="p-8 rounded-3xl bg-surface border border-border/80 space-y-6 shadow-cinematic">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-accent">FORMÜL 2</span>
              <h2 className="font-display text-xl font-bold text-text-primary">
                Film DNA Vektörel Zevk Skoru (S_DNA)
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
              Profil Uyum Skoru
            </span>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            Kalibrasyon adımlarında yaptığınız her "LOVE", "LIKE", "DISLIKE", "NOT_WATCHED" kararı Film DNA profilinizi besler. Aday filmin profilinize uyumu 6 farklı boyutta ağırlıklandırılır:
          </p>

          <div className="p-6 rounded-2xl bg-background border border-accent/30 text-center font-mono space-y-3 shadow-inner">
            <div className="text-sm md:text-lg font-bold text-accent tracking-wide leading-relaxed">
              Match_raw = (0.35 · S_genre) + (0.15 · S_era) + (0.15 · S_quality) + (0.15 · S_popularity) + (0.10 · S_discovery) + S_feedback
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-surface-elevated border border-border/60 flex items-center justify-between text-xs">
              <span className="font-bold text-text-primary">🎭 Tür Uyumu (S_genre) — %35</span>
              <span className="text-text-muted">Kullanıcının sevdiği ve kaçındığı türlerin ağırlıklı fonksiyonu</span>
            </div>
            <div className="p-4 rounded-xl bg-surface-elevated border border-border/60 flex items-center justify-between text-xs">
              <span className="font-bold text-text-primary">⏳ Dönem Uyumu (S_era) — %15</span>
              <span className="text-text-muted">70'ler, 90'lar veya 2020'ler sinema çağı tercihi</span>
            </div>
            <div className="p-4 rounded-xl bg-surface-elevated border border-border/60 flex items-center justify-between text-xs">
              <span className="font-bold text-text-primary">⭐ Bayesian Kalite (S_quality) — %15</span>
              <span className="text-text-muted">Filmin Bayesyen ağırlıklı W puanı</span>
            </div>
            <div className="p-4 rounded-xl bg-surface-elevated border border-border/60 flex items-center justify-between text-xs">
              <span className="font-bold text-text-primary">🍿 Popülarite Oryantasyonu (S_popularity) — %15</span>
              <span className="text-text-muted">Ana akım vs bağımsız sinema tercihi</span>
            </div>
          </div>
        </section>

        {/* Formula 3: Reference Evidence & Cosine Similarity */}
        <section className="p-8 rounded-3xl bg-surface border border-border/80 space-y-6 shadow-cinematic">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-accent">FORMÜL 3</span>
              <h2 className="font-display text-xl font-bold text-text-primary">
                Referans Benzerlik & Vektörel Örtüşme (Sim_Cosine)
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
              Gerekçelendirme Motoru
            </span>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            "Sana Neden Uygun?" bölümünde gösterilen referans filmler, kullanıcının daha önce "LOVE" dediği filmlerle aday film arasındaki çok boyutlu kosinüs benzerliği ile belirlenir:
          </p>

          <div className="p-6 rounded-2xl bg-background border border-accent/30 text-center font-mono space-y-3 shadow-inner">
            <div className="text-base md:text-xl font-bold text-accent tracking-wide">
              Sim(A, B) = (v_A · v_B) / (||v_A|| · ||v_B||)
            </div>
            <div className="text-xs text-text-muted font-mono italic">
              {"Sim(A, B) = CosineSimilarity(Vector(A), Vector(B))"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-elevated border border-border/60 space-y-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-accent font-bold">
              <span>📌 Güçlü Referans Eşiği ($\ge 0.60$)</span>
            </div>
            <p className="text-text-muted leading-relaxed">
              Eğer aday film ile sevdiğiniz bir film arasındaki benzerlik 0.60 ve üzerinde ise sistem doğrudan bu filmi referans gösterir (Örn: <em>"Se7en filmini çok sevdiğin için..."</em>). Benzerlik 0.60'ın altında kalırsa sistem uydurma referans seçmek yerine genel profil sinyallerini kullanır.
            </p>
          </div>
        </section>

        {/* Formula 4: Calibration & Relaxation */}
        <section className="p-8 rounded-3xl bg-surface border border-border/80 space-y-6 shadow-cinematic">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-accent">FORMÜL 4</span>
              <h2 className="font-display text-xl font-bold text-text-primary">
                Skor Kalibrasyonu & Kategori Bağlam Gevşetmesi
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
              Denge & Caping
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-background border border-border/60 space-y-3 text-xs">
              <h3 className="font-bold text-text-primary text-sm">🔒 Max %97 Gösterim Sınırı</h3>
              <p className="text-text-muted leading-relaxed">
                Hiçbir film %100 mükemmel olarak garanti edilemez. Gösterim match skoru üst sınırı %97 olarak belirlenmiştir. Ayrıca %90+ skor için güçlü direkt referans şarttır.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-background border border-border/60 space-y-3 text-xs">
              <h3 className="font-bold text-text-primary text-sm">🌊 3 Aşamalı Bağlam Gevşetmesi</h3>
              <p className="text-text-muted leading-relaxed">
                Kategoriler doldurulurken STRICT ($\ge 0.55$), NORMAL ($\ge 0.40$), RELAXED ($\ge 0.25$) seviyeleri uygulanır. 0.25 taban puanının altına inen alakasız filmler kategoriye sokulmaz.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="text-center p-8 rounded-3xl bg-gradient-to-b from-surface to-surface-elevated border border-accent/30 space-y-4">
          <h2 className="font-display text-2xl font-bold text-text-primary">
            Film DNA Profilini Matematiksel Olarak Keşfet
          </h2>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            Hemen kalibrasyon motorunu deneyin ve kişisel film önerilerinizi inceleyin.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-accent text-white font-mono font-bold text-xs hover:bg-accent-hover transition-colors shadow-lg"
            >
              🎯 Kalibrasyonu Başlat
            </Link>
            <Link
              href="/recommendations"
              className="px-6 py-3 rounded-xl bg-surface-elevated border border-border text-text-primary font-mono font-bold text-xs hover:border-accent transition-colors"
            >
              ✨ Önerilerimi Gör
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
