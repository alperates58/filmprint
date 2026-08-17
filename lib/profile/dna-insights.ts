import type { FilmDnaResult, GenrePreference, EraPreference } from "./types";
import type { TvDnaResult, TvGenreSignature, TvEraSignature, TvArchetypeResult } from "../tv/profile/types";

export interface GenreColorToken {
  bg: string;
  border: string;
  text: string;
  gradient: string;
  barColor: string;
  shadow: string;
}

const GENRE_COLOR_MAP: Record<string, GenreColorToken> = {
  // Action & Adventure
  Aksiyon: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-400",
    gradient: "from-rose-500 to-red-600",
    barColor: "bg-rose-500",
    shadow: "shadow-rose-500/20",
  },
  Macera: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    gradient: "from-amber-500 to-orange-600",
    barColor: "bg-amber-500",
    shadow: "shadow-amber-500/20",
  },
  // Drama
  Dram: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    text: "text-violet-400",
    gradient: "from-violet-500 to-indigo-600",
    barColor: "bg-violet-500",
    shadow: "shadow-violet-500/20",
  },
  // Comedy
  Komedi: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    gradient: "from-yellow-400 to-amber-500",
    barColor: "bg-yellow-400",
    shadow: "shadow-yellow-500/20",
  },
  // Thriller & Suspense
  Gerilim: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
    gradient: "from-orange-500 to-amber-600",
    barColor: "bg-orange-500",
    shadow: "shadow-orange-500/20",
  },
  // Crime & Mystery
  Suç: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    gradient: "from-blue-500 to-indigo-600",
    barColor: "bg-blue-500",
    shadow: "shadow-blue-500/20",
  },
  Gizem: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    text: "text-indigo-400",
    gradient: "from-indigo-500 to-purple-600",
    barColor: "bg-indigo-500",
    shadow: "shadow-indigo-500/20",
  },
  // Sci-Fi & Fantasy
  "Bilim-Kurgu": {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    gradient: "from-cyan-500 to-blue-600",
    barColor: "bg-cyan-500",
    shadow: "shadow-cyan-500/20",
  },
  "Bilim Kurgu": {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    gradient: "from-cyan-500 to-blue-600",
    barColor: "bg-cyan-500",
    shadow: "shadow-cyan-500/20",
  },
  Fantastik: {
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/30",
    text: "text-fuchsia-400",
    gradient: "from-fuchsia-500 to-pink-600",
    barColor: "bg-fuchsia-500",
    shadow: "shadow-fuchsia-500/20",
  },
  // Romance
  Romantik: {
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
    text: "text-pink-400",
    gradient: "from-pink-500 to-rose-600",
    barColor: "bg-pink-500",
    shadow: "shadow-pink-500/20",
  },
  // Horror
  Korku: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    gradient: "from-emerald-600 to-teal-800",
    barColor: "bg-emerald-500",
    shadow: "shadow-emerald-500/20",
  },
  // Animation
  Animasyon: {
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    text: "text-teal-400",
    gradient: "from-teal-400 to-emerald-500",
    barColor: "bg-teal-400",
    shadow: "shadow-teal-500/20",
  },
  // Documentary & History
  Belgesel: {
    bg: "bg-amber-600/10",
    border: "border-amber-600/30",
    text: "text-amber-500",
    gradient: "from-amber-600 to-yellow-700",
    barColor: "bg-amber-600",
    shadow: "shadow-amber-600/20",
  },
  Tarih: {
    bg: "bg-stone-500/10",
    border: "border-stone-500/30",
    text: "text-stone-300",
    gradient: "from-stone-500 to-stone-700",
    barColor: "bg-stone-400",
    shadow: "shadow-stone-500/20",
  },
  Savaş: {
    bg: "bg-red-700/10",
    border: "border-red-700/30",
    text: "text-red-400",
    gradient: "from-red-700 to-neutral-800",
    barColor: "bg-red-600",
    shadow: "shadow-red-700/20",
  },
  Müzik: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-400",
    gradient: "from-purple-500 to-pink-600",
    barColor: "bg-purple-500",
    shadow: "shadow-purple-500/20",
  },
  Western: {
    bg: "bg-yellow-700/10",
    border: "border-yellow-700/30",
    text: "text-yellow-600",
    gradient: "from-yellow-700 to-amber-900",
    barColor: "bg-yellow-600",
    shadow: "shadow-yellow-700/20",
  },
};

