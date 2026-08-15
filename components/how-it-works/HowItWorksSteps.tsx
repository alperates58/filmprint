import React from "react";

export function HowItWorksSteps() {
  const steps = [
    {
      number: "01",
      title: "Sen Değerlendirirsin",
      description:
        "Film veya dizileri LOVE, LIKE, NEUTRAL, DISLIKE ile değerlendirirsin. Ham sinyaller profili besler.",
      icon: "👆",
      highlight: "Ham Tercih Sinyalleri",
    },
    {
      number: "02",
      title: "DNA Oluşur",
      description:
        "Film DNA ve Dizi DNA bağımsız olarak vektörel düzeyde modellenir; tür, dönem ve format tercihleri çıkarılır.",
      icon: "🧬",
      highlight: "Vektörel Profil Modelleme",
    },
    {
      number: "03",
      title: "Match Engine Adayları Bulur",
      description:
        "Binlerce içerikten kalite, tür, dönem, süre, yetişkin filtreleri ve dislike cezalarıyla güvenli bir shortlist oluşturur.",
      icon: "⚙️",
      highlight: "Deterministik Güvenli Shortlist",
    },
    {
      number: "04",
      title: "AI Semantic Reranker",
      description:
        "Yapay Zeka (AI) yalnızca filtrelenmiş shortlist'i analiz eder; anlatım biçimi, psikolojik ton, story structure ve tema derinliğini inceler.",
      icon: "🧠",
      highlight: "İkinci Aşama Semantik Analiz",
    },
    {
      number: "05",
      title: "Hibrit Skor Hesaplanır",
      description:
        "Matematiksel eşleşme skoru ile AI semantik yakınlığı kontrollü ağırlıklarla birleşerek final sıralamayı oluşturur.",
      icon: "✨",
      highlight: "Kalibre Edilmiş Hibrit Sıralama",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
          Akış Mimarisi
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary">
          5 Adımda Hibrit Öneri Mimarisi
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary">
          Kullanıcı değerlendirmesinden matematiksel filtreye ve semantik yapay zeka sıralamasına uzanan uçtan uca akış.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="group relative p-5 rounded-2xl bg-surface border border-border/80 hover:border-accent/40 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md hover:shadow-accent/5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{step.icon}</span>
                <span className="font-mono text-xs font-bold text-accent/80 px-2 py-0.5 rounded bg-accent/10">
                  {step.number}
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
                {step.title}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {step.description}
              </p>
            </div>

            <div className="pt-3 border-t border-border/40 text-[10px] font-mono text-text-muted">
              {step.highlight}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
