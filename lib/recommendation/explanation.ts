import { getDeepSeekConfig } from "@/lib/config/service";
import { CandidateMovie } from "@/lib/calibration/types";
import { FilmDnaResult } from "@/lib/profile/types";
import { MovieMatchResult, ExplanationResult } from "./types";

/**
 * Generates a deterministic fallback explanation with 2-3 structured reasons
 * when DeepSeek is disabled, unavailable, or times out.
 */
export function generateDeterministicExplanation(
  movie: CandidateMovie,
  matchResult: MovieMatchResult,
  profile: FilmDnaResult
): ExplanationResult {
  const topGenre = movie.genres[0] || "Sinema";
  const matchPct = matchResult.matchScore;
  const { components } = matchResult;

  let headline = `${topGenre} zevkinle güçlü biçimde örtüşüyor.`;
  if (matchPct >= 90) {
    headline = `Tam senin kaleminde bir ${topGenre} yapımı.`;
  } else if (matchPct >= 80) {
    headline = `Zevkine yüksek derecede uygun bir ${topGenre} filmi.`;
  } else if (matchPct < 70) {
    headline = `Sinema keşif listen için farklı bir ${topGenre} alternatifi.`;
  }

  const reasons: string[] = [];

  // Reason 1: Genre fit
  if (components.genre >= 0.7) {
    reasons.push(`${topGenre}, Film DNA'ındaki en güçlü sinema alanlarından biri.`);
  } else if (components.genre >= 0.5) {
    reasons.push(`${topGenre} türüyle belirgin bir ilgi uyumun bulunuyor.`);
  } else {
    reasons.push(`${topGenre} türü sinema profilinle uyumlu sinyaller taşıyor.`);
  }

  // Reason 2: Era fit or Quality fit
  if (movie.releaseYear && components.era >= 0.65) {
    const decade = Math.floor(movie.releaseYear / 10) * 10;
    reasons.push(`${decade}'lar yapımlarına olan eğiliminle doğrudan örtüşüyor.`);
  } else if (movie.voteAverage && movie.voteAverage >= 7.5) {
    reasons.push(`${movie.voteAverage.toFixed(1)}/10 puanıyla yüksek kalite beklentinle uyumlu.`);
  } else if (components.popularity >= 0.7) {
    reasons.push(`Popülerlik ve izleyici beğeni dengenle uyum gösteriyor.`);
  }

  // Reason 3: Archetype / Discovery / Contrast
  if (matchPct < 85 && components.era < 0.5 && movie.releaseYear) {
    reasons.push(`Dönem tercihinle tam örtüşmese de tür ve içerik uyumu çok güçlü.`);
  } else if (profile.traits && profile.traits[0]) {
    reasons.push(`"${profile.traits[0]}" sinema karakterinle güçlü biçimde eşleşiyor.`);
  } else {
    reasons.push(`Keşif ve kalite dengen gözetilerek senin için özel seçildi.`);
  }

  // Ensure 2 to 3 reasons
  const finalReasons = reasons.slice(0, 3);

  return {
    headline,
    reasons: finalReasons,
    isAiGenerated: false,
  };
}

/**
 * Generates a personalized Turkish recommendation explanation with structured headline + 2-3 reasons.
 * Uses DeepSeek AI with strict 3000ms timeout and falls back to deterministic generator if AI fails or returns malformed response.
 */
export async function generateRecommendationExplanation(
  movie: CandidateMovie,
  matchResult: MovieMatchResult,
  profile: FilmDnaResult
): Promise<ExplanationResult> {
  const config = await getDeepSeekConfig();

  if (!config.enabled || !config.apiKey) {
    return generateDeterministicExplanation(movie, matchResult, profile);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Minimal privacy-safe prompt payload (NO user ID, NO raw interaction history)
    const promptPayload = {
      movieTitle: movie.title,
      genres: movie.genres,
      releaseYear: movie.releaseYear,
      matchScore: matchResult.matchScore,
      userTopGenres: profile.genres.slice(0, 3).map((g: any) => g.name),
      userTopEra: profile.eras[0]?.label || "",
      userTraits: profile.traits.slice(0, 3),
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
            content:
              'Sen Filmprint sinema asistanısın. Kullanıcıya filmi neden önerdiğini doğal, etkileyici ve kısa Türkçe ile açıkla. Sadece ve sadece geçerli JSON formatında yanıt ver: {"headline": "kısa ilgi çekici başlık", "reasons": ["kısa neden 1", "kısa neden 2", "kısa neden 3"]}',
          },
          {
            role: "user",
            content: JSON.stringify(promptPayload),
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return generateDeterministicExplanation(movie, matchResult, profile);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (
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
            isAiGenerated: true,
          };
        }
      }
    }

    return generateDeterministicExplanation(movie, matchResult, profile);
  } catch {
    return generateDeterministicExplanation(movie, matchResult, profile);
  }
}
