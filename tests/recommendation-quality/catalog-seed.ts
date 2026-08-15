import { db } from "../../lib/db/client";
import { assertSafetyOrExit } from "./safety";
import { GENRE_MAP } from "../../lib/tmdb/client";
import { isMovieEligible } from "../../lib/movies/eligibility";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TARGET_CATALOG_MIN = 3500;
const TARGET_CATALOG_PREFERRED = 4500;

interface TMDBRawMovie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  popularity: number;
  vote_average: number;
  vote_count?: number;
  adult?: boolean;
  overview?: string;
  genre_ids?: number[];
  original_language?: string;
}

/**
 * Fetches a single page from TMDB API with rate limit safety.
 */
async function fetchTMDBPage(
  endpoint: string,
  params: Record<string, string | number>,
  apiKey: string
): Promise<TMDBRawMovie[]> {
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
        console.warn("[TMDB Seed] Rate limited (429), waiting 2000ms...");
        await new Promise((r) => setTimeout(r, 2000));
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
    console.warn(`[TMDB Seed] Failed to fetch ${url}:`, err);
    return [];
  }
}

/**
 * Seeds local PostgreSQL with authentic, rich TMDB catalog (Target: 3500 - 4500 eligible movies).
 * Resumable, idempotent, local-only.
 */
