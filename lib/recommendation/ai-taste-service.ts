import { db } from "../db/client";
import { getDeepSeekConfig } from "../config/service";
import type { FilmDnaResult } from "../profile/types";
import { getOrCalculateUserProfile } from "../profile/service";
import {
  AI_TASTE_SCHEMA_VERSION,
  AI_TASTE_PROMPT_VERSION,
  AI_TASTE_ALGORITHM_VERSION,
  AI_TASTE_DEFAULT_REFRESH_THRESHOLD,
  AI_TASTE_MAX_POSITIVE_ANCHORS,
  AI_TASTE_MAX_NEGATIVE_ANCHORS,
  AI_TASTE_TIMEOUT_MS,
} from "./ai-taste-constants";
import type {
  AiTasteProfile,
  MediaDomain,
  AiTasteTokenUsage,
} from "./ai-taste-types";
import { createHash } from "crypto";

/**
 * Validates and normalizes raw JSON response against strict AiTasteProfile schema.
 */
export function validateAiTasteJson(raw: any): AiTasteProfile | null {
  if (!raw || typeof raw !== "object") return null;

  try {
    const corePreferences = Array.isArray(raw.corePreferences)
      ? raw.corePreferences.map((p: any) => String(p).trim()).filter(Boolean)
      : [];
    const strongDislikes = Array.isArray(raw.strongDislikes)
      ? raw.strongDislikes.map((d: any) => String(d).trim()).filter(Boolean)
      : [];
    const preferredCharacteristics = Array.isArray(raw.preferredCharacteristics)
      ? raw.preferredCharacteristics.map((c: any) => String(c).trim()).filter(Boolean)
      : [];
    const avoidCharacteristics = Array.isArray(raw.avoidCharacteristics)
      ? raw.avoidCharacteristics.map((c: any) => String(c).trim()).filter(Boolean)
      : [];

    const sp = raw.storyPreferences || {};
    const clamp01 = (val: any, def: number = 0.5) => {
      const num = typeof val === "number" ? val : parseFloat(val);
      return isNaN(num) ? def : Math.max(0.0, Math.min(1.0, Number(num.toFixed(2))));
    };

    const storyPreferences = {
      slowBurn: clamp01(sp.slowBurn, 0.5),
      complexNarrative: clamp01(sp.complexNarrative, 0.5),
      characterDriven: clamp01(sp.characterDriven, 0.5),
      spectacle: clamp01(sp.spectacle, 0.5),
      moralAmbiguity: clamp01(sp.moralAmbiguity, 0.5),
      nonlinearNarrative: clamp01(sp.nonlinearNarrative, 0.5),
    };

    const discoveryTolerance = clamp01(raw.discoveryTolerance, 0.5);
    const confidence = clamp01(raw.confidence, 0.7);

    return {
      schemaVersion: AI_TASTE_SCHEMA_VERSION,
      corePreferences,
      strongDislikes,
      storyPreferences,
      discoveryTolerance,
      preferredCharacteristics,
      avoidCharacteristics,
      confidence,
    };
  } catch {
    return null;
  }
}

/**
 * Deterministically generates an input fingerprint from user interaction states,
 * ensuring same-row updates (e.g. LIKE -> DISLIKE on existing row) alter the fingerprint.
 */
