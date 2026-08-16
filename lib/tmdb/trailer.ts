export type TrailerLanguageSource = "tr-TR" | "en-US" | "neutral";

export interface TmdbVideoCandidate {
  key?: string | null;
  site?: string | null;
  type?: string | null;
  official?: boolean | null;
  name?: string | null;
  published_at?: string | null;
}

export interface LocalizedTmdbVideo extends TmdbVideoCandidate {
  languageSource: TrailerLanguageSource;
}

export interface ResolvedTmdbTrailer {
  provider: "youtube";
  key: string;
  languageSource: TrailerLanguageSource;
  type: "Trailer" | "Teaser" | "Clip";
  official: boolean;
}

export interface LocalizedTrailerResolution {
  trailer: ResolvedTmdbTrailer | null;
  englishRequested: boolean;
}

function normalizedType(video: TmdbVideoCandidate): "Trailer" | "Teaser" | "Clip" | null {
  const type = video.type?.trim().toLowerCase();
  if (type === "trailer") return "Trailer";
  if (type === "teaser") return "Teaser";
  if (type === "clip") return "Clip";
  return null;
}

function isTrustedCandidate(video: LocalizedTmdbVideo): boolean {
  if (video.site?.toLowerCase() !== "youtube" || !video.key?.trim()) return false;
  const type = normalizedType(video);
  if (!type) return false;
  if (type === "Trailer") return true;

  // Teaser/clip fallback is deliberately stricter than trailer selection.
  const name = video.name?.toLocaleLowerCase("tr-TR") || "";
  return video.official === true || /official|resmi|teaser|fragman|trailer/.test(name);
}

function scoreVideo(video: LocalizedTmdbVideo): number {
  const type = normalizedType(video);
  if (!type) return Number.NEGATIVE_INFINITY;
  let score = type === "Trailer" ? 10_000 : type === "Teaser" ? 2_000 : 500;

  // Exact product priority: any Turkish trailer outranks English trailers;
  // trailers in either language outrank teasers/clips.
  if (type === "Trailer") {
    if (video.languageSource === "tr-TR") score += 1_000;
    if (video.languageSource === "en-US") score += 500;
    if (video.official === true) score += 300;
  } else {
    if (video.languageSource === "tr-TR") score += 200;
    if (video.languageSource === "en-US") score += 100;
    if (video.official === true) score += type === "Teaser" ? 1_000 : 200;
  }

  const name = video.name?.toLocaleLowerCase("tr-TR") || "";
  if (/official trailer|resmi fragman/.test(name)) score += 80;
  else if (/trailer|fragman/.test(name)) score += 50;
  else if (/teaser/.test(name)) score += 20;

  const publishedAt = video.published_at ? Date.parse(video.published_at) : Number.NaN;
  if (Number.isFinite(publishedAt)) score += Math.min(10, publishedAt / 1_000_000_000_000);
  return score;
}

/** Pure, deterministic selector shared by Movie and TV detail flows. */
export function selectBestTrailer(videos: LocalizedTmdbVideo[]): ResolvedTmdbTrailer | null {
  const selected = videos
    .filter(isTrustedCandidate)
    .sort((left, right) => scoreVideo(right) - scoreVideo(left))[0];
  if (!selected?.key) return null;

  const type = normalizedType(selected);
  if (!type) return null;
  return {
    provider: "youtube",
    key: selected.key.trim(),
    languageSource: selected.languageSource,
    type,
    official: selected.official === true,
  };
}

function withLanguage(
  videos: TmdbVideoCandidate[] | null | undefined,
  languageSource: TrailerLanguageSource
): LocalizedTmdbVideo[] {
  return (videos || []).map((video) => ({ ...video, languageSource }));
}

/** Fetches English videos only when Turkish has no usable Trailer candidate. */
export async function resolveLocalizedTrailer(
  turkishVideos: TmdbVideoCandidate[] | null | undefined,
  fetchEnglish?: () => Promise<TmdbVideoCandidate[] | null>
): Promise<LocalizedTrailerResolution> {
  const turkish = withLanguage(turkishVideos, "tr-TR");
  const turkishBest = selectBestTrailer(turkish);
  if (turkishBest?.type === "Trailer" || !fetchEnglish) {
    return { trailer: turkishBest, englishRequested: false };
  }

  let english: LocalizedTmdbVideo[] = [];
  try {
    english = withLanguage(await fetchEnglish(), "en-US");
  } catch {
    // Keep a Turkish teaser/clip rather than failing the entire detail request.
  }
  return {
    trailer: selectBestTrailer([...turkish, ...english]),
    englishRequested: true,
  };
}