export async function seedLocalCatalog(force: boolean = false): Promise<number> {
  assertSafetyOrExit();

  const currentCount = await db.movie.count();
  console.log(`[Catalog Seed] Current local DB Movie count: ${currentCount}`);

  if (!force && currentCount >= TARGET_CATALOG_MIN) {
    console.log(`[Catalog Seed] Catalog already satisfies target (>= ${TARGET_CATALOG_MIN}). Skipping TMDB fetch.`);
    return currentCount;
  }

  const apiKey = process.env.TMDB_API_KEY || "d0ba98ea59dbb09f50c502a045686765";
  if (!apiKey) {
    console.error("[Catalog Seed] TMDB_API_KEY is required for seeding.");
    return currentCount;
  }

  console.log(`[Catalog Seed] Starting controlled local catalog expansion to ~${TARGET_CATALOG_PREFERRED} movies...`);

  const fetchedMovieMap = new Map<number, TMDBRawMovie>();

  // Strategy 1: Top Rated Movies (Pages 1 to 50 = ~1,000 movies)
  console.log("--> Fetching Top Rated pool (pages 1-50)...");
  for (let page = 1; page <= 50; page++) {
    const movies = await fetchTMDBPage("/movie/top_rated", { page }, apiKey);
    for (const m of movies) fetchedMovieMap.set(m.id, m);
    if (page % 10 === 0) {
      console.log(`    Fetched Top Rated page ${page}/50 (Total unique so far: ${fetchedMovieMap.size})`);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  // Strategy 2: Popular Movies (Pages 1 to 50 = ~1,000 movies)
  console.log("--> Fetching Popular pool (pages 1-50)...");
  for (let page = 1; page <= 50; page++) {
    const movies = await fetchTMDBPage("/movie/popular", { page }, apiKey);
    for (const m of movies) fetchedMovieMap.set(m.id, m);
    if (page % 10 === 0) {
      console.log(`    Fetched Popular page ${page}/50 (Total unique so far: ${fetchedMovieMap.size})`);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  // Strategy 3: Discover by Vote Count (High confidence cinephile catalog, pages 1 to 50)
  console.log("--> Fetching High Confidence Vote Count pool (pages 1-50)...");
  for (let page = 1; page <= 50; page++) {
    const movies = await fetchTMDBPage(
      "/discover/movie",
      {
        page,
        sort_by: "vote_count.desc",
        "vote_count.gte": 100,
      },
      apiKey
    );
    for (const m of movies) fetchedMovieMap.set(m.id, m);
    if (page % 10 === 0) {
      console.log(`    Fetched High Vote Count page ${page}/50 (Total unique so far: ${fetchedMovieMap.size})`);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  // Strategy 4: Classic Cinema pool (1950 - 1989, pages 1 to 30 = ~600 movies)
  console.log("--> Fetching Classic Cinema pool (1950-1989, pages 1-30)...");
  for (let page = 1; page <= 30; page++) {
    const movies = await fetchTMDBPage(
      "/discover/movie",
      {
        page,
        sort_by: "vote_average.desc",
        "vote_count.gte": 80,
        "primary_release_date.gte": "1950-01-01",
        "primary_release_date.lte": "1989-12-31",
      },
      apiKey
    );
    for (const m of movies) fetchedMovieMap.set(m.id, m);
    if (page % 10 === 0) {
      console.log(`    Fetched Classics page ${page}/30 (Total unique so far: ${fetchedMovieMap.size})`);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  // Strategy 5: International Cinema pool (Korean, Japanese, French, German, Spanish, Turkish, Italian)
  console.log("--> Fetching International Cinema pools (pages 1-15 per language)...");
  const languages = ["ko", "ja", "fr", "de", "es", "tr", "it"];
  for (const lang of languages) {
    for (let page = 1; page <= 10; page++) {
      const movies = await fetchTMDBPage(
        "/discover/movie",
        {
          page,
          sort_by: "vote_count.desc",
          "vote_count.gte": 30,
          with_original_language: lang,
        },
        apiKey
      );
      for (const m of movies) fetchedMovieMap.set(m.id, m);
    }
    console.log(`    Fetched International lang '${lang}' (Total unique: ${fetchedMovieMap.size})`);
    await new Promise((r) => setTimeout(r, 150));
  }

  // Strategy 6: Genre-specific curation pools (Horror, Sci-Fi, Crime, Animation, Comedy, Romance, Mystery)
  const genreIds = [27, 878, 80, 16, 35, 10749, 9648, 99]; // Horror, SciFi, Crime, Animation, Comedy, Romance, Mystery, Documentary
  for (const gid of genreIds) {
    for (let page = 1; page <= 10; page++) {
      const movies = await fetchTMDBPage(
        "/discover/movie",
        {
          page,
          sort_by: "vote_average.desc",
          "vote_count.gte": 60,
          with_genres: gid,
        },
        apiKey
      );
      for (const m of movies) fetchedMovieMap.set(m.id, m);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n[Catalog Seed] Total raw unique TMDB movies gathered: ${fetchedMovieMap.size}`);

  // Filter & Format Movies
  const rawList = Array.from(fetchedMovieMap.values());
  let eligibleCount = 0;
  let skippedCount = 0;

  const preparedMovies: any[] = [];

  for (const raw of rawList) {
    const releaseYear = raw.release_date
      ? parseInt(raw.release_date.substring(0, 4), 10)
      : null;

    const genreNames: string[] = [];
    if (raw.genre_ids && Array.isArray(raw.genre_ids)) {
      for (const gid of raw.genre_ids) {
        if (GENRE_MAP[gid]) genreNames.push(GENRE_MAP[gid]);
      }
    }

    const overviewText = (raw.overview || "").trim();

    const candidateObj = {
      title: raw.title || raw.original_title || "",
      originalTitle: raw.original_title || raw.title || "",
      posterPath: raw.poster_path || null,
      backdropPath: raw.backdrop_path || null,
      releaseYear: releaseYear && !isNaN(releaseYear) ? releaseYear : null,
      popularity: raw.popularity || 0.0,
      voteAverage: raw.vote_average || 0.0,
      voteCount: raw.vote_count || 0,
      genres: genreNames,
      overview: overviewText,
      adult: raw.adult === true,
    };

    // Apply strict eligibility check
    if (!isMovieEligible(candidateObj, "RECOMMENDATION")) {
      skippedCount++;
      continue;
    }

    eligibleCount++;
    preparedMovies.push({
      tmdbId: raw.id,
      title: candidateObj.title,
      originalTitle: candidateObj.originalTitle,
      posterPath: candidateObj.posterPath,
      backdropPath: candidateObj.backdropPath,
      releaseYear: candidateObj.releaseYear,
      popularity: candidateObj.popularity,
      voteAverage: candidateObj.voteAverage,
      metadata: {
        genres: candidateObj.genres,
        overview: candidateObj.overview,
        voteCount: candidateObj.voteCount,
        adult: candidateObj.adult,
        originalLanguage: raw.original_language || "en",
        releaseDate: raw.release_date || null,
      },
    });
  }

  console.log(`[Catalog Seed] Eligible candidates ready for DB insert: ${preparedMovies.length} (Skipped ineligible: ${skippedCount})`);

  // Batch insert into local PostgreSQL Movie table in chunks of 200
  console.log("--> Inserting movies into local PostgreSQL...");
  let insertedCount = 0;
  const CHUNK_SIZE = 200;

  for (let i = 0; i < preparedMovies.length; i += CHUNK_SIZE) {
    const chunk = preparedMovies.slice(i, i + CHUNK_SIZE);
    
    // Upsert sequentially in chunk to be resilient
    await Promise.all(
      chunk.map((item) =>
        db.movie.upsert({
          where: { tmdbId: item.tmdbId },
          update: {
            title: item.title,
            originalTitle: item.originalTitle,
            posterPath: item.posterPath,
            backdropPath: item.backdropPath,
            releaseYear: item.releaseYear,
            popularity: item.popularity,
            voteAverage: item.voteAverage,
            metadata: item.metadata,
          },
          create: {
            tmdbId: item.tmdbId,
            title: item.title,
            originalTitle: item.originalTitle,
            posterPath: item.posterPath,
            backdropPath: item.backdropPath,
            releaseYear: item.releaseYear,
            popularity: item.popularity,
            voteAverage: item.voteAverage,
            metadata: item.metadata,
          },
        })
      )
    );

    insertedCount += chunk.length;
    if (insertedCount % 1000 === 0 || insertedCount === preparedMovies.length) {
      console.log(`    Processed ${insertedCount}/${preparedMovies.length} movies into DB...`);
    }
  }

  const finalTotal = await db.movie.count();
  console.log(`\n✅ [Catalog Seed Completed] Local DB Movie count is now: ${finalTotal}`);
  return finalTotal;
}

// Direct execution CLI support
if (require.main === module || process.argv[1]?.includes("catalog-seed")) {
  const force = process.argv.includes("--force");
  seedLocalCatalog(force)
    .then((count) => {
      console.log(`Done. Total movies in DB: ${count}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}
