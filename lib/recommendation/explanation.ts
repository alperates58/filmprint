import { getDeepSeekConfig } from "../config/service";
import type { CandidateMovie } from "../calibration/types";
import type { FilmDnaResult } from "../profile/types";
import type { MovieMatchResult, ExplanationResult, CandidateEvidence } from "./types";

export const EXPLANATION_ENGINE_VERSION = "v3";

/**
 * Generates a deterministic fallback explanation V3.
 * Only references a specific movie if evidence.hasStrongReference is true.
 */
export function generateDeterministicExplanation(
  movie: CandidateMovie,
  matchResult: MovieMatchResult,
  profile: FilmDnaResult,
  evidence?: CandidateEvidence
): ExplanationResult {
  const topGenre = movie.genres[0] || "Sinema";
  const matchPct = matchResult.matchScore;
  const { components } = matchResult;

  const strongRef = evidence?.hasStrongReference ? evidence.positiveReferences[0] : null;

  let headline = `${topGenre} zevkinle güçlü biçimde örtüşüyor.`;
  if (strongRef) {
    headline = `Daha önce sevdiğin "${strongRef.title}" tarzında bir ${topGenre} yapımı.`;
  } else if (matchPct >= 90) {
    headline = `Tam senin kaleminde bir ${topGenre} yapımı.`;
  } else if (matchPct >= 80) {
    headline = `Zevkine yüksek derecede uygun bir ${topGenre} filmi.`;
  }

  const reasons: string[] = [];

  // Reason 1: Candidate-specific Evidence or Profile Evidence
  if (strongRef) {
    reasons.push(
      `Daha önce yüksek puan verdiğin "${strongRef.title}" filmi benzeri tempolu ve sürükleyici bir anlatı sunuyor.`
    );
  } else if (evidence?.profileSignals && evidence.profileSignals.length > 0) {
    reasons.push(evidence.profileSignals[0]);
  } else if (components.genre >= 0.7) {
    reasons.push(`${topGenre}, Film DNA'ındaki en güçlü sinema alanlarından biri.`);
  } else {
    reasons.push(`${topGenre} türü sinema profilinle uyumlu sinyaller taşıyor.`);
  }

  // Reason 2: Era fit or Quality fit
  if (movie.releaseYear && components.era >= 0.65) {
    const decade = Math.floor(movie.releaseYear / 10) * 10;
    reasons.push(`${decade}'lar yapımlarına olan eğiliminle doğrudan örtüşüyor.`);
  } else if (movie.voteAverage && movie.voteAverage >= 7.5) {
    reasons.push(`${movie.voteAverage.toFixed(1)}/10 izleyici puanıyla yüksek kalite beklentinle uyumlu.`);
  } else {
    reasons.push(`Popülerlik ve izleyici beğeni dengenle uyum gösteriyor.`);
  }

  // Reason 3: Archetype / Traits
  if (profile.traits && profile.traits[0]) {
    reasons.push(`"${profile.traits[0]}" sinema karakterinle güçlü biçimde eşleşiyor.`);
  } else {
    reasons.push(`Keşif ve kalite dengen gözetilerek senin için özel seçildi.`);
  }

  return {
    headline,
    reasons: reasons.slice(0, 3),
    referenceMovies: strongRef ? [strongRef.title] : [],
    isAiGenerated: false,
  };
}

/**
 * Generates a personalized Grounded Explanation V3 using DeepSeek AI with strict 3000ms timeout.
 * Validates output against input evidence list to prevent AI hallucinations.
 */
export async function generateRecommendationExplanation(
  movie: CandidateMovie,
  matchResult: MovieMatchResult,
  profile: FilmDnaResult,
  evidence?: CandidateEvidence
): Promise<ExplanationResult> {
  const config = await getDeepSeekConfig();

  if (!config.enabled || !config.apiKey) {
    return generateDeterministicExplanation(movie, matchResult, profile, evidence);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const validReferenceTitles = evidence?.positiveReferences.map((r) => r.title) || [];

    const promptPayload = {
      movieTitle: movie.title,
      genres: movie.genres,
      releaseYear: movie.releaseYear,
      matchScore: matchResult.matchScore,
      evidenceMovies: evidence?.positiveReferences.map((r) => ({
        title: r.title,
        userRating: r.userRating,
        similarity: r.similarityScore,
        overlaps: r.overlaps,
      })) || [],
      profileSignals: evidence?.profileSignals || [],
    };

    const targetUrl = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.modelId,
        messages: [
          {
            role: "system",
            content: `Sen SineAI sinema asistanısın. Kullanıcıya filmi neden önerdiğini grounded Türkçe cümlelerle açıkla.
STRICT RULES:
1. Yalnızca verilen evidenceMovies içerisindeki filmleri referans göster. evidenceMovies boşsa ASLA film adı uydurma.
2. Pazarlama dili kullanma.
3. Sadece geçerli JSON formatında yanıt ver:
{"headline": "kısa ilgi çekici başlık", "referenceMovies": ["sadece verilen listedeki film adları"], "reasons": ["kısa neden 1", "kısa neden 2", "kısa neden 3"]}`,
          },
          {
            role: "user",
            content: JSON.stringify(promptPayload),
          },
        ],
        temperature: 0.5,
        max_tokens: 220,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return generateDeterministicExplanation(movie, matchResult, profile, evidence);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Anti-hallucination check: any returned reference movie MUST exist in input evidence
      const returnedRefs: string[] = Array.isArray(parsed.referenceMovies)
        ? parsed.referenceMovies.map((r: any) => String(r).trim())
        : [];

      const hasHallucinatedRef = returnedRefs.some(
        (ref) => !validReferenceTitles.includes(ref)
      );

      if (
        !hasHallucinatedRef &&
        typeof parsed.headline === "string" &&
        parsed.headline.trim().length > 0 &&
        Array.isArray(parsed.reasons) &&
        parsed.reasons.length >= 1
      ) {
        const cleanReasons = parsed.reasons
          .map((r: any) => String(r).trim())
          .filter((r: string) => r.length > 0)
          .slice(0, 3);

        if (cleanReasons.length >= 1) {
          return {
            headline: String(parsed.headline).trim(),
            reasons: cleanReasons,
            referenceMovies: returnedRefs,
            isAiGenerated: true,
          };
        }
      }
    }

    return generateDeterministicExplanation(movie, matchResult, profile, evidence);
  } catch {
    return generateDeterministicExplanation(movie, matchResult, profile, evidence);
  }
}
