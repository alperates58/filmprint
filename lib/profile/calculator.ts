import { RATING_WEIGHTS, ERA_BUCKETS, FILM_DNA_ALGORITHM_VERSION } from "./constants";
import {
  RawInteractionData,
  FilmDnaResult,
  GenrePreference,
  EraPreference,
  PopularityOrientation,
  FamiliarityPreference,
} from "./types";

/**
 * Pure, deterministic Film DNA calculator.
 * Takes interaction dataset and returns structured FilmDnaResult.
 */
export function calculateFilmDna(interactions: RawInteractionData[]): FilmDnaResult {
  const totalInteractions = interactions.length;
  const watchedInteractions = interactions.filter((i: any) => i.status === "WATCHED");
  const notWatchedInteractions = interactions.filter((i: any) => i.status === "NOT_WATCHED");
  const unsureInteractions = interactions.filter((i: any) => i.status === "UNSURE");

  const ratedMoviesCount = watchedInteractions.length;

  // 1. Calculate Confidence Level
  let confidence = 0.0;
  let confidenceLabel = "Çok Düşük";

  if (ratedMoviesCount >= 100) {
    confidence = Math.min(0.95 + (ratedMoviesCount - 100) * 0.001, 1.0);
    confidenceLabel = "Çok Yüksek";
  } else if (ratedMoviesCount >= 60) {
    confidence = 0.85 + (ratedMoviesCount - 60) * 0.0025;
    confidenceLabel = "Yüksek";
  } else if (ratedMoviesCount >= 30) {
    confidence = 0.65 + (ratedMoviesCount - 30) * 0.0067;
    confidenceLabel = "İyi";
  } else if (ratedMoviesCount >= 20) {
    confidence = 0.45 + (ratedMoviesCount - 20) * 0.02;
    confidenceLabel = "Orta";
  } else if (ratedMoviesCount >= 10) {
    confidence = 0.25 + (ratedMoviesCount - 10) * 0.02;
    confidenceLabel = "Düşük";
  } else {
    confidence = Math.max(0.05, ratedMoviesCount * 0.02);
    confidenceLabel = "Çok Düşük";
  }

  confidence = Math.round(confidence * 100) / 100;

  // 2. Genre Preference Scoring
  const genreStats: Record<string, { weightSum: number; ratedCount: number; exposureCount: number }> = {};

  interactions.forEach((item) => {
    const rawGenres = item.movie.metadata.genres || [];
    rawGenres.forEach((g) => {
      if (!genreStats[g]) {
        genreStats[g] = { weightSum: 0, ratedCount: 0, exposureCount: 0 };
      }
      genreStats[g].exposureCount += 1;

      if (item.status === "WATCHED" && item.rating) {
        genreStats[g].ratedCount += 1;
        genreStats[g].weightSum += RATING_WEIGHTS[item.rating] || 0;
      }
    });
  });

  const genreList: GenrePreference[] = Object.entries(genreStats)
    .map(([name, stat]) => {
      // Bayesian shrinkage score to balance small sample sizes
      const rawScore = (stat.weightSum + 1.0) / (stat.ratedCount + 2.0);
      const normalizedScore = Math.max(0, Math.min(1, (rawScore + 1) / 3.0));
      return {
        name,
        score: Math.round(normalizedScore * 100) / 100,
        ratedCount: stat.ratedCount,
        exposureCount: stat.exposureCount,
      };
    })
    .sort((a, b) => b.score - a.score || b.ratedCount - a.ratedCount);

  // 3. Era Preference Scoring
  const eraStats: Record<string, { label: string; weightSum: number; ratedCount: number }> = {};
  ERA_BUCKETS.forEach((b) => {
    eraStats[b.key] = { label: b.label, weightSum: 0, ratedCount: 0 };
  });

  watchedInteractions.forEach((item) => {
    const year = item.movie.releaseYear;
    if (year && item.rating) {
      const bucket = ERA_BUCKETS.find((b) => year >= b.minYear && year <= b.maxYear);
      if (bucket && eraStats[bucket.key]) {
        eraStats[bucket.key].ratedCount += 1;
        eraStats[bucket.key].weightSum += RATING_WEIGHTS[item.rating] || 0;
      }
    }
  });

  const eraList: EraPreference[] = ERA_BUCKETS.map((bucket) => {
    const stat = eraStats[bucket.key];
    const rawScore = stat.ratedCount > 0 ? (stat.weightSum + 1.0) / (stat.ratedCount + 2.0) : 0;
    const normalizedScore = stat.ratedCount > 0 ? Math.max(0, Math.min(1, (rawScore + 1) / 3.0)) : 0;

    return {
      key: bucket.key,
      label: bucket.label,
      score: Math.round(normalizedScore * 100) / 100,
      ratedCount: stat.ratedCount,
    };
  }).sort((a, b) => b.score - a.score || b.ratedCount - a.ratedCount);

  // 4. Popularity Orientation
  const positiveMovies = watchedInteractions.filter(
    (i) => i.rating === "LOVE" || i.rating === "LIKE"
  );

  let avgPopularity = 0;
  if (positiveMovies.length > 0) {
    const sumPop = positiveMovies.reduce((acc, curr) => acc + (curr.movie.popularity || 0), 0);
    avgPopularity = sumPop / positiveMovies.length;
  }

  let popOrientation: "mainstream" | "balanced" | "niche" = "balanced";
  let popLabel = "Dengeli Kataloğa Açık";

  if (avgPopularity >= 100) {
    popOrientation = "mainstream";
    popLabel = "Popüler & Ana Akım Odaklı";
  } else if (avgPopularity < 40) {
    popOrientation = "niche";
    popLabel = "Bağımsız & Niş Keşifçi";
  }

  const popularity: PopularityOrientation = {
    orientation: popOrientation,
    label: popLabel,
    avgPopularityScore: Math.round(avgPopularity * 10) / 10,
  };

  // 5. Familiarity Signal
  const totalDecided = ratedMoviesCount + notWatchedInteractions.length;
  const familiarityRatio = totalDecided > 0 ? ratedMoviesCount / totalDecided : 0;

  let famLabel: "high" | "balanced" | "discovery_heavy" = "balanced";
  let famDesc = "Dengeli İzleme & Keşif Oranı";

  if (familiarityRatio >= 0.7) {
    famLabel = "high";
    famDesc = "Yüksek İzleme Oranı ve Geniş Katalog Bilgisi";
  } else if (familiarityRatio < 0.35) {
    famLabel = "discovery_heavy";
    famDesc = "Keşfe Açık ve Seçici İzleme Profili";
  }

  const familiarity: FamiliarityPreference = {
    score: Math.round(familiarityRatio * 100) / 100,
    label: famLabel,
    description: famDesc,
  };

  // 6. Generate Archetype Traits (3 to 5 Traits)
  const traits: string[] = [];

  if (genreList.length > 0) {
    const top1 = genreList[0];
    if (top1.name === "Bilim Kurgu") traits.push("Bilim Kurgu Kaşifi");
    else if (top1.name === "Suç" || top1.name === "Gerilim") traits.push("Kült Suç & Polisiye Tutkunu");
    else if (top1.name === "Dram") traits.push("Prestij Dram Meraklısı");
    else if (top1.name === "Macera" || top1.name === "Aksiyon") traits.push("Aksiyon & Epik Macera Sever");
    else if (top1.name === "Animasyon" || top1.name === "Aile") traits.push("Animasyon & Hayal Gücü Tutkunu");
    else traits.push(`${top1.name} Odaklı`);
  }

  if (genreList.length > 1 && traits.length < 5) {
    const top2 = genreList[1];
    if (top2.score >= 0.5) {
      traits.push(`${top2.name} Tutkunu`);
    }
  }

  const topEra = eraList[0];
  if (topEra && topEra.ratedCount > 0 && traits.length < 5) {
    if (topEra.key === "2010s" || topEra.key === "2020s") {
      traits.push("Modern Sinema Eğilimli");
    } else if (topEra.key === "1990s" || topEra.key === "1980s") {
      traits.push("90'lar & Nostalji Tutkunu");
    } else if (topEra.key === "Before 1970" || topEra.key === "1970s") {
      traits.push("Klasik Sinema Sevdalısı");
    }
  }

  if (popularity.orientation === "mainstream" && traits.length < 5) {
    traits.push("Popüler Klasik Takipçisi");
  } else if (popularity.orientation === "niche" && traits.length < 5) {
    traits.push("Bağımsız Kataloğa Açık");
  }

  if (traits.length === 0) {
    traits.push("Film Tutkunu");
  }

  // 7. Deterministic Natural Turkish Summary
  const topGenreNames = genreList.slice(0, 2).map((g) => g.name);
  let summaryText = "";

  if (topGenreNames.length >= 2) {
    summaryText = `İzleme seçimlerinde ağırlıklı olarak **${topGenreNames[0]}** ve **${topGenreNames[1]}** türlerine yüksek ilgi gösteriyorsun.`;
  } else if (topGenreNames.length === 1) {
    summaryText = `İzleme seçimlerinde belirgin şekilde **${topGenreNames[0]}** türündeki yapımlara yüksek ilgi gösteriyorsun.`;
  } else {
    summaryText = "İzleme seçimlerinde dengeli bir film zevki sergiliyorsun.";
  }

  if (topEra && topEra.ratedCount > 0) {
    summaryText += ` **${topEra.label}** yapımlarına belirgin bir eğilimin var`;
  }

  summaryText += ` ve genel olarak **${popularity.label}** filmlerle güçlü bir bağ kuruyorsun.`;

  return {
    version: FILM_DNA_ALGORITHM_VERSION,
    generatedAt: new Date().toISOString(),
    confidence,
    confidenceLabel,
    sample: {
      totalInteractions,
      ratedMovies: ratedMoviesCount,
      watched: watchedInteractions.length,
      notWatched: notWatchedInteractions.length,
      unsure: unsureInteractions.length,
    },
    summary: summaryText,
    genres: genreList,
    eras: eraList,
    popularity,
    familiarity,
    traits,
  };
}
