import { db } from "@/lib/db/client";
import { evaluateMovieSeoEligibility, evaluateTvSeoEligibility } from "./quality-gate";
import { generateMovieSlug, generateTvSlug } from "./slug";

export interface SeoDiagnosticIssue {
  type: "CRITICAL" | "WARNING" | "INFO";
  code: string;
  message: string;
  entityType?: "Movie" | "TvShow" | "Route" | "System";
  entityId?: string;
  tmdbId?: number;
  details?: Record<string, unknown>;
}

export interface SeoDiagnosticsReport {
  timestamp: string;
  summary: {
    status: "HEALTHY" | "WARNINGS" | "CRITICAL";
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
  issues: SeoDiagnosticIssue[];
  metrics: {
    totalAudited: number;
    eligibleCount: number;
    ineligibleCount: number;
  };
}

/**
 * Runs on-demand SEO diagnostics scan across catalog and routes.
 */
export async function runSeoDiagnostics(): Promise<SeoDiagnosticsReport> {
  const issues: SeoDiagnosticIssue[] = [];

  const [movies, tvShows] = await Promise.all([
    db.movie.findMany({
      select: {
        id: true,
        tmdbId: true,
        title: true,
        originalTitle: true,
        posterPath: true,
        backdropPath: true,
        releaseYear: true,
        voteAverage: true,
        popularity: true,
        metadata: true,
      },
    }),
    db.tvShow.findMany({
      select: {
        id: true,
        tmdbId: true,
        name: true,
        originalName: true,
        overview: true,
        posterPath: true,
        backdropPath: true,
        firstAirDate: true,
        voteAverage: true,
        popularity: true,
        metadata: true,
      },
    }),
  ]);

  let eligibleCount = 0;
  let ineligibleCount = 0;

  // Audit Movies
  for (const m of movies) {
    const meta = (m.metadata as Record<string, any>) || {};
    const evalRes = evaluateMovieSeoEligibility(m as any);

    if (evalRes.isEligible) {
      eligibleCount++;

      // Validate slug generation
      const slug = generateMovieSlug(m.title, m.tmdbId);
      if (!slug || slug.length < 3) {
        issues.push({
          type: "CRITICAL",
          code: "INVALID_MOVIE_SLUG",
          message: `Film için geçersiz slug üretildi: ${m.title} (TMDB ID: ${m.tmdbId})`,
          entityType: "Movie",
          entityId: m.id,
          tmdbId: m.tmdbId,
        });
      }

      // Check overview length warning
      const overview = (m as any).overview || meta.overview || "";
      if (overview.length < 50) {
        issues.push({
          type: "WARNING",
          code: "SHORT_OVERVIEW",
          message: `Film özeti kısa (${overview.length} karakter): "${m.title}"`,
          entityType: "Movie",
          entityId: m.id,
          tmdbId: m.tmdbId,
        });
      }
    } else {
      ineligibleCount++;
      if (evalRes.reasons.includes("NON_LATIN_DISPLAY_TITLE")) {
        issues.push({
          type: "WARNING",
          code: "NON_LATIN_TITLE",
          message: `Film başlığı Latin alfabesinde değil: "${m.title}" (noindex uygulanıyor)`,
          entityType: "Movie",
          entityId: m.id,
          tmdbId: m.tmdbId,
        });
      }
    }
  }

  // Audit TV Shows
  for (const s of tvShows) {
    const meta = (s.metadata as Record<string, any>) || {};
    const evalRes = evaluateTvSeoEligibility(s as any);

    if (evalRes.isEligible) {
      eligibleCount++;

      const slug = generateTvSlug(s.name, s.tmdbId);
      if (!slug || slug.length < 3) {
        issues.push({
          type: "CRITICAL",
          code: "INVALID_TV_SLUG",
          message: `Dizi için geçersiz slug üretildi: ${s.name} (TMDB ID: ${s.tmdbId})`,
          entityType: "TvShow",
          entityId: s.id,
          tmdbId: s.tmdbId,
        });
      }

      const overview = s.overview || meta.overview || "";
      if (overview.length < 50) {
        issues.push({
          type: "WARNING",
          code: "SHORT_OVERVIEW",
          message: `Dizi özeti kısa (${overview.length} karakter): "${s.name}"`,
          entityType: "TvShow",
          entityId: s.id,
          tmdbId: s.tmdbId,
        });
      }
    } else {
      ineligibleCount++;
    }
  }

  const criticalCount = issues.filter((i) => i.type === "CRITICAL").length;
  const warningCount = issues.filter((i) => i.type === "WARNING").length;
  const infoCount = issues.filter((i) => i.type === "INFO").length;

  const status = criticalCount > 0 ? "CRITICAL" : warningCount > 0 ? "WARNINGS" : "HEALTHY";

  return {
    timestamp: new Date().toISOString(),
    summary: {
      status,
      criticalCount,
      warningCount,
      infoCount,
    },
    issues: issues.slice(0, 100), // Cap output at top 100 issues
    metrics: {
      totalAudited: movies.length + tvShows.length,
      eligibleCount,
      ineligibleCount,
    },
  };
}
