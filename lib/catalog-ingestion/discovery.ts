import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import readline from "node:readline";
import { Readable } from "node:stream";
import type {
  CatalogDiscoveryProvider,
  DiscoveryBatchResult,
  DiscoveryCandidate,
  MediaType,
} from "./types";
import { getTMDBApiKey } from "@/lib/config/service";

const TMDB_EXPORTS_BASE_URL = "http://files.tmdb.org/p/exports";
const EXPORT_CACHE_DIR = path.join(os.tmpdir(), "filmprint_tmdb_exports");

function formatTmdbExportDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${month}_${day}_${year}`;
}

export class DailyExportDiscoveryProvider implements CatalogDiscoveryProvider {
  public readonly name = "TMDB_DAILY_EXPORT";

  constructor(private cacheDir: string = EXPORT_CACHE_DIR) {
    if (!fs.existsSync(this.cacheDir)) {
      try {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      } catch {}
    }
  }

  private getExportFileName(mediaType: MediaType, dateStr: string): string {
    const prefix = mediaType === "FILM" ? "movie_ids" : "tv_series_ids";
    return `${prefix}_${dateStr}.json.gz`;
  }

  private getCachedFilePath(mediaType: MediaType, dateStr: string): string {
    return path.join(this.cacheDir, this.getExportFileName(mediaType, dateStr));
  }

  public async downloadExportFileIfNeeded(
    mediaType: MediaType,
    targetDate: Date = new Date()
  ): Promise<{ filePath: string; sourceDate: string }> {
    // Try current target date, then fall back up to 4 days if unavailable
    for (let dayOffset = 0; dayOffset <= 4; dayOffset++) {
      const checkDate = new Date(targetDate.getTime() - dayOffset * 86_400_000);
      const dateStr = formatTmdbExportDate(checkDate);
      const cachedPath = this.getCachedFilePath(mediaType, dateStr);

      if (fs.existsSync(cachedPath) && fs.statSync(cachedPath).size > 1024) {
        return { filePath: cachedPath, sourceDate: dateStr };
      }

      const fileName = this.getExportFileName(mediaType, dateStr);
      const url = `${TMDB_EXPORTS_BASE_URL}/${fileName}`;

      try {
        const response = await fetch(url, {
          cache: "no-store",
          headers: { "User-Agent": "Filmprint-Catalog-Worker/1.0" },
        });

        if (response.ok && response.body) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          if (buffer.length > 1024) {
            fs.writeFileSync(cachedPath, buffer);
            return { filePath: cachedPath, sourceDate: dateStr };
          }
        }
      } catch (err) {
        console.warn(`[DailyExportDiscovery] Error fetching ${url}:`, err);
      }
    }

    throw new Error(
      `Could not download TMDB daily ID export for ${mediaType} within the last 5 days.`
    );
  }

  public async fetchCandidateBatch(
    mediaType: MediaType,
    cursor: number = 0,
    batchSize: number = 25,
    date?: Date
  ): Promise<DiscoveryBatchResult> {
    const { filePath, sourceDate } = await this.downloadExportFileIfNeeded(
      mediaType,
      date || new Date()
    );

    const fileStream = fs.createReadStream(filePath);
    const gunzip = zlib.createGunzip();
    const rl = readline.createInterface({
      input: fileStream.pipe(gunzip),
      crlfDelay: Infinity,
    });

    const candidates: DiscoveryCandidate[] = [];
    let currentLineIndex = 0;
    let hasMore = false;

    try {
      for await (const line of rl) {
        if (!line || line.trim().length === 0) {
          currentLineIndex++;
          continue;
        }

        if (currentLineIndex < cursor) {
          currentLineIndex++;
          continue;
        }

        if (candidates.length >= batchSize) {
          hasMore = true;
          break;
        }

        try {
          const parsed = JSON.parse(line);
          const tmdbId = typeof parsed.id === "number" ? parsed.id : parseInt(parsed.id, 10);
          const popularity = typeof parsed.popularity === "number" ? parsed.popularity : 0.0;
          const adult = parsed.adult === true;

          if (!isNaN(tmdbId) && tmdbId > 0) {
            candidates.push({
              tmdbId,
              mediaType,
              popularity,
              adult,
              title: parsed.original_title || parsed.title,
              originalTitle: parsed.original_title,
              name: parsed.original_name || parsed.name,
              originalName: parsed.original_name,
            });
          }
        } catch {}

        currentLineIndex++;
      }
    } finally {
      rl.close();
      gunzip.destroy();
      fileStream.destroy();
    }

    const nextCursor = currentLineIndex;

    return {
      candidates,
      nextCursor,
      sourceDate,
      hasMore,
    };
  }
}

export class DiscoverApiFallbackProvider implements CatalogDiscoveryProvider {
  public readonly name = "TMDB_DISCOVER_API_FALLBACK";

  public async fetchCandidateBatch(
    mediaType: MediaType,
    cursor: number = 0,
    batchSize: number = 25
  ): Promise<DiscoveryBatchResult> {
    const apiKey = (await getTMDBApiKey()) || process.env.TMDB_API_KEY || "";
    if (!apiKey) {
      return {
        candidates: [],
        nextCursor: cursor,
        sourceDate: "API_DISCOVER_NO_KEY",
        hasMore: false,
      };
    }

    const page = Math.floor(cursor / 20) + 1;
    const offsetInPage = cursor % 20;
    const endpoint = mediaType === "FILM" ? "movie" : "tv";

    const url = `https://api.themoviedb.org/3/discover/${endpoint}?api_key=${apiKey}&language=tr-TR&sort_by=popularity.desc&page=${page}&include_adult=false`;

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        return {
          candidates: [],
          nextCursor: cursor,
          sourceDate: "API_DISCOVER_ERROR",
          hasMore: false,
        };
      }

      const data = await response.json();
      const results: any[] = data.results || [];
      const pageSlice = results.slice(offsetInPage, offsetInPage + batchSize);

      const candidates: DiscoveryCandidate[] = pageSlice.map((item) => ({
        tmdbId: item.id,
        mediaType,
        popularity: item.popularity || 0.0,
        adult: item.adult === true,
        title: item.title,
        originalTitle: item.original_title,
        name: item.name,
        originalName: item.original_name,
      }));

      const nextCursor = cursor + candidates.length;
      const hasMore = page < (data.total_pages || 500);

      return {
        candidates,
        nextCursor,
        sourceDate: `DISCOVER_PAGE_${page}`,
        hasMore,
        totalAvailable: data.total_results,
      };
    } catch (err) {
      console.error("[DiscoverApiFallbackProvider] Error:", err);
      return {
        candidates: [],
        nextCursor: cursor,
        sourceDate: "API_DISCOVER_EXCEPTION",
        hasMore: false,
      };
    }
  }
}
