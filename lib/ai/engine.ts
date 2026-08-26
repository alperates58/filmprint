import { AI_SYSTEM_PROMPT } from "./prompts";
import {
  FALLBACK_NORMALIZE,
  applyQueryHeuristics,
  sanitizeNormalizedInput,
  inferGenresFromQuery,
  buildRequestSummaryTr,
  MOVIE_GENRES,
  TV_GENRES,
  toSearchText,
} from "./heuristics";
import {
  searchTMDB,
  fetchSimilarTMDB,
  fetchReferenceDiscoverTMDB,
  getKeywordIds,
  getItemKeywords,
  searchPersonTMDB,
  getProviderId,
  passesSafetyFilter,
  enrichMovieOrTvItem,
  countGenreOverlap,
  parseReleaseYear,
  isFutureRelease,
} from "./tmdb";
import {
  NormalizedAiQuery,
  EnrichedAiMovieItem,
  AiRecommendationResponse,
} from "./types";
import {
  getDeepSeekConfig,
  CANONICAL_DEEPSEEK_MODEL,
  CANONICAL_DEEPSEEK_BASE_URL,
} from "@/lib/config/service";

const AI_PROVIDER = process.env.AI_PROVIDER || "deepseek";
const AI_RESULT_LIMIT = parseInt(process.env.AI_RESULT_LIMIT || "12", 10);
const AI_CANDIDATE_LIMIT = parseInt(process.env.AI_CANDIDATE_LIMIT || "40", 10);

// In-Memory Query Cache with 15-minute TTL
interface CacheEntry {
  data: AiRecommendationResponse;
  expiresAt: number;
}
const queryCache = new Map<string, CacheEntry>();

function getFromCache(key: string): AiRecommendationResponse | null {
  const entry = queryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    queryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: AiRecommendationResponse, ttlSeconds = 900): void {
  if (queryCache.size >= 500) {
    const firstKey = queryCache.keys().next().value;
    if (firstKey) queryCache.delete(firstKey);
  }
  queryCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function parseProviderJson(content: string): any {
  const text = String(content || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(text);
}

function sanitizeProviderMessage(message?: string, extraSecrets: (string | null | undefined)[] = []): string {
  let safe = String(message || "Bilinmeyen sağlayıcı hatası");
  for (const secret of [process.env.DEEPSEEK_API_KEY, process.env.OPENAI_API_KEY, process.env.GEMINI_API_KEY, ...extraSecrets]) {
    if (secret) safe = safe.split(secret).join("[redacted]");
  }
  return safe.substring(0, 400);
}

async function callDeepSeek(query: string, config?: { apiKey: string | null; baseUrl: string; modelId: string; enabled: boolean }): Promise<any> {
  const deepseek = config || (await getDeepSeekConfig());
  const apiKey = deepseek.apiKey;
  if (!apiKey || !deepseek.enabled) throw new Error("DeepSeek API anahtarı yapılandırılmamış veya servis devre dışı");
  const baseUrl = deepseek.baseUrl || CANONICAL_DEEPSEEK_BASE_URL;
  const model = deepseek.modelId || CANONICAL_DEEPSEEK_MODEL;

  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      max_tokens: 1400,
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek ${response.status}: ${sanitizeProviderMessage(errorText, [apiKey])}`);
  }
  const data = await response.json();
  return parseProviderJson(data.choices?.[0]?.message?.content);
}

async function callOpenAI(query: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API anahtarı yapılandırılmamış");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI ${response.status}: ${sanitizeProviderMessage(errorText, [apiKey])}`);
  }
  const data = await response.json();
  return parseProviderJson(data.choices?.[0]?.message?.content);
}

async function callGemini(query: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API anahtarı yapılandırılmamış");
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: query }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.15,
        topP: 0.8,
        maxOutputTokens: 3072,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini ${response.status}: ${sanitizeProviderMessage(errorText, [apiKey])}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || "";
  if (!text) throw new Error("Gemini boş yanıt döndürdü");
  return parseProviderJson(text);
}

