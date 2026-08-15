import {
  TV_DNA_SCHEMA_VERSION,
  TV_DNA_ALGORITHM_VERSION,
  TV_BASE_RATING_WEIGHTS,
  TV_WATCHED_MULTIPLIER,
  TV_PARTIAL_WATCHED_MULTIPLIERS,
  TV_ERA_BUCKETS,
  TV_CANONICAL_GENRES,
  TV_ARCHETYPE_DEFINITIONS,
  TV_MATURITY_LEVELS,
} from "./constants";
import type {
  TvInteractionData,
  TvDnaResult,
  TvGenreSignature,
  TvEraSignature,
  TvPopularityOrientation,
  TvFormatPreference,
  TvSeriesLengthPreference,
  TvEpisodeRuntimePreference,
  TvStatusPreference,
  TvInternationalOrientation,
  TvNetworkStyleOrientation,
  TvArchetypeResult,
  TvMaturityCode,
  TvGenreState,
} from "./types";

/**
 * Calculates effective taste weight for a TV interaction.
 * Taste evidence is strictly extracted from WATCHED and PARTIALLY_WATCHED with valid ratings.
 * NOT_WATCHED and UNSURE yield 0 evidence weight.
 */
export function calculateTvEffectiveWeight(
  status: string,
  rating: string | null
): { weight: number; isEvidence: boolean } {
  if (!rating || !TV_BASE_RATING_WEIGHTS[rating as keyof typeof TV_BASE_RATING_WEIGHTS] && rating !== "NEUTRAL") {
    return { weight: 0.0, isEvidence: false };
  }

  const baseWeight = TV_BASE_RATING_WEIGHTS[rating as keyof typeof TV_BASE_RATING_WEIGHTS] ?? 0.0;

  if (status === "WATCHED") {
    return {
      weight: Math.round(baseWeight * TV_WATCHED_MULTIPLIER * 100) / 100,
      isEvidence: true,
    };
  }

  if (status === "PARTIALLY_WATCHED") {
    const mult = TV_PARTIAL_WATCHED_MULTIPLIERS[rating as keyof typeof TV_PARTIAL_WATCHED_MULTIPLIERS] ?? 0.70;
    return {
      weight: Math.round(baseWeight * mult * 100) / 100,
      isEvidence: true,
    };
  }

  return { weight: 0.0, isEvidence: false };
}

/**
 * Pure, deterministic TV DNA Calculator.
 * Takes TV interactions and returns structured, canonical TvDnaResult.
 */
