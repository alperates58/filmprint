import { db } from "@/lib/db/client";
import { getDeepSeekConfig } from "@/lib/config/service";
import type { TvMatchResult } from "./types";
import type { TvDnaResult } from "../profile/types";

export interface TvExplanationResult {
  headline: string;
  explanation: string;
  isAiGenerated: boolean;
  fromCache: boolean;
  groundedReferences: string[];
}

/**
 * Resolves or generates on-demand natural language explanation for a recommended TV show.
 * Strictly uses grounded evidence shows selected deterministically by the match engine.
 */
export async function getOrGenerateTvRecommendationExplanation(
  userId: string,
  tvShowId: string,
  matchResult: TvMatchResult,
  tvProfile?: TvDnaResult,
  options: { profileVersion?: number; matchVersion?: number } = {}
): Promise<TvExplanationResult> {
  const profileVersion = options.profileVersion || 1;
  const matchVersion = options.matchVersion || 1;

  // 1. Check existing explanation cache
  const cached = await db.tvRecommendationExplanation.findUnique({
    where: {
      userId_tvShowId_profileVersion_matchVersion: {
        userId,
        tvShowId,
        profileVersion,
        matchVersion,
      },
    },
  });

  const groundedRefNames = (matchResult.evidenceShows || []).map((e) => e.name);

  if (cached) {
    return {
      headline: cached.headline,
      explanation: cached.explanation,
      isAiGenerated: cached.isAiGenerated,
      fromCache: true,
      groundedReferences: groundedRefNames,
    };
  }

  // 2. Fallback to deterministic template if DeepSeek is not configured
  const deepseekConfig = await getDeepSeekConfig();
  if (!deepseekConfig.apiKey || !deepseekConfig.enabled) {
    return {
      headline: `${matchResult.matchScore}% Dizi DNA Uyumu`,
      explanation: matchResult.deterministicExplanation,
      isAiGenerated: false,
      fromCache: false,
      groundedReferences: groundedRefNames,
    };
  }

  // 3. Fetch TV Show metadata
  const tvShow = await db.tvShow.findUnique({
    where: { id: tvShowId },
  });

  if (!tvShow) {
    return {
      headline: `${matchResult.matchScore}% Dizi DNA Uyumu`,
      explanation: matchResult.deterministicExplanation,
      isAiGenerated: false,
      fromCache: false,
      groundedReferences: groundedRefNames,
    };
  }

  const meta = (tvShow.metadata as any) || {};
  const genres = (meta.genres || []).map((g: any) => g.name || g);

  const systemPrompt = `You are the Filmprint TV Series Recommendation Explainer.
Explain why this TV series was recommended to the user in a concise, warm, and cinematic Turkish paragraph (2-3 sentences max).

CRITICAL RULES:
1. ONLY reference the provided grounded reference series (${groundedRefNames.join(", ") || "none"}). DO NOT invent external comparison series.
2. Highlight specific storytelling elements (e.g. slow-burn pacing, seasonal commitment, character depth, narrative tension).
3. Return STRICT JSON conforming to:
{
  "headline": "Kısa, çarpıcı Türkçe başlık (örn: 'Soluksuz Bir Suç Gerilimi')",
  "explanation": "2-3 cümlelik doğal, sinematik Türkçe açıklama."
}`;

  const userPrompt = JSON.stringify({
    show: {
      name: tvShow.name,
      firstAirYear: tvShow.firstAirDate ? new Date(tvShow.firstAirDate).getFullYear() : null,
      seasons: meta.numberOfSeasons || null,
      runtime: meta.episodeRunTime?.[0] || null,
      genres,
      overview: tvShow.overview,
    },
    matchScore: matchResult.matchScore,
    reasonCodes: matchResult.reasonCodes,
    groundedReferences: matchResult.evidenceShows || [],
    userDnaSummary: tvProfile
      ? {
          topGenres: (tvProfile.genres || []).filter((g) => g.state === "POSITIVE").slice(0, 3).map((g) => g.name),
          formatPreference: tvProfile.formatPreference?.preference,
          runtimePreference: tvProfile.episodeRuntimePreference?.preference,
        }
      : null,
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${deepseekConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: deepseekConfig.modelId,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        headline: `${matchResult.matchScore}% Dizi DNA Uyumu`,
        explanation: matchResult.deterministicExplanation,
        isAiGenerated: false,
        fromCache: false,
        groundedReferences: groundedRefNames,
      };
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content;
    const parsed = rawContent ? JSON.parse(rawContent) : null;

    const headline = String(parsed?.headline || `${matchResult.matchScore}% Dizi DNA Uyumu`).trim();
    const explanation = String(parsed?.explanation || matchResult.deterministicExplanation).trim();

    // Persist in cache
    await db.tvRecommendationExplanation.upsert({
      where: {
        userId_tvShowId_profileVersion_matchVersion: {
          userId,
          tvShowId,
          profileVersion,
          matchVersion,
        },
      },
      update: {
        headline,
        explanation,
        isAiGenerated: true,
      },
      create: {
        userId,
        tvShowId,
        profileVersion,
        matchVersion,
        headline,
        explanation,
        isAiGenerated: true,
      },
    });

    return {
      headline,
      explanation,
      isAiGenerated: true,
      fromCache: false,
      groundedReferences: groundedRefNames,
    };
  } catch (err: any) {
    console.warn("[TV Explanation] Error generating AI explanation:", err.message || err);
    return {
      headline: `${matchResult.matchScore}% Dizi DNA Uyumu`,
      explanation: matchResult.deterministicExplanation,
      isAiGenerated: false,
      fromCache: false,
      groundedReferences: groundedRefNames,
    };
  }
}
