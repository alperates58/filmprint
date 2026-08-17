import { db } from "@/lib/db/client";
import { getOrRecalculateTvTasteProfile } from "../profile/service";
import { calculateTvMatch } from "./matcher";
import { buildTvTasteEvidenceProfile } from "./evidence";
import { buildTvFeedbackProfile } from "./feedback-profile";
import type { CandidateTvShow } from "./types";
import type { TvDnaResult } from "../profile/types";

export interface UniversalTvMatchResult {
  tvShowId: string;
  rawScore: number;
  displayScore: number;
  label: string;
  evidenceStrength: "STRONG" | "MODERATE" | "WEAK" | "NONE";
  available: boolean;
  reasons: string[];
  headline?: string;
}

export function generateDeterministicTvReasons(
  candidate: CandidateTvShow,
  matchResult: ReturnType<typeof calculateTvMatch>,
  tvProfile: TvDnaResult
): { headline: string; reasons: string[] } {
  const reasons: string[] = [];
  const candidateGenres = candidate.metadata?.genres || [];
  const seasons = candidate.metadata?.numberOfSeasons ?? null;
  const statusStr = candidate.status || candidate.metadata?.status;
  const isMini = seasons === 1 && (statusStr === "Ended" || statusStr === "Canceled");

  let headline = matchResult.deterministicExplanation || "Dizi DNA Uyumu";

  // 1. Evidence Show Reference
  if (matchResult.evidenceShows && matchResult.evidenceShows.length > 0) {
    const topShow = matchResult.evidenceShows[0];
    headline = `Daha önce beğendiğin "${topShow.name}" ile benzer temalarda.`;
    reasons.push(`"${topShow.name}" dizisindeki atmosfer ve anlatım tonuyla örtüşüyor.`);
  }

  // 2. Genre Affinity
  if (candidateGenres.length > 0) {
    const genreScoreMap = new Map(
      (tvProfile.genres || []).map((g) => [g.name.toLowerCase(), g])
    );
    const positiveMatched = candidateGenres.filter((g) => {
      const entry = genreScoreMap.get(g.toLowerCase());
      return entry && entry.state === "POSITIVE";
    });

    if (positiveMatched.length > 0) {
      reasons.push(`${positiveMatched.slice(0, 2).join(" ve ")} türlerindeki güçlü beğeninizle örtüşüyor.`);
    } else if (candidateGenres.length > 0) {
      reasons.push(`${candidateGenres.slice(0, 2).join(" / ")} tür dinamikleri profilinize uygun.`);
    }
  }

  // 3. Format / Series Length
  if (isMini) {
    reasons.push("Tek sezonda tamamlanan kompakt mini dizi formatı tercihinle uyumlu.");
  } else if (seasons && seasons >= 2 && seasons <= 4) {
    reasons.push("Dengeli karakter gelişimi sunan çok sezonlu dizi yapısında.");
  } else if (seasons && seasons >= 5) {
    reasons.push("Zengin evrenlere sahip uzun soluklu dizi yapısıyla örtüşüyor.");
  }

  // 4. Quality & International signals
  if (matchResult.scoreBreakdown.qualityScore >= 0.80) {
    reasons.push("Eleştirmenler ve izleyiciler tarafından yüksek puanlanmış güçlü yapım.");
  }

  if (candidate.originalLanguage && candidate.originalLanguage !== "en" && candidate.originalLanguage !== "tr") {
    reasons.push("Dünya dizilerine ve farklı dillerdeki özgün yapımlara olan ilginizle uyumlu.");
  }

  // Deduplicate and bound to max 4 reasons
  const uniqueReasons = Array.from(new Set(reasons)).slice(0, 4);

  return {
    headline,
    reasons: uniqueReasons,
  };
}

/**
 * Universal TV Match Helper for a single TV Show.
 * Provides personal match score, label, headline, and structured evidence reasons.
 */
export async function getTvPersonalMatch(
  userId: string,
  tvShowId: string
): Promise<UniversalTvMatchResult> {
  const matches = await getTvPersonalMatches(userId, [tvShowId]);
  return (
    matches.get(tvShowId) || {
      tvShowId,
      rawScore: 0,
      displayScore: 0,
      label: "Uyum Hesaplanıyor",
      evidenceStrength: "NONE",
      available: false,
      reasons: [],
    }
  );
}

