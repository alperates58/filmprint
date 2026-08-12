import { getDeepSeekConfig } from "@/lib/config/service";
import { CandidateMovie } from "@/lib/calibration/types";
import { FilmDnaResult } from "@/lib/profile/types";
import { MovieMatchResult, ExplanationResult } from "./types";

/**
 * Generates a deterministic fallback explanation when DeepSeek is disabled, unavailable, or times out.
 */
export function generateDeterministicExplanation(
  movie: CandidateMovie,
  matchResult: MovieMatchResult,
  profile: FilmDnaResult
): ExplanationResult {
  const topGenre = movie.genres[0] || "Sinema";
  const topTrait = profile.traits[0] || "Film Tutkunu";
  const matchPct = matchResult.matchScore;

  let headline = `Senin İçin Seçildi: %${matchPct} Uyumlu ${topGenre} Yapımı`;
  if (matchPct >= 90) {
    headline = `Tam Senin Kaleminde Bir ${topGenre} Şaheseri`;
  } else if (matchPct >= 80) {
    headline = `Zevkine Çok Uygun Bir ${topGenre} Yapımı`;
  }

  let explanation = `${movie.title}, **${topGenre}** türündeki yüksek ilgi oranınız`;

  if (movie.releaseYear) {
    explanation += ` ve **${movie.releaseYear}** dönemi sinema tercihlerinizle`;
  }

  explanation += ` **%${matchPct}** oranında güçlü bir uyum gösteriyor. "${topTrait}" sinema kimliğinize son derece hitap ediyor.`;

  return {
    headline,
    explanation,
    isAiGenerated: false,
  };
}

/**
 * Generates a personalized Turkish recommendation explanation.
 * Uses DeepSeek AI with strict 3000ms timeout and falls back to deterministic generator if AI fails.
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
              'Sen Filmprint sinema asistanısın. Kullanıcıya filmi neden önerdiğini doğal, etkileyici ve kısa Türkçe ile açıkla. Sadece ve sadece geçerli JSON formatında yanıt ver: {"headline": "kısa ilgi çekici başlık", "explanation": "2 cümlelik açıklama"}',
          },
          {
            role: "user",
            content: JSON.stringify(promptPayload),
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
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
      if (parsed.headline && parsed.explanation) {
        return {
          headline: String(parsed.headline),
          explanation: String(parsed.explanation),
          isAiGenerated: true,
        };
      }
    }

    return generateDeterministicExplanation(movie, matchResult, profile);
  } catch {
    return generateDeterministicExplanation(movie, matchResult, profile);
  }
}
