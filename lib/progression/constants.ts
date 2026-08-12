import type { RankDefinition } from "./types.ts";

export const RANK_DEFINITIONS: RankDefinition[] = [
  {
    key: "BEGINNER",
    label: "Başlangıç",
    minimum: 0,
    description: "Film zevkinin ilk sinyalleri toplanıyor.",
    badgeIcon: "🌱",
  },
  {
    key: "VIEWER",
    label: "İzleyici",
    minimum: 30,
    description: "İlk Film DNA profilin oluştu.",
    badgeIcon: "🎬",
  },
  {
    key: "CINEPHILE",
    label: "Sinefil",
    minimum: 100,
    description: "Tür ve dönem tercihlerin belirginleşti.",
    badgeIcon: "🍿",
  },
  {
    key: "CURATOR",
    label: "Küratör",
    minimum: 250,
    description: "Zevk profilin artık daha ince ayrımları yakalıyor.",
    badgeIcon: "🏛️",
  },
  {
    key: "ARCHIVIST",
    label: "Arşivci",
    minimum: 500,
    description: "Geniş bir film kataloğu üzerinden güçlü sinyaller oluştu.",
    badgeIcon: "📜",
  },
  {
    key: "MASTER_CINEPHILE",
    label: "Usta Sinefil",
    minimum: 1000,
    description: "Film DNA'n oldukça güçlü ve detaylı.",
    badgeIcon: "👑",
  },
  {
    key: "FILMPRINT_LEGEND",
    label: "Filmprint Legend",
    minimum: 2500,
    description: "Filmprint kataloğunda olağanüstü geniş bir iz bıraktın.",
    badgeIcon: "🏆",
  },
];
