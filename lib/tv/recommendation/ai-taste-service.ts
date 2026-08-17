import { db } from "@/lib/db/client";
import { getDeepSeekConfig } from "@/lib/config/service";
import { getOrRecalculateTvTasteProfile } from "../profile/service";
import type { TvDnaResult } from "../profile/types";
import {
  TV_AI_TASTE_SCHEMA_VERSION,
  TV_AI_TASTE_PROMPT_VERSION,
  TV_AI_TASTE_ALGORITHM_VERSION,
  TV_AI_TASTE_DEFAULT_REFRESH_THRESHOLD,
  TV_AI_TASTE_MAX_POSITIVE_ANCHORS,
  TV_AI_TASTE_MAX_NEGATIVE_ANCHORS,
  TV_AI_TASTE_TIMEOUT_MS,
} from "./ai-taste-constants";
import type {
  TvAiTasteProfile,
  TvAiTasteTokenUsage,
} from "./ai-taste-types";
import { createHash } from "crypto";

/**
 * Validates and normalizes raw JSON response against strict TvAiTasteProfile schema.
 */
export function validateTvAiTasteJson(raw: any): TvAiTasteProfile | null {
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
      serializedNarrative: clamp01(sp.serializedNarrative, 0.5),
      episodicNarrative: clamp01(sp.episodicNarrative, 0.5),
      complexNarrative: clamp01(sp.complexNarrative, 0.5),
      characterDriven: clamp01(sp.characterDriven, 0.5),
      moralAmbiguity: clamp01(sp.moralAmbiguity, 0.5),
      cliffhangerTolerance: clamp01(sp.cliffhangerTolerance, 0.5),
      comfortViewing: clamp01(sp.comfortViewing, 0.5),
    };

    const cp = raw.commitmentPreference || {};
    const commitmentPreference = {
      shortSeries: clamp01(cp.shortSeries, 0.5),
      longRunning: clamp01(cp.longRunning, 0.5),
    };

    const internationalOpenness = clamp01(raw.internationalOpenness, 0.5);
    const confidence = clamp01(raw.confidence, 0.7);

    return {
      schemaVersion: TV_AI_TASTE_SCHEMA_VERSION,
      corePreferences,
      strongDislikes,
      storyPreferences,
      commitmentPreference,
      internationalOpenness,
      preferredCharacteristics,
      avoidCharacteristics,
      confidence,
    };
  } catch {
    return null;
  }
}

/**
 * Deterministically generates an input fingerprint from TV user interaction states.
 * Guarantees same-row updates (e.g. PARTIAL LIKE -> WATCHED LOVE) produce a new fingerprint.
 */
