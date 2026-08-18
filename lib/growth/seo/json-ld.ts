import { getAbsoluteCanonicalUrl, getMovieCanonicalPath, getTvCanonicalPath } from "./slug";

/**
 * Escapes characters in JSON serialization to prevent XSS injection inside <script type="application/ld+json">.
 */
export function safeJsonLdStringify(data: unknown): string {
  const json = JSON.stringify(data);
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Formats runtime minutes into ISO 8601 duration string (e.g. 125 mins -> "PT2H5M").
 */
export function formatIsoDuration(minutes: number | null | undefined): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  let iso = "PT";
  if (hours > 0) iso += `${hours}H`;
  if (remainingMinutes > 0 || hours === 0) iso += `${remainingMinutes}M`;
  return iso;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generates Schema.org BreadcrumbList JSON-LD.
 */
export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: getAbsoluteCanonicalUrl(item.url),
    })),
  };
}

export interface MovieJsonLdInput {
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  overview?: string | null;
  releaseYear?: number | null;
  releaseDate?: string | null;
  runtime?: number | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  director?: string | null;
  cast?: { name: string }[] | string[];
  genres?: string[];
  voteAverage?: number;
  voteCount?: number | null;
}

/**
 * Generates Schema.org Movie JSON-LD based purely on authentic database/TMDB metadata.
 * Strictly adheres to Google Guidelines: NO fake reviews, NO fake user ratings.
 */
export function generateMovieJsonLd(movie: MovieJsonLdInput) {
  const canonicalUrl = getAbsoluteCanonicalUrl(getMovieCanonicalPath(movie.title, movie.tmdbId));
  const images = [movie.posterUrl, movie.backdropUrl].filter((url): url is string => Boolean(url));

  const castNames = Array.isArray(movie.cast)
    ? movie.cast
        .map((c) => (typeof c === "string" ? c : c.name))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Movie",
    url: canonicalUrl,
    name: movie.title,
    description: movie.overview || undefined,
  };

  if (movie.originalTitle && movie.originalTitle !== movie.title) {
    jsonLd.alternateName = movie.originalTitle;
  }

  if (images.length > 0) {
    jsonLd.image = images;
  }

  if (movie.releaseDate) {
    jsonLd.datePublished = movie.releaseDate;
  } else if (movie.releaseYear) {
    jsonLd.datePublished = `${movie.releaseYear}-01-01`;
  }

  const duration = formatIsoDuration(movie.runtime);
  if (duration) {
    jsonLd.duration = duration;
  }

  if (movie.director) {
    jsonLd.director = {
      "@type": "Person",
      name: movie.director,
    };
  }

  if (castNames.length > 0) {
    jsonLd.actor = castNames.map((name) => ({
      "@type": "Person",
      name,
    }));
  }

  if (movie.genres && movie.genres.length > 0) {
    jsonLd.genre = movie.genres;
  }

  // Authentic rating: if voteCount is substantial and voteAverage > 0, include TMDB rating without fake review counts
  if (typeof movie.voteAverage === "number" && movie.voteAverage > 0 && typeof movie.voteCount === "number" && movie.voteCount > 5) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: movie.voteAverage,
      bestRating: 10,
      worstRating: 1,
      ratingCount: movie.voteCount,
    };
  }

  return jsonLd;
}

export interface TvJsonLdInput {
  tmdbId: number;
  name: string;
  originalName?: string | null;
  overview?: string | null;
  firstAirDate?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
  creators?: { name: string }[] | string[];
  cast?: { name: string }[] | string[];
  genres?: string[];
  voteAverage?: number;
  voteCount?: number | null;
}

/**
 * Generates Schema.org TVSeries JSON-LD.
 */
export function generateTvJsonLd(show: TvJsonLdInput) {
  const canonicalUrl = getAbsoluteCanonicalUrl(getTvCanonicalPath(show.name, show.tmdbId));
  const images = [show.posterUrl, show.backdropUrl].filter((url): url is string => Boolean(url));

  const castNames = Array.isArray(show.cast)
    ? show.cast
        .map((c) => (typeof c === "string" ? c : c.name))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  const creatorNames = Array.isArray(show.creators)
    ? show.creators
        .map((c) => (typeof c === "string" ? c : c.name))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    url: canonicalUrl,
    name: show.name,
    description: show.overview || undefined,
  };

  if (show.originalName && show.originalName !== show.name) {
    jsonLd.alternateName = show.originalName;
  }

  if (images.length > 0) {
    jsonLd.image = images;
  }

  if (show.firstAirDate) {
    jsonLd.startDate = show.firstAirDate;
  }

  if (typeof show.numberOfSeasons === "number" && show.numberOfSeasons > 0) {
    jsonLd.numberOfSeasons = show.numberOfSeasons;
  }

  if (typeof show.numberOfEpisodes === "number" && show.numberOfEpisodes > 0) {
    jsonLd.numberOfEpisodes = show.numberOfEpisodes;
  }

  if (creatorNames.length > 0) {
    jsonLd.creator = creatorNames.map((name) => ({
      "@type": "Person",
      name,
    }));
  }

  if (castNames.length > 0) {
    jsonLd.actor = castNames.map((name) => ({
      "@type": "Person",
      name,
    }));
  }

  if (show.genres && show.genres.length > 0) {
    jsonLd.genre = show.genres;
  }

  if (typeof show.voteAverage === "number" && show.voteAverage > 0 && typeof show.voteCount === "number" && show.voteCount > 5) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: show.voteAverage,
      bestRating: 10,
      worstRating: 1,
      ratingCount: show.voteCount,
    };
  }

  return jsonLd;
}
