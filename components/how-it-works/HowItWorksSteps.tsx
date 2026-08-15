import React from "react";

export function HowItWorksSteps() {
  const steps = [
    {
      number: "01",
      title: "Sen sinyal verirsin",
      description:
        "İzledim, Çok Sevdim, Beğendim, Sevmedim gibi kararların profilini besler.",
      icon: "👆",
      highlight: "Ham Tercih Sinyalleri",
    },
    {
      number: "02",
      title: "Film DNA oluşur",
      description:
        "Tür, dönem, popülerlik yönelimi, keşif açıklığı ve benzeri sinyallerden kişisel zevk modeli çıkarılır.",
      icon: "🧬",
      highlight: "Vektörel Profil Modelleme",
    },
    {
      number: "03",
      title: "Match Engine adayları sıralar",
      description:
        "Film kalitesi, profil uyumu, keşif dengesi, kanıt gücü ve tekrar cezaları birlikte değerlendirilir.",
      icon: "⚙️",
      highlight: "Çok Boyutlu Sıralama",
    },
    {
      number: "04",
      title: "Açıklanabilir öneriler gelir",
      description:
        "Sadece filmi değil, neden sana uygun olduğunu da görürsün.",
      icon: "💡",
      highlight: "Gerekçelendirilmiş Öneriler",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
          Akış Mimarisi
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary">
          4 Adımda Nasıl Çalışıyor?
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary">
          Kullanıcı kararından kişiselleştirilmiş gerekçeli önerilere uzanan uçtan uca akış.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="group relative p-6 rounded-2xl bg-surface border border-border/80 hover:border-accent/40 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md hover:shadow-accent/5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{step.icon}</span>
                <span className="font-mono text-xs font-bold text-accent/80 px-2 py-0.5 rounded bg-accent/10">
                  {step.number}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-text-primary group-hover:text-accent transition-colors">
                {step.title}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {step.description}
              </p>
            </div>

            <div className="pt-3 border-t border-border/40 text-[11px] font-mono text-text-muted">
              {step.highlight}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