export function generateTvAiTasteInputFingerprint(
  interactions: { tvShowId: string; status: string; rating: string | null; updatedAt: Date }[],
  profileVersion: number,
  algorithmVersion: number = TV_AI_TASTE_ALGORITHM_VERSION,
  promptVersion: number = TV_AI_TASTE_PROMPT_VERSION
): string {
  const sortedTuples = [...interactions]
    .sort((a, b) => a.tvShowId.localeCompare(b.tvShowId))
    .map(
      (i) => `${i.tvShowId}:${i.status}:${i.rating || "none"}:${i.updatedAt.getTime()}`
    )
    .join("|");

  const payload = `tv_v${algorithmVersion}_p${promptVersion}_prof${profileVersion}_count${interactions.length}_data:${sortedTuples}`;
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Deterministic TV Taste Drift Detector.
 * Triggers refresh before threshold if primary genre polarity flips, format shifts, or archetypes change.
 */
export function detectSignificantTvTasteDrift(
  currentDna: TvDnaResult,
  cachedDnaSummary: {
    topGenreName?: string;
    formatPreference?: string;
    archetypeIds?: string[];
  }
): boolean {
  if (!cachedDnaSummary) return true;

  // 1. Top genre shift or polarity inversion
  const currentTop = currentDna.genres?.[0]?.name;
  if (currentTop && cachedDnaSummary.topGenreName && currentTop !== cachedDnaSummary.topGenreName) {
    return true;
  }

  // 2. Format preference shift
  const curFormat = currentDna.formatPreference?.preference;
  if (curFormat && cachedDnaSummary.formatPreference && curFormat !== cachedDnaSummary.formatPreference) {
    return true;
  }

  // 3. Archetype shift
  const currentPrimaryArchetypes = (currentDna.archetypes || []).filter((a) => a.isPrimary).map((a) => a.id);
  if (cachedDnaSummary.archetypeIds && cachedDnaSummary.archetypeIds.length > 0) {
    const isSameArchetype = currentPrimaryArchetypes.some((id) => cachedDnaSummary.archetypeIds!.includes(id));
    if (!isSameArchetype && currentPrimaryArchetypes.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves or generates the user's TV AI Taste Profile via DeepSeek.
 * Completely media-isolated with mediaType = TV.
 */
export async function getOrGenerateTvAiTasteProfile(
  userId: string,
  options: { forceRefresh?: boolean; refreshThreshold?: number } = {}
): Promise<{ profile: TvAiTasteProfile | null; tokenUsage?: TvAiTasteTokenUsage; fromCache: boolean }> {
  const refreshThreshold = options.refreshThreshold || TV_AI_TASTE_DEFAULT_REFRESH_THRESHOLD;

  // 1. Fetch TV Dizi DNA & Taste-bearing TV Interactions (WATCHED or PARTIAL with rating)
  const [profileResult, tasteInteractions] = await Promise.all([
    getOrRecalculateTvTasteProfile(userId),
    db.tvInteraction.findMany({
      where: {
        userId,
        status: { in: ["WATCHED", "PARTIALLY_WATCHED"] },
        rating: { not: null },
      },
      include: { tvShow: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const tvProfile = profileResult.profile;
  if (!tvProfile) {
    return { profile: null, fromCache: false };
  }

  const currentEvidenceCount = tasteInteractions.length;
  const profileVersion = tvProfile.schemaVersion || 1;

  // 2. Generate current deterministic input fingerprint
  const currentFingerprint = generateTvAiTasteInputFingerprint(
    tasteInteractions.map((i) => ({
      tvShowId: i.tvShowId,
      status: i.status,
      rating: i.rating,
      updatedAt: i.updatedAt,
    })),
    profileVersion
  );

  // 3. Query existing TV AI Taste Profile from database
  const cached = await db.userAiTasteProfile.findUnique({
    where: {
      userId_mediaType: {
        userId,
        mediaType: "TV",
      },
    },
  });

  const deepseekConfig = await getDeepSeekConfig();
  const currentModel = deepseekConfig.modelId;

  // 4. Freshness Evaluation
  if (cached && !options.forceRefresh) {
    const isExactFingerprint =
      cached.inputFingerprint === currentFingerprint &&
      cached.aiTasteVersion === TV_AI_TASTE_SCHEMA_VERSION &&
      cached.model === currentModel;

    if (isExactFingerprint) {
      const validated = validateTvAiTasteJson(cached.tasteJson);
      if (validated) {
        return { profile: validated, fromCache: true };
      }
    }

    const evidenceDelta = Math.abs(currentEvidenceCount - cached.sourceEvidenceCount);
    const cachedTaste = cached.tasteJson as any;
    const hasDrift = detectSignificantTvTasteDrift(tvProfile, {
      topGenreName: cachedTaste?._dnaSummary?.topGenre,
      formatPreference: cachedTaste?._dnaSummary?.format,
      archetypeIds: cachedTaste?._dnaSummary?.archetypes,
    });

    if (evidenceDelta < refreshThreshold && !hasDrift && cached.model === currentModel) {
      const validated = validateTvAiTasteJson(cached.tasteJson);
      if (validated) {
        return { profile: validated, fromCache: true };
      }
    }
  }

  // 5. Generate TV AI Taste Profile via DeepSeek
  if (!deepseekConfig.apiKey || !deepseekConfig.enabled) {
    return { profile: null, fromCache: false };
  }

  const positiveAnchors = tasteInteractions
    .filter((i) => i.rating === "LOVE" || i.rating === "LIKE")
    .slice(0, TV_AI_TASTE_MAX_POSITIVE_ANCHORS)
    .map((i) => ({
      name: i.tvShow.name,
      rating: i.rating,
      status: i.status,
      genres: (i.tvShow.metadata as any)?.genres || [],
      seasons: (i.tvShow.metadata as any)?.numberOfSeasons,
      language: i.tvShow.originalLanguage,
    }));

  const negativeAnchors = tasteInteractions
    .filter((i) => i.rating === "DISLIKE")
    .slice(0, TV_AI_TASTE_MAX_NEGATIVE_ANCHORS)
    .map((i) => ({
      name: i.tvShow.name,
      rating: i.rating,
      status: i.status,
      genres: (i.tvShow.metadata as any)?.genres || [],
    }));

  const systemPrompt = `You are the AI TV Taste Profiler for SineAI.
Your job is to analyze a user's deterministic TV Series DNA and structured watching history, then extract deep semantic storytelling and commitment preferences for TV series recommendations.

Respond with STRICT JSON ONLY conforming to the exact schema:
{
  "schemaVersion": 1,
  "corePreferences": ["string", "string"],
  "strongDislikes": ["string"],
  "storyPreferences": {
    "slowBurn": 0.0 to 1.0,
    "serializedNarrative": 0.0 to 1.0,
    "episodicNarrative": 0.0 to 1.0,
    "complexNarrative": 0.0 to 1.0,
    "characterDriven": 0.0 to 1.0,
    "moralAmbiguity": 0.0 to 1.0,
    "cliffhangerTolerance": 0.0 to 1.0,
    "comfortViewing": 0.0 to 1.0
  },
  "commitmentPreference": {
    "shortSeries": 0.0 to 1.0,
    "longRunning": 0.0 to 1.0
  },
  "internationalOpenness": 0.0 to 1.0,
  "preferredCharacteristics": ["string", "string"],
  "avoidCharacteristics": ["string"],
  "confidence": 0.0 to 1.0
}`;

  const userPrompt = JSON.stringify({
    mediaType: "TV",
    diziDna: {
      maturity: tvProfile.maturity,
      confidence: tvProfile.confidence,
      topGenres: (tvProfile.genres || []).filter((g) => g.state === "POSITIVE").slice(0, 5),
      dislikedGenres: (tvProfile.genres || []).filter((g) => g.state === "NEGATIVE"),
      formatPreference: tvProfile.formatPreference,
      seriesLengthPreference: tvProfile.seriesLengthPreference,
      episodeRuntimePreference: tvProfile.episodeRuntimePreference,
      statusPreference: tvProfile.statusPreference,
      internationalOrientation: tvProfile.internationalOrientation,
      archetypes: (tvProfile.archetypes || []).map((a) => ({ name: a.name, isPrimary: a.isPrimary })),
    },
    positiveAnchors,
    negativeAnchors,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TV_AI_TASTE_TIMEOUT_MS);

  try {
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
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) {
      console.warn(`[TV AI Taste] DeepSeek API returned HTTP ${res.status}`);
      return { profile: null, fromCache: false };
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content;
    const parsed = rawContent ? JSON.parse(rawContent) : null;
    const validated = validateTvAiTasteJson(parsed);

    if (!validated) {
      console.warn("[TV AI Taste] Failed to validate JSON schema from DeepSeek");
      return { profile: null, fromCache: false };
    }

    // Embed DNA summary for drift detection
    const persistedJson = {
      ...validated,
      _dnaSummary: {
        topGenre: tvProfile.genres?.[0]?.name,
        format: tvProfile.formatPreference?.preference,
        archetypes: (tvProfile.archetypes || []).filter((a) => a.isPrimary).map((a) => a.id),
      },
    };

    // Upsert into UserAiTasteProfile with mediaType = TV
    await db.userAiTasteProfile.upsert({
      where: {
        userId_mediaType: {
          userId,
          mediaType: "TV",
        },
      },
      update: {
        profileVersion,
        aiTasteVersion: TV_AI_TASTE_SCHEMA_VERSION,
        model: currentModel,
        tasteJson: persistedJson as any,
        sourceEvidenceCount: currentEvidenceCount,
        inputFingerprint: currentFingerprint,
      },
      create: {
        userId,
        mediaType: "TV",
        profileVersion,
        aiTasteVersion: TV_AI_TASTE_SCHEMA_VERSION,
        model: currentModel,
        tasteJson: persistedJson as any,
        sourceEvidenceCount: currentEvidenceCount,
        inputFingerprint: currentFingerprint,
      },
    });

    const tokenUsage: TvAiTasteTokenUsage = {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    };

    return { profile: validated, tokenUsage, fromCache: false };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn("[TV AI Taste] Error querying DeepSeek for TV Taste Profile:", err.message || err);
    return { profile: null, fromCache: false };
  }
}
