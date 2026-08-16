import {
  evaluateMovieEligibility,
  isMovieEligible,
  filterEligibleMovies,
} from "../lib/movies/eligibility";
import { isExplicitAdultContent, isGenericOverview } from "../lib/movies/denylist";

export function runMovieEligibilityTests() {
  console.log("=== GLOBAL MOVIE ELIGIBILITY & ADULT FILTER UNIT & REGRESSION TESTS ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${message}`);
    }
  }

  // 1. TMDB Adult Flag Hard Block
  const adultMovie = {
    title: "Explicit Adult Feature",
    overview: "Bu yapım yetişkinlere özel erotik içerikler barındıran uzun metrajlı bir yapımdır.",
    posterPath: "/adult_poster.jpg",
    releaseYear: 2021,
    voteAverage: 6.5,
    voteCount: 120,
    adult: true,
  };
  const resAdult = evaluateMovieEligibility(adultMovie, "CALIBRATION");
  assert(resAdult.isEligible === false, "adult=true movie is rejected");
  assert(resAdult.reason === "ADULT_FLAG", "Rejection reason is ADULT_FLAG");

  // 2. Secondary Explicit Pornographic / Adult Keyword Filter
  const pornKeywordMovie = {
    title: "Hardcore Porno Seks Hikayeleri",
    overview: "Açık ve sansürsüz porno sahneler içeren yetişkin video prodüksiyonu.",
    posterPath: "/poster123.jpg",
    releaseYear: 2020,
    voteAverage: 5.0,
    voteCount: 80,
    adult: false, // TMDB flag missed
  };
  const resPorn = evaluateMovieEligibility(pornKeywordMovie, "CALIBRATION");
  assert(resPorn.isEligible === false, "Explicit pornographic keyword is rejected even when adult=false");
  assert(resPorn.reason === "EXPLICIT_ADULT_KEYWORD", "Rejection reason is EXPLICIT_ADULT_KEYWORD");

  // 3. Romance, Drama & Sensual Cinema False Positive Guardrail
  const romanceMovies = [
    {
      title: "Titanic",
      overview: "Gemi Atlas Okyanusu'nda ilerlerken iki genç aşık arasında filizlenen efsanevi ve tutkulu bir aşk hikayesi.",
      posterPath: "/titanic.jpg",
      releaseYear: 1997,
      voteAverage: 7.9,
      voteCount: 24000,
      genres: ["Dram", "Romantik"],
      adult: false,
    },
    {
      title: "Before Sunrise",
      overview: "Viyana sokaklarında sabaha kadar yürüyerek hayatı ve aşkı keşfeden Jesse ve Celine'in romantik gecesi.",
      posterPath: "/before_sunrise.jpg",
      releaseYear: 1995,
      voteAverage: 8.1,
      voteCount: 5000,
      genres: ["Dram", "Romantik"],
      adult: false,
    },
    {
      title: "In the Mood for Love",
      overview: "1960'ların Hong Kong'unda birbirinin eşleri tarafından aldatıldığını fark eden iki komşunun hüzünlü ve duygusal bağı.",
      posterPath: "/in_the_mood.jpg",
      releaseYear: 2000,
      voteAverage: 8.1,
      voteCount: 2600,
      genres: ["Dram", "Romantik"],
      adult: false,
    },
    {
      title: "Aşk Tesadüfleri Sever",
      overview: "Doğumlarından itibaren yolları kesişen iki aşığın yıllar sonra İstanbul'da yeniden karşılaşmasını anlatan duygusal Türk filmi.",
      posterPath: "/ask_tesadufleri.jpg",
      releaseYear: 2011,
      voteAverage: 7.3,
      voteCount: 300,
      genres: ["Romantik", "Dram"],
      adult: false,
    },
    {
      title: "The Transporter",
      overview: "Kurallarına sıkı sıkıya bağlı profesyonel bir taşıyıcının contemporary suç dünyasındaki aksiyon dolu mücadelesi.",
      posterPath: "/transporter.jpg",
      releaseYear: 2002,
      voteAverage: 6.9,
      voteCount: 5200,
      genres: ["Aksiyon", "Suç"],
      adult: false,
    },
  ];

  for (const m of romanceMovies) {
    const res = evaluateMovieEligibility(m, "CALIBRATION");
    assert(res.isEligible === true, `Valid romance/cinema classic '${m.title}' is NOT falsely rejected`);
  }

  // 4. Missing & Generic Placeholder Overview Tests
  const emptyOverviewMovie = {
    title: "Gizemli Film",
    overview: "",
    posterPath: "/gizem.jpg",
    releaseYear: 2022,
    voteAverage: 7.0,
    voteCount: 200,
  };
  assert(evaluateMovieEligibility(emptyOverviewMovie, "CALIBRATION").isEligible === false, "Empty overview is rejected");
  assert(evaluateMovieEligibility(emptyOverviewMovie, "CALIBRATION").reason === "MISSING_OVERVIEW", "Reason is MISSING_OVERVIEW");

  const genericPlaceholderMovie = {
    title: "Katalog Filmi",
    overview: "Film hakkında özet bilgi bulunmuyor.",
    posterPath: "/katalog.jpg",
    releaseYear: 2021,
    voteAverage: 6.8,
    voteCount: 150,
  };
  assert(evaluateMovieEligibility(genericPlaceholderMovie, "CALIBRATION").isEligible === false, "Generic placeholder overview is rejected");
  assert(evaluateMovieEligibility(genericPlaceholderMovie, "CALIBRATION").reason === "GENERIC_NO_OVERVIEW", "Reason is GENERIC_NO_OVERVIEW");

  const shortOverviewMovie = {
    title: "Kısa Bilgili Film",
    overview: "Kısa özet metni.", // < 40 chars
    posterPath: "/kisa.jpg",
    releaseYear: 2020,
    voteAverage: 7.2,
    voteCount: 100,
  };
  assert(evaluateMovieEligibility(shortOverviewMovie, "CALIBRATION").isEligible === false, "Too short overview (<40 chars) is rejected in CALIBRATION");
  assert(evaluateMovieEligibility(shortOverviewMovie, "CALIBRATION").reason === "OVERVIEW_TOO_SHORT", "Reason is OVERVIEW_TOO_SHORT");

  // 5. Missing Poster Path Tests
  const noPosterMovie = {
    title: "Afissiz Film",
    overview: "Bu filmin detaylı bir konusu ve kaliteli bir yönetmen anlatımı bulunmaktadır.",
    posterPath: null,
    releaseYear: 2021,
    voteAverage: 7.5,
    voteCount: 500,
  };
  assert(evaluateMovieEligibility(noPosterMovie, "CALIBRATION").isEligible === false, "Missing poster in CALIBRATION is rejected");
  assert(evaluateMovieEligibility(noPosterMovie, "CALIBRATION").reason === "MISSING_POSTER", "Reason is MISSING_POSTER");
  assert(evaluateMovieEligibility(noPosterMovie, "RECOMMENDATION").isEligible === false, "Missing poster in RECOMMENDATION is rejected");

  // 6. Release Date & Future Release Tests
  const futureYearMovie = {
    title: "Gelecek Zamanlı Yapım",
    overview: "2032 yılında vizyona girecek olan bilim kurgu ve uzay keşfi sinema projesi.",
    posterPath: "/future.jpg",
    releaseYear: 2032,
    voteAverage: 0,
    voteCount: 0,
  };
  assert(evaluateMovieEligibility(futureYearMovie, "CALIBRATION").isEligible === false, "Future releaseYear movie is rejected");
  assert(evaluateMovieEligibility(futureYearMovie, "CALIBRATION").reason === "FUTURE_RELEASE", "Reason is FUTURE_RELEASE");

  const futureDateMovie = {
    title: "2029 Gelecek Film",
    overview: "Henüz yapım aşamasında olan ve 2029 yılında vizyona girmesi beklenen film.",
    posterPath: "/future2.jpg",
    releaseDate: "2029-08-15",
    releaseYear: 2029,
    voteAverage: 0,
    voteCount: 0,
  };
  assert(evaluateMovieEligibility(futureDateMovie, "CALIBRATION").isEligible === false, "Future releaseDate movie is rejected");

  // 7. Low Vote Count & Noise Floor Tests
  const lowVoteMovie = {
    title: "Çok Az Oylu Obscure Film",
    overview: "Gözlerden uzak bir kasabada çekilmiş çok az bilinen bağımsız bir sinema denemesi.",
    posterPath: "/obscure.jpg",
    releaseYear: 2018,
    voteAverage: 5.0,
    voteCount: 4, // < 50
    popularity: 1.2,
  };
  assert(evaluateMovieEligibility(lowVoteMovie, "CALIBRATION").isEligible === false, "Very low voteCount (<50) rejected in CALIBRATION");
  assert(evaluateMovieEligibility(lowVoteMovie, "CALIBRATION").reason === "LOW_VOTE_CONFIDENCE", "Reason is LOW_VOTE_CONFIDENCE");

  // 8. International Global Cinema Safety (Korean, Japanese, Hindi, French, Turkish)
  const internationalMovies = [
    {
      title: "Parazit",
      originalTitle: "Gisaengchung",
      overview: "Yoksul Kim ailesinin fertlerinin zengin Park ailesinin evine birer birer sızmasını anlatan Oscar ödüllü kara komedi.",
      posterPath: "/parasite.jpg",
      releaseYear: 2019,
      voteAverage: 8.5,
      voteCount: 16500,
      genres: ["Komedi", "Gerilim", "Dram"],
    },
    {
      title: "Ruhların Kaçışı",
      originalTitle: "Sen to Chihiro no Kamikakushi",
      overview: "Küçük Chihiro'nun anne babasını kurtarmak için ruhlar dünyasındaki fantastik ve büyüleyici yolculuğu.",
      posterPath: "/spirited_away.jpg",
      releaseYear: 2001,
      voteAverage: 8.5,
      voteCount: 15000,
      genres: ["Animasyon", "Aile", "Fantezi"],
    },
    {
      title: "3 Aptal",
      originalTitle: "3 Idiots",
      overview: "Hindistan'ın en seçkin mühendislik okulunda eğitim sistemini sorgulayan üç yakın arkadaşın dokunaklı ve komik hikayesi.",
      posterPath: "/3idiots.jpg",
      releaseYear: 2009,
      voteAverage: 8.0,
      voteCount: 2200,
      genres: ["Komedi", "Dram"],
    },
    {
      title: "Kış Uykusu",
      originalTitle: "Kış Uykusu",
      overview: "Kapadokya'da eski bir tiyatro oyuncusunun kış mevsiminde karla kaplanan otelinde yaşadığı ahlaki ve varoluşsal hesaplaşmalar.",
      posterPath: "/kis_uykusu.jpg",
      releaseYear: 2014,
      voteAverage: 8.1,
      voteCount: 450,
      genres: ["Dram"],
    },
    {
      title: "Amélie",
      originalTitle: "Le Fabuleux Destin d'Amélie Poulain",
      overview: "Paris'te yaşayan hayalperest genç bir kadının çevresindeki insanların hayatlarını gizlice güzelleştirme serüveni.",
      posterPath: "/amelie.jpg",
      releaseYear: 2001,
      voteAverage: 7.9,
      voteCount: 11000,
      genres: ["Komedi", "Romantik"],
    },
  ];

  for (const im of internationalMovies) {
    const res = evaluateMovieEligibility(im, "CALIBRATION");
    assert(res.isEligible === true, `International cinema masterwork '${im.title}' (${im.originalTitle}) is ELIGIBLE`);
  }

  // 8.5 Numeric Title Eligibility Verification (2012, 1917, 17, 9, 1408)
  const numericMovies = [
    {
      title: "2012",
      originalTitle: "2012",
      overview: "Mayalıların takvim kehanetine dayanan küresel jeolojik kıyamet ve insanlığın hayatta kalma mücadelesi.",
      posterPath: "/2012.jpg",
      releaseYear: 2009,
      voteAverage: 6.5,
      voteCount: 12000,
      genres: ["Aksiyon", "Macera", "Bilim-Kurgu"],
      adult: false,
    },
    {
      title: "1917",
      originalTitle: "1917",
      overview: "Birinci Dünya Savaşı sırasında imkansız bir mesajı düşman hatlarının arkasına ulaştırmakla görevlendirilen iki askerin nefes kesen yolculuğu.",
      posterPath: "/1917.jpg",
      releaseYear: 2019,
      voteAverage: 8.0,
      voteCount: 13000,
      genres: ["Savaş", "Dram"],
      adult: false,
    },
    {
      title: "17",
      originalTitle: "17",
      overview: "Gençlik yıllarının karmaşık ilişkilerini ve duygusal yol ayrımlarını anlatan sürükleyici bağımsız film.",
      posterPath: "/17.jpg",
      releaseYear: 2016,
      voteAverage: 7.1,
      voteCount: 150,
      genres: ["Dram"],
      adult: false,
    },
  ];

  for (const nm of numericMovies) {
    const res = evaluateMovieEligibility(nm, "CALIBRATION");
    assert(res.isEligible === true, `Numeric title movie '${nm.title}' is ELIGIBLE`);
    assert(!res.reasons.includes("NON_LATIN_DISPLAY_TITLE"), `Numeric title movie '${nm.title}' has NO NON_LATIN_DISPLAY_TITLE`);
    assert(res.details?.titleLatinRatio === 1.0, `Numeric title movie '${nm.title}' reports titleLatinRatio = 1.0`);
  }


  // 9. Runtime DB Cached Movie Filtering
  const cachedDbAdultMovie = {
    id: "db-movie-uuid-1",
    tmdbId: 999999,
    title: "Eski DB Kaydı Adult Film",
    originalTitle: "Old Adult Movie",
    posterPath: "/old.jpg",
    releaseYear: 2019,
    popularity: 10,
    voteAverage: 6.0,
    metadata: {
      overview: "Daha önce DB'ye kaydedilmiş sansürsüz erotik video yapımı.",
      genres: ["Erotik"],
      adult: true,
      voteCount: 500,
    },
  };
  assert(isMovieEligible(cachedDbAdultMovie, "CALIBRATION") === false, "Previously cached DB adult movie is rejected at runtime");
  assert(isMovieEligible(cachedDbAdultMovie, "RECOMMENDATION") === false, "Previously cached DB adult movie rejected from recommendations");
  assert(isMovieEligible(cachedDbAdultMovie, "HOME") === false, "Previously cached DB adult movie rejected from home categories");
  assert(isMovieEligible(cachedDbAdultMovie, "MOVIE_NIGHT") === false, "Previously cached DB adult movie rejected from Movie Night");

  // 10. Filter Array Helper Test
  const mixedPool = [
    romanceMovies[0], // Valid Titanic
    adultMovie, // Invalid Adult
    emptyOverviewMovie, // Invalid Overview
    internationalMovies[0], // Valid Parasite
    noPosterMovie, // Invalid Poster
  ];
  const filtered = filterEligibleMovies(mixedPool, "CALIBRATION");
  assert(filtered.length === 2, "filterEligibleMovies filters down from 5 mixed items to 2 high-quality eligible items");
  assert(filtered[0].title === "Titanic" && filtered[1].title === "Parazit", "Only Titanic and Parazit passed through calibration filter");

  console.log(`\nRESULTS: Passed ${passed} of ${total} tests.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runMovieEligibilityTests();