export function calculateTvTasteProfile(interactions: TvInteractionData[]): TvDnaResult {
  const evaluatedCount = interactions.length;

  // Filter evidence-bearing interactions
  const evidenceInteractions: Array<{
    item: TvInteractionData;
    effectiveWeight: number;
  }> = [];

  for (const item of interactions) {
    const { weight, isEvidence } = calculateTvEffectiveWeight(item.status, item.rating);
    if (isEvidence) {
      evidenceInteractions.push({ item, effectiveWeight: weight });
    }
  }

  const evidenceCount = evidenceInteractions.length;

  // 1. Calculate Maturity Level
  let maturity: TvMaturityCode = "INSUFFICIENT";
  let maturityLabel: string = TV_MATURITY_LEVELS.INSUFFICIENT.label;

  if (evidenceCount >= TV_MATURITY_LEVELS.VERY_STRONG.min) {
    maturity = "VERY_STRONG";
    maturityLabel = TV_MATURITY_LEVELS.VERY_STRONG.label;
  } else if (evidenceCount >= TV_MATURITY_LEVELS.STRONG.min) {
    maturity = "STRONG";
    maturityLabel = TV_MATURITY_LEVELS.STRONG.label;
  } else if (evidenceCount >= TV_MATURITY_LEVELS.ESTABLISHED.min) {
    maturity = "ESTABLISHED";
    maturityLabel = TV_MATURITY_LEVELS.ESTABLISHED.label;
  } else if (evidenceCount >= TV_MATURITY_LEVELS.FORMING.min) {
    maturity = "FORMING";
    maturityLabel = TV_MATURITY_LEVELS.FORMING.label;
  } else if (evidenceCount >= TV_MATURITY_LEVELS.EARLY.min) {
    maturity = "EARLY";
    maturityLabel = TV_MATURITY_LEVELS.EARLY.label;
  }

  // 2. Calculate Deterministic Confidence (0.05 to 1.0)
  let baseConfidence = 0.05;
  if (evidenceCount >= 150) {
    baseConfidence = Math.min(1.0, 0.95 + (evidenceCount - 150) * 0.0005);
  } else if (evidenceCount >= 75) {
    baseConfidence = 0.85 + (evidenceCount - 75) * 0.0013;
  } else if (evidenceCount >= 30) {
    baseConfidence = 0.65 + (evidenceCount - 30) * 0.0044;
  } else if (evidenceCount >= 15) {
    baseConfidence = 0.45 + (evidenceCount - 15) * 0.0133;
  } else if (evidenceCount >= 5) {
    baseConfidence = 0.20 + (evidenceCount - 5) * 0.025;
  } else {
    baseConfidence = Math.max(0.05, evidenceCount * 0.035);
  }

  const confidence = Math.round(baseConfidence * 100) / 100;
  let confidenceLabel = "Çok Düşük";
  if (confidence >= 0.85) confidenceLabel = "Çok Yüksek";
  else if (confidence >= 0.70) confidenceLabel = "Yüksek";
  else if (confidence >= 0.50) confidenceLabel = "İyi";
  else if (confidence >= 0.35) confidenceLabel = "Orta";
  else if (confidence >= 0.20) confidenceLabel = "Düşük";

  // 3. Genre Signatures with Unobserved State Handling
  const genreStats = new Map<
    string,
    { id: number; name: string; weightSum: number; ratedCount: number; exposureCount: number }
  >();

  // Initialize canonical genres
  for (const cg of TV_CANONICAL_GENRES) {
    genreStats.set(cg.name.toLowerCase(), {
      id: cg.id,
      name: cg.name,
      weightSum: 0,
      ratedCount: 0,
      exposureCount: 0,
    });
  }

  // Track exposure across all evaluated items
  for (const item of interactions) {
    const rawGenres = item.tvShow.metadata?.genres || [];
    const genreNames = rawGenres.map((g) => (typeof g === "string" ? g : g.name || "")).filter(Boolean);

    for (const gName of genreNames) {
      const key = gName.toLowerCase();
      const existing = genreStats.get(key);
      if (existing) {
        existing.exposureCount += 1;
      } else {
        genreStats.set(key, {
          id: 0,
          name: gName,
          weightSum: 0,
          ratedCount: 0,
          exposureCount: 1,
        });
      }
    }
  }

  // Aggregate taste evidence
  for (const { item, effectiveWeight } of evidenceInteractions) {
    const rawGenres = item.tvShow.metadata?.genres || [];
    const genreNames = rawGenres.map((g) => (typeof g === "string" ? g : g.name || "")).filter(Boolean);

    for (const gName of genreNames) {
      const key = gName.toLowerCase();
      const existing = genreStats.get(key);
      if (existing) {
        existing.ratedCount += 1;
        existing.weightSum += effectiveWeight;
      }
    }
  }

  const genreSignatures: TvGenreSignature[] = Array.from(genreStats.values()).map((stat) => {
    if (stat.exposureCount === 0 && stat.ratedCount === 0) {
      return {
        genreId: stat.id,
        name: stat.name,
        score: -1.0,
        exposure: 0,
        ratedCount: 0,
        confidence: 0.0,
        state: "UNOBSERVED" as TvGenreState,
      };
    }

    if (stat.ratedCount === 0) {
      return {
        genreId: stat.id,
        name: stat.name,
        score: 0.50,
        exposure: stat.exposureCount,
        ratedCount: 0,
        confidence: 0.0,
        state: "NEUTRAL" as TvGenreState,
      };
    }

    // Bayesian shrinkage score
    const rawScore = (stat.weightSum + 1.0) / (stat.ratedCount + 2.0);
    const normalizedScore = Math.max(0.0, Math.min(1.0, (rawScore + 1.0) / 3.0));
    const genreConf = Math.min(1.0, stat.ratedCount / 8.0);

    let state: TvGenreState = "NEUTRAL";
    if (normalizedScore >= 0.62 && stat.ratedCount >= 1) {
      state = "POSITIVE";
    } else if (normalizedScore <= 0.38 && stat.ratedCount >= 1) {
      state = "NEGATIVE";
    }

    return {
      genreId: stat.id,
      name: stat.name,
      score: Math.round(normalizedScore * 100) / 100,
      exposure: stat.exposureCount,
      ratedCount: stat.ratedCount,
      confidence: Math.round(genreConf * 100) / 100,
      state,
    };
  });

  // Sort genres: POSITIVE (by score desc), then NEUTRAL (by exposure desc), then NEGATIVE, then UNOBSERVED
  genreSignatures.sort((a, b) => {
    const orderMap: Record<TvGenreState, number> = {
      POSITIVE: 1,
      NEUTRAL: 2,
      NEGATIVE: 3,
      UNOBSERVED: 4,
    };
    if (orderMap[a.state] !== orderMap[b.state]) {
      return orderMap[a.state] - orderMap[b.state];
    }
    return b.score - a.score || b.ratedCount - a.ratedCount || b.exposure - a.exposure;
  });

  // 4. Era Signatures (firstAirDate)
  const eraStats = new Map<string, { key: string; label: string; weightSum: number; ratedCount: number; exposure: number }>();
  for (const b of TV_ERA_BUCKETS) {
    eraStats.set(b.key, { key: b.key, label: b.label, weightSum: 0, ratedCount: 0, exposure: 0 });
  }

  for (const item of interactions) {
    const yearStr = item.tvShow.firstAirDate?.slice(0, 4);
    const year = yearStr ? parseInt(yearStr, 10) : null;
    if (year && !isNaN(year)) {
      const bucket = TV_ERA_BUCKETS.find((b) => year >= b.minYear && year <= b.maxYear);
      if (bucket) {
        const stat = eraStats.get(bucket.key);
        if (stat) stat.exposure += 1;
      }
    }
  }

  for (const { item, effectiveWeight } of evidenceInteractions) {
    const yearStr = item.tvShow.firstAirDate?.slice(0, 4);
    const year = yearStr ? parseInt(yearStr, 10) : null;
    if (year && !isNaN(year)) {
      const bucket = TV_ERA_BUCKETS.find((b) => year >= b.minYear && year <= b.maxYear);
      if (bucket) {
        const stat = eraStats.get(bucket.key);
        if (stat) {
          stat.ratedCount += 1;
          stat.weightSum += effectiveWeight;
        }
      }
    }
  }

  const eraSignatures: TvEraSignature[] = Array.from(eraStats.values()).map((stat) => {
    const rawScore = stat.ratedCount > 0 ? (stat.weightSum + 1.0) / (stat.ratedCount + 2.0) : 0;
    const normalizedScore = stat.ratedCount > 0 ? Math.max(0.0, Math.min(1.0, (rawScore + 1.0) / 3.0)) : 0.0;
    const eraConf = Math.min(1.0, stat.ratedCount / 5.0);

    return {
      key: stat.key,
      label: stat.label,
      score: Math.round(normalizedScore * 100) / 100,
      exposure: stat.exposure,
      ratedCount: stat.ratedCount,
      confidence: Math.round(eraConf * 100) / 100,
    };
  });

  // 5. Popularity Orientation
  let popWeightedSum = 0;
  let popWeightTotal = 0;

  for (const { item, effectiveWeight } of evidenceInteractions) {
    if (effectiveWeight > 0) {
      const pop = item.tvShow.popularity || 20;
      popWeightedSum += pop * effectiveWeight;
      popWeightTotal += effectiveWeight;
    }
  }

  const avgLikedPop = popWeightTotal > 0 ? popWeightedSum / popWeightTotal : 50;
  let popOrientation: "MAINSTREAM" | "BALANCED" | "DISCOVERY_ORIENTED" = "BALANCED";
  let popLabel = "Dengeli Keşif";
  let popDesc = "Hem popüler dizi gündemini hem de niş ve özgün yapımları dengeli izliyorsun.";

  if (avgLikedPop >= 65) {
    popOrientation = "MAINSTREAM";
    popLabel = "Popüler / Trend Odaklı";
    popDesc = "Gündemdeki, yüksek izleyici kitlesine ulaşan popüler dizilere öncelik veriyorsun.";
  } else if (avgLikedPop <= 35) {
    popOrientation = "DISCOVERY_ORIENTED";
    popLabel = "Özgün / Niş Keşif";
    popDesc = "Ana akımın dışındaki saklı cevherleri ve özgün yapımları keşfetmeye yatkınsın.";
  }

  const popularityOrientation: TvPopularityOrientation = {
    orientation: popOrientation,
    score: Math.round(avgLikedPop * 10) / 10,
    label: popLabel,
    description: popDesc,
  };

  // 6. Format Preference (MINISERIES, MULTI_SEASON, LONG_RUNNING)
  let miniseriesSum = 0;
  let miniseriesCount = 0;
  let multiSeasonSum = 0;
  let multiSeasonCount = 0;
  let longRunningSum = 0;
  let longRunningCount = 0;

  for (const { item, effectiveWeight } of evidenceInteractions) {
    const seasons = item.tvShow.metadata?.numberOfSeasons ?? null;
    const status = item.tvShow.status || item.tvShow.metadata?.status;
    const rawGenres = item.tvShow.metadata?.genres || [];
    const isMiniseries =
      seasons === 1 && (status === "Ended" || status === "Canceled" || status === "Ended");

    if (isMiniseries || seasons === 1) {
      miniseriesSum += effectiveWeight;
      miniseriesCount++;
    } else if (seasons && seasons >= 2 && seasons <= 4) {
      multiSeasonSum += effectiveWeight;
      multiSeasonCount++;
    } else if (seasons && seasons >= 5) {
      longRunningSum += effectiveWeight;
      longRunningCount++;
    }
  }

  const calcFormatScore = (sum: number, count: number) => {
    if (count === 0) return 0.5;
    const raw = (sum + 1.0) / (count + 2.0);
    return Math.max(0.0, Math.min(1.0, (raw + 1.0) / 3.0));
  };

  const miniScore = calcFormatScore(miniseriesSum, miniseriesCount);
  const multiScore = calcFormatScore(multiSeasonSum, multiSeasonCount);
  const longScore = calcFormatScore(longRunningSum, longRunningCount);

  let formatPref: "MINISERIES" | "MULTI_SEASON" | "LONG_RUNNING" | "FLEXIBLE" = "FLEXIBLE";
  let formatDesc = "Farklı dizi formatlarına dengeli bir yaklaşımın var.";

  if (miniScore >= 0.65 && miniScore > multiScore && miniScore > longScore && miniseriesCount >= 2) {
    formatPref = "MINISERIES";
    formatDesc = "Tek sezonda başlayan ve biten, sarkmayan vurucu mini dizilere daha yakınsın.";
  } else if (multiScore >= 0.60 && multiScore >= miniScore && multiScore > longScore && multiSeasonCount >= 2) {
    formatPref = "MULTI_SEASON";
    formatDesc = "2–4 sezon arası derinleşen ama gereksiz uzamayan dengeli dizileri seviyorsun.";
  } else if (longScore >= 0.65 && longScore > multiScore && longRunningCount >= 2) {
    formatPref = "LONG_RUNNING";
    formatDesc = "5 sezon ve üzeri, dünyası genişleyen uzun soluklu dizilere güçlü ilgin var.";
  }

  const formatPreference: TvFormatPreference = {
    preference: formatPref,
    miniseriesScore: Math.round(miniScore * 100) / 100,
    multiSeasonScore: Math.round(multiScore * 100) / 100,
    longRunningScore: Math.round(longScore * 100) / 100,
    description: formatDesc,
  };

  // 7. Series Length Preference
  let totalLikedSeasons = 0;
  let likedSeasonsCount = 0;

  for (const { item, effectiveWeight } of evidenceInteractions) {
    if (effectiveWeight > 0) {
      const seasons = item.tvShow.metadata?.numberOfSeasons;
      if (typeof seasons === "number" && seasons > 0) {
        totalLikedSeasons += seasons;
        likedSeasonsCount++;
      }
    }
  }

  const avgSeasons = likedSeasonsCount > 0 ? totalLikedSeasons / likedSeasonsCount : 2.5;
  let seriesLengthPref: "SHORT" | "MEDIUM" | "LONG" | "VERY_LONG" | "BALANCED" = "BALANCED";
  let seriesLengthDesc = "Farklı sezon uzunluklarındaki yapımları izlemeye açıksın.";

  if (likedSeasonsCount >= 2) {
    if (avgSeasons <= 1.5) {
      seriesLengthPref = "SHORT";
      seriesLengthDesc = "Ortalama 1–2 sezonluk kısa yapımlarda memnuniyetin daha yüksek.";
    } else if (avgSeasons <= 4.2) {
      seriesLengthPref = "MEDIUM";
      seriesLengthDesc = "Ortalama 2–4 sezonluk ideal derinlikteki diziler profiline tam uyuyor.";
    } else if (avgSeasons <= 8.0) {
      seriesLengthPref = "LONG";
      seriesLengthDesc = "Ortalama 5–8 sezonluk zengin hikâyeli yapımları istikrarlı takip ediyorsun.";
    } else {
      seriesLengthPref = "VERY_LONG";
      seriesLengthDesc = "9 sezon ve üzeri geniş evrenli devasa dizilerde güçlü zevk sinyallerin var.";
    }
  }

  const seriesLengthPreference: TvSeriesLengthPreference = {
    preference: seriesLengthPref,
    avgSeasons: Math.round(avgSeasons * 10) / 10,
    description: seriesLengthDesc,
  };

  // 8. Episode Runtime Preference
  let totalRuntimeMinutes = 0;
  let runtimeCount = 0;
  const runtimeBuckets = { SHORT: 0, STANDARD: 0, LONG: 0, EXTRA_LONG: 0 };

  for (const { item, effectiveWeight } of evidenceInteractions) {
    if (effectiveWeight > 0) {
      const rawRun = item.tvShow.metadata?.episodeRunTime ?? item.tvShow.metadata?.episode_run_time;
      let runtimeMin: number | null = null;

      if (Array.isArray(rawRun) && rawRun.length > 0 && typeof rawRun[0] === "number") {
        runtimeMin = rawRun[0];
      } else if (typeof rawRun === "number") {
        runtimeMin = rawRun;
      }

      if (runtimeMin && runtimeMin > 0) {
        totalRuntimeMinutes += runtimeMin;
        runtimeCount++;

        if (runtimeMin <= 30) runtimeBuckets.SHORT++;
        else if (runtimeMin <= 50) runtimeBuckets.STANDARD++;
        else if (runtimeMin <= 70) runtimeBuckets.LONG++;
        else runtimeBuckets.EXTRA_LONG++;
      }
    }
  }

  const avgMinutes = runtimeCount > 0 ? Math.round(totalRuntimeMinutes / runtimeCount) : null;
  let runtimePref: "SHORT" | "STANDARD" | "LONG" | "EXTRA_LONG" | "FLEXIBLE" = "FLEXIBLE";
  let runtimeDesc = "Bölüm süresinden bağımsız olarak hikâyenin kalitesine odaklanıyorsun.";

  if (runtimeCount >= 2 && avgMinutes) {
    if (avgMinutes <= 30) {
      runtimePref = "SHORT";
      runtimeDesc = "20–30 dakikalık dinamik ve akıcı bölümleri tercih ediyorsun.";
    } else if (avgMinutes <= 50) {
      runtimePref = "STANDARD";
      runtimeDesc = "40–50 dakikalık standart televizyon formatı senin için ideal.";
    } else if (avgMinutes <= 70) {
      runtimePref = "LONG";
      runtimeDesc = "50–65 dakikalık sinematik, derinlikli bölümlere yatkınsın.";
    } else {
      runtimePref = "EXTRA_LONG";
      runtimeDesc = "70 dakika ve üzeri film tadında uzun bölümleri seviyorsun.";
    }
  }

  const episodeRuntimePreference: TvEpisodeRuntimePreference = {
    preference: runtimePref,
    avgMinutes,
    description: runtimeDesc,
  };

  // 9. Status Preference (Ended vs Returning)
  let endedSum = 0;
  let endedCount = 0;
  let returningSum = 0;
  let returningCount = 0;

  for (const { item, effectiveWeight } of evidenceInteractions) {
    const status = item.tvShow.status || item.tvShow.metadata?.status;
    if (status === "Ended" || status === "Canceled") {
      endedSum += effectiveWeight;
      endedCount++;
    } else if (status === "Returning Series" || status === "In Production") {
      returningSum += effectiveWeight;
      returningCount++;
    }
  }

  const endedScore = calcFormatScore(endedSum, endedCount);
  const returningScore = calcFormatScore(returningSum, returningCount);

  let statusPref: "ENDED" | "RETURNING" | "LIMITED" | "FLEXIBLE" = "FLEXIBLE";
  let statusDesc = "Hem final yapmış hem de devam eden dizileri takip etmeye açıksın.";

  if (endedCount >= 2 && endedScore >= 0.65 && endedScore > returningScore) {
    statusPref = "ENDED";
    statusDesc = "Final yapmış, sonu belli olan dizilerde memnuniyetin daha belirgin.";
  } else if (returningCount >= 2 && returningScore >= 0.65 && returningScore > endedScore) {
    statusPref = "RETURNING";
    statusDesc = "Devam eden dizilerin güncel heyecanını ve sezon aralarını takip etmeyi seviyorsun.";
  }

  const statusPreference: TvStatusPreference = {
    preference: statusPref,
    endedScore: Math.round(endedScore * 100) / 100,
    returningScore: Math.round(returningScore * 100) / 100,
    description: statusDesc,
  };

  // 10. International Orientation
  let nonEnglishPositiveCount = 0;
  let englishPositiveCount = 0;
  const langCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};

  for (const { item, effectiveWeight } of evidenceInteractions) {
    if (effectiveWeight > 0) {
      const lang = item.tvShow.originalLanguage || "en";
      langCounts[lang] = (langCounts[lang] || 0) + 1;

      const rawCountries = item.tvShow.metadata?.originCountry ?? item.tvShow.metadata?.origin_country;
      if (Array.isArray(rawCountries)) {
        rawCountries.forEach((c) => {
          if (typeof c === "string") countryCounts[c] = (countryCounts[c] || 0) + 1;
        });
      } else if (typeof rawCountries === "string") {
        countryCounts[rawCountries] = (countryCounts[rawCountries] || 0) + 1;
      }

      if (lang !== "en") {
        nonEnglishPositiveCount++;
      } else {
        englishPositiveCount++;
      }
    }
  }

  const totalPositive = nonEnglishPositiveCount + englishPositiveCount;
  const nonEnglishRatio = totalPositive > 0 ? nonEnglishPositiveCount / totalPositive : 0.0;

  let intOrientation: "LOCAL_LANGUAGE" | "ENGLISH_LANGUAGE" | "INTERNATIONAL_NON_ENGLISH" | "GLOBAL_EXPLORER" =
    "ENGLISH_LANGUAGE";
  let intDesc = "Ağırlıklı olarak İngilizce ve ana akım küresel yapımları tercih ediyorsun.";

  if (nonEnglishRatio >= 0.40 && totalPositive >= 3) {
    intOrientation = "GLOBAL_EXPLORER";
    intDesc = "İngilizce dışı dünya yapımlarına (Kore, İspanya, İskandinav, vb.) güçlü şekilde açıksın.";
  } else if (nonEnglishRatio >= 0.25 && totalPositive >= 2) {
    intOrientation = "INTERNATIONAL_NON_ENGLISH";
    intDesc = "Farklı dillerdeki özgün yabancı dizileri keşfetmeye yatkın bir zevkin var.";
  }

  const internationalOrientation: TvInternationalOrientation = {
    orientation: intOrientation,
    nonEnglishRatio: Math.round(nonEnglishRatio * 100) / 100,
    topLanguages: Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0])
      .slice(0, 3),
    topCountries: Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0])
      .slice(0, 3),
    description: intDesc,
  };

  // 11. Network Style Orientation (Prestige / Production)
  let prestigeHits = 0;
  let networkEvidenceCount = 0;
  const prestigeKeywords = ["hbo", "fx", "apple tv", "bbc", "amc", "showtime", "hulu"];

  for (const { item, effectiveWeight } of evidenceInteractions) {
    if (effectiveWeight > 0) {
      const networks = item.tvShow.metadata?.networks || [];
      const prodCompanies =
        item.tvShow.metadata?.productionCompanies ||
        item.tvShow.metadata?.production_companies ||
        [];

      const names = [
        ...networks.map((n) => n.name?.toLowerCase() || ""),
        ...prodCompanies.map((p) => p.name?.toLowerCase() || ""),
      ];

      const isPrestige = names.some((n) => prestigeKeywords.some((pk) => n.includes(pk)));
      if (isPrestige) prestigeHits++;
      if (names.length > 0) networkEvidenceCount++;
    }
  }

  const hasNetworkEvidence = networkEvidenceCount >= 4;
  const prestigeRatio = networkEvidenceCount > 0 ? prestigeHits / networkEvidenceCount : 0;
  let networkStyle: string | null = null;
  let networkDesc = "Henüz belirgin bir yapımcı veya kanal eğilimi saptanmadı.";

  if (hasNetworkEvidence && prestigeRatio >= 0.50) {
    networkStyle = "PRESTIGE_PRODUCTION";
    networkDesc = "Yüksek prodüksiyonlu, eleştirmen standardı yüksek prestij platform yapımlarına yönelimlisin.";
  }

  const networkStyleOrientation: TvNetworkStyleOrientation = {
    hasSufficientEvidence: hasNetworkEvidence,
    dominantStyle: networkStyle,
    description: networkDesc,
  };

  // 12. TV Archetypes Evaluation (Multi-Signal Scoring)
  const candidateArchetypes: Array<{
    id: string;
    name: string;
    score: number;
    evidenceCount: number;
    confidence: number;
    description: string;
    icon: string;
  }> = [];

  const getGenreScore = (name: string): number => {
    const found = genreSignatures.find((g) => g.name.toLowerCase().includes(name.toLowerCase()));
    return found && found.state !== "UNOBSERVED" ? found.score : 0.0;
  };

  const getGenreRated = (name: string): number => {
    const found = genreSignatures.find((g) => g.name.toLowerCase().includes(name.toLowerCase()));
    return found ? found.ratedCount : 0;
  };

  for (const arch of TV_ARCHETYPE_DEFINITIONS) {
    let rawScore = 0;
    let archEvidence = 0;

    switch (arch.id) {
      case "PRESTIGE_DRAMA_SEEKER": {
        const dramaScore = getGenreScore("Dram");
        const dramaRated = getGenreRated("Dram");
        const multiBonus = formatPreference.multiSeasonScore > 0.6 ? 20 : 0;
        const prestigeBonus = prestigeRatio >= 0.4 ? 20 : 0;
        rawScore = dramaScore * 60 + multiBonus + prestigeBonus;
        archEvidence = dramaRated;
        break;
      }
      case "MYSTERY_SOLVER": {
        const mysteryScore = getGenreScore("Gizem");
        const crimeScore = getGenreScore("Suç");
        rawScore = Math.max(mysteryScore, crimeScore) * 70 + (mysteryScore > 0.6 && crimeScore > 0.6 ? 30 : 0);
        archEvidence = getGenreRated("Gizem") + getGenreRated("Suç");
        break;
      }
      case "COMFORT_SERIES_FAN": {
        const comedyScore = getGenreScore("Komedi");
        const familyScore = getGenreScore("Aile");
        const runtimeBonus = episodeRuntimePreference.preference === "SHORT" ? 20 : 0;
        rawScore = Math.max(comedyScore, familyScore) * 70 + runtimeBonus;
        archEvidence = getGenreRated("Komedi") + getGenreRated("Aile");
        break;
      }
      case "LONG_FORM_EXPLORER": {
        const longScore = formatPreference.longRunningScore;
        const lengthBonus = seriesLengthPreference.preference === "LONG" || seriesLengthPreference.preference === "VERY_LONG" ? 30 : 0;
        rawScore = longScore * 70 + lengthBonus;
        archEvidence = longRunningCount;
        break;
      }
      case "MINISERIES_SPECIALIST": {
        const miniScoreVal = formatPreference.miniseriesScore;
        const miniBonus = formatPreference.preference === "MINISERIES" ? 30 : 0;
        rawScore = miniScoreVal * 70 + miniBonus;
        archEvidence = miniseriesCount;
        break;
      }
      case "GLOBAL_SERIES_EXPLORER": {
        rawScore = Math.min(100, nonEnglishRatio * 100 + (nonEnglishPositiveCount >= 3 ? 20 : 0));
        archEvidence = nonEnglishPositiveCount;
        break;
      }
      case "DARK_STORY_SEEKER": {
        const crimeScore = getGenreScore("Suç");
        const mysteryScore = getGenreScore("Gizem");
        const dramaScore = getGenreScore("Dram");
        rawScore = (crimeScore * 0.4 + mysteryScore * 0.4 + dramaScore * 0.2) * 100;
        archEvidence = getGenreRated("Suç") + getGenreRated("Gizem");
        break;
      }
      case "COMEDY_COMFORT_VIEWER": {
        const comedyScore = getGenreScore("Komedi");
        const shortBonus = (episodeRuntimePreference.avgMinutes && episodeRuntimePreference.avgMinutes <= 35) ? 25 : 0;
        rawScore = comedyScore * 75 + shortBonus;
        archEvidence = getGenreRated("Komedi");
        break;
      }
      case "SCI_FI_WORLD_BUILDER": {
        const sciFiScore = getGenreScore("Bilim Kurgu");
        rawScore = sciFiScore * 100;
        archEvidence = getGenreRated("Bilim Kurgu");
        break;
      }
      case "PRESTIGE_NETWORK_FAN": {
        rawScore = Math.min(100, prestigeRatio * 80 + (prestigeHits >= 2 ? 20 : 0));
        archEvidence = prestigeHits;
        break;
      }
    }

    const clampedScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    const archConf = Math.min(1.0, archEvidence / 6.0);

    if (clampedScore >= 45 && archEvidence >= 1) {
      candidateArchetypes.push({
        id: arch.id,
        name: arch.name,
        score: clampedScore,
        evidenceCount: archEvidence,
        confidence: Math.round(archConf * 100) / 100,
        description: arch.description,
        icon: arch.icon,
      });
    }
  }

  // Sort and select max 3 archetypes (2 primary, 1 secondary)
  candidateArchetypes.sort((a, b) => b.score - a.score || b.evidenceCount - a.evidenceCount);
  const selectedArchetypes: TvArchetypeResult[] = candidateArchetypes.slice(0, 3).map((arch, idx) => ({
    ...arch,
    isPrimary: idx < 2,
  }));

  // Fallback archetype if evidence is low
  if (selectedArchetypes.length === 0) {
    const topPositiveGenre = genreSignatures.find((g) => g.state === "POSITIVE");
    if (topPositiveGenre) {
      selectedArchetypes.push({
        id: "EARLY_EXPLORER",
        name: `${topPositiveGenre.name} Meraklısı`,
        score: 65,
        evidenceCount: topPositiveGenre.ratedCount,
        confidence: 0.3,
        description: `${topPositiveGenre.name} türündeki dizilere pozitif sinyaller veriyorsun.`,
        icon: "✨",
        isPrimary: true,
      });
    } else {
      selectedArchetypes.push({
        id: "EXPLORING_VIEWER",
        name: "Keşif Yolcusu",
        score: 50,
        evidenceCount: evidenceCount,
        confidence: 0.2,
        description: "Dizi zevkin değerlendirdiğin yeni yapımlarla şekillenmeye devam ediyor.",
        icon: "🧭",
        isPrimary: true,
      });
    }
  }

  // 13. Deterministic Human Insights Generation (Template-based, No LLM)
  const humanInsights: string[] = [];

  const topPosGenres = genreSignatures.filter((g) => g.state === "POSITIVE");
  if (topPosGenres.length > 0) {
    const names = topPosGenres.slice(0, 2).map((g) => g.name).join(" ve ");
    humanInsights.push(`${names} türlerinde belirgin bir beğeni yoğunlaşman var.`);
  }

  if (formatPreference.preference === "MINISERIES") {
    humanInsights.push("Mini dizileri uzun soluklu yapımlara göre daha sık ve yüksek puanla izliyorsun.");
  } else if (formatPreference.preference === "LONG_RUNNING") {
    humanInsights.push("Karakterleriyle yıllar boyu bağ kurabildiğin çok sezonlu dizileri seviyorsun.");
  }

  if (episodeRuntimePreference.avgMinutes && episodeRuntimePreference.avgMinutes <= 35) {
    humanInsights.push("Bölüm sürelerinde akıcı, yarım saatlik dinamik formatlara yöneliyorsun.");
  } else if (episodeRuntimePreference.avgMinutes && episodeRuntimePreference.avgMinutes >= 55) {
    humanInsights.push("Sinematik derinliği olan 50+ dakikalık uzun bölümler senin için ideal.");
  }

  if (internationalOrientation.orientation === "GLOBAL_EXPLORER" || internationalOrientation.orientation === "INTERNATIONAL_NON_ENGLISH") {
    humanInsights.push("İngilizce dışındaki dünya yapımlarına güçlü şekilde açıksın.");
  }

  if (statusPreference.preference === "ENDED") {
    humanInsights.push("Final yapmış dizilere daha yakınsın; hikâyenin tamamlanmış olması senin için önemli.");
  }

  return {
    schemaVersion: TV_DNA_SCHEMA_VERSION,
    algorithmVersion: TV_DNA_ALGORITHM_VERSION,
    generatedAt: new Date().toISOString(),

    evaluatedCount,
    evidenceCount,

    confidence,
    confidenceLabel,

    maturity,
    maturityLabel,

    genres: genreSignatures,
    eras: eraSignatures,
    popularityOrientation,
    formatPreference,
    seriesLengthPreference,
    episodeRuntimePreference,
    statusPreference,
    internationalOrientation,
    networkStyleOrientation,

    archetypes: selectedArchetypes,
    humanInsights,
  };
}