/**
 * Universal TV Match Helper for multiple TV Shows (Batch / Bulk).
 * Prevents N+1 database queries.
 */
export async function getTvPersonalMatches(
  userId: string,
  tvShowIds: string[]
): Promise<Map<string, UniversalTvMatchResult>> {
  const resultMap = new Map<string, UniversalTvMatchResult>();
  if (!userId || !tvShowIds || tvShowIds.length === 0) {
    return resultMap;
  }

  const uniqueIds = Array.from(new Set(tvShowIds));

  try {
    const [profileResponse, evidenceProfile, feedbackProfile, tvShowsRaw] = await Promise.all([
      getOrRecalculateTvTasteProfile(userId),
      buildTvTasteEvidenceProfile(userId),
      buildTvFeedbackProfile(userId),
      db.tvShow.findMany({
        where: {
          OR: [
            { id: { in: uniqueIds } },
            { tmdbId: { in: uniqueIds.map((id) => (isNaN(Number(id)) ? -1 : Number(id))).filter((n) => n > 0) } },
          ],
        },
      }),
    ]);

    const tvProfile = profileResponse.profile || ({} as TvDnaResult);

    for (const raw of tvShowsRaw) {
      const meta = (raw.metadata as Record<string, unknown>) || {};
      const genres = (meta.genres as string[]) || [];

      if (!raw.name || genres.length === 0) {
        resultMap.set(raw.id, {
          tvShowId: raw.id,
          rawScore: 0,
          displayScore: 0,
          label: "Uyum Hesaplanıyor",
          evidenceStrength: "NONE",
          available: false,
          reasons: [],
        });
        continue;
      }

      const candidate: CandidateTvShow = {
        id: raw.id,
        tmdbId: raw.tmdbId,
        name: raw.name,
        originalName: raw.originalName,
        firstAirDate: raw.firstAirDate,
        lastAirDate: raw.lastAirDate,
        status: raw.status,
        originalLanguage: raw.originalLanguage,
        popularity: raw.popularity,
        voteAverage: raw.voteAverage,
        voteCount: raw.voteCount,
        posterPath: raw.posterPath,
        backdropPath: raw.backdropPath,
        overview: raw.overview || (meta.overview as string) || "",
        metadata: meta,
      };

      const matchRes = calculateTvMatch(candidate, tvProfile, feedbackProfile, evidenceProfile);
      const explanation = generateDeterministicTvReasons(candidate, matchRes, tvProfile);

      let evidenceStrength: "STRONG" | "MODERATE" | "WEAK" | "NONE" = "NONE";
      if (matchRes.evidenceShows && matchRes.evidenceShows.length > 0 && matchRes.evidenceShows[0].similarity >= 0.65) {
        evidenceStrength = "STRONG";
      } else if (matchRes.evidenceShows && matchRes.evidenceShows.length > 0) {
        evidenceStrength = "MODERATE";
      } else if (matchRes.reasonCodes.includes("GENRE_MATCH")) {
        evidenceStrength = "WEAK";
      }

      const item: UniversalTvMatchResult = {
        tvShowId: raw.id,
        rawScore: matchRes.rawScore,
        displayScore: matchRes.matchScore,
        label: matchRes.matchLabel,
        evidenceStrength,
        available: true,
        reasons: explanation.reasons,
        headline: explanation.headline,
      };

      resultMap.set(raw.id, item);
      if (raw.tmdbId) {
        resultMap.set(String(raw.tmdbId), item);
      }
    }
  } catch (error) {
    console.error("[getTvPersonalMatches Error]:", error);
  }

  for (const id of uniqueIds) {
    if (!resultMap.has(id)) {
      resultMap.set(id, {
        tvShowId: id,
        rawScore: 0,
        displayScore: 0,
        label: "Uyum Hesaplanıyor",
        evidenceStrength: "NONE",
        available: false,
        reasons: [],
      });
    }
  }

  return resultMap;
}
