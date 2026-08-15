import type { TvInteractionData } from "@/lib/tv/profile/types";

export interface TvQualityProfileFixture {
  id: string;
  name: string;
  archetype: string;
  maturity: string;
  targetMaturity: string;
  evidenceTarget: number;
  evaluatedTarget: number;
  corePreferences: {
    genres: string[];
    dislikedGenres: string[];
    seasons?: number[];
    runtimeRange?: [number, number];
    languages?: string[];
    networks?: string[];
    status?: string;
  };
}

export const TV_QUALITY_FIXTURES: TvQualityProfileFixture[] = [
  {
    id: "tv-prof-1-mystery-crime",
    name: "Gizem & Suç Dedektifi",
    archetype: "MYSTERY_SOLVER",
    maturity: "ESTABLISHED",
    targetMaturity: "ESTABLISHED",
    evidenceTarget: 40,
    evaluatedTarget: 50,
    corePreferences: {
      genres: ["Suç", "Gizem", "Dram"],
      dislikedGenres: ["Pembe Dizi", "Reality", "Talk Show"],
      seasons: [2, 3, 4],
      runtimeRange: [45, 60],
      languages: ["en", "de", "sv"],
      networks: ["hbo", "bbc", "fx"],
      status: "Ended",
    },
  },
  {
    id: "tv-prof-2-comedy-sitcom",
    name: "Komedi Kaçamağı",
    archetype: "COMEDY_COMFORT_VIEWER",
    maturity: "ESTABLISHED",
    targetMaturity: "ESTABLISHED",
    evidenceTarget: 35,
    evaluatedTarget: 45,
    corePreferences: {
      genres: ["Komedi"],
      dislikedGenres: ["Savaş & Politik", "Korku"],
      seasons: [3, 4, 5, 6, 7],
      runtimeRange: [20, 30],
      languages: ["en"],
      networks: ["nbc", "hulu"],
    },
  },
  {
    id: "tv-prof-3-prestige-drama",
    name: "Prestij Drama Tutkunu",
    archetype: "PRESTIGE_DRAMA_SEEKER",
    maturity: "STRONG",
    targetMaturity: "STRONG",
    evidenceTarget: 80,
    evaluatedTarget: 95,
    corePreferences: {
      genres: ["Dram", "Suç"],
      dislikedGenres: ["Pembe Dizi", "Reality", "Çocuk"],
      seasons: [3, 4, 5, 6],
      runtimeRange: [50, 65],
      languages: ["en"],
      networks: ["hbo", "amc", "showtime"],
      status: "Ended",
    },
  },
  {
    id: "tv-prof-4-sci-fi-fantasy",
    name: "Bilim Kurgu Evren Kaşifi",
    archetype: "SCI_FI_WORLD_BUILDER",
    maturity: "ESTABLISHED",
    targetMaturity: "ESTABLISHED",
    evidenceTarget: 30,
    evaluatedTarget: 40,
    corePreferences: {
      genres: ["Bilim Kurgu & Fantezi", "Gizem"],
      dislikedGenres: ["Pembe Dizi", "Reality"],
      seasons: [2, 3, 4],
      runtimeRange: [45, 65],
      languages: ["en", "de"],
    },
  },
  {
    id: "tv-prof-5-miniseries-specialist",
    name: "Mini Dizi Meraklısı",
    archetype: "MINISERIES_SPECIALIST",
    maturity: "FORMING",
    targetMaturity: "FORMING",
    evidenceTarget: 18,
    evaluatedTarget: 25,
    corePreferences: {
      genres: ["Dram", "Gizem", "Savaş & Politik"],
      dislikedGenres: ["Pembe Dizi"],
      seasons: [1],
      runtimeRange: [45, 75],
      status: "Ended",
    },
  },
  {
    id: "tv-prof-6-long-running-fan",
    name: "Uzun Soluklu Hikâye Kaşifi",
    archetype: "LONG_FORM_EXPLORER",
    maturity: "ESTABLISHED",
    targetMaturity: "ESTABLISHED",
    evidenceTarget: 45,
    evaluatedTarget: 60,
    corePreferences: {
      genres: ["Dram", "Aksiyon & Macera"],
      dislikedGenres: [],
      seasons: [5, 6, 7, 8, 9, 10],
      runtimeRange: [40, 50],
    },
  },
  {
    id: "tv-prof-7-global-explorer",
    name: "Global Dizi Kaşifi",
    archetype: "GLOBAL_SERIES_EXPLORER",
    maturity: "STRONG",
    targetMaturity: "STRONG",
    evidenceTarget: 75,
    evaluatedTarget: 90,
    corePreferences: {
      genres: ["Gizem", "Dram", "Suç"],
      dislikedGenres: [],
      languages: ["ko", "es", "de", "fr", "ja", "tr"],
      runtimeRange: [45, 70],
    },
  },
  {
    id: "tv-prof-8-anime-fan",
    name: "Anime Evren Kaşifi",
    archetype: "SCI_FI_WORLD_BUILDER",
    maturity: "ESTABLISHED",
    targetMaturity: "ESTABLISHED",
    evidenceTarget: 35,
    evaluatedTarget: 45,
    corePreferences: {
      genres: ["Animasyon", "Aksiyon & Macera", "Bilim Kurgu & Fantezi"],
      dislikedGenres: ["Pembe Dizi", "Reality"],
      languages: ["ja"],
      runtimeRange: [20, 26],
    },
  },
  {
    id: "tv-prof-9-classic-tv",
    name: "Klasik Dizi Sever",
    archetype: "COMFORT_SERIES_FAN",
    maturity: "ESTABLISHED",
    targetMaturity: "ESTABLISHED",
    evidenceTarget: 30,
    evaluatedTarget: 40,
    corePreferences: {
      genres: ["Dram", "Komedi", "Gizem"],
      dislikedGenres: [],
      runtimeRange: [40, 50],
    },
  },
  {
    id: "tv-prof-10-mainstream-pop",
    name: "Trend & Popüler Dizi İzleyicisi",
    archetype: "PRESTIGE_DRAMA_SEEKER",
    maturity: "ESTABLISHED",
    targetMaturity: "ESTABLISHED",
    evidenceTarget: 50,
    evaluatedTarget: 65,
    corePreferences: {
      genres: ["Dram", "Bilim Kurgu & Fantezi", "Aksiyon & Macera"],
      dislikedGenres: [],
      networks: ["hbo", "netflix", "apple tv"],
    },
  },
  {
    id: "tv-prof-11-discovery-niche",
    name: "Niş Keşifçi",
    archetype: "DARK_STORY_SEEKER",
    maturity: "FORMING",
    targetMaturity: "FORMING",
    evidenceTarget: 22,
    evaluatedTarget: 30,
    corePreferences: {
      genres: ["Dram", "Komedi"],
      dislikedGenres: ["Reality", "Pembe Dizi"],
      runtimeRange: [25, 45],
    },
  },
  {
    id: "tv-prof-12-power-user",
    name: "Dizi Gurmesi (Power User)",
    archetype: "PRESTIGE_DRAMA_SEEKER",
    maturity: "VERY_STRONG",
    targetMaturity: "VERY_STRONG",
    evidenceTarget: 250,
    evaluatedTarget: 320,
    corePreferences: {
      genres: ["Dram", "Suç", "Gizem", "Bilim Kurgu & Fantezi", "Komedi"],
      dislikedGenres: ["Pembe Dizi", "Reality"],
      languages: ["en", "de", "ko", "es", "ja"],
      networks: ["hbo", "fx", "apple tv", "bbc"],
    },
  },
  {
    id: "tv-prof-13-partial-heavy-user",
    name: "Yarım Bırakan İzleyici (Partial-Heavy)",
    archetype: "MYSTERY_SOLVER",
    maturity: "FORMING",
    targetMaturity: "FORMING",
    evidenceTarget: 20,
    evaluatedTarget: 60,
    corePreferences: {
      genres: ["Gizem", "Suç"],
      dislikedGenres: ["Komedi"],
    },
  },
  {
    id: "tv-prof-14-not-watched-heavy",
    name: "Geniş Aday Havuzlu İzleyici (Not-Watched Heavy)",
    archetype: "PRESTIGE_DRAMA_SEEKER",
    maturity: "STRONG",
    targetMaturity: "STRONG",
    evidenceTarget: 100,
    evaluatedTarget: 500,
    corePreferences: {
      genres: ["Dram", "Suç", "Aksiyon & Macera"],
      dislikedGenres: ["Reality"],
    },
  },
  {
    id: "tv-prof-15-low-evidence-user",
    name: "Başlangıç Seviyesi (Low Evidence)",
    archetype: "EXPLORING_VIEWER",
    maturity: "EARLY",
    targetMaturity: "EARLY",
    evidenceTarget: 5,
    evaluatedTarget: 8,
    corePreferences: {
      genres: ["Dram", "Gizem"],
      dislikedGenres: [],
    },
  },
  {
    id: "tv-prof-16-forming-user",
    name: "Gelişen Profil (Forming Profile)",
    archetype: "MYSTERY_SOLVER",
    maturity: "FORMING",
    targetMaturity: "FORMING",
    evidenceTarget: 15,
    evaluatedTarget: 20,
    corePreferences: {
      genres: ["Suç", "Gizem"],
      dislikedGenres: [],
    },
  },
];
