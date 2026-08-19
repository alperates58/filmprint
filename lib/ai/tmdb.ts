import {
  toSearchText,
  normalizeTitle,
  MOVIE_GENRES,
  TV_GENRES,
  KEYWORD_ALIASES,
  TMDB_GENRE_NAMES,
} from "./heuristics";
import { EnrichedAiMovieItem, NormalizedAiQuery, WatchProviderInfo } from "./types";

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || "";
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
const TMDB_LANGUAGE = "tr-TR";
const TMDB_REGION = "TR";

let movieProvidersMap: any[] | null = null;
let tvProvidersMap: any[] | null = null;
const keywordCache = new Map<string, number>();
const itemKeywordCache = new Map<string, number[]>();

export function parseReleaseYear(releaseDate?: string | null): number | null {
  if (!releaseDate || typeof releaseDate !== "string" || releaseDate.length < 4) return null;
  const year = parseInt(releaseDate.substring(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

export function isFutureRelease(releaseDate?: string | null): boolean {
  if (!releaseDate) return false;
  const time = Date.parse(releaseDate);
  return Number.isFinite(time) && time > Date.now();
}

export function countGenreOverlap(itemGenreIds: number[] = [], targetGenreIds: number[] = []): number {
  if (!itemGenreIds.length || !targetGenreIds.length) return 0;
  return itemGenreIds.filter((id) => targetGenreIds.includes(id)).length;
}

export async function getProviderId(providerName?: string, type: "movie" | "tv" | "any" = "any"): Promise<number | null> {
  if (!providerName || !TMDB_API_KEY) return null;
  const nameNorm = providerName.toLowerCase().replace(/\s+/g, "");

  if (type === "movie" || type === "any") {
    if (!movieProvidersMap) {
      try {
        const url = `${TMDB_BASE_URL}/watch/providers/movie?api_key=${TMDB_API_KEY}&language=${TMDB_LANGUAGE}&watch_region=TR`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          movieProvidersMap = data.results || [];
        }
      } catch {}
    }
    const found = (movieProvidersMap || []).find((p) =>
      p.provider_name.toLowerCase().replace(/\s+/g, "").includes(nameNorm)
    );
    if (found) return found.provider_id;
  }

  if (type === "tv" || type === "any") {
    if (!tvProvidersMap) {
      try {
        const url = `${TMDB_BASE_URL}/watch/providers/tv?api_key=${TMDB_API_KEY}&language=${TMDB_LANGUAGE}&watch_region=TR`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          tvProvidersMap = data.results || [];
        }
      } catch {}
    }
    const found = (tvProvidersMap || []).find((p) =>
      p.provider_name.toLowerCase().replace(/\s+/g, "").includes(nameNorm)
    );
    if (found) return found.provider_id;
  }
  return null;
}

export async function searchPersonTMDB(name: string): Promise<any | null> {
  if (!name || !TMDB_API_KEY) return null;
  const url = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&language=${TMDB_LANGUAGE}&query=${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) return data.results[0];
    }
  } catch {}
  return null;
}

