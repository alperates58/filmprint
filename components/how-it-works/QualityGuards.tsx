import React from "react";

export function QualityGuards() {
  const guards = [
    {
      icon: "⚖️",
      title: "Bayesian Kalite Dengesi",
      description: "Az oyla şişmiş puanların önüne geçer.",
      details: "Yalnızca birkaç kişinin 10 verdiği filmler küresel ortalama ağırlığıyla dengelenir.",
    },
    {
      icon: "🎯",
      title: "Kanıt Şartı",
      description: "90+ uyum skorları için güçlü geçmiş sinyalleri gerekir.",
      details: "Kullanıcının daha önce 'Çok Sevdim' dediği somut filmlerle örtüşmeyen adaylara 90+ verilmez.",
    },
    {
      icon: "🔄",
      title: "Tekrara Karşı Koruma",
      description: "Aynı film veya aynı içerik kümeleri sürekli tekrar edilmez.",
      details: "Global home deduplication ve yorgunluk cezaları sayesinde her satır taze bir keşif sunar.",
    },
    {
      icon: "🧭",
      title: "Keşif Dengesi",
      description: "Sadece güvenli seçenekler değil, profil dışına kontrollü keşif de yapılır.",
      details: "Yankı odasına hapsolmadan, zevkinin kıyısındaki yüksek puanlı gizli cevherler sunulur.",
    },
    {
      icon: "🖼️",
      title: "Metadata Kalite Filtresi",
      description: "Eksik posterli, özetsiz, düşük güvenilirlikte içerikler elenir.",
      details: "Afişsiz veya placeholder özetli yapımlar recommendation havuzuna kesinlikle alınmaz.",
    },
    {
      icon: "🔞",
      title: "Yetişkin / Uygunsuz İçerik Filtresi",
      description: "Adult ve açık erotik/pornografik içerikler kullanıcı akışlarından çıkarılır.",
      details: "Fail-closed adult filter koruması ile ana akım ve sinefil sinema deneyimi temiz tutulur.",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
          Güvenlik & Bütünlük
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary">
          Kaliteyi Nasıl Koruyoruz?
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary">
          Öneri havuzunun her aşamasında çalışan 6 koruyucu katman.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {guards.map((guard, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl bg-surface border border-border/80 hover:border-accent/40 transition-all duration-300 space-y-3 shadow-sm hover:shadow-md hover:shadow-accent/5 group"
          >
            <div className="text-2xl">{guard.icon}</div>
            <h3 className="font-display text-base font-bold text-text-primary group-hover:text-accent transition-colors">
              {guard.title}
            </h3>
            <p className="text-xs font-semibold text-text-secondary">
              {guard.description}
            </p>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {guard.details}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