const DEFAULT_GENRE_COLOR: GenreColorToken = {
  bg: "bg-accent/10",
  border: "border-accent/30",
  text: "text-accent",
  gradient: "from-accent to-accent-hover",
  barColor: "bg-accent",
  shadow: "shadow-accent/20",
};

export function getGenreColor(genreName: string): GenreColorToken {
  const normalized = genreName.trim();
  return GENRE_COLOR_MAP[normalized] || DEFAULT_GENRE_COLOR;
}

export interface CompoundInsight {
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: string;
  description: string;
}

/**
 * Derives rich, structured compound insights for Film DNA.
 */
export function deriveFilmCompoundInsights(dna: FilmDnaResult): CompoundInsight[] {
  const insights: CompoundInsight[] = [];
  const topGenres = dna.genres || [];
  const topEras = dna.eras || [];
  const totalRated = dna.sample?.ratedMovies || 0;

  // 1. Dominant Genre Pairing
  if (topGenres.length >= 2) {
    const g1 = topGenres[0];
    const g2 = topGenres[1];
    insights.push({
      title: `${g1.name} + ${g2.name} Rezonansı`,
      subtitle: "Baskın Tür İkilisi",
      badge: "ÇİFTE MERKEZ",
      badgeColor: "bg-violet-500/15 border-violet-500/30 text-violet-400",
      icon: "⚡",
      description: `İzleme geçmişinde en yüksek beğeni yoğunluğunu %${Math.round(g1.score * 100)} ile ${g1.name} ve %${Math.round(g2.score * 100)} ile ${g2.name} paylaşıyor. Bu iki türün kesiştiği yapımlarda tatmin düzeyin zirveye çıkıyor.`,
    });
  }

  // 2. Era Gravity
  if (topEras.length > 0) {
    const strongestEra = topEras[0];
    const isModern = strongestEra.key.includes("202") || strongestEra.key.includes("201");
    insights.push({
      title: `${strongestEra.label} Ağırlığı`,
      subtitle: isModern ? "Çağdaş Sinema Eğilimi" : "Klasik & Kült Sinema Sevgisi",
      badge: strongestEra.key.toUpperCase(),
      badgeColor: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
      icon: "⌛",
      description: isModern
        ? `Modern dönem anlatı teknikleri, çağdaş prodüksiyon kalitesi ve güncel ritim senin için sinemanın merkezinde yer alıyor.`
        : `Dönem sineması ve klasik kült eserlerin atmosferik dokusu zevkinde kalıcı bir iz bırakmış durumda.`,
    });
  }

  // 3. Discovery / Mainstream Archetype
  const pop = dna.popularity?.orientation || "balanced";
  const fam = dna.familiarity?.label || "balanced";
  if (pop === "niche" || fam === "discovery_heavy") {
    insights.push({
      title: "Derin Sinema Kaşifi",
      subtitle: "Popülerlikten Bağımsız Zevk",
      badge: "GİZLİ CEVHER",
      badgeColor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      icon: "🧭",
      description: "Ana akım gişe filmlerinin ötesine geçip festival, bağımsız ve az bilinen yönetmen sinemasına karşı açık bir merak besliyorsun.",
    });
  } else if (pop === "mainstream") {
    insights.push({
      title: "Kültürün Kalbinde",
      subtitle: "Güçlü Prodüksiyon Sevgisi",
      badge: "ANA AKIM GÜCÜ",
      badgeColor: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      icon: "🌟",
      description: "Geniş kitlelerin beğendiği, yüksek prodüksiyon bütçeli, ikonik ve global etki yaratan başyapıtlar seni en çok tatmin ediyor.",
    });
  } else {
    insights.push({
      title: "Dengeli Sinefil Çizgisi",
      subtitle: "Çok Yönlü İzleme Yelpazesi",
      badge: "DENGELİ GÖZ",
      badgeColor: "bg-blue-500/15 border-blue-500/30 text-blue-400",
      icon: "⚖️",
      description: "Popüler sinemanın en iyileri ile az bilinen cevherler arasında dengeli ve önyargısız bir denge kurmuş durumdasın.",
    });
  }

  // 4. Sample Size & Calibration Depth
  if (totalRated >= 50) {
    insights.push({
      title: "Kristalleşmiş Sinema DNA'sı",
      subtitle: `${totalRated} Değerlendirilmiş Eser`,
      badge: "YÜKSEK GÜVENİLİRLİK",
      badgeColor: "bg-rose-500/15 border-rose-500/30 text-rose-400",
      icon: "💎",
      description: "Geniş veri havuzun sayesinde öneri motoru kişisel nüanslarını, kaçındığın klişeleri ve en derin estetik eşiklerini son derece yüksek hassasiyetle tanıyor.",
    });
  }

  return insights;
}

