import { RATING_WEIGHTS, ERA_BUCKETS, FILM_DNA_ALGORITHM_VERSION } from "./constants";
import type {
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
      if (stat.ratedCount === 0) {
        return {
          name,
          score: 0.50,
          ratedCount: 0,
          exposureCount: stat.exposureCount,
        };
      }

      // Bayesian shrinkage score spanning [-2.0, +3.0] (5.0 range)
      const smoothedWeight = (stat.weightSum + 2.0) / (stat.ratedCount + 2.0);
      const satisfactionScore = Math.max(0.05, Math.min(0.98, (smoothedWeight + 2.0) / 5.0));

      // Damped volume curve: scales affinity realistically with evidence depth
      const volumeFactor = 0.88 + 0.12 * Math.min(1.0, Math.log10(stat.ratedCount + 1) / Math.log10(25));
      const normalizedScore = Math.round(satisfactionScore * volumeFactor * 100) / 100;

      return {
        name,
        score: normalizedScore,
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
    if (stat.ratedCount === 0) {
      return {
        key: bucket.key,
        label: bucket.label,
        score: 0,
        ratedCount: 0,
      };
    }

    const smoothedWeight = (stat.weightSum + 2.0) / (stat.ratedCount + 2.0);
    const satisfactionScore = Math.max(0.05, Math.min(0.98, (smoothedWeight + 2.0) / 5.0));
    const volumeFactor = 0.88 + 0.12 * Math.min(1.0, Math.log10(stat.ratedCount + 1) / Math.log10(25));
    const normalizedScore = Math.round(satisfactionScore * volumeFactor * 100) / 100;

    return {
      key: bucket.key,
      label: bucket.label,
      score: normalizedScore,
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

  // 7. Rich, Multi-Dimensional AI Cinephile Narrative Summary
  const summaryText = generateRichFilmDnaSummary({
    genreList,
    topEra,
    popularity,
    familiarity,
    traits,
    sample: {
      totalInteractions,
      ratedMovies: ratedMoviesCount,
    },
  });

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

/**
 * Generates an articulate, deeply insightful, multi-paragraph AI Cinephile Narrative.
 */
export function generateRichFilmDnaSummary(params: {
  genreList: GenrePreference[];
  topEra?: EraPreference;
  popularity: PopularityOrientation;
  familiarity: FamiliarityPreference;
  traits: string[];
  sample: { ratedMovies: number; totalInteractions: number };
}): string {
  const { genreList, topEra, popularity, familiarity, sample } = params;
  const top1Genre = genreList[0]?.name;
  const top2Genre = genreList[1]?.name;

  const paragraphs: string[] = [];

  // Paragraph 1: Core Persona & Narrative Philosophy
  let p1 = "";
  if (top1Genre === "Dram" && (top2Genre === "Gerilim" || top2Genre === "Suç")) {
    p1 = `Senin için sinema; olayların yüzeysel aktığı bir eğlence aracı olmaktan ziyade **insan psikolojisinin karmaşık labirentlerine inen, ahlaki ikilemleri ve karakterlerin baskı altındaki çözülüşlerini** cesurca irdeleyen derin bir keşif alanı. Klişe dramatik formüller yerine yüksek atmosferik tansiyona, çok katmanlı karakter arklarına ve adım adım tırmanan psikolojik gerilime özel bir zaafın var.`;
  } else if (top1Genre === "Dram") {
    p1 = `İzleme seçimlerinde **karakter odaklı derin anlatıları, varoluşsal çatışmaları ve duygusal dürüstlüğü** merkeze alan rafine bir sinefil perspektifine sahipsin. Basit şablonlar yerine insan ilişkilerinin kırılganlığını ve hayatın gri alanlarını samimiyetle yansıtan prestij yapımlar senin sinema doyumunun temelini oluşturuyor.`;
  } else if (top1Genre === "Gerilim" || top1Genre === "Gizem") {
    p1 = `Zihnini sürekli tetikte tutan, **seyircisini pasif bırakmayan ve akıl oyunlarıyla örülü tekinsiz atmosferlere** sahip yapımlara güçlü bir bağlılığın var. Öngörülebilir kurgulardan uzak duruyor; çözülmesi zor düğümleri, ritmi ustalıkla tırmandıran gizem katmanlarını ve zekice tasarlanmış ters köşeleri ödüllendiriyorsun.`;
  } else if (top1Genre === "Bilim Kurgu" || top1Genre === "Bilim-Kurgu") {
    p1 = `Felsefi derinliği olan, **insanlığın geleceğini ve bilinmeyenin sınırlarını sorgulayan kavramsal yapımlara** derin bir tutkun var. Görsel ihtişamı salt gösteriş için değil; düşünsel bir vizyonu ve zengin bir evren inşasını desteklemek için kullanan zeki bilim kurgu anlatıları senin sinema dünyanda başköşede yer alıyor.`;
  } else if (top1Genre === "Suç") {
    p1 = `Yeraltı dünyasının karanlık dinamiklerini, **adalet ile ahlak arasındaki çatışmaları ve neo-noir atmosferi** ham bir gerçekçilikle ele alan yapımlarla güçlü bir bağ kuruyorsun. Gri karakterlerin ve stilize suç anlatılarının sunduğu sinematik ağırlık senin için vazgeçilmez.`;
  } else if (top1Genre === "Aksiyon" || top1Genre === "Macera") {
    p1 = `Kamera kullanımından kurgu ritmine kadar **yüksek temposunu ve sinematik enerjisini kaybetmeyen dinamik yolculukları** seviyorsun. Görsel vizyonu geniş, dünya tasarımı tutarlı ve hikayesini fiziksel bir devinimle anlatan yapımlarda en yüksek izleme doyumuna ulaşıyorsun.`;
  } else if (top1Genre === "Komedi") {
    p1 = `Zeki diyalog ritmine dayanan, **durum mizahını insani inceliklerle harmanlayan ve samimi karakter kimyası sunan** hikayelere yöneliyorsun. Yapmacıklıktan uzak, hayatın ironilerini nüanslarla yakalayan anlatılar senin için özel bir yere sahip.`;
  } else if (top1Genre === "Korku") {
    p1 = `Ucuz şok efektleri (jump-scare) yerine; **tekinsiz atmosferi, psikolojik klostrofobisi ve insan doğasının karanlık yanlarını** estetik bir dille işleyen cüretkar korku ve gerilim sinemasına derin bir saygın var.`;
  } else {
    p1 = `İzleme geçmişin; tür sınırlarına hapsolmayan, **anlatım kalitesini ve yönetmen vizyonunu önceleyen dengeli ve olgun bir sinefil profili** çiziyor. Farklı sinematik dilleri deneyimlemekten çekinmeyen çok yönlü bir zevk skalasına sahipsin.`;
  }
  paragraphs.push(p1);

  // Paragraph 2: Era, Aesthetic Texture & Narrative Synergy
  let p2 = "";
  if (topEra && topEra.ratedCount > 0) {
    if (topEra.key === "1990s") {
      p2 = `Estetik açıdan özellikle **1990'lar Kült Dönemi** sinemasıyla sarsılmaz bir rezonansın bulunuyor. 90'ların analog film dokusu, bağımsız yönetmenlerin cüretkar çıkışları, dijital efektlerin henüz boğmadığı organik sinematografi ve dokulu neo-noir atmosferi zevkinde derin bir iz bırakmış.`;
    } else if (topEra.key === "1970s" || topEra.key === "Before 1970") {
      p2 = `Sinema algında **Klasik Dönem ve 70'ler Yeni Hollywood ekolünün** ham gerçekçiliği, tavizsiz yönetmen imzaları ve zamansız sinematografi kuralları belirleyici bir standart oluşturuyor.`;
    } else if (topEra.key === "1980s") {
      p2 = `**1980'ler Sinemasının** stilize renk paletleri, ikonik synth müzikleri ve döneme özgü kült anlatı dili zevkinde belirgin bir nostaljik ağırlık oluşturuyor.`;
    } else if (topEra.key === "2000s") {
      p2 = `Milenyum döneminin getirdiği **katmanlı kurgu yapıları, zihin büken senaryolar ve çağdaş yönetmen sinemasının olgunluk dönemi eserleri** izleme hafızanda merkezi bir konuma sahip.`;
    } else {
      p2 = `**Modern ve Çağdaş Sinemanın** güncel ritmine, yenilikçi görsel tekniklerine ve günümüz dünyasının sosyolojik dinamiklerini tartışan taze anlatım biçimlerine yüksek uyum gösteriyorsun.`;
    }

    if (top2Genre && top1Genre) {
      p2 += ` **${top1Genre}** türünün getirdiği duygusal ve tematik ağırlık ile **${top2Genre}** türünün yarattığı sürükleyici dinamizm, izleme kararlarındaki ana çekim merkezini oluşturuyor.`;
    }
  }
  if (p2) paragraphs.push(p2);

  // Paragraph 3: Curation Behavior & Exploration Philosophy
  let p3 = "";
  if (popularity.orientation === "niche" || familiarity.label === "discovery_heavy") {
    p3 = `Popüler gişe formüllerinin ve hazır tüketim şablonlarının kolaycılığına kapılmak yerine; **yönetmen vizyonunu tavizsiz yansıtan, festival ve bağımsız kulvardaki özgün yapımları keşfetmekten keyif alan seçici bir damak zevkine** sahipsin. Radara girmemiş gizli cevherleri bulmak senin için sinemanın en heyecan verici parçası.`;
  } else if (popularity.orientation === "mainstream") {
    p3 = `Kültürel bir fenomen haline gelmiş, **yüksek prodüksiyon kalitesine, güçlü oyuncu kadrolarına ve evrensel anlatı gücüne sahip prestijli başyapıtları** takdir eden bir gözün var. Kitleleri peşinden sürükleyen ikonik eserlerdeki sinematik ustalığı seviyorsun.`;
  } else {
    p3 = `Geniş kitlelerin hayran kaldığı kült başyapıtlar ile bağımsız sinemanın az bilinen özgün denemeleri arasında **sağlıklı ve önyargısız bir denge** kurmuş durumdasın. Bir eseri popülaritesine göre değil, sunduğu sinematik değer ve özgünlük üzerinden değerlendiriyorsun.`;
  }
  paragraphs.push(p3);

  // Paragraph 4: AI Recommendation Compass & Final Synthesis
  const countStr = sample.ratedMovies >= 50
    ? `${sample.ratedMovies}'i aşkın değerlendirilmiş filmle kristalleşen bu DNA doğrultusunda; `
    : "";
  const p4 = `${countStr}SineAI motorumuz senin için; **tahmin edilebilir şablonlardan kaçınan, karakter derinliğini olay örgüsünün önüne koyan, atmosferiyle içine çeken ve bittikten sonra da zihninde yankılanmaya devam edecek** güçlü yapımları önceliklendirecektir.`;
  paragraphs.push(p4);

  return paragraphs.join("\n\n");
}
