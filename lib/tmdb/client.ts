import { db } from "@/lib/db/client";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  popularity: number;
  vote_average: number;
  overview?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
}

export interface CachedMovieData {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  popularity: number;
  voteAverage: number;
  metadata: Record<string, unknown>;
}

// Structured high-quality fallback movies for development when TMDB_API_KEY is omitted
const FALLBACK_MOVIES: TMDBMovie[] = [
  {
    id: 157336,
    title: "Interstellar",
    original_title: "Interstellar",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop_path: "/xJHokMbljvjADYdit5fKSuVQwOZ.jpg",
    release_date: "2014-11-05",
    popularity: 145.2,
    vote_average: 8.4,
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.",
    genres: [{ id: 12, name: "Adventure" }, { id: 18, name: "Drama" }, { id: 878, name: "Science Fiction" }],
    runtime: 169,
  },
  {
    id: 27205,
    title: "Inception",
    original_title: "Inception",
    poster_path: "/lFw5UwTslwDmC22eaDhKVyYhZ43.jpg",
    backdrop_path: "/8ZTVqvKDQ8emSGUEMjsR4yHA8jZ.jpg",
    release_date: "2010-07-15",
    popularity: 128.5,
    vote_average: 8.4,
    overview: "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets, is offered a chance to regain his old life.",
    genres: [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }, { id: 12, name: "Adventure" }],
    runtime: 148,
  },
  {
    id: 550,
    title: "Fight Club",
    original_title: "Fight Club",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/hZkgoQY85WAgW2sJBehSFvYmF2z.jpg",
    release_date: "1999-10-15",
    popularity: 92.1,
    vote_average: 8.4,
    overview: "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.",
    genres: [{ id: 18, name: "Drama" }],
    runtime: 139,
  },
  {
    id: 680,
    title: "Pulp Fiction",
    original_title: "Pulp Fiction",
    poster_path: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    backdrop_path: "/suaEOtk1N1sgg2MTM7oZd2cf4p3.jpg",
    release_date: "1994-09-10",
    popularity: 110.4,
    vote_average: 8.5,
    overview: "A burger-loving hitman, his philosophical partner, a bruised boxer and a washed-up actress become entwined in four tales of violence and redemption.",
    genres: [{ id: 80, name: "Crime" }, { id: 18, name: "Drama" }],
    runtime: 154,
  },
  {
    id: 155,
    title: "The Dark Knight",
    original_title: "The Dark Knight",
    poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdrop_path: "/dq20wZ1vBld2v2Jy6j2D2jQ5N.jpg",
    release_date: "2008-07-16",
    popularity: 132.8,
    vote_average: 8.5,
    overview: "Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.",
    genres: [{ id: 18, name: "Drama" }, { id: 28, name: "Action" }, { id: 80, name: "Crime" }],
    runtime: 152,
  },
];

/**
 * Server-side TMDB Client
 * Strictly executed on the server. TMDB_API_KEY is kept private.
 */
export class TMDBClient {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || "";
  }

  /**
   * Fetches popular movies from TMDB API server-side.
   * If key is absent, uses fallback static movies for seamless dev experience.
   */
  public async getPopularMovies(page: number = 1): Promise<TMDBMovie[]> {
    if (!this.apiKey) {
      console.info("[TMDB Server Client] TMDB_API_KEY is not set. Using fallback dev dataset.");
      return FALLBACK_MOVIES;
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/movie/popular?api_key=${this.apiKey}&language=en-US&page=${page}`,
        { next: { revalidate: 3600 } }
      );

      if (!response.ok) {
        throw new Error(`TMDB API response failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("[TMDB Server Client] Error fetching popular movies:", error);
      return FALLBACK_MOVIES;
    }
  }

  /**
   * Upserts TMDB movie metadata into local PostgreSQL `Movie` table.
   */
  public async syncMovieToDatabase(tmdbMovie: TMDBMovie): Promise<CachedMovieData> {
    const releaseYear = tmdbMovie.release_date
      ? parseInt(tmdbMovie.release_date.substring(0, 4), 10)
      : null;

    const movie = await db.movie.upsert({
      where: { tmdbId: tmdbMovie.id },
      update: {
        title: tmdbMovie.title,
        originalTitle: tmdbMovie.original_title,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseYear: releaseYear && !isNaN(releaseYear) ? releaseYear : null,
        popularity: tmdbMovie.popularity || 0.0,
        voteAverage: tmdbMovie.vote_average || 0.0,
        metadata: {
          overview: tmdbMovie.overview || "",
          genres: tmdbMovie.genres || tmdbMovie.genre_ids || [],
          runtime: tmdbMovie.runtime || null,
        },
      },
      create: {
        tmdbId: tmdbMovie.id,
        title: tmdbMovie.title,
        originalTitle: tmdbMovie.original_title,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseYear: releaseYear && !isNaN(releaseYear) ? releaseYear : null,
        popularity: tmdbMovie.popularity || 0.0,
        voteAverage: tmdbMovie.vote_average || 0.0,
        metadata: {
          overview: tmdbMovie.overview || "",
          genres: tmdbMovie.genres || tmdbMovie.genre_ids || [],
          runtime: tmdbMovie.runtime || null,
        },
      },
    });

    return {
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle,
      posterPath: movie.posterPath,
      backdropPath: movie.backdropPath,
      releaseYear: movie.releaseYear,
      popularity: movie.popularity,
      voteAverage: movie.voteAverage,
      metadata: movie.metadata as Record<string, unknown>,
    };
  }

  /**
   * Synchronizes candidate pool and returns synced DB movies.
   */
  public async seedAndFetchMovies(): Promise<CachedMovieData[]> {
    const tmdbList = await this.getPopularMovies(1);
    const syncedMovies: CachedMovieData[] = [];

    for (const m of tmdbList) {
      const synced = await this.syncMovieToDatabase(m);
      syncedMovies.push(synced);
    }

    return syncedMovies;
  }
}

export const tmdbClient = new TMDBClient();