export async function getKeywordIds(keywords: string[]): Promise<{ ids: number[]; resolvedNames: string[] }> {
  const ids: number[] = [];
  const resolvedNames: string[] = [];
  if (!keywords || !Array.isArray(keywords) || !TMDB_API_KEY) return { ids, resolvedNames };

  const lookups = await Promise.all(
    keywords.map(async (kw) => {
      const original = kw.toLowerCase().trim();
      const query = KEYWORD_ALIASES[original] || original;

      if (keywordCache.has(query)) {
        return { id: keywordCache.get(query)!, original };
      }

      try {
        const url = `${TMDB_BASE_URL}/search/keyword?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          let best = data.results?.find((k: any) => k.name.toLowerCase() === query);
          if (!best && data.results?.length > 0) best = data.results[0];
          if (best) {
            keywordCache.set(query, best.id);
            return { id: best.id, original };
          }
        }
      } catch {}
      return null;
    })
  );

  for (const result of lookups.filter(Boolean)) {
    if (result) {
      ids.push(result.id);
      resolvedNames.push(result.original);
    }
  }
  return { ids, resolvedNames };
}

export async function getItemKeywords(id: number, type: "movie" | "tv"): Promise<number[]> {
  if (!TMDB_API_KEY) return [];
  const cacheKey = `item_kw_${type}_${id}`;
  if (itemKeywordCache.has(cacheKey)) return itemKeywordCache.get(cacheKey)!;

  try {
    const url = `${TMDB_BASE_URL}/${type}/${id}/keywords?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const kws = (data.keywords || data.results || []).map((k: any) => k.id);
      itemKeywordCache.set(cacheKey, kws);
      return kws;
    }
  } catch {}
  return [];
}

export async function searchTMDB(title: string, type: "movie" | "tv" | "any", expectedYear: number | null = null): Promise<any | null> {
  if (!title || !TMDB_API_KEY) return null;
  const typesToSearch = type === "any" ? ["movie", "tv"] : [type];
  let bestMatch: any = null;
  let bestScore = -1;
  const queryNorm = normalizeTitle(title);

  const languages = Array.from(new Set([TMDB_LANGUAGE, "en-US"]));
  const searches = await Promise.all(
    typesToSearch.flatMap((t) =>
      languages.map(async (lang) => {
        try {
          const url = `${TMDB_BASE_URL}/search/${t}?api_key=${TMDB_API_KEY}&language=${lang}&query=${encodeURIComponent(title)}`;
          const res = await fetch(url);
          if (!res.ok) return [];
          const data = await res.json();
          return (data.results || []).map((match: any) => ({ match, type: t }));
        } catch {
          return [];
        }
      })
    )
  );

  const candidateMap = new Map<string, { score: number; data: any }>();
  for (const { match, type: candidateType } of searches.flat()) {
    const matchTitle = candidateType === "movie" ? match.title : match.name;
    const matchOriginalTitle = candidateType === "movie" ? match.original_title : match.original_name;
    const titleNorm = normalizeTitle(matchTitle);
    const originalNorm = normalizeTitle(matchOriginalTitle);
    if (/making of|behind the scenes|interview|special/.test(titleNorm)) continue;

    let score = 0;
    if (titleNorm === queryNorm) score += 1000000;
    else if (originalNorm === queryNorm) score += 900000;
    else if (titleNorm.startsWith(queryNorm) && (titleNorm.length === queryNorm.length || titleNorm[queryNorm.length] === " ")) score += 5000;
    else if (originalNorm.startsWith(queryNorm) && (originalNorm.length === queryNorm.length || originalNorm[queryNorm.length] === " ")) score += 4000;
    else if (titleNorm.includes(queryNorm)) score += 1000;
    else if (originalNorm.includes(queryNorm)) score += 800;

    const matchYear = parseReleaseYear(match.release_date || match.first_air_date);
    if (expectedYear) {
      if (!matchYear) score -= 100000;
      else {
        const distance = Math.abs(Number(expectedYear) - matchYear);
        if (distance === 0) score += 200000;
        else if (distance === 1) score += 150000;
        else if (distance === 2) score += 80000;
        else score -= distance * 20000;
      }
    }
    score += Math.log10((match.popularity || 0) + 1) * 20;
    score += Math.log10((match.vote_count || 0) + 1) * 30;
    if ((match.genre_ids || []).includes(99)) score -= 10000;

    const key = `${candidateType}_${match.id}`;
    const existing = candidateMap.get(key);
    if (!existing || score > existing.score) {
      candidateMap.set(key, {
        score,
        data: {
          ...match,
          id: match.id,
          type: candidateType,
          title: matchTitle || matchOriginalTitle,
          original_title: matchOriginalTitle || matchTitle,
          release_date: match.release_date || match.first_air_date || null,
          genre_ids: match.genre_ids || [],
          vote_count: match.vote_count || 0,
          popularity: match.popularity || 0,
        },
      });
    }
  }

  for (const { score, data } of candidateMap.values()) {
    if (score > bestScore) {
      bestScore = score;
      bestMatch = data;
    }
  }

  if (bestScore < 750) return null;

  if (bestMatch) {
    try {
      const url = `${TMDB_BASE_URL}/${bestMatch.type}/${bestMatch.id}?api_key=${TMDB_API_KEY}&language=${TMDB_LANGUAGE}`;
      const res = await fetch(url);
      if (res.ok) {
        const dData = await res.json();
        bestMatch.title = bestMatch.type === "movie" ? (dData.title || dData.original_title) : (dData.name || dData.original_name);
        bestMatch.original_title = bestMatch.type === "movie" ? dData.original_title : dData.original_name;
        bestMatch.overview = dData.overview || "";
        bestMatch.poster_path = dData.poster_path || null;
        bestMatch.backdrop_path = dData.backdrop_path || null;
        bestMatch.release_date = bestMatch.type === "movie" ? dData.release_date : dData.first_air_date;
        bestMatch.vote_average = dData.vote_average || 0;
        bestMatch.vote_count = dData.vote_count || bestMatch.vote_count || 0;
        bestMatch.popularity = dData.popularity || bestMatch.popularity || 0;
        bestMatch.genre_ids = (dData.genres || []).map((g: any) => g.id);
        bestMatch.original_language = dData.original_language || null;
        bestMatch.origin_country = dData.origin_country || (dData.production_countries || []).map((c: any) => c.iso_3166_1);
        bestMatch.adult = Boolean(dData.adult);
      }
    } catch {}
  }
  return bestMatch;
}

export async function fetchSimilarTMDB(reference: any, normalized: NormalizedAiQuery): Promise<any[]> {
  if (!TMDB_API_KEY || !reference) return [];
  const endpoints = ["recommendations", "similar"];
  const pages = [1, 2];
  const batches = await Promise.all(
    endpoints.flatMap((endpoint) =>
      pages.map(async (page) => {
        try {
          const url = `${TMDB_BASE_URL}/${reference.type}/${reference.id}/${endpoint}?api_key=${TMDB_API_KEY}&language=${TMDB_LANGUAGE}&page=${page}`;
          const res = await fetch(url);
          if (!res.ok) return [];
          const data = await res.json();
          return (data.results || []).map((item: any) => ({
            ...item,
            type: reference.type,
            strategy: page === 1 ? "strict" : "relaxed",
          }));
        } catch {
          return [];
        }
      })
    )
  );
  return batches.flat();
}

export async function fetchReferenceDiscoverTMDB(reference: any, normalized: NormalizedAiQuery, providerId: number | null = null): Promise<any[]> {
  if (!TMDB_API_KEY || !reference) return [];
  const referenceKeywordIds = await getItemKeywords(reference.id, reference.type);
  const genreSeed = (reference.genre_ids || []).slice(0, 3);
  const keywordSeed = referenceKeywordIds.slice(0, 4);

  const batches = await Promise.all(
    [1, 2].map(async (page) => {
      try {
        const url = new URL(`${TMDB_BASE_URL}/discover/${reference.type}`);
        url.searchParams.append("api_key", TMDB_API_KEY);
        url.searchParams.append("language", TMDB_LANGUAGE);
        url.searchParams.append("region", TMDB_REGION);
        url.searchParams.append("sort_by", page === 1 ? "vote_average.desc" : "popularity.desc");
        url.searchParams.append("vote_count.gte", normalized.quality_profile === "hidden_gems" ? "50" : "150");
        url.searchParams.append("vote_average.gte", normalized.quality_profile === "hidden_gems" ? "6" : "6.5");
        url.searchParams.append("page", String(page));

        if (genreSeed.length > 0) url.searchParams.append("with_genres", genreSeed.join(","));
        if (keywordSeed.length > 0) url.searchParams.append("with_keywords", keywordSeed.join("|"));
        if (providerId) {
          url.searchParams.append("with_watch_providers", String(providerId));
          url.searchParams.append("watch_region", "TR");
        }
        if (reference.original_language && reference.original_language !== "en") {
          url.searchParams.append("with_original_language", reference.original_language);
        }
        if (normalized.language && normalized.language !== "any") {
          url.searchParams.set("with_original_language", normalized.language);
        }
        if (normalized.country) url.searchParams.append("with_origin_country", normalized.country);

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          return (data.results || []).map((i: any) => ({ ...i, type: reference.type, strategy: "reference_discover" }));
        }
      } catch {}
      return [];
    })
  );
  return batches.flat();
}

export function pickCertification(details: any, type: "movie" | "tv"): string {
  if (type === "movie") {
    const countries = details.release_dates?.results || [];
    for (const countryCode of ["TR", "US", "GB"]) {
      const releases = countries.find((entry: any) => entry.iso_3166_1 === countryCode)?.release_dates || [];
      const rated = releases
        .filter((entry: any) => String(entry.certification || "").trim())
        .sort((a: any, b: any) => (a.type === 3 ? -1 : 0) - (b.type === 3 ? -1 : 0));
      if (rated[0]) return String(rated[0].certification).trim();
    }
    return "";
  }

  const ratings = details.content_ratings?.results || [];
  for (const countryCode of ["TR", "US", "GB"]) {
    const rating = ratings.find((entry: any) => entry.iso_3166_1 === countryCode)?.rating;
    if (rating) return String(rating).trim();
  }
  return "";
}

export function certificationRank(certification: string): number | null {
  const value = String(certification || "").toUpperCase().replace(/[\s-]/g, "");
  if (!value || value === "NR" || value === "UNRATED") return null;
  if (["G", "U", "TVY", "TVY7", "TVG", "0+", "6+"].includes(value)) return 0;
  if (["PG", "TVPG", "7+", "9+", "10+", "12"].includes(value)) return 1;
  if (["PG13", "TV14", "12+", "13+", "14+", "15"].includes(value)) return 2;
  if (["R", "TVMA", "15+", "16", "16+"].includes(value)) return 3;
  if (["NC17", "18", "18+", "X"].includes(value)) return 4;
  const numeric = Number(value.replace("+", ""));
  if (Number.isFinite(numeric)) {
    if (numeric <= 7) return 0;
    if (numeric <= 12) return 1;
    if (numeric <= 15) return 2;
    if (numeric <= 17) return 3;
    return 4;
  }
  return null;
}

export function passesSafetyFilter(item: any, safetyLevel: string): boolean {
  if (!safetyLevel || safetyLevel === "none") return true;
  if (item.adult) return false;
  const rank = certificationRank(item.certification);
  if (rank === null) return false;
  if (safetyLevel === "family" && rank > 1) return false;
  if (["no_adult", "low_violence"].includes(safetyLevel) && rank > 2) return false;
  if (safetyLevel === "low_violence") {
    const unsafeKeywords = /gore|splatter|graphic violence|torture|serial killer|slasher|zombie/;
    if ((item.keyword_names || []).some((kw: string) => unsafeKeywords.test(toSearchText(kw)))) return false;
    if ((item.genre_ids || []).includes(27)) return false;
  }
  return true;
}

export async function enrichMovieOrTvItem(item: any, normalized: NormalizedAiQuery, reference?: any): Promise<EnrichedAiMovieItem> {
  let reason = item.custom_reason || "";
  if (!reason) {
    if (normalized.intent === "similar_to_title" && reference) {
      const refIds = reference.genre_ids || [];
      const itemIds = item.genre_ids || [];
      const intersection = itemIds.filter((id: number) => refIds.includes(id));
      if (intersection.length > 0) {
        const genreNames = intersection.slice(0, 2).map((id: number) => TMDB_GENRE_NAMES[id]).filter(Boolean);
        reason = genreNames.length > 0
          ? `"${reference.title}" ile ortak ${genreNames.join("/")} temasını taşıyor.`
          : `"${reference.title}" ile benzer bir atmosfere sahip.`;
      } else {
        reason = `"${reference.title}" ile benzer tarzda bir yapım.`;
      }
    } else if (normalized.intent === "person_search" && normalized.actors?.length) {
      reason = `"${normalized.actors[0]}" yer alıyor.`;
    } else if (normalized.intent === "person_search" && normalized.directors?.length) {
      reason = `"${normalized.directors[0]}" yönetti.`;
    } else {
      const reasonParts: string[] = [];
      if (normalized.resolved_must_have?.length) {
        reasonParts.push(`${normalized.resolved_must_have.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ve ")} temasını merkeze alan`);
      } else if (normalized.resolved_semantic?.length) {
        reasonParts.push(`${normalized.resolved_semantic.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")} temalarına sahip`);
      }

      let genreStr = "";
      if (normalized.genres?.length) {
        const map = item.type === "movie" ? MOVIE_GENRES : TV_GENRES;
        const validGenres = normalized.genres.map((g) => {
          const lower = g.toLowerCase();
          return map[lower] ? lower.charAt(0).toUpperCase() + lower.slice(1) : null;
        }).filter(Boolean);
        if (validGenres.length > 0) genreStr = validGenres.join("-");
      }

      if (reasonParts.length > 0) {
        reason = `${reasonParts.join(" ")} başarılı bir ${genreStr ? genreStr : (item.type === "movie" ? "film" : "dizi")} önerisi.`;
      } else if (genreStr) {
        reason = `${genreStr} isteğinin temel tür koşullarını karşılayan doğrulanmış bir ${item.type === "movie" ? "film" : "dizi"} önerisi.`;
      } else {
        reason = `İsteğinize uygun popüler ve yüksek puanlı bir öneri.`;
      }
    }
  }

  let providers: WatchProviderInfo[] = [];
  let trailerUrl: string | null = null;
  let runtime: number | null = null;
  let director: string | null = null;
  let castNames: string[] = [];
  let numberOfSeasons: number | null = null;
  let numberOfEpisodes: number | null = null;
  let certification = "";
  let keywordNames: string[] = [];
  let genres: string[] = [];
  let originalTitle = item.original_title || item.title;
  let title = item.title;
  let poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : (item.poster || null);
  let backdrop = item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : (item.backdrop || null);

  if (TMDB_API_KEY && item.id) {
    try {
      const url = `${TMDB_BASE_URL}/${item.type}/${item.id}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=watch/providers,videos,credits,release_dates,content_ratings,keywords`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        originalTitle = item.type === "movie" ? d.original_title : d.original_name;
        genres = (d.genres || []).map((g: any) => g.name);
        title = item.type === "movie" ? (d.title || d.original_title || title) : (d.name || d.original_name || title);
        if (d.poster_path) poster = `https://image.tmdb.org/t/p/w500${d.poster_path}`;
        if (d.backdrop_path) backdrop = `https://image.tmdb.org/t/p/w1280${d.backdrop_path}`;
        certification = pickCertification(d, item.type);
        keywordNames = (d.keywords?.keywords || d.keywords?.results || []).map((kw: any) => kw.name).filter(Boolean);
        castNames = (d.credits?.cast || []).slice(0, 5).map((p: any) => p.name).filter(Boolean);

        if (item.type === "movie") {
          runtime = d.runtime || null;
          const dir = (d.credits?.crew || []).find((c: any) => c.job === "Director");
          if (dir) director = dir.name;
        } else {
          numberOfSeasons = d.number_of_seasons || null;
          numberOfEpisodes = d.number_of_episodes || null;
          const creator = (d.created_by || [])[0];
          if (creator) director = creator.name;
        }

        // Watch Providers in TR
        const trProviders = d["watch/providers"]?.results?.TR;
        if (trProviders) {
          const flat = [
            ...(trProviders.flatrate || []),
            ...(trProviders.free || []),
            ...(trProviders.ads || []),
            ...(trProviders.buy || []),
          ];
          const seen = new Set<number>();
          for (const p of flat) {
            if (!seen.has(p.provider_id)) {
              seen.add(p.provider_id);
              providers.push({
                provider_id: p.provider_id,
                provider_name: p.provider_name,
                logo_path: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
                display_priority: p.display_priority,
              });
            }
          }
        }

        // YouTube Trailer
        const videos = d.videos?.results || [];
        const youtubeVideos = videos.filter((v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
        const trTrailer = youtubeVideos.find((v: any) => v.iso_639_1 === "tr");
        const enTrailer = youtubeVideos.find((v: any) => v.iso_639_1 === "en" || !v.iso_639_1);
        const bestVideo = trTrailer || enTrailer || youtubeVideos[0];
        if (bestVideo?.key) {
          trailerUrl = `https://www.youtube.com/watch?v=${bestVideo.key}`;
        }
      }
    } catch {}
  }

  const releaseYear = parseReleaseYear(item.release_date);

  return {
    id: item.id,
    type: item.type,
    title,
    original_title: originalTitle,
    overview: item.overview || "",
    poster,
    backdrop,
    release_date: item.release_date || null,
    release_year: releaseYear,
    vote_average: Number(item.vote_average || 0),
    vote_count: Number(item.vote_count || 0),
    popularity: Number(item.popularity || 0),
    genres: genres.length ? genres : (item.genre_ids || []).map((id: number) => TMDB_GENRE_NAMES[id]).filter(Boolean),
    genre_ids: item.genre_ids || [],
    runtime,
    director,
    cast_names: castNames,
    number_of_seasons: numberOfSeasons,
    number_of_episodes: numberOfEpisodes,
    certification,
    keyword_names: keywordNames,
    providers,
    trailer_url: trailerUrl,
    reason,
    ai_match_tags: item.ai_match_tags || [],
    ai_relevance_score: item.ai_relevance_score || 85,
    base_score: item.base_score || 0,
    strategy: item.strategy || "ai_recommendation",
  };
}