export async function normalizeAiQuery(query: string): Promise<NormalizedAiQuery> {
  const safeQuery = query.substring(0, 500);
  const analysisMeta = {
    provider: AI_PROVIDER,
    model: CANONICAL_DEEPSEEK_MODEL,
    providerAttempted: false,
    providerSucceeded: false,
    fallback: false,
    cached: false,
    chargeable: false,
    error: undefined as string | undefined,
  };

  try {
    let rawResult: any = null;
    const deepseekConfig = await getDeepSeekConfig().catch(() => null);

    if (deepseekConfig?.apiKey && deepseekConfig?.enabled) {
      analysisMeta.provider = "deepseek";
      analysisMeta.model = deepseekConfig.modelId || CANONICAL_DEEPSEEK_MODEL;
      analysisMeta.providerAttempted = true;
      rawResult = await callDeepSeek(safeQuery, deepseekConfig);
      analysisMeta.providerSucceeded = true;
      analysisMeta.chargeable = true;
    } else if (process.env.OPENAI_API_KEY) {
      analysisMeta.provider = "openai";
      analysisMeta.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      analysisMeta.providerAttempted = true;
      rawResult = await callOpenAI(safeQuery);
      analysisMeta.providerSucceeded = true;
      analysisMeta.chargeable = true;
    } else if (process.env.GEMINI_API_KEY) {
      analysisMeta.provider = "gemini";
      analysisMeta.model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      analysisMeta.providerAttempted = true;
      rawResult = await callGemini(safeQuery);
      analysisMeta.providerSucceeded = true;
      analysisMeta.chargeable = true;
    } else {
      analysisMeta.provider = "deterministic-fallback";
      analysisMeta.model = "heuristic-v1";
      analysisMeta.providerAttempted = false;
      analysisMeta.providerSucceeded = false;
      analysisMeta.fallback = true;
      analysisMeta.chargeable = false;
      rawResult = {};
    }

    const normalized = applyQueryHeuristics(rawResult, safeQuery);
    normalized._analysis = analysisMeta;
    return normalized;
  } catch (err: any) {
    const safeError = sanitizeProviderMessage(err?.message);
    analysisMeta.providerAttempted = true;
    analysisMeta.providerSucceeded = false;
    analysisMeta.fallback = true;
    analysisMeta.chargeable = false;
    analysisMeta.error = safeError;
    const fallback = applyQueryHeuristics({}, safeQuery);
    fallback._analysis = analysisMeta;
    return fallback;
  }
}


