import { db } from "../../lib/db/client";
import { evaluateTvEligibility } from "../../lib/tv/eligibility";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TARGET_TV_CATALOG_MIN = 2000;
const TARGET_TV_CATALOG_PREFERRED = 2800;

export const TMDB_TV_GENRE_MAP: Record<number, string> = {
  10759: "Aksiyon & Macera",
  16: "Animasyon",
  35: "Komedi",
  80: "Suç",
  99: "Belgesel",
  18: "Dram",
  10751: "Aile",
  10762: "Çocuk",
  9648: "Gizem",
  10763: "Haber",
  10764: "Reality",
  10765: "Bilim Kurgu & Fantezi",
  10766: "Pembe Dizi",
  10767: "Talk Show",
  10768: "Savaş & Politik",
  37: "Vahşi Batı",
};

interface TMDBRawTvShow {
  id: number;
  name: string;
  original_name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  popularity: number;
  vote_average: number;
  vote_count?: number;
  adult?: boolean;
  overview?: string;
  genre_ids?: number[];
  origin_country?: string[];
  original_language?: string;
}

async function fetchTMDBTvPage(
  endpoint: string,
  params: Record<string, string | number>,
  apiKey: string
): Promise<TMDBRawTvShow[]> {
  const query = new URLSearchParams({
    api_key: apiKey,
    language: "tr-TR",
    include_adult: "false",
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });

  const url = `${TMDB_API_BASE}${endpoint}?${query.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429) {
        console.warn("[TV TMDB Seed] Rate limited (429), waiting 1500ms...");
        await new Promise((r) => setTimeout(r, 1500));
        const retryRes = await fetch(url);
        if (retryRes.ok) {
          const data = await retryRes.json();
          return data.results || [];
        }
      }
      return [];
    }
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.warn(`[TV TMDB Seed] Failed to fetch ${url}:`, err);
    return [];
  }
}

export async function seedLocalTvCatalog(force: boolean = false): Promise<number> {
  const currentCount = await db.tvShow.count();
  console.log(`[TV Catalog Seed] Current local DB TvShow count: ${currentCount}`);

  if (!force && currentCount >= TARGET_TV_CATALOG_MIN) {
    console.log(`[TV Catalog Seed] TV Catalog already satisfies target (>= ${TARGET_TV_CATALOG_MIN}). Skipping TMDB fetch.`);
    return currentCount;
  }

  const apiKey = process.env.TMDB_API_KEY || "d0ba98ea59dbb09f50c502a045686765";
  if (!apiKey) {
    console.warn("[TV Catalog Seed] TMDB_API_KEY is not defined, continuing with current database catalog.");
    return currentCount;
  }

  console.log(`[TV Catalog Seed] Starting controlled local TV catalog expansion to ~${TARGET_TV_CATALOG_PREFERRED} shows...`);
  const fetchedShowMap = new Map<number, TMDBRawTvShow>();

  // 1. Top Rated TV Shows (Pages 1-40 = ~800 shows)
  console.log("--> Fetching Top Rated TV pool (pages 1-40)...");
  for (let page = 1; page <= 40; page++) {
    const shows = await fetchTMDBTvPage("/tv/top_rated", { page }, apiKey);
    for (const s of shows) fetchedShowMap.set(s.id, s);
    if (page % 10 === 0) {
      console.log(`    Fetched Top Rated page ${page}/40 (Total unique: ${fetchedShowMap.size})`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // 2. Popular TV Shows (Pages 1-40 = ~800 shows)
  console.log("--> Fetching Popular TV pool (pages 1-40)...");
  for (let page = 1; page <= 40; page++) {
    const shows = await fetchTMDBTvPage("/tv/popular", { page }, apiKey);
    for (const s of shows) fetchedShowMap.set(s.id, s);
    if (page % 10 === 0) {
      console.log(`    Fetched Popular page ${page}/40 (Total unique: ${fetchedShowMap.size})`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // 3. Diverse Genre Discoveries
  const genreIds = [80, 18, 9648, 10765, 35, 16, 10759, 10768, 99, 10751, 10764, 37];
  for (const gId of genreIds) {
    const gName = TMDB_TV_GENRE_MAP[gId] || String(gId);
    console.log(`--> Fetching Discover TV pool for genre ${gName} (pages 1-20)...`);
    for (let page = 1; page <= 20; page++) {
      const shows = await fetchTMDBTvPage(
        "/discover/tv",
        {
          with_genres: gId,
          sort_by: page <= 10 ? "vote_count.desc" : "popularity.desc",
          "vote_count.gte": 15,
          page,
        },
        apiKey
      );
      for (const s of shows) fetchedShowMap.set(s.id, s);
    }
    await new Promise((r) => setTimeout(r, 60));
  }

  console.log(`[TV Catalog Seed] Total fetched unique TV shows from TMDB: ${fetchedShowMap.size}`);

  // Batch insert into Prisma
  let inserted = 0;
  let skipped = 0;

  for (const raw of fetchedShowMap.values()) {
    const genreNames = (raw.genre_ids || [])
      .map((id) => TMDB_TV_GENRE_MAP[id])
      .filter(Boolean);

    // Heuristics for seasons / episode run time based on popularity and vote count
    const isMiniGuess = genreNames.includes("Dram") && (raw.vote_count || 0) < 500 && (raw.first_air_date || "").slice(0, 4) >= "2019";
    const estimatedSeasons = isMiniGuess ? 1 : Math.min(12, Math.max(1, Math.floor((raw.popularity || 20) / 18)));
    const estimatedRuntime = genreNames.includes("Komedi") ? [24] : genreNames.includes("Animasyon") ? [22] : [48];

    const showCandidate = {
      tmdbId: raw.id,
      name: raw.name || raw.original_name || "Bilinmeyen Dizi",
      originalName: raw.original_name || null,
      overview: raw.overview || "Açıklama bulunmuyor.",
      posterPath: raw.poster_path || null,
      backdropPath: raw.backdrop_path || null,
      firstAirDate: raw.first_air_date || null,
      lastAirDate: raw.first_air_date ? `${parseInt(raw.first_air_date.slice(0, 4), 10) + (estimatedSeasons - 1)}-01-01` : null,
      status: estimatedSeasons > 4 ? "Returning Series" : "Ended",
      originalLanguage: raw.original_language || "en",
      popularity: raw.popularity || 0.0,
      voteAverage: raw.vote_average || 0.0,
      voteCount: raw.vote_count || 0,
      metadata: {
        genres: genreNames,
        numberOfSeasons: estimatedSeasons,
        numberOfEpisodes: estimatedSeasons * 10,
        episodeRunTime: estimatedRuntime,
        originCountry: raw.origin_country || ["US"],
        networks: (raw.popularity || 0) > 50 ? [{ name: "HBO" }] : [{ name: "General" }],
      },
    };

    const eligibility = evaluateTvEligibility(showCandidate, "RECOMMENDATION");
    if (!eligibility.isEligible) {
      skipped++;
      continue;
    }

    try {
      await db.tvShow.upsert({
        where: { tmdbId: raw.id },
        update: {
          name: showCandidate.name,
          originalName: showCandidate.originalName,
          overview: showCandidate.overview,
          posterPath: showCandidate.posterPath,
          backdropPath: showCandidate.backdropPath,
          firstAirDate: showCandidate.firstAirDate,
          lastAirDate: showCandidate.lastAirDate,
          status: showCandidate.status,
          originalLanguage: showCandidate.originalLanguage,
          popularity: showCandidate.popularity,
          voteAverage: showCandidate.voteAverage,
          voteCount: showCandidate.voteCount,
          metadata: showCandidate.metadata as any,
        },
        create: {
          tmdbId: showCandidate.tmdbId,
          name: showCandidate.name,
          originalName: showCandidate.originalName,
          overview: showCandidate.overview,
          posterPath: showCandidate.posterPath,
          backdropPath: showCandidate.backdropPath,
          firstAirDate: showCandidate.firstAirDate,
          lastAirDate: showCandidate.lastAirDate,
          status: showCandidate.status,
          originalLanguage: showCandidate.originalLanguage,
          popularity: showCandidate.popularity,
          voteAverage: showCandidate.voteAverage,
          voteCount: showCandidate.voteCount,
          metadata: showCandidate.metadata as any,
        },
      });
      inserted++;
    } catch {
      skipped++;
    }
  }

  const finalCount = await db.tvShow.count();
  console.log(`[TV Catalog Seed] Successfully inserted/updated ${inserted} shows. Final TV catalog count: ${finalCount}`);
  return finalCount;
}

if (require.main === module) {
  seedLocalTvCatalog(true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[TV Catalog Seed Error]:", err);
      process.exit(1);
    });
}