export function generateAiTasteInputFingerprint(
  interactions: { movieId: string; status: string; rating: string | null; updatedAt: Date }[],
  profileVersion: number,
  algorithmVersion: number = AI_TASTE_ALGORITHM_VERSION,
  promptVersion: number = AI_TASTE_PROMPT_VERSION
): string {
  // Sort interactions deterministically by movieId
  const sortedTuples = [...interactions]
    .sort((a, b) => a.movieId.localeCompare(b.movieId))
    .map(
      (i) => `${i.movieId}:${i.status}:${i.rating || "none"}:${i.updatedAt.getTime()}`
    )
    .join("|");

  const payload = `v${algorithmVersion}_p${promptVersion}_prof${profileVersion}_count${interactions.length}_data:${sortedTuples}`;
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Deterministic Taste Drift Detector.
 * Checks for top genre rank shifts, polarity flips, or archetype orientation changes.
 */
export function detectSignificantTasteDrift(
  cachedTasteJson: any,
  currentDna: FilmDnaResult
): boolean {
  if (!cachedTasteJson || typeof cachedTasteJson !== "object") return true;

  // 1. Top genre drift: check if top 2 current DNA genres are in cached preferences
  const currentTopGenres = (currentDna.genres || []).slice(0, 2).map((g) => g.name);
  const cachedCore = (cachedTasteJson.corePreferences || []).map((s: string) => s.toLowerCase());

  if (currentTopGenres.length > 0) {
    const primaryGenre = currentTopGenres[0].toLowerCase();
    const hasPrimary = cachedCore.some((c: string) => c.includes(primaryGenre));
    // If primary genre has no trace in cached preferences, consider drifted
    if (!hasPrimary && (currentDna.genres?.[0]?.score || 0) >= 0.70) {
      return true;
    }
  }

  // 2. Disliked genre drift: check if current disliked genres clash with cached core
  const dislikedGenres = (currentDna.genres || []).filter((g) => g.score < 0.25).map((g) => g.name.toLowerCase());
  for (const neg of dislikedGenres) {
    if (cachedCore.some((c: string) => c.includes(neg))) {
      return true; // Polarity flipped on a prominent genre
    }
  }

  return false;
}

/**
 * Builds compact prompt payload for DeepSeek AI Taste Profile generation.
 */
export async function buildAiTastePromptPayload(
  userId: string,
  dna: FilmDnaResult
) {
  // Fetch positive anchors (LOVE & LIKE)
  const positiveInteractions = await db.movieInteraction.findMany({
    where: { userId, status: "WATCHED", rating: { in: ["LOVE", "LIKE"] } },
    include: { movie: true },
    orderBy: { updatedAt: "desc" },
    take: AI_TASTE_MAX_POSITIVE_ANCHORS,
  });

  // Fetch negative anchors (DISLIKE)
  const negativeInteractions = await db.movieInteraction.findMany({
    where: { userId, status: "WATCHED", rating: "DISLIKE" },
    include: { movie: true },
    orderBy: { updatedAt: "desc" },
    take: AI_TASTE_MAX_NEGATIVE_ANCHORS,
  });

  const formatAnchor = (i: any) => {
    const meta = (i.movie.metadata as Record<string, any>) || {};
    return {
      title: i.movie.title,
      year: i.movie.releaseYear,
      genres: (meta.genres as string[]) || [],
      rating: i.rating,
      director: meta.director || undefined,
    };
  };

  const positiveAnchors = positiveInteractions.map(formatAnchor);
  const negativeAnchors = negativeInteractions.map(formatAnchor);

  const topGenres = (dna.genres || []).slice(0, 5).map((g) => ({ name: g.name, score: g.score }));
  const bottomGenres = (dna.genres || []).filter((g) => g.score < 0.30).map((g) => g.name);
  const topEras = (dna.eras || []).slice(0, 3).map((e) => ({ era: e.label, score: e.score }));

  return {
    profileSummary: dna.summary,
    archetypeTraits: dna.traits || [],
    popularityOrientation: dna.popularity?.orientation || "balanced",
    topGenres,
    bottomGenres,
    preferredEras: topEras,
    positiveAnchors,
    negativeAnchors,
    ratedCount: dna.sample?.ratedMovies || 0,
  };
}

/**
 * Calls DeepSeek API to generate structured semantic AI Taste Profile.
 */
export async function generateAiTasteWithDeepSeek(
  promptPayload: any
): Promise<{ profile: AiTasteProfile | null; tokenUsage?: AiTasteTokenUsage }> {
  const config = await getDeepSeekConfig();

  if (!config.enabled || !config.apiKey) {
    return { profile: null };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TASTE_TIMEOUT_MS);

    const targetUrl = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

    const systemPrompt = `Sen Filmprint sinema zevk analistisin. Kullanıcının Film DNA verisini ve izleme tercihlerini analiz ederek derinlikli bir Semantik Sinema Zevk Profili (AI Taste Profile) oluştur.

STRICT JSON OUTPUT SCHEMA:
{
  "schemaVersion": 1,
  "corePreferences": ["kullanıcının en çok keyif aldığı 3-5 semantik tema / anlatı motifi"],
  "strongDislikes": ["kullanıcının kesinlikle kaçındığı 2-4 tema / klişe"],
  "storyPreferences": {
    "slowBurn": 0.0-1.0,
    "complexNarrative": 0.0-1.0,
    "characterDriven": 0.0-1.0,
    "spectacle": 0.0-1.0,
    "moralAmbiguity": 0.0-1.0,
    "nonlinearNarrative": 0.0-1.0
  },
  "discoveryTolerance": 0.0-1.0,
  "preferredCharacteristics": ["kısa karakteristik 1", "kısa karakteristik 2"],
  "avoidCharacteristics": ["kısa kaçınma 1", "kısa kaçınma 2"],
  "confidence": 0.0-1.0
}

Kurallar:
1. Yalnızca geçerli JSON döndür, başka hiçbir metin veya markdown ekleme.
2. Değerleri 0.0 - 1.0 aralığında kesin sayılar olarak belirle.
3. Pazarlama dili kullanma; sinemasal derinlik ve anlatı yapısına odaklan.`;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(promptPayload) },
        ],
        temperature: 0.3,
        max_tokens: 450,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[AiTasteService] DeepSeek API returned status ${response.status}`);
      return { profile: null };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    const usage: AiTasteTokenUsage | undefined = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
          cacheHitTokens: data.usage.prompt_cache_hit_tokens,
          cacheMissTokens: data.usage.prompt_cache_miss_tokens,
        }
      : undefined;

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validProfile = validateAiTasteJson(parsed);
      return { profile: validProfile, tokenUsage: usage };
    }

    return { profile: null };
  } catch (err) {
    console.error("[AiTasteService] Error generating AI Taste Profile:", err);
    return { profile: null };
  }
}

/**
 * Retrieves or refreshes User AI Taste Profile for a given mediaType ("FILM" | "TV").
 * Evaluates refresh policy: 25 taste-bearing interaction delta, same-row rating changes (fingerprint),
 * taste drift, or version increments.
 */
export async function getOrRefreshUserAiTasteProfile(
  userId: string,
  mediaType: MediaDomain = "FILM",
  options: { forceRefresh?: boolean; refreshThreshold?: number } = {}
): Promise<{ profile: AiTasteProfile | null; refreshed: boolean; source: "cached" | "generated" | "fallback" }> {
  // Phase 9.5 strictly limits execution to FILM
  if (mediaType !== "FILM") {
    return { profile: null, refreshed: false, source: "fallback" };
  }

  const refreshThreshold = options.refreshThreshold || AI_TASTE_DEFAULT_REFRESH_THRESHOLD;

  // 1. Fetch current Film DNA profile
  const dnaResponse = await getOrCalculateUserProfile(userId);
  if (!dnaResponse.ready || !dnaResponse.profile) {
    return { profile: null, refreshed: false, source: "fallback" };
  }
  const dna = dnaResponse.profile as FilmDnaResult;

  // 2. Fetch all taste-bearing interactions (WATCHED + LOVE/LIKE/NEUTRAL/DISLIKE)
  const tasteBearingInteractions = await db.movieInteraction.findMany({
    where: {
      userId,
      status: "WATCHED",
      rating: { not: null },
    },
    select: {
      movieId: true,
      status: true,
      rating: true,
      updatedAt: true,
    },
  });

  const currentEvidenceCount = tasteBearingInteractions.length;

  // Need a minimum baseline of taste interactions to generate meaningful AI profile
  if (currentEvidenceCount < 10) {
    return { profile: null, refreshed: false, source: "fallback" };
  }

  // 3. Compute current input fingerprint
  const currentFingerprint = generateAiTasteInputFingerprint(
    tasteBearingInteractions,
    dna.version || 1,
    AI_TASTE_ALGORITHM_VERSION,
    AI_TASTE_PROMPT_VERSION
  );

  // 4. Check existing UserAiTasteProfile record
  const existingRecord = await db.userAiTasteProfile.findUnique({
    where: {
      userId_mediaType: {
        userId,
        mediaType: "FILM",
      },
    },
  });

  let shouldRefresh = false;

  if (!existingRecord) {
    shouldRefresh = true;
  } else if (options.forceRefresh) {
    shouldRefresh = true;
  } else if (existingRecord.inputFingerprint !== currentFingerprint) {
    // Fingerprint changed -> either interaction count grew by 25+ OR existing ratings were updated (same-row update)
    const evidenceDelta = currentEvidenceCount - existingRecord.sourceEvidenceCount;
    if (evidenceDelta >= refreshThreshold) {
      shouldRefresh = true;
    } else if (evidenceDelta === 0) {
      // Same count but different fingerprint = same-row update detected (e.g. LIKE -> DISLIKE)
      shouldRefresh = true;
    } else if (evidenceDelta > 0 && detectSignificantTasteDrift(existingRecord.tasteJson, dna)) {
      shouldRefresh = true;
    }
  } else if (existingRecord.aiTasteVersion !== AI_TASTE_SCHEMA_VERSION) {
    shouldRefresh = true;
  }

  // If valid and no refresh needed, return cached profile
  if (!shouldRefresh && existingRecord) {
    const validated = validateAiTasteJson(existingRecord.tasteJson);
    if (validated) {
      return { profile: validated, refreshed: false, source: "cached" };
    }
  }

  // 5. Generate fresh AI Taste Profile
  const promptPayload = await buildAiTastePromptPayload(userId, dna);
  const { profile: generatedProfile, tokenUsage } = await generateAiTasteWithDeepSeek(promptPayload);

  if (generatedProfile) {
    const config = await getDeepSeekConfig();
    const savedRecord = await db.userAiTasteProfile.upsert({
      where: {
        userId_mediaType: {
          userId,
          mediaType: "FILM",
        },
      },
      update: {
        profileVersion: dna.version || 1,
        aiTasteVersion: AI_TASTE_SCHEMA_VERSION,
        model: config.modelId,
        tasteJson: generatedProfile as any,
        sourceEvidenceCount: currentEvidenceCount,
        inputFingerprint: currentFingerprint,
      },
      create: {
        userId,
        mediaType: "FILM",
        profileVersion: dna.version || 1,
        aiTasteVersion: AI_TASTE_SCHEMA_VERSION,
        model: config.modelId,
        tasteJson: generatedProfile as any,
        sourceEvidenceCount: currentEvidenceCount,
        inputFingerprint: currentFingerprint,
      },
    });

    return {
      profile: validateAiTasteJson(savedRecord.tasteJson),
      refreshed: true,
      source: "generated",
    };
  }

  // Fallback: If generation failed, return previous profile if available
  if (existingRecord) {
    const previousValidated = validateAiTasteJson(existingRecord.tasteJson);
    if (previousValidated) {
      return { profile: previousValidated, refreshed: false, source: "fallback" };
    }
  }

  return { profile: null, refreshed: false, source: "fallback" };
}
