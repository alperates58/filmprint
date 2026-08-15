import { db } from "@/lib/db/client";
import { getTMDBApiKey } from "@/lib/config/service";
import {
  TMDBTvShow,
  CachedTvShowData,
  TMDBTvDetails,
  TV_GENRE_MAP,
} from "./types";
import { COMPREHENSIVE_FALLBACK_TV_SHOWS } from "./fallback-catalog";
import { isValidTmdbImagePath } from "@/lib/tmdb/image";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

export const FALLBACK_TV_SHOWS: TMDBTvShow[] = COMPREHENSIVE_FALLBACK_TV_SHOWS;

/**
 * Server-side TMDB TV Client.
 * Fully isolated from the Movie client.
 */
export class TMDBTvClient {
  private async resolveApiKey(): Promise<string> {
    try {
      const dbKey = await getTMDBApiKey();
      if (dbKey) return dbKey;
    } catch (e) {
      console.error("[TMDB TV Client] Error resolving API key from config service:", e);
    }
    return process.env.TMDB_API_KEY || "";
  }

  /**
   * Fetches full details, credits (cast & creators), and trailers for a TV show.
   */
  public async getTvDetails(tmdbId: number): Promise<TMDBTvDetails> {
    const apiKey = await this.resolveApiKey();

    if (!apiKey) {
      return {
        numberOfSeasons: null,
        numberOfEpisodes: null,
        episodeRunTime: null,
        creators: [],
        cast: [],
        trailer: null,
      };
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=tr-TR&append_to_response=credits,videos`,
        { next: { revalidate: 86400 } }
      );

      if (!response.ok) {
        return {
          numberOfSeasons: null,
          numberOfEpisodes: null,
          episodeRunTime: null,
          creators: [],
          cast: [],
          trailer: null,
        };
      }

      const data = await response.json();
      const numberOfSeasons = data.number_of_seasons || null;
      const numberOfEpisodes = data.number_of_episodes || null;
      const episodeRunTime =
        Array.isArray(data.episode_run_time) && data.episode_run_time.length > 0
          ? data.episode_run_time[0]
          : null;

      // Extract creators
      const creators: string[] = [];
      if (data.created_by && Array.isArray(data.created_by)) {
        data.created_by.forEach((c: any) => {
          if (c.name) creators.push(c.name);
        });
      }

      // Extract top 8 cast members
      const cast: { name: string; character: string; profilePath: string | null }[] = [];
      if (data.credits?.cast && Array.isArray(data.credits.cast)) {
        data.credits.cast.slice(0, 8).forEach((actor: any) => {
          cast.push({
            name: actor.name,
            character: actor.character || "",
            profilePath: actor.profile_path || null,
          });
        });
      }

      // Extract trailer
      let trailer: { provider: "youtube"; key: string } | null = null;
      if (data.videos?.results && Array.isArray(data.videos.results)) {
        const videos = data.videos.results;

        let targetVideo = videos.find(
          (v: any) => v.site === "YouTube" && v.type === "Trailer" && v.official === true
        );

        if (!targetVideo) {
          targetVideo = videos.find(
            (v: any) => v.site === "YouTube" && v.type === "Trailer"
          );
        }

        if (!targetVideo) {
          targetVideo = videos.find(
            (v: any) => v.site === "YouTube" && v.type === "Teaser"
          );
        }

        if (!targetVideo) {
          targetVideo = videos.find((v: any) => v.site === "YouTube" && v.key);
        }

        if (targetVideo && targetVideo.key) {
          trailer = {
            provider: "youtube",
            key: targetVideo.key,
          };
        }
      }

      return {
        numberOfSeasons,
        numberOfEpisodes,
        episodeRunTime,
        creators,
        cast,
        trailer,
      };
    } catch (e) {
      console.error("[TMDB TV Client] Error fetching TV details:", e);
      return {
        numberOfSeasons: null,
        numberOfEpisodes: null,
        episodeRunTime: null,
        creators: [],
        cast: [],
        trailer: null,
      };
    }
  }

  /**
   * Fetches popular TV shows from TMDB API server-side with explicit include_adult=false.
   */
  public async getPopularTv(page: number = 1): Promise<TMDBTvShow[]> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      return FALLBACK_TV_SHOWS;
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/tv/popular?api_key=${apiKey}&language=tr-TR&page=${page}&include_adult=false`,
        { next: { revalidate: 3600 } }
      );

      if (!response.ok) {
        throw new Error(`TMDB TV API response failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("[TMDB TV Server Client] Error fetching popular TV shows:", error);
      return FALLBACK_TV_SHOWS;
    }
  }

  /**
   * Fetches top rated TV shows across all eras from TMDB API server-side with explicit include_adult=false.
   */
  public async getTopRatedTv(page: number = 1): Promise<TMDBTvShow[]> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      return FALLBACK_TV_SHOWS;
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/tv/top_rated?api_key=${apiKey}&language=tr-TR&page=${page}&include_adult=false`,
        { next: { revalidate: 3600 } }
      );

      if (!response.ok) return FALLBACK_TV_SHOWS;

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("[TMDB TV Server Client] Error fetching top rated TV shows:", error);
      return FALLBACK_TV_SHOWS;
    }
  }

