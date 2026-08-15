import React from "react";

export function LiveReasoningDemo() {
  const reasoningChips = [
    { label: "Tür Uyumu", score: "%95", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
    { label: "Dönem Uyumu", score: "2010'lar", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
    { label: "Benzer Ton", score: "Zihinsel & Melankolik", color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
    { label: "Güçlü Kanıt", score: "Interstellar Bağlantısı", color: "text-accent border-accent/30 bg-accent/10" },
    { label: "Keşif Dengesi", score: "Yüksek Kalite", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  ];

  return (
    <section className="space-y-6">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
          Açıklanabilir Yapay Zeka
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary">
          Neden Bu Film?
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary">
          SineAI sana sadece bir afiş fırlatmaz; neden beğeneceğini somut kanıtlarla açıklar.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border/80 shadow-cinematic">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Sample Movie Card */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-background border border-border/80 space-y-4 shadow-inner">
            <div className="flex items-start gap-4">
              <div className="w-20 h-28 sm:w-24 sm:h-36 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-3xl font-mono text-text-muted shrink-0 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                  <span className="text-[10px] font-mono text-accent font-bold">2016</span>
                </div>
                🎬
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
                    %94 Uyum
                  </span>
                  <span className="text-xs font-mono text-text-muted">⭐ 8.0/10</span>
                </div>
                <h3 className="font-display text-lg font-bold text-text-primary truncate">
                  Arrival (Geliş)
                </h3>
                <p className="text-xs text-text-muted">
                  Yönetmen: Denis Villeneuve • Bilim Kurgu, Dram, Gizem
                </p>
                <div className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                  Dünya genelinde gizemli uzay araçları belirdiğinde, insanlık iletişim kurmak için uzman bir dilbilimciye başvurur.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Reasoning & Grounded Evidence */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-accent">GEREKÇELENDİRME PANELİ</span>
              <h4 className="font-display text-base sm:text-lg font-bold text-text-primary">
                Neden sana uygun?
              </h4>
            </div>

            {/* Reasoning Chips */}
            <div className="flex flex-wrap gap-2">
              {reasoningChips.map((chip, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-1 rounded-lg border text-xs font-medium font-mono flex items-center gap-1.5 ${chip.color}`}
                >
                  <span>✓</span>
                  <span>{chip.label}:</span>
                  <span className="font-bold">{chip.score}</span>
                </div>
              ))}
            </div>

            {/* Concrete Grounded Explanation Box */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-border/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-text-primary font-bold">
                <span>📌</span>
                <span>Somut Kanıt ve Referans Motoru:</span>
              </div>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-sans">
                "Daha önce çok sevdiğin <strong className="text-text-primary font-semibold">Interstellar</strong> ve <strong className="text-text-primary font-semibold">Blade Runner 2049</strong> filmleriyle derin bilim kurgu felsefesi, yüksek gerilimli gizem yapısı ve melankolik ton yakınlığı taşıyor."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
