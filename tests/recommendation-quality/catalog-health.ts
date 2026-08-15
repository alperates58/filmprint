import { db } from "../../lib/db/client";
import { assertSafetyOrExit } from "./safety";
import { isMovieEligible } from "../../lib/movies/eligibility";

export interface CatalogHealthReport {
  totalMovies: number;
  eligibleRecommendation: number;
  eligibleHome: number;
  eligibleCalibration: number;
  ineligibleCount: number;
  withPosterCount: number;
  withOverviewCount: number;
  decadeDistribution: Record<string, number>;
  genreDistribution: Record<string, number>;
  languageDistribution: Record<string, number>;
  ratingDistribution: {
    under6: number;
    sixToSeven: number;
    sevenToEight: number;
    eightPlus: number;
  };
  popularityDistribution: {
    niche: number;      // < 20
    moderate: number;   // 20 - 60
    popular: number;    // 60 - 100
    blockbuster: number;// > 100
  };
  powerUserSupply: {
    fixture1043Remaining: number;
    fixture1500Remaining: number;
    supplyStatus: "HEALTHY" | "WARNING" | "CRITICAL";
  };
}

/**
 * Audits the local movie catalog in PostgreSQL.
 */
export async function auditCatalogHealth(): Promise<CatalogHealthReport> {
  assertSafetyOrExit();

  const allMovies = await db.movie.findMany({
    select: {
      id: true,
      tmdbId: true,
      title: true,
      originalTitle: true,
      posterPath: true,
      releaseYear: true,
      popularity: true,
      voteAverage: true,
      metadata: true,
    },
  });

  const totalMovies = allMovies.length;
  let eligibleRecommendation = 0;
  let eligibleHome = 0;
  let eligibleCalibration = 0;
  let withPosterCount = 0;
  let withOverviewCount = 0;

  const decadeDistribution: Record<string, number> = {
    "Pre-1970": 0,
    "1970s": 0,
    "1980s": 0,
    "1990s": 0,
    "2000s": 0,
    "2010s": 0,
    "2020s": 0,
    "Unknown": 0,
  };

  const genreDistribution: Record<string, number> = {};
  const languageDistribution: Record<string, number> = {};

  const ratingDistribution = {
    under6: 0,
    sixToSeven: 0,
    sevenToEight: 0,
    eightPlus: 0,
  };

  const popularityDistribution = {
    niche: 0,
    moderate: 0,
    popular: 0,
    blockbuster: 0,
  };

  for (const m of allMovies) {
    const meta = (m.metadata as Record<string, any>) || {};
    const genres: string[] = Array.isArray(meta.genres) ? meta.genres : [];
    const overview = (meta.overview as string) || "";
    const lang = (meta.originalLanguage as string) || "en";
    const adult = meta.adult === true;
    const voteCount = typeof meta.voteCount === "number" ? meta.voteCount : 0;

    const candidateObj = {
      title: m.title,
      originalTitle: m.originalTitle,
      posterPath: m.posterPath,
      releaseYear: m.releaseYear,
      popularity: m.popularity,
      voteAverage: m.voteAverage,
      voteCount,
      genres,
      overview,
      adult,
    };

    if (isMovieEligible(candidateObj, "RECOMMENDATION")) eligibleRecommendation++;
    if (isMovieEligible(candidateObj, "HOME")) eligibleHome++;
    if (isMovieEligible(candidateObj, "CALIBRATION")) eligibleCalibration++;

    if (m.posterPath && m.posterPath.length > 3) withPosterCount++;
    if (overview && overview.length >= 25) withOverviewCount++;

    // Decade
    if (!m.releaseYear) {
      decadeDistribution["Unknown"]++;
    } else if (m.releaseYear < 1970) {
      decadeDistribution["Pre-1970"]++;
    } else if (m.releaseYear < 1980) {
      decadeDistribution["1970s"]++;
    } else if (m.releaseYear < 1990) {
      decadeDistribution["1980s"]++;
    } else if (m.releaseYear < 2000) {
      decadeDistribution["1990s"]++;
    } else if (m.releaseYear < 2010) {
      decadeDistribution["2000s"]++;
    } else if (m.releaseYear < 2020) {
      decadeDistribution["2010s"]++;
    } else {
      decadeDistribution["2020s"]++;
    }

    // Genres
    for (const g of genres) {
      genreDistribution[g] = (genreDistribution[g] || 0) + 1;
    }

    // Language
    languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;

    // Rating
    if (m.voteAverage < 6.0) ratingDistribution.under6++;
    else if (m.voteAverage < 7.0) ratingDistribution.sixToSeven++;
    else if (m.voteAverage < 8.0) ratingDistribution.sevenToEight++;
    else ratingDistribution.eightPlus++;

    // Popularity
    if (m.popularity < 20) popularityDistribution.niche++;
    else if (m.popularity < 60) popularityDistribution.moderate++;
    else if (m.popularity < 100) popularityDistribution.popular++;
    else popularityDistribution.blockbuster++;
  }

  const ineligibleCount = totalMovies - eligibleRecommendation;
  const fixture1043Remaining = Math.max(0, eligibleRecommendation - 1043);
  const fixture1500Remaining = Math.max(0, eligibleRecommendation - 1500);

  let supplyStatus: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";
  if (eligibleRecommendation < 3000) supplyStatus = "CRITICAL";
  else if (fixture1500Remaining < 2000) supplyStatus = "WARNING";

  return {
    totalMovies,
    eligibleRecommendation,
    eligibleHome,
    eligibleCalibration,
    ineligibleCount,
    withPosterCount,
    withOverviewCount,
    decadeDistribution,
    genreDistribution,
    languageDistribution,
    ratingDistribution,
    popularityDistribution,
    powerUserSupply: {
      fixture1043Remaining,
      fixture1500Remaining,
      supplyStatus,
    },
  };
}

