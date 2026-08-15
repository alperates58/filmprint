import React from "react";

export function DoAndDont() {
  const dos = [
    "Film zevkini matematiksel olarak modeller",
    "Her öneri için somut gerekçe ve kanıt sunar",
    "Düşük kaliteli ve şişirilmiş puanları eler",
    "Verdiğin her yeni oyla birlikte kendini geliştirir",
    "Farklı tür ve çağlardan zengin çeşitlilik sağlar",
  ];

  const donts = [
    "Sponsorlu veya reklam içerikli film öne çıkarmaz",
    "Gerçek dışı yapay %100 skorlar dağıtmaz",
    "Sadece genel katalog ortalamasına göre öneri yapmaz",
    "İzlemediğin filmi 'sevmedin' diye negatif puanlamaz",
    "Tek bir oya bakarak tüm zevk profilini altüst etmez",
  ];

  return (
    <section className="space-y-6">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
          İlkeler ve Sınırlar
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary">
          SineAI Ne Yapar / Ne Yapmaz?
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary">
          Algoritmik dürüstlük ve kullanıcı hakları manifestomuz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DO Column */}
        <div className="p-6 rounded-3xl bg-surface border border-emerald-500/30 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-sm border-b border-border/60 pb-3">
            <span>✅</span>
            <span>YAPAR</span>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-text-secondary">
            {dos.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                <span className="leading-relaxed text-text-primary">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* DON'T Column */}
        <div className="p-6 rounded-3xl bg-surface border border-red-500/30 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-red-400 font-mono font-bold text-sm border-b border-border/60 pb-3">
            <span>❌</span>
            <span>YAPMAZ</span>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-text-secondary">
            {donts.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="text-red-400 font-bold mt-0.5">✗</span>
                <span className="leading-relaxed text-text-primary">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI Boundaries Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-accent/30 space-y-4 shadow-cinematic">
        <div className="flex items-center gap-2.5 text-accent font-mono font-bold text-sm border-b border-border/60 pb-3">
          <span>🧠</span>
          <span>YAPAY ZEKA (AI) NE YAPMAZ?</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
            <div className="font-bold text-text-primary flex items-center gap-1.5">
              <span>🚫</span>
              <span>Kafasına Göre Film Seçmez</span>
            </div>
            <p className="text-text-muted leading-relaxed">
              Katalogdan rastgele seçim yapamaz; yalnızca Match Engine'in onayladığı shortlist'i semantik olarak sıralar.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
            <div className="font-bold text-text-primary flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Güvenlik Filtresini Aşamaz</span>
            </div>
            <p className="text-text-muted leading-relaxed">
              Yetişkin içerik, düşük kalite veya dislike kısıtlamalarını baypas edemez.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-elevated border border-border/70 space-y-1">
            <div className="font-bold text-text-primary flex items-center gap-1.5">
              <span>🎯</span>
              <span>%100 Garanti Uyduramaz</span>
            </div>
            <p className="text-text-muted leading-relaxed">
              Tüm skorlar %97 tavan sınırına tabidir. Hayali veya uydurma referans film üretemez.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
