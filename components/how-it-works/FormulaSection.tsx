import React from "react";
import { MathFormula } from "./MathFormula";

export function FormulaSection() {
  return (
    <section className="space-y-8">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
          Matematiksel Modeller
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary">
          Formüller ve Çalışma Prensipleri
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary">
          Tüm puanlar, filtreler ve sıralamalar açık matematiksel temellere dayanır.
        </p>
      </div>

      <div className="space-y-8">
        {/* FORMULA 1: Bayesian Weighted Quality Score */}
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border/90 space-y-6 shadow-cinematic relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-accent">FORMÜL 1</span>
              <h3 className="font-display text-lg sm:text-xl font-bold text-text-primary">
                Bayesian Weighted Quality Score
              </h3>
            </div>
            <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-semibold text-accent">
              Kalite Filtresi
            </span>
          </div>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Az oy almış ama puanı aşırı yüksek görünen filmlerin, çok daha güvenilir ve çok sayıda oy almış kaliteli filmlerin önüne geçmesini engeller.
          </p>

          {/* Math Render Card */}
          <div className="p-5 sm:p-8 rounded-2xl bg-background/90 border border-accent/30 text-center flex flex-col items-center justify-center space-y-2 shadow-inner overflow-x-auto">
            <MathFormula
              tex={"W = \\frac{v \\cdot R + m \\cdot C}{v + m}"}
              className="text-accent text-xl sm:text-2xl md:text-3xl font-bold"
            />
          </div>

          {/* Variable Breakdown Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="text-accent font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">v</span>
                <span>Vote Count</span>
              </div>
              <p className="text-text-secondary font-sans text-xs">
                Filmin toplam oy sayısı
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="text-accent font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">R</span>
                <span>Vote Average</span>
              </div>
              <p className="text-text-secondary font-sans text-xs">
                Filmin ham TMDB puanı (0–10)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="text-accent font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">m</span>
                <span>Prior Weight</span>
              </div>
              <p className="text-text-secondary font-sans text-xs">
                Minimum güvenilirlik / prior ağırlığı
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="text-accent font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">C</span>
                <span>Global Mean</span>
              </div>
              <p className="text-text-secondary font-sans text-xs">
                Global ortalama kalite puanı
              </p>
            </div>
          </div>
        </div>

        {/* FORMULA 2: Film DNA Vektörel Zevk Skoru */}
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border/90 space-y-6 shadow-cinematic relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-accent">FORMÜL 2</span>
              <h3 className="font-display text-lg sm:text-xl font-bold text-text-primary">
                Film DNA Vektörel Zevk Skoru
              </h3>
            </div>
            <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-semibold text-accent">
              Profil Uyum Skoru
            </span>
          </div>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Kullanıcının Film DNA profilindeki farklı tercih boyutlarının ağırlıklı toplamıdır.
          </p>

          {/* Math Render Card */}
          <div className="p-5 sm:p-8 rounded-2xl bg-background/90 border border-accent/30 text-center flex flex-col items-center justify-center space-y-2 shadow-inner overflow-x-auto">
            <MathFormula
              tex={"S_{\\text{DNA}} = \\sum_{i=1}^{n} w_i \\cdot s_i"}
              className="text-accent text-xl sm:text-2xl md:text-3xl font-bold"
            />
          </div>

          {/* Variables */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="text-accent font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">w_i</span>
                <span>Boyut Ağırlığı</span>
              </div>
              <p className="text-text-secondary font-sans text-xs">
                Kullanıcının ilgili tercih boyutundaki ağırlığı
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="text-accent font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">s_i</span>
                <span>Aday Uyum Değeri</span>
              </div>
              <p className="text-text-secondary font-sans text-xs">
                Aday filmin aynı boyuttaki uyum skoru
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="text-accent font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">n</span>
                <span>Boyut Sayısı</span>
              </div>
              <p className="text-text-secondary font-sans text-xs">
                Değerlendirilen profil boyutu sayısı
              </p>
            </div>
          </div>

          {/* Signal Feedback Box */}
          <div className="p-4 rounded-2xl bg-surface-elevated/80 border border-border/70 space-y-3">
            <div className="text-xs font-mono font-bold text-text-primary flex items-center gap-2">
              <span>⚡</span>
              <span>Film DNA'yı Besleyen Kullanıcı Kararları:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-surface border border-emerald-500/20 text-emerald-400 font-mono flex items-center gap-2">
                <span>❤️ LOVE</span>
                <span className="text-[10px] text-text-muted">(Güçlü Pozitif)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-blue-500/20 text-blue-400 font-mono flex items-center gap-2">
                <span>👍 LIKE</span>
                <span className="text-[10px] text-text-muted">(Pozitif İlgi)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-border text-text-secondary font-mono flex items-center gap-2">
                <span>⚪ NEUTRAL</span>
                <span className="text-[10px] text-text-muted">(Nötr Sinyal)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-red-500/20 text-red-400 font-mono flex items-center gap-2">
                <span>👎 DISLIKE</span>
                <span className="text-[10px] text-text-muted">(Kaçınma)</span>
              </div>
            </div>

            {/* NOT_WATCHED Critical Clarification */}
            <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs text-text-secondary flex items-start gap-2.5 mt-2">
              <span className="text-accent text-base mt-0.5">ℹ️</span>
              <div className="leading-relaxed">
                <strong className="text-text-primary font-semibold">Önemli Güvenlik Kuralı:</strong>{" "}
                <code className="font-mono text-accent bg-accent/10 px-1 py-0.5 rounded text-[11px]">NOT_WATCHED</code>{" "}
                (İzlemedim) kararı kullanıcı zevkine <strong>kesinlikle negatif bir ceza sinyali değildir</strong>. Bu karar sadece henüz izlemediğin bir filmi belirtir ve profil zevk puanını olumsuz etkilemez.
              </div>
            </div>
          </div>
        </div>

        {/* FORMULA 3: Nihai Filmprint Uyum Skoru */}
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border/90 space-y-6 shadow-cinematic relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-accent">FORMÜL 3</span>
              <h3 className="font-display text-lg sm:text-xl font-bold text-text-primary">
                Nihai Filmprint Uyum Skoru
              </h3>
            </div>
            <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-semibold text-accent">
              Match Engine
            </span>
          </div>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Tüm kalite filtreleri, profil DNA eşleşmesi, çeşitlilik ve kanıt katkısının birleştiği nihai sıralama modelidir.
          </p>

          {/* Math Render Card */}
          <div className="p-5 sm:p-8 rounded-2xl bg-background/90 border border-accent/30 text-center flex flex-col items-center justify-center space-y-2 shadow-inner overflow-x-auto">
            <MathFormula
              tex={"M = \\alpha W + \\beta S_{\\text{DNA}} + \\gamma D + \\delta E - P"}
              className="text-accent text-xl sm:text-2xl md:text-3xl font-bold"
            />
          </div>

          {/* Variables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="text-accent font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">W</span>
                <span>Kalite (α)</span>
              </div>
              <p className="text-text-secondary font-sans text-xs">
                Bayesian kalite skoru
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="text-accent font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">S_DNA</span>
                <span>DNA (β)</span>
              </div>
              <p className="text-text-secondary font-sans text-xs">
                Film DNA profil uyumu
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="text-accent font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">D</span>
                <span>Keşif (γ)</span>
              </div>
              <p className="text-text-secondary font-sans text-xs">
                Keşif ve çeşitlilik katkısı
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="text-accent font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">E</span>
                <span>Kanıt (δ)</span>
              </div>
              <p className="text-text-secondary font-sans text-xs">
                Geçmişten gelen referans kanıtı
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="text-red-400 font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">P</span>
                <span>Ceza</span>
              </div>
              <p className="text-text-secondary font-sans text-xs">
                Tekrar ve uyumsuzluk cezaları
              </p>
            </div>
          </div>

          {/* Disclaimer Note */}
          <div className="p-3.5 rounded-xl bg-surface-elevated border border-border/60 text-xs text-text-muted font-sans italic">
            💡 <strong>Not:</strong> Bu gösterim, Filmprint Match Engine’in farklı sinyalleri nasıl bir araya getirdiğini kullanıcıya açıklayan özet bir matematiksel temsilidir. Backend hesaplama mantığı bu sayfa için değiştirilmemelidir.
          </div>
        </div>

        {/* FORMULA 4: Trust Guard / Score Ceiling */}
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border/90 space-y-6 shadow-cinematic relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-accent">FORMÜL 4</span>
              <h3 className="font-display text-lg sm:text-xl font-bold text-text-primary">
                Neden %100 Vermiyoruz? (Trust Guard)
              </h3>
            </div>
            <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-semibold text-accent">
              Güvenlik Sınırı
            </span>
          </div>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Filmprint yapay %100 eşleşmeler üretmez. Çok yüksek skorlar yalnızca güçlü profil uyumu ve yeterli kanıt olduğunda oluşur.
          </p>

          {/* Math Render Card */}
          <div className="p-5 sm:p-8 rounded-2xl bg-background/90 border border-accent/30 text-center flex flex-col items-center justify-center space-y-2 shadow-inner overflow-x-auto">
            <MathFormula
              tex={"M \\le 97"}
              className="text-accent text-2xl sm:text-3xl md:text-4xl font-bold"
            />
          </div>

          {/* Score Tiers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
              <div className="font-mono font-bold text-text-secondary text-sm">%70–79</div>
              <div className="font-semibold text-text-primary">Uyumlu</div>
              <div className="text-[11px] text-text-muted">Temel profil kesişimi</div>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-blue-500/20 space-y-1">
              <div className="font-mono font-bold text-blue-400 text-sm">%80–89</div>
              <div className="font-semibold text-text-primary">Güçlü Eşleşme</div>
              <div className="text-[11px] text-text-muted">Tür ve dönem uyumu</div>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-emerald-500/20 space-y-1">
              <div className="font-mono font-bold text-emerald-400 text-sm">%90–96</div>
              <div className="font-semibold text-text-primary">Çok Güçlü Eşleşme</div>
              <div className="text-[11px] text-text-muted">Kanıtlanmış doğrudan benzerlik</div>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-accent/40 space-y-1 bg-accent/5">
              <div className="font-mono font-bold text-accent text-sm">%97</div>
              <div className="font-semibold text-accent">Nadir Zirve Eşleşme</div>
              <div className="text-[11px] text-text-muted">Kusursuz DNA ve kalite örtüşmesi</div>
            </div>
          </div>

          {/* Sub-note */}
          <div className="p-3.5 rounded-xl bg-surface-elevated border border-border/60 text-xs text-text-muted font-sans text-center">
            🛡️ <strong>Sıfır Garanti Prensibi:</strong> %100 garanti anlamına gelen bir skor yoktur. Sinema sanatı kişiseldir ve matematik her zaman keşfe açık bir pay bırakır.
          </div>
        </div>
      </div>
    </section>
  );
}