/**
 * Prints formatted catalog health summary to console.
 */
export function printCatalogHealth(report: CatalogHealthReport): void {
  console.log("\n===============================================================");
  console.log("FILMPRINT LOCAL CATALOG HEALTH AUDIT");
  console.log("===============================================================");
  console.log(`Total Movies in DB        : ${report.totalMovies}`);
  console.log(`Eligible (Recommendation) : ${report.eligibleRecommendation}`);
  console.log(`Eligible (Home)           : ${report.eligibleHome}`);
  console.log(`Eligible (Calibration)    : ${report.eligibleCalibration}`);
  console.log(`Ineligible / Filtered     : ${report.ineligibleCount}`);
  console.log(`With Valid Poster         : ${report.withPosterCount} (${((report.withPosterCount / report.totalMovies) * 100).toFixed(1)}%)`);
  console.log(`With Valid Overview       : ${report.withOverviewCount} (${((report.withOverviewCount / report.totalMovies) * 100).toFixed(1)}%)`);
  console.log("---------------------------------------------------------------");
  console.log("Power User Supply Headroom:");
  console.log(`- P15 (1043 interactions) : ${report.powerUserSupply.fixture1043Remaining} remaining unseen candidates`);
  console.log(`- P16 (1500 interactions) : ${report.powerUserSupply.fixture1500Remaining} remaining unseen candidates`);
  console.log(`- Supply Status           : [${report.powerUserSupply.supplyStatus}]`);
  console.log("---------------------------------------------------------------");
  console.log("Decade Distribution:");
  for (const [dec, count] of Object.entries(report.decadeDistribution)) {
    console.log(`  ${dec.padEnd(10)}: ${count}`);
  }
  console.log("---------------------------------------------------------------");
  console.log("Top Genres:");
  const sortedGenres = Object.entries(report.genreDistribution).sort((a, b) => b[1] - a[1]);
  for (const [genre, count] of sortedGenres.slice(0, 10)) {
    console.log(`  ${genre.padEnd(15)}: ${count}`);
  }
  console.log("===============================================================\n");
}

if (require.main === module || process.argv[1]?.includes("catalog-health")) {
  auditCatalogHealth()
    .then((report) => {
      printCatalogHealth(report);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