export async function getAiRecommendations(rawQuery: string): Promise<AiRecommendationResponse> {
  const startTime = Date.now();
  const cleanQuery = (rawQuery || "").trim();
  const cacheKey = toSearchText(cleanQuery);

  if (!cleanQuery) {
    return {
      success: true,
      query: "",
      request_summary_tr: "Popüler ve yüksek puanlı film ve diziler listeleniyor.",
      normalized: { ...FALLBACK_NORMALIZE },
      results: [],
      warnings: [],
      total: 0,
      _analysis: {
        provider: "deterministic",
        model: "none",
        providerAttempted: false,
        providerSucceeded: false,
        fallback: true,
        cached: false,
        chargeable: false,
        latencyMs: 0,
      },
    };
  }

  const cached = getFromCache(cacheKey);
  if (cached) {
    return {
      ...cached,
      _analysis: {
        ...(cached._analysis || {
          provider: "cache",
          model: "memory",
          providerAttempted: false,
          providerSucceeded: true,
          fallback: false,
          chargeable: false,
        }),
        cached: true,
        chargeable: false,
        latencyMs: Date.now() - startTime,
      },
    };
  }

  const warnings: string[] = [];
  const normalized = await normalizeAiQuery(cleanQuery);
  const types: ("movie" | "tv")[] =
    normalized.type === "movie" ? ["movie"] : normalized.type === "tv" ? ["tv"] : ["movie", "tv"];

  const queryGenresByType: Record<"movie" | "tv", number[]> = {
    movie: (normalized.genres || [])
      .map((g) => MOVIE_GENRES[g.toLowerCase()])
      .filter((id) => id !== undefined),
    tv: (normalized.genres || [])
      .map((g) => TV_GENRES[g.toLowerCase()])
      .filter((id) => id !== undefined),
  };

  const rawResults: any[] = [];
  let reference: any = null;

  // 1. Process direct AI recommendations
  if (normalized.recommended_titles?.length) {
    const directMatches = await Promise.all(
      normalized.recommended_titles.map(async (recItem, recIndex) => {
        const recTitle = recItem.title;
        const recReason = recItem.reason;
        const recYear = recItem.year;
        const recType = recItem.type && ["movie", "tv"].includes(recItem.type) ? recItem.type : (normalized.type || "any");
        if (recTitle) {
          try {
            const match = await searchTMDB(recTitle, recType as any, recYear ?? null);
            if (match) {
              if (recReason) match.custom_reason = recReason;
              match.ai_relevance_score = Number(recItem.relevance_score) || Math.max(80, 95 - recIndex * 2);
              match.ai_rank = recIndex;
              match.ai_match_tags = recItem.match_tags || [];
              match.strategy = "ai_direct_recommendation";
              return match;
            }
          } catch {}
        }
        return null;
      })
    );
    rawResults.push(...directMatches.filter(Boolean));
  }

  const directCount = rawResults.filter((item) => item.strategy === "ai_direct_recommendation").length;

  // 2. Similar to Title handling
  if (normalized.intent === "similar_to_title" && normalized.reference_title) {
    reference = await searchTMDB(normalized.reference_title, normalized.type || "any");
    if (reference) {
      if (directCount < 4) {
        rawResults.push(...(await fetchSimilarTMDB(reference, normalized)));
      }
    } else {
      warnings.push(`"${normalized.reference_title}" için tam eşleşme bulunamadı, tema bazlı arama yapılıyor.`);
      normalized.intent = "discover";
    }
  }

  // 3. Watch Provider Filter
  let providerId: number | null = null;
  if (normalized.watch_provider) {
    providerId = await getProviderId(normalized.watch_provider, normalized.type || "any");
    if (!providerId) warnings.push(`'${normalized.watch_provider}' izleme platformu bulunamadı.`);
  }

  if (reference && normalized.intent === "similar_to_title" && directCount < 4) {
    rawResults.push(...(await fetchReferenceDiscoverTMDB(reference, normalized, providerId)));
  }

  // 4. Person Search
  const personName = normalized.actors?.[0] || normalized.directors?.[0];
  let personId: number | null = null;
  if (personName) {
    const person = await searchPersonTMDB(personName);
    if (person) {
      personId = person.id;
    } else {
      warnings.push(`'${personName}' isminde kişi bulunamadı.`);
    }
  }

  // 5. Discover search if candidates are still low
  const shouldRunDiscover = !personId && normalized.intent === "discover" && rawResults.length < 10;
  if (shouldRunDiscover) {
    const [kwMustHave, kwSemantic] = await Promise.all([
      getKeywordIds(normalized.must_have),
      getKeywordIds(normalized.semantic_topics),
    ]);

    normalized.resolved_must_have = kwMustHave.resolvedNames;
    normalized.resolved_semantic = kwSemantic.resolvedNames;

    const strictIds = Array.from(new Set([...kwMustHave.ids]));
    const relaxedIds = Array.from(new Set([...kwMustHave.ids, ...kwSemantic.ids]));

    for (const type of types) {
      const fetchDiscover = async (keywordIds: number[], strategy: string) => {
        try {
          const TMDB_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || "";
          const url = new URL(`https://api.themoviedb.org/3/discover/${type}`);
          url.searchParams.append("api_key", TMDB_KEY);
          url.searchParams.append("language", "tr-TR");
          url.searchParams.append("region", "TR");
          url.searchParams.append("page", "1");
          url.searchParams.append("sort_by", strategy === "strict" ? "popularity.desc" : "vote_average.desc");

          if (normalized.year_min) {
            url.searchParams.append(type === "movie" ? "primary_release_date.gte" : "first_air_date.gte", `${normalized.year_min}-01-01`);
          }
          if (normalized.year_max) {
            url.searchParams.append(type === "movie" ? "primary_release_date.lte" : "first_air_date.lte", `${normalized.year_max}-12-31`);
          }
          if (providerId) {
            url.searchParams.append("with_watch_providers", String(providerId));
            url.searchParams.append("watch_region", "TR");
          }
          if (normalized.language && normalized.language !== "any") {
            url.searchParams.append("with_original_language", normalized.language);
          }
          if (normalized.country) url.searchParams.append("with_origin_country", normalized.country);

          if (queryGenresByType[type].length > 0) {
            url.searchParams.append("with_genres", queryGenresByType[type].join(","));
          }
          if (keywordIds.length > 0) {
            url.searchParams.append("with_keywords", keywordIds.join(strategy === "strict" ? "," : "|"));
          }

          url.searchParams.append("vote_count.gte", normalized.quality_profile === "hidden_gems" ? "40" : "150");
          url.searchParams.append("vote_average.gte", "5.8");

          const res = await fetch(url.toString());
          if (res.ok) {
            const data = await res.json();
            return (data.results || []).map((i: any) => ({ ...i, type, strategy }));
          }
        } catch {}
        return [];
      };

      if (strictIds.length > 0) rawResults.push(...(await fetchDiscover(strictIds, "strict")));
      if (relaxedIds.length > 0) rawResults.push(...(await fetchDiscover(relaxedIds, "relaxed")));
      if (rawResults.filter((r) => r.type === type).length < 5) {
        rawResults.push(...(await fetchDiscover([], "fallback")));
      }
    }
  }

  // Deduplicate and filter hard constraints
  const uniqueMap = new Map<string, any>();
  for (const item of rawResults) {
    if (reference && item.id === reference.id) continue;
    const uniqueKey = `${item.type || "movie"}_${item.id}`;
    if (uniqueMap.has(uniqueKey)) continue;

    const year = parseReleaseYear(item.release_date || item.first_air_date);
    if (normalized.year_min && (!year || year < normalized.year_min)) continue;
    if (normalized.year_max && (!year || year > normalized.year_max)) continue;

    if (normalized.language && normalized.language !== "any" && item.original_language !== normalized.language) continue;

    if (normalized.quality_profile === "family" && item.adult) continue;

    if (normalized.exclude?.length) {
      const map = item.type === "movie" ? MOVIE_GENRES : TV_GENRES;
      const excludeIds = normalized.exclude.map((g) => map[g.toLowerCase()]).filter(Boolean);
      const itemGenres = item.genre_ids || [];
      if (itemGenres.some((id: number) => excludeIds.includes(id))) continue;
    }

    uniqueMap.set(uniqueKey, {
      id: item.id,
      type: item.type,
      title: item.type === "movie" ? (item.title || item.original_title) : (item.name || item.original_name || item.title),
      original_title: item.type === "movie" ? item.original_title : (item.original_name || item.original_title),
      overview: item.overview,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      release_date: item.release_date || item.first_air_date || null,
      vote_average: item.vote_average || 0,
      vote_count: item.vote_count || 0,
      popularity: item.popularity || 0,
      genre_ids: item.genre_ids || [],
      original_language: item.original_language || null,
      adult: Boolean(item.adult),
      strategy: item.strategy,
      custom_reason: item.custom_reason,
      ai_relevance_score: item.ai_relevance_score,
      ai_rank: item.ai_rank,
      ai_match_tags: item.ai_match_tags || [],
    });
  }

  // Scoring
  const candidates = Array.from(uniqueMap.values());
  for (const item of candidates) {
    let score =
      (item.vote_average * 2) +
      (Math.log10(item.vote_count + 1) * 4) +
      (Math.log10(item.popularity + 1) * 2);

    if (item.poster_path) score += 5;
    if (!item.release_date) score -= 10;
    if (isFutureRelease(item.release_date) && normalized.quality_profile !== "new") score -= 35;

    if (item.strategy === "ai_direct_recommendation") {
      score += 260 + (item.ai_relevance_score || 85) * 2 - (item.ai_rank || 0) * 4;
    } else if (item.strategy === "strict") {
      score += 24;
    } else if (item.strategy === "relaxed") {
      score += 10;
    }

    const requestedGenreIds = queryGenresByType[item.type as "movie" | "tv"] || [];
    const genreOverlap = countGenreOverlap(item.genre_ids, requestedGenreIds);
    if (requestedGenreIds.length > 0) {
      if (genreOverlap > 0) score += genreOverlap * 18;
      else score -= 25;
    }

    if (reference) {
      const refGenreOverlap = countGenreOverlap(item.genre_ids, reference.genre_ids || []);
      if (refGenreOverlap > 0) score += refGenreOverlap * 20;
    }

    item.base_score = score;
  }

  candidates.sort((a, b) => b.base_score - a.base_score);
  const topSlice = candidates.slice(0, AI_RESULT_LIMIT);

  // Enrich with watch providers, trailers, cast, director, custom reason
  const enrichedResults: EnrichedAiMovieItem[] = await Promise.all(
    topSlice.map((item) => enrichMovieOrTvItem(item, normalized, reference))
  );

  const response: AiRecommendationResponse = {
    success: true,
    query: cleanQuery,
    request_summary_tr: normalized.request_summary_tr || buildRequestSummaryTr(cleanQuery, normalized),
    normalized,
    results: enrichedResults,
    warnings,
    total: enrichedResults.length,
    _analysis: {
      provider: normalized._analysis?.provider || "sineai-engine",
      model: normalized._analysis?.model || "v1",
      providerAttempted: Boolean(normalized._analysis?.providerAttempted),
      providerSucceeded: Boolean(normalized._analysis?.providerSucceeded),
      fallback: Boolean(normalized._analysis?.fallback),
      cached: false,
      chargeable: Boolean(normalized._analysis?.chargeable),
      error: normalized._analysis?.error,
      latencyMs: Date.now() - startTime,
    },
  };

  setCache(cacheKey, response);
  return response;
}
