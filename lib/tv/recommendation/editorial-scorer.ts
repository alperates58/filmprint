import type { PersonalizedTvRecommendationItem, TvHomeModuleItem } from "./types";

export interface TvEditorialCategoryDef {
  id: string;
  title: string;
  subtitle: string;
  filter: (item: PersonalizedTvRecommendationItem) => boolean;
  scoreBonus?: (item: PersonalizedTvRecommendationItem) => number;
}

export const TV_EDITORIAL_CATEGORIES: TvEditorialCategoryDef[] = [
  {
    id: "FOR_YOU",
    title: "Sana Özel TV Seçkisi",
    subtitle: "Dizi DNA profilinize en yüksek uyum gösteren yapımlar.",
    filter: (item) => item.matchScore >= 65,
  },
  {
    id: "MINISERIES",
    title: "Vurucu Mini Diziler",
    subtitle: "Tek sezonda başlayan ve biten, yüksek tempolu kompakt hikâyeler.",
    filter: (item) => {
      const seasons = item.tvShow.metadata?.numberOfSeasons;
      const status = item.tvShow.status || item.tvShow.metadata?.status;
      return seasons === 1 && (status === "Ended" || status === "Canceled");
    },
  },
  {
    id: "MYSTERY_CRIME",
    title: "Gizem & Suç Dosyaları",
    subtitle: "Katmanlı sırlar, suç soruşturmaları ve sürükleyici gerilimler.",
    filter: (item) => {
      const genres = item.tvShow.metadata?.genres || [];
      return genres.some((g) => ["Gizem", "Suç"].includes(g));
    },
  },
  {
    id: "GLOBAL_DISCOVERY",
    title: "Dünya Dizileri",
    subtitle: "Farklı kültürler, özgün diller ve küresel televizyon başarıları.",
    filter: (item) => {
      const lang = item.tvShow.originalLanguage;
      return lang !== null && lang !== undefined && lang !== "en";
    },
  },
  {
    id: "SHORT_EPISODES",
    title: "Kısa Bölümlükler (Yarım Saat)",
    subtitle: "Günün yorgunluğunu atan 20–35 dakikalık akıcı bölümler.",
    filter: (item) => {
      const rawRun = item.tvShow.metadata?.episodeRunTime ?? item.tvShow.metadata?.episode_run_time;
      let run: number | null = null;
      if (Array.isArray(rawRun) && rawRun.length > 0) run = rawRun[0];
      else if (typeof rawRun === "number") run = rawRun;
      return run !== null && run <= 35 && run > 0;
    },
  },
  {
    id: "LONG_RUNNING",
    title: "Uzun Soluklu Dünyalar",
    subtitle: "Karakterleriyle bağ kuracağınız 4+ sezonluk zengin evrenler.",
    filter: (item) => {
      const seasons = item.tvShow.metadata?.numberOfSeasons;
      return typeof seasons === "number" && seasons >= 4;
    },
  },
  {
    id: "COMPLETED_GEMS",
    title: "Final Yapmış Güçlü Diziler",
    subtitle: "Sonu belli, hikâyesi tamamlanmış yüksek puanlı yapımlar.",
    filter: (item) => {
      const status = item.tvShow.status || item.tvShow.metadata?.status;
      const vote = item.tvShow.voteAverage || 0;
      return (status === "Ended" || status === "Canceled") && vote >= 7.8;
    },
  },
];

/**
 * Builds editorial home modules with strict cross-row deduplication.
 * Prevents candidate duplication across rows.
 */
export function buildTvHomeEditorialModules(
  recommendations: PersonalizedTvRecommendationItem[],
  maxItemsPerRow: number = 8
): TvHomeModuleItem[] {
  const renderedShowCounts = new Map<string, number>();
  const modules: TvHomeModuleItem[] = [];

  for (const cat of TV_EDITORIAL_CATEGORIES) {
    const rowItems: PersonalizedTvRecommendationItem[] = [];

    for (const rec of recommendations) {
      const appearanceCount = renderedShowCounts.get(rec.tvShow.id) || 0;
      // Allow max 1 appearance (or 2 if it's the main FOR_YOU row)
      const maxAllowed = cat.id === "FOR_YOU" ? 2 : 1;

      if (appearanceCount < maxAllowed && cat.filter(rec)) {
        rowItems.push(rec);
        renderedShowCounts.set(rec.tvShow.id, appearanceCount + 1);

        if (rowItems.length >= maxItemsPerRow) {
          break;
        }
      }
    }

    if (rowItems.length >= 3) {
      modules.push({
        id: cat.id,
        title: cat.title,
        subtitle: cat.subtitle,
        type: "HORIZONTAL_ROW",
        items: rowItems,
      });
    }
  }

  return modules;
}