  /**
   * Discovers TV shows using flexible query filters with explicit include_adult=false.
   */
  public async discoverTv(
    params: Record<string, string | number | boolean> = {}
  ): Promise<TMDBTvShow[]> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      return FALLBACK_TV_SHOWS;
    }

    try {
      const queryParams = new URLSearchParams({
        api_key: apiKey,
        language: "tr-TR",
        include_adult: "false",
        ...Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        ),
      });

      const response = await fetch(
        `${TMDB_API_BASE}/discover/tv?${queryParams.toString()}`,
        { next: { revalidate: 3600 } }
      );

      if (!response.ok) return FALLBACK_TV_SHOWS;

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("[TMDB TV Server Client] Error discovering TV shows:", error);
      return FALLBACK_TV_SHOWS;
    }
  }

  /**
   * Upserts TMDB TV show metadata into local PostgreSQL `TvShow` table.
   */
  public async syncTvShowToDatabase(tmdbShow: TMDBTvShow): Promise<CachedTvShowData> {
    const genreNames: string[] = [];
    if (tmdbShow.genres && tmdbShow.genres.length > 0) {
      tmdbShow.genres.forEach((g) => genreNames.push(g.name));
    } else if (tmdbShow.genre_ids && tmdbShow.genre_ids.length > 0) {
      tmdbShow.genre_ids.forEach((id) => {
        if (TV_GENRE_MAP[id]) genreNames.push(TV_GENRE_MAP[id]);
      });
    }

    const overviewText = tmdbShow.overview || "Dizi hakkında özet bilgi bulunmuyor.";

    const show = await db.tvShow.upsert({
      where: { tmdbId: tmdbShow.id },
      update: {
        name: tmdbShow.name,
        originalName: tmdbShow.original_name || null,
        posterPath: tmdbShow.poster_path,
        backdropPath: tmdbShow.backdrop_path,
        firstAirDate: tmdbShow.first_air_date || null,
        lastAirDate: tmdbShow.last_air_date || null,
        status: tmdbShow.status || null,
        originalLanguage: tmdbShow.original_language || null,
        popularity: tmdbShow.popularity || 0.0,
        voteAverage: tmdbShow.vote_average || 0.0,
        voteCount: tmdbShow.vote_count || null,
        overview: overviewText,
        metadata: {
          overview: overviewText,
          genres: genreNames,
          numberOfSeasons: tmdbShow.number_of_seasons || null,
          numberOfEpisodes: tmdbShow.number_of_episodes || null,
          episodeRunTime: tmdbShow.episode_run_time || null,
          originCountry: tmdbShow.origin_country || [],
          createdBy: tmdbShow.created_by || [],
          adult: tmdbShow.adult === true,
        },
      },
      create: {
        tmdbId: tmdbShow.id,
        name: tmdbShow.name,
        originalName: tmdbShow.original_name || null,
        posterPath: tmdbShow.poster_path,
        backdropPath: tmdbShow.backdrop_path,
        firstAirDate: tmdbShow.first_air_date || null,
        lastAirDate: tmdbShow.last_air_date || null,
        status: tmdbShow.status || null,
        originalLanguage: tmdbShow.original_language || null,
        popularity: tmdbShow.popularity || 0.0,
        voteAverage: tmdbShow.vote_average || 0.0,
        voteCount: tmdbShow.vote_count || null,
        overview: overviewText,
        metadata: {
          overview: overviewText,
          genres: genreNames,
          numberOfSeasons: tmdbShow.number_of_seasons || null,
          numberOfEpisodes: tmdbShow.number_of_episodes || null,
          episodeRunTime: tmdbShow.episode_run_time || null,
          originCountry: tmdbShow.origin_country || [],
          createdBy: tmdbShow.created_by || [],
          adult: tmdbShow.adult === true,
        },
      },
    });

    const metaObj = (show.metadata as Record<string, unknown>) || {};

    return {
      id: show.id,
      tmdbId: show.tmdbId,
      name: show.name,
      originalName: show.originalName,
      posterPath: show.posterPath,
      backdropPath: show.backdropPath,
      firstAirDate: show.firstAirDate,
      lastAirDate: show.lastAirDate,
      status: show.status,
      originalLanguage: show.originalLanguage,
      popularity: show.popularity,
      voteAverage: show.voteAverage,
      voteCount: show.voteCount,
      overview: show.overview,
      genres: (metaObj.genres as string[]) || genreNames,
      numberOfSeasons: (metaObj.numberOfSeasons as number | null) || null,
      numberOfEpisodes: (metaObj.numberOfEpisodes as number | null) || null,
      metadata: metaObj,
    };
  }

  /**
   * Cache-First TV Show Resolution.
   * 1. Query local PostgreSQL `TvShow` table first.
   * 2. If exists, return cached data immediately (zero TMDB network calls).
   * 3. If missing, fetch from TMDB, normalize, upsert into `TvShow`, and return.
   */
  public async getOrFetchTvShow(tmdbId: number): Promise<CachedTvShowData | null> {
    // 1. Local Cache Lookup First
    const cached = await db.tvShow.findUnique({
      where: { tmdbId },
    });

    const hasInvalidPoster =
      !cached ||
      !isValidTmdbImagePath(cached.posterPath);

    if (cached && !hasInvalidPoster) {
      const metaObj = (cached.metadata as Record<string, unknown>) || {};
      return {
        id: cached.id,
        tmdbId: cached.tmdbId,
        name: cached.name,
        originalName: cached.originalName,
        posterPath: cached.posterPath,
        backdropPath: cached.backdropPath,
        firstAirDate: cached.firstAirDate,
        lastAirDate: cached.lastAirDate,
        status: cached.status,
        originalLanguage: cached.originalLanguage,
        popularity: cached.popularity,
        voteAverage: cached.voteAverage,
        voteCount: cached.voteCount,
        overview: cached.overview,
        genres: (metaObj.genres as string[]) || [],
        numberOfSeasons: (metaObj.numberOfSeasons as number | null) || null,
        numberOfEpisodes: (metaObj.numberOfEpisodes as number | null) || null,
        metadata: metaObj,
      };
    }

    // 2. Fetch from TMDB if not in local cache
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      // Fallback check
      const fallback = FALLBACK_TV_SHOWS.find((f) => f.id === tmdbId);
      if (fallback) {
        return this.syncTvShowToDatabase(fallback);
      }
      return null;
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=tr-TR`,
        { next: { revalidate: 86400 } }
      );

      if (!response.ok) {
        const fallback = FALLBACK_TV_SHOWS.find((f) => f.id === tmdbId);
        if (fallback) return this.syncTvShowToDatabase(fallback);
        return null;
      }

      const data: TMDBTvShow = await response.json();
      return this.syncTvShowToDatabase(data);
    } catch (e) {
      console.error(`[TMDB TV Client] Error fetching show ${tmdbId}:`, e);
      const fallback = FALLBACK_TV_SHOWS.find((f) => f.id === tmdbId);
      if (fallback) return this.syncTvShowToDatabase(fallback);
      return null;
    }
  }

  /**
   * Synchronizes candidate pool dynamically using multi-stream discovery and page rotation.
   * Fetches diverse, high-quality TV shows across popular, top-rated, and key genre discovery streams.
   * Guarantees idempotency and deduplication.
   */
  public async seedAndFetchTvShows(options?: {
    forceFullSeed?: boolean;
    targetCount?: number;
  }): Promise<CachedTvShowData[]> {
    const apiKey = await this.resolveApiKey();
    const syncedShows: CachedTvShowData[] = [];
    const processedIds = new Set<number>();

    // 1. Always ensure all 105+ iconic fallback shows are synced in local DB
    for (const fallback of COMPREHENSIVE_FALLBACK_TV_SHOWS) {
      if (!processedIds.has(fallback.id)) {
        processedIds.add(fallback.id);
        const synced = await this.syncTvShowToDatabase(fallback);
        syncedShows.push(synced);
      }
    }

    // 2. If TMDB API key is available, fetch live dynamic multi-stream pool
    if (apiKey) {
      try {
        const existingCount = await db.tvShow.count();
        // Dynamic page rotation: cycles across pages 1..10 to constantly bring varied quality titles
        const basePage = ((Math.floor(existingCount / 20)) % 10) + 1;
        const nextPage = (basePage % 10) + 1;

        const [popA, popB, topA, topB, drama, crime, mystery, scifi, comedy, animation] =
          await Promise.all([
            this.getPopularTv(basePage),
            this.getPopularTv(nextPage),
            this.getTopRatedTv(basePage),
            this.getTopRatedTv(nextPage),
            this.discoverTv({ with_genres: "18", sort_by: "popularity.desc", "vote_count.gte": 30, page: basePage }),
            this.discoverTv({ with_genres: "80", sort_by: "popularity.desc", "vote_count.gte": 30, page: basePage }),
            this.discoverTv({ with_genres: "9648", sort_by: "popularity.desc", "vote_count.gte": 30, page: basePage }),
            this.discoverTv({ with_genres: "10765", sort_by: "popularity.desc", "vote_count.gte": 30, page: basePage }),
            this.discoverTv({ with_genres: "35", sort_by: "popularity.desc", "vote_count.gte": 30, page: basePage }),
            this.discoverTv({ with_genres: "16", sort_by: "popularity.desc", "vote_count.gte": 30, page: basePage }),
          ]);

        const combined = [
          ...popA,
          ...popB,
          ...topA,
          ...topB,
          ...drama,
          ...crime,
          ...mystery,
          ...scifi,
          ...comedy,
          ...animation,
        ];

        for (const s of combined) {
          if (!processedIds.has(s.id)) {
            processedIds.add(s.id);
            const synced = await this.syncTvShowToDatabase(s);
            syncedShows.push(synced);
          }
        }
      } catch (err) {
        console.error("[TMDB TV Client] Error during multi-stream replenishment:", err);
      }
    }

    return syncedShows;
  }
}

export const tmdbTvClient = new TMDBTvClient();
