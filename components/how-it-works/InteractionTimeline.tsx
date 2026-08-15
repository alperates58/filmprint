import React from "react";

export function InteractionTimeline() {
  const milestones = [
    {
      range: "0–30",
      title: "İlk Sinyaller",
      desc: "Ana tür ve dönem yönelimleri belirlenir. Temel Film DNA oluşur.",
      badge: "Başlangıç",
    },
    {
      range: "30–100",
      title: "Profil Şekilleniyor",
      desc: "Popülarite eğilimi ve keşif dengesi netleşir. Güvenilirlik artar.",
      badge: "Gelişme",
    },
    {
      range: "100–250",
      title: "Güçlü Kişiselleştirme",
      desc: "Alt türler ve yönetmen lezzetleri modele katılır. 90+ skorlar açılır.",
      badge: "Olgunlaşma",
    },
    {
      range: "250–500",
      title: "Daha Derin Zevk Modeli",
      desc: "Yıllara ve temalara göre niş eğilimler ayrışır. Yanılgı payı minimize olur.",
      badge: "Sinefil Seviye",
    },
    {
      range: "500+",
      title: "İnce Ayrımlar Belirginleşir",
      desc: "Mikro-türler, yönetmen bağları ve bağlamsal ruh hali tam oturur.",
      badge: "Usta Sinefil",
    },
    {
      range: "1000+",
      title: "Çok Güçlü Kişiselleştirme",
      desc: "Kusursuz zevk kütüphanesi. Binlerce aday arasından nokta atışı öneriler.",
      badge: "Küratör Zirve",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
          Öğrenme Eğrisi
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary">
          Daha Çok Film = Daha İyi Öneri
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary">
          Her oyladığın film, Filmprint'in seni tanıma çözünürlüğünü katlar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {milestones.map((item, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl bg-surface border border-border/80 hover:border-accent/40 transition-all duration-300 space-y-3 shadow-sm relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-bold text-accent px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20">
                {item.range} Film
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                {item.badge}
              </span>
            </div>
            <h3 className="font-display text-base font-bold text-text-primary group-hover:text-accent transition-colors">
              {item.title}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