/**
 * Derives rich, structured compound insights for TV DNA.
 */
export function deriveTvCompoundInsights(tvProfile: TvDnaResult): CompoundInsight[] {
  const insights: CompoundInsight[] = [];
  const topGenres = (tvProfile.genres || []).filter((g: TvGenreSignature) => g.state === "POSITIVE");
  const archetypes: TvArchetypeResult[] = tvProfile.archetypes || [];

  // 1. Dominant Genre Pairing
  if (topGenres.length >= 2) {
    insights.push({
      title: `${topGenres[0].name} + ${topGenres[1].name} Rezonansı`,
      subtitle: "Baskın Dizi İkilisi",
      badge: "ÇİFTE ODAK",
      badgeColor: "bg-violet-500/15 border-violet-500/30 text-violet-400",
      icon: "📺",
      description: `Dizi izleme alışkanlığında en yüksek tutkuyu ${topGenres[0].name} ve ${topGenres[1].name} türleri oluşturuyor. Bu türlerde karakter arklarının uzun soluklu işlenişi seni ekrana bağlıyor.`,
    });
  }

  // 2. Format / Length Preference
  const format = tvProfile.formatPreference?.preference;
  if (format === "MINISERIES") {
    insights.push({
      title: "Kompakt Mini Dizi Tutkusu",
      subtitle: "Yüksek Tempolu Anlatı",
      badge: "MİNİ SERİ",
      badgeColor: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
      icon: "⏱️",
      description: "Gereksiz uzatılmamış, net bir başlangıcı ve tatmin edici bir sonu olan tek sezonluk mini diziler senin için en verimli format.",
    });
  } else if (format === "LONG_RUNNING" || format === "MULTI_SEASON") {
    insights.push({
      title: "Uzun Soluklu Evren Bağı",
      subtitle: "Derin Karakter Gelişimi",
      badge: "ÇOK SEZONLU",
      badgeColor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      icon: "🏰",
      description: "Sezonlar boyunca yavaş yavaş inşa edilen zengin karakter ilişkileri ve genişleyen anlatı evrenleri senin izleme konforunu artırıyor.",
    });
  }

  // 3. International Orientation
  const intl = tvProfile.internationalOrientation?.orientation;
  if (intl === "GLOBAL_EXPLORER" || intl === "INTERNATIONAL_NON_ENGLISH") {
    insights.push({
      title: "Küresel Dizi Kaşifi",
      subtitle: "Farklı Kültürler & Diller",
      badge: "DÜNYA SİNEMASI",
      badgeColor: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      icon: "🌍",
      description: "Yalnızca Hollywood değil; Avrupa, İskandinav, Kore ve Latin Amerika gibi farklı coğrafyaların özgün dizi anlatılarına açıksın.",
    });
  }

  // 4. Primary Archetype
  if (archetypes.length > 0) {
    const primary = archetypes.find((a) => a.isPrimary) || archetypes[0];
    insights.push({
      title: `${primary.name} Arketipi`,
      subtitle: "Temel İzleyici Kimliği",
      badge: "ANA KARAKTER",
      badgeColor: "bg-rose-500/15 border-rose-500/30 text-rose-400",
      icon: primary.icon || "🎭",
      description: primary.description,
    });
  }

  return insights;
}
