import { db } from "@/lib/db/client";
import { getTMDBApiKey } from "@/lib/config/service";
import { evaluateContentIngestionSafety } from "@/lib/content/ingestion-safety";
import { isMeaningfulOverview, normalizeOverviewForPersistence } from "@/lib/content/overview-safety";
import { isDisplayTitleAllowed } from "@/lib/content/title-safety";
import {
  TMDBTvShow,
  CachedTvShowData,
  TMDBTvDetails,
  TV_GENRE_MAP,
} from "./types";
import { resolveCanonicalGenreIds } from "@/lib/catalog/genres";
import { pickTmdbCertification, evaluateContentSafety } from "@/lib/content/safety";
import {
  computeCalibrationPriorityScore,
  generateSearchNormalizedTitle,
} from "@/lib/calibration/priority";
import { isValidTmdbImagePath } from "@/lib/tmdb/image";

import {
  fetchTmdbTvJson,
  normalizeTmdbTvCursor,
  runTmdbTvSourceRotation,
  TmdbTvRequestError,
  type TmdbTvReplenishmentCursor,
  type TmdbTvRequestMetrics,
  type TmdbTvSourceRequest,
} from "./replenishment";
import {
  fetchLocalizedTmdbTvShow,
  localizeTmdbTvShow,
  mergeTmdbTvLocalization,
  type LocalizedTmdbTvShow,
} from "./localization";
import { resolveLocalizedTrailer } from "@/lib/tmdb/trailer";
import { COMPREHENSIVE_FALLBACK_TV_SHOWS } from "./fallback-catalog";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_TV_CURSOR_SETTING_KEY = "tmdb_tv_calibration_cursor_v1";

export const FALLBACK_TV_SHOWS: TMDBTvShow[] = COMPREHENSIVE_FALLBACK_TV_SHOWS;

/**
 * Server-side TMDB TV Client.
 * Fully isolated from the Movie client.
 */
