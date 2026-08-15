import type { RatingStatus } from "@prisma/client";

export const TV_DNA_SCHEMA_VERSION = 1;
export const TV_DNA_ALGORITHM_VERSION = 1;

/**
 * Base rating weights for TV interaction signals.
 */
export const TV_BASE_RATING_WEIGHTS: Record<RatingStatus, number> = {
  LOVE: 3.0,
  LIKE: 1.5,
  NEUTRAL: 0.0,
  DISLIKE: -2.0,
};

/**
 * Multiplier when status is WATCHED (100% full evidence signal).
 */
export const TV_WATCHED_MULTIPLIER = 1.0;

/**
 * Multipliers when status is PARTIALLY_WATCHED.
 * Dropping a series with DISLIKE is a strong negative signal (-1.80).
 */
export const TV_PARTIAL_WATCHED_MULTIPLIERS: Record<RatingStatus, number> = {
  LOVE: 0.75, // +2.25
  LIKE: 0.70, // +1.05
  NEUTRAL: 0.60, // 0.0
  DISLIKE: 0.90, // -1.80
};

/**
 * TV Era Buckets based on firstAirDate year.
 */
export const TV_ERA_BUCKETS = [
  { key: "PRE_1990", label: "Klasik (1990 Öncesi)", minYear: 1900, maxYear: 1989 },
  { key: "1990S", label: "90'lar", minYear: 1990, maxYear: 1999 },
  { key: "2000S", label: "2000'ler", minYear: 2000, maxYear: 2009 },
  { key: "2010S", label: "2010'lar", minYear: 2010, maxYear: 2019 },
  { key: "2020S", label: "2020 ve Sonrası", minYear: 2020, maxYear: 2099 },
] as const;

/**
 * TV Profile Maturity Levels based on taste evidence count.
 */
export const TV_MATURITY_LEVELS = {
  INSUFFICIENT: { min: 0, max: 4, label: "Yetersiz", code: "INSUFFICIENT" },
  EARLY: { min: 5, max: 14, label: "Erken Aşama", code: "EARLY" },
  FORMING: { min: 15, max: 29, label: "Şekilleniyor", code: "FORMING" },
  ESTABLISHED: { min: 30, max: 74, label: "Belirgin", code: "ESTABLISHED" },
  STRONG: { min: 75, max: 149, label: "Güçlü", code: "STRONG" },
  VERY_STRONG: { min: 150, max: Infinity, label: "Çok Güçlü", code: "VERY_STRONG" },
} as const;

/**
 * Standard TV Genres recognized in TMDB and Filmprint.
 */
export const TV_CANONICAL_GENRES: { id: number; name: string }[] = [
  { id: 10759, name: "Aksiyon & Macera" },
  { id: 16, name: "Animasyon" },
  { id: 35, name: "Komedi" },
  { id: 80, name: "Suç" },
  { id: 99, name: "Belgesel" },
  { id: 18, name: "Dram" },
  { id: 10751, name: "Aile" },
  { id: 10762, name: "Çocuk" },
  { id: 9648, name: "Gizem" },
  { id: 10763, name: "Haber" },
  { id: 10764, name: "Reality" },
  { id: 10765, name: "Bilim Kurgu & Fantezi" },
  { id: 10766, name: "Pembe Dizi" },
  { id: 10767, name: "Talk Show" },
  { id: 10768, name: "Savaş & Politik" },
  { id: 37, name: "Vahşi Batı" },
];

/**
 * TV Archetype Definitions & Descriptions.
 */
export const TV_ARCHETYPE_DEFINITIONS = [
  {
    id: "PRESTIGE_DRAMA_SEEKER",
    name: "Prestij Drama Tutkunu",
    description: "Karakter derinliği yüksek, ödüllü ve eleştirmenlerce beğenilen dram dizilerine derin ilgi.",
    icon: "🎭",
  },
  {
    id: "MYSTERY_SOLVER",
    name: "Gizem Çözücü",
    description: "Katmanlı sırlar, suç soruşturmaları ve öngörülemez ters köşeler barındıran hikâyeleri arayan profil.",
    icon: "🔍",
  },
  {
    id: "COMFORT_SERIES_FAN",
    name: "Rahat İzleme Tutkunu",
    description: "Yorucu olmayan, samimi karakter ilişkileri ve sıcak atmosferiyle tekrar tekrar izlenebilen dizilerin adresi.",
    icon: "☕",
  },
  {
    id: "LONG_FORM_EXPLORER",
    name: "Uzun Soluklu Hikâye Kaşifi",
    description: "Birden fazla sezona yayılan, evreni genişleyen ve karakterleriyle birlikte yıllarca büyüyen yapımların tutkunu.",
    icon: "📚",
  },
  {
    id: "MINISERIES_SPECIALIST",
    name: "Mini Dizi Meraklısı",
    description: "Başlangıcı ve sonu net, sarkmayan, tek sezonda vurucu anlatım sunan kompakt mini dizileri tercih eden profil.",
    icon: "⏱️",
  },
  {
    id: "GLOBAL_SERIES_EXPLORER",
    name: "Global Dizi Kaşifi",
    description: "İngilizce dışı dünya sineması ve farklı coğrafyaların özgün kültürlerini ekrana taşıyan yapımlara açık zevk.",
    icon: "🌍",
  },
  {
    id: "DARK_STORY_SEEKER",
    name: "Karanlık Hikâye Tutkunu",
    description: "Gerilim dozu yüksek, ahlaki gri alanları keşfeden ve psikolojik derinliği olan karanlık temaların takipçisi.",
    icon: "🌑",
  },
  {
    id: "COMEDY_COMFORT_VIEWER",
    name: "Komedi Kaçamağı",
    description: "Zekice diyaloglar, durum komedileri ve dinamik sitcom formatlarıyla günün yorgunluğunu atan profil.",
    icon: "😄",
  },
  {
    id: "SCI_FI_WORLD_BUILDER",
    name: "Bilim Kurgu Evren Kaşifi",
    description: "Gelecek tasvirleri, zengin spekülatif evrenler ve felsefi bilim kurgu anlatılarına güçlü yönelim.",
    icon: "🚀",
  },
  {
    id: "PRESTIGE_NETWORK_FAN",
    name: "Prestij Yapım Takipçisi",
    description: "Yüksek prodüksiyon kalitesi, usta senaryolar ve sinematografik standartları yüksek platform yapımları tutkunu.",
    icon: "💎",
  },
] as const;