export class TMDBTvClient {
  private createRequestMetrics(): TmdbTvRequestMetrics {
    return { httpAttempts: 0, retries: 0, rateLimited: 0, failures: 0 };
  }

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
        localization: null,
      };
    }

    try {
      let englishDetail: (TMDBTvShow & { videos?: { results?: Array<Record<string, any>> } }) | null = null;
      const localized = await fetchLocalizedTmdbTvShow(async (language) => {
        const detail = await fetchTmdbTvJson<TMDBTvShow & {
          videos?: { results?: Array<Record<string, any>> };
          content_ratings?: { results?: Array<Record<string, any>> };
          keywords?: { results?: Array<{ id: number; name: string }> };
        }>(
          `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=${language}${
            language === "tr-TR"
              ? "&append_to_response=credits,videos,content_ratings,keywords"
              : "&append_to_response=videos,content_ratings,keywords"
          }`
        );
        if (language === "en-US") englishDetail = detail as any;
        return detail;
      });
      const data = localized.show as TMDBTvShow & {
        credits?: { cast?: Array<Record<string, any>> };
        videos?: { results?: Array<Record<string, any>> };
        content_ratings?: { results?: Array<Record<string, any>> };
        keywords?: { results?: Array<{ id: number; name: string }> };
      };
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
      const cast: { id?: number; name: string; character: string; profilePath: string | null }[] = [];
      if (data.credits?.cast && Array.isArray(data.credits.cast)) {
        data.credits.cast.slice(0, 8).forEach((actor: any) => {
          cast.push({
            id: actor.id || undefined,
            name: actor.name,
            character: actor.character || "",
            profilePath: actor.profile_path || null,
          });
        });
      }

      const trailerResolution = await resolveLocalizedTrailer(
        data.videos?.results,
        async () => {
          if (!englishDetail) {
            englishDetail = await fetchTmdbTvJson<TMDBTvShow & { videos?: { results?: Array<Record<string, any>> } }>(
              `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=en-US&append_to_response=videos,content_ratings,keywords`
            );
          }
          return englishDetail?.videos?.results || [];
        }
      );
      const trailer = trailerResolution.trailer
        ? { provider: "youtube" as const, key: trailerResolution.trailer.key }
        : null;

      return {
        numberOfSeasons,
        numberOfEpisodes,
        episodeRunTime,
        creators,
        cast,
        trailer,
        localization: {
          name: localized.show.name,
          originalName: localized.show.original_name,
          overview: localized.show.overview || "",
          turkishTitle: localized.turkishTitle,
          englishTitle: localized.englishTitle,
          titleSource: localized.titleSource,
          overviewSource: localized.overviewSource,
          adult: localized.show.adult === true,
        },
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
        localization: null,
      };
    }
  }

  /**
   * Fetches high-relevance recommendations and similar TV shows for a given TMDB show ID.
   * Combines /tv/{id}/recommendations and /tv/{id}/similar with adult filtering and deduplication.
   */
  public async getSimilarAndRecommendedTvShows(
    tmdbId: number,
    limit: number = 12
  ): Promise<TMDBTvShow[]> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) return [];

    try {
      const [recRes, simRes] = await Promise.allSettled([
        fetchTmdbTvJson<{ results?: TMDBTvShow[] }>(
          `${TMDB_API_BASE}/tv/${tmdbId}/recommendations?api_key=${apiKey}&language=tr-TR&page=1`
        ),
        fetchTmdbTvJson<{ results?: TMDBTvShow[] }>(
          `${TMDB_API_BASE}/tv/${tmdbId}/similar?api_key=${apiKey}&language=tr-TR&page=1`
        ),
      ]);

      const candidates: TMDBTvShow[] = [];
      const seenIds = new Set<number>([tmdbId]);

      if (recRes.status === "fulfilled" && Array.isArray(recRes.value.results)) {
        for (const item of recRes.value.results) {
          if (
            item.id &&
            !seenIds.has(item.id) &&
            item.poster_path &&
            !item.adult &&
            (item.name || item.original_name)
          ) {
            seenIds.add(item.id);
            candidates.push(item);
          }
        }
      }

      if (simRes.status === "fulfilled" && Array.isArray(simRes.value.results)) {
        for (const item of simRes.value.results) {
          if (
            item.id &&
            !seenIds.has(item.id) &&
            item.poster_path &&
            !item.adult &&
            (item.name || item.original_name)
          ) {
            seenIds.add(item.id);
            candidates.push(item);
          }
        }
      }

      return candidates.slice(0, limit);
    } catch (error) {
      console.error("[TMDB TV Client] Error fetching similar/recommended TV shows:", error);
      return [];
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
      const data = await fetchTmdbTvJson<{ results?: TMDBTvShow[] }>(
        `${TMDB_API_BASE}/tv/popular?api_key=${apiKey}&language=tr-TR&page=${page}&include_adult=false`
      );
      return data.results || [];
    } catch (error) {
      console.error("[TMDB TV Server Client] Error fetching popular TV shows:", error);
      return [];
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
      const data = await fetchTmdbTvJson<{ results?: TMDBTvShow[] }>(
        `${TMDB_API_BASE}/tv/top_rated?api_key=${apiKey}&language=tr-TR&page=${page}&include_adult=false`
      );
      return data.results || [];
    } catch (error) {
      console.error("[TMDB TV Server Client] Error fetching top rated TV shows:", error);
      return [];
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

      const data = await fetchTmdbTvJson<{ results?: TMDBTvShow[] }>(
        `${TMDB_API_BASE}/discover/tv?${queryParams.toString()}`
      );
      return data.results || [];
    } catch (error) {
      console.error("[TMDB TV Server Client] Error discovering TV shows:", error);
      return [];
    }
  }

  /**
   * Upserts TMDB TV show metadata into local PostgreSQL `TvShow` table.
   */
  public async syncTvShowToDatabase(
    tmdbShow: TMDBTvShow,
    localization: LocalizedTmdbTvShow = mergeTmdbTvLocalization(tmdbShow)
  ): Promise<CachedTvShowData | null> {
    const safety = evaluateContentIngestionSafety({
      localizedTitle: localization.turkishTitle || tmdbShow.name,
      englishTitle: localization.englishTitle,
      originalTitle: tmdbShow.original_name,
      overview: tmdbShow.overview,
      adult: tmdbShow.adult,
    });

    // This guard must run before the upsert so rejected content never reaches DB.
    if (!safety.allowed || !safety.displayTitle) return null;

    const displayTitle = safety.displayTitle.title;
    const genreNames: string[] = [];
    if (tmdbShow.genres && tmdbShow.genres.length > 0) {
      tmdbShow.genres.forEach((g) => genreNames.push(g.name));
    } else if (tmdbShow.genre_ids && tmdbShow.genre_ids.length > 0) {
      tmdbShow.genre_ids.forEach((id) => {
        if (TV_GENRE_MAP[id]) genreNames.push(TV_GENRE_MAP[id]);
      });
    }

    // Extract canonical TV genre IDs
    const canonicalGenreIds = resolveCanonicalGenreIds(
      tmdbShow.genre_ids || tmdbShow.genres || [],
      "TV"
    );

    const discoveryExclusionReasons: string[] = [];
    if (canonicalGenreIds.includes(10762)) discoveryExclusionReasons.push("KIDS_CONTENT");
    if (canonicalGenreIds.includes(10763)) discoveryExclusionReasons.push("NEWS_CONTENT");
    if (canonicalGenreIds.includes(10767)) discoveryExclusionReasons.push("TALK_SHOW_CONTENT");
    const discoveryEligible = discoveryExclusionReasons.length === 0;

    const overviewText = normalizeOverviewForPersistence(tmdbShow.overview);
    const existingShow = await db.tvShow.findUnique({
      where: { tmdbId: tmdbShow.id },
      select: { metadata: true },
    });
    const existingMetadata =
      existingShow?.metadata &&
      typeof existingShow.metadata === "object" &&
      !Array.isArray(existingShow.metadata)
        ? (existingShow.metadata as Record<string, unknown>)
        : {};
    const localizedMetadata = {
      ...existingMetadata,
      overview: overviewText,
      genres: genreNames,
      numberOfSeasons: tmdbShow.number_of_seasons || null,
      numberOfEpisodes: tmdbShow.number_of_episodes || null,
      episodeRunTime: tmdbShow.episode_run_time || null,
      originCountry: tmdbShow.origin_country || [],
      createdBy: tmdbShow.created_by || [],
      adult: tmdbShow.adult === true,
      titleLocalizationSource: localization.titleSource,
      overviewLocalizationSource: localization.overviewSource,
      turkishTitle: localization.turkishTitle,
      englishTitle: localization.englishTitle,
      discoveryEligible,
      discoveryExclusionReasons,
    };

    // Extract Certification & Content Safety V2
    const cert = pickTmdbCertification(tmdbShow, "TV");
    const safetyV2 = evaluateContentSafety({
      adult: tmdbShow.adult,
      contentRating: cert.contentRating,
      normalizedMinimumAge: cert.normalizedMinimumAge,
      title: displayTitle,
      originalTitle: tmdbShow.original_name,
      englishTitle: localization.englishTitle,
      overview: tmdbShow.overview,
      genres: canonicalGenreIds,
    });

    const firstAirYear = tmdbShow.first_air_date
      ? parseInt(tmdbShow.first_air_date.substring(0, 4), 10)
      : null;

    const voteCount = tmdbShow.vote_count || 0;
    const voteAverage = tmdbShow.vote_average || 0.0;
    const popularity = tmdbShow.popularity || 0.0;

    const calibrationPriorityScore = computeCalibrationPriorityScore({
      popularity,
      voteAverage,
      voteCount,
      releaseYear: firstAirYear && !isNaN(firstAirYear) ? firstAirYear : null,
      safetyLevel: safetyV2.safetyLevel,
      normalizedMinimumAge: safetyV2.normalizedMinimumAge,
      adult: tmdbShow.adult,
    });

    const searchNormalizedTitle = generateSearchNormalizedTitle(
      displayTitle,
      tmdbShow.original_name,
      localization.englishTitle
    );

    const show = await db.tvShow.upsert({
      where: { tmdbId: tmdbShow.id },
      update: {
        name: displayTitle,
        originalName: tmdbShow.original_name || null,
        posterPath: tmdbShow.poster_path,
        backdropPath: tmdbShow.backdrop_path,
        firstAirDate: tmdbShow.first_air_date || null,
        firstAirYear: firstAirYear && !isNaN(firstAirYear) ? firstAirYear : null,
        lastAirDate: tmdbShow.last_air_date || null,
        status: tmdbShow.status || null,
        originalLanguage: tmdbShow.original_language || null,
        popularity,
        voteAverage,
        voteCount,
        genreIds: canonicalGenreIds,
        adult: tmdbShow.adult === true || safetyV2.safetyLevel === "ADULT",
        contentRating: safetyV2.contentRating,
        normalizedMinimumAge: safetyV2.normalizedMinimumAge,
        safetyLevel: safetyV2.safetyLevel,
        calibrationPriorityScore,
        searchNormalizedTitle,
        overview: overviewText,
        metadata: localizedMetadata,
      },
      create: {
        tmdbId: tmdbShow.id,
        name: displayTitle,
        originalName: tmdbShow.original_name || null,
        posterPath: tmdbShow.poster_path,
        backdropPath: tmdbShow.backdrop_path,
        firstAirDate: tmdbShow.first_air_date || null,
        firstAirYear: firstAirYear && !isNaN(firstAirYear) ? firstAirYear : null,
        lastAirDate: tmdbShow.last_air_date || null,
        status: tmdbShow.status || null,
        originalLanguage: tmdbShow.original_language || null,
        popularity,
        voteAverage,
        voteCount,
        genreIds: canonicalGenreIds,
        adult: tmdbShow.adult === true || safetyV2.safetyLevel === "ADULT",
        contentRating: safetyV2.contentRating,
        normalizedMinimumAge: safetyV2.normalizedMinimumAge,
        safetyLevel: safetyV2.safetyLevel,
        calibrationPriorityScore,
        searchNormalizedTitle,
        overview: overviewText,
        metadata: localizedMetadata,
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
    const needsLocalizationRepair =
      !cached ||
      !isMeaningfulOverview(cached.overview) ||
      !isDisplayTitleAllowed(cached.name);

    if (cached && !hasInvalidPoster && !needsLocalizationRepair) {
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
      const localized = await fetchLocalizedTmdbTvShow((language) =>
        fetchTmdbTvJson<TMDBTvShow>(
          `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=${language}`
        )
      );
      return this.syncTvShowToDatabase(localized.show, localized);
    } catch (e) {
      console.error(`[TMDB TV Client] Error fetching show ${tmdbId}:`, e);
      const fallback = FALLBACK_TV_SHOWS.find((f) => f.id === tmdbId);
      if (fallback) return this.syncTvShowToDatabase(fallback);
      return null;
    }
  }

  private async loadReplenishmentCursor(): Promise<TmdbTvReplenishmentCursor> {
    const setting = await db.systemSetting.findUnique({
      where: { key: TMDB_TV_CURSOR_SETTING_KEY },
      select: { value: true },
    });

    if (!setting) return normalizeTmdbTvCursor(null);

    try {
      return normalizeTmdbTvCursor(JSON.parse(setting.value));
    } catch {
      return normalizeTmdbTvCursor(null);
    }
  }

  private async saveReplenishmentCursor(
    cursor: TmdbTvReplenishmentCursor
  ): Promise<void> {
    await db.systemSetting.upsert({
      where: { key: TMDB_TV_CURSOR_SETTING_KEY },
      update: { value: JSON.stringify(cursor) },
      create: {
        key: TMDB_TV_CURSOR_SETTING_KEY,
        value: JSON.stringify(cursor),
        metadata: { purpose: "TV calibration TMDB source/page rotation" },
      },
    });
  }

  private async fetchReplenishmentSource(
    apiKey: string,
    request: TmdbTvSourceRequest,
    metrics: TmdbTvRequestMetrics
  ): Promise<TMDBTvShow[]> {
    let path: string;
    if (request.source === "popular") {
      path = `/tv/popular?api_key=${apiKey}&language=tr-TR&page=${request.page}&include_adult=false`;
    } else if (request.source === "top_rated") {
      path = `/tv/top_rated?api_key=${apiKey}&language=tr-TR&page=${request.page}&include_adult=false`;
    } else {
      const query = new URLSearchParams({
        api_key: apiKey,
        language: "tr-TR",
        include_adult: "false",
        with_genres: request.genreId || "",
        sort_by: "popularity.desc",
        "vote_count.gte": "30",
        page: String(request.page),
      });
      path = `/discover/tv?${query.toString()}`;
    }

    try {
      const data = await fetchTmdbTvJson<{ results?: TMDBTvShow[] }>(
        `${TMDB_API_BASE}${path}`,
        { metrics }
      );
      return data.results || [];
    } catch (error) {
      metrics.failures++;
      const structuredError =
        error instanceof TmdbTvRequestError
          ? {
              source: request.source,
              page: request.page,
              status: error.status,
              attempts: error.attempts,
              message: error.message,
            }
          : { source: request.source, page: request.page, message: String(error) };
      console.error("[TMDB TV Replenishment Request Failed]", structuredError);
      throw error;
    }
  }

  private async syncSourceShows(
    shows: TMDBTvShow[],
    apiKey: string,
    metrics: TmdbTvRequestMetrics
  ): Promise<{
    synced: CachedTvShowData[];
    newUniqueIds: number;
  }> {
    const uniqueShows = Array.from(new Map(shows.map((show) => [show.id, show])).values());
    const existing = await db.tvShow.findMany({
      where: { tmdbId: { in: uniqueShows.map((show) => show.id) } },
      select: { tmdbId: true },
    });
    const existingIds = new Set(existing.map((show) => show.tmdbId));
    const synced: CachedTvShowData[] = [];
    let newUniqueIds = 0;

    for (const show of uniqueShows) {
      let localized: LocalizedTmdbTvShow;
      try {
        localized = await localizeTmdbTvShow(show, () =>
          fetchTmdbTvJson<TMDBTvShow>(
            `${TMDB_API_BASE}/tv/${show.id}?api_key=${apiKey}&language=en-US`,
            { metrics }
          )
        );
      } catch (error) {
        // A failed optional English fallback must not discard usable Turkish/original metadata.
        localized = mergeTmdbTvLocalization(show, null, true);
      }
      const syncedShow = await this.syncTvShowToDatabase(localized.show, localized);
      if (!syncedShow) continue;
      synced.push(syncedShow);
      if (!existingIds.has(show.id)) newUniqueIds++;
    }

    return { synced, newUniqueIds };
  }

  private async syncEmergencyFallback(): Promise<CachedTvShowData[]> {
    const synced: CachedTvShowData[] = [];
    for (const fallback of COMPREHENSIVE_FALLBACK_TV_SHOWS) {
      const localized = mergeTmdbTvLocalization(fallback);
      const syncedShow = await this.syncTvShowToDatabase(localized.show, localized);
      if (syncedShow) synced.push(syncedShow);
    }
    return synced;
  }

  /**
   * Synchronizes candidate supply with a persistent source/page cursor. The
   * emergency catalog contains 69 shows and is not sufficient for power users;
   * it is used only when TMDB is unavailable or every live source fails.
   */
  public async seedAndFetchTvShows(options?: {
    forceFullSeed?: boolean;
    targetCount?: number;
  }): Promise<CachedTvShowData[]> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      console.warn("[TMDB TV Replenishment] API key unavailable; using 69-show emergency catalog");
      return this.syncEmergencyFallback();
    }

    const initialCursor = await this.loadReplenishmentCursor();
    const metrics = this.createRequestMetrics();
    const rotation = await runTmdbTvSourceRotation<TMDBTvShow, CachedTvShowData>({
      initialCursor,
      targetNewIds: options?.targetCount || 30,
      fetchSource: (request) => this.fetchReplenishmentSource(apiKey, request, metrics),
      syncShows: (shows) => this.syncSourceShows(shows, apiKey, metrics),
    });

    // Persist advancement even when every response contained duplicates or failed.
    await this.saveReplenishmentCursor(rotation.cursor);

    console.info("[TMDB TV Replenishment]", {
      cursorBefore: initialCursor,
      cursorAfter: rotation.cursor,
      sourceRequests: rotation.requests,
      httpAttempts: metrics.httpAttempts,
      retries: metrics.retries,
      rateLimited: metrics.rateLimited,
      failedSources: rotation.failedSources,
      newUniqueIds: rotation.newUniqueIds,
      syncedCount: rotation.synced.length,
    });

    if (
      rotation.synced.length === 0 &&
      rotation.failedSources === rotation.requests.length
    ) {
      console.warn("[TMDB TV Replenishment] All live sources failed; using emergency catalog");
      return this.syncEmergencyFallback();
    }

    return rotation.synced;
  }
}

export const tmdbTvClient = new TMDBTvClient();
