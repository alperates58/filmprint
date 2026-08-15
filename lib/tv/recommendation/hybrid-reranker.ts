import { db } from "@/lib/db/client";
import { getDeepSeekConfig } from "@/lib/config/service";
import { calibrateTvMatchScore } from "./matcher";
import {
  TV_AI_RERANK_MIN_DETERMINISTIC_GATE,
  TV_AI_RERANK_SHORTLIST_DEFAULT_SIZE,
  TV_AI_RERANK_TIMEOUT_MS,
  TV_AI_WEIGHT_SAFETY_CEILING,
  DEFAULT_TV_MATCH_WEIGHT,
  DEFAULT_TV_AI_WEIGHT,
} from "./ai-taste-constants";
import type {
  TvAiTasteProfile,
  TvAiRerankCandidateItem,
  TvAiRerankRankingItem,
  TvAiRerankResult,
  TvHybridScoreBreakdown,
} from "./ai-taste-types";
import type { ScoredTvCandidate } from "./service";
import type { TvDnaResult } from "../profile/types";
import { createHash } from "crypto";

// In-memory concurrency locks to prevent duplicate simultaneous DeepSeek calls for the same (userId, TV, candidateFingerprint)
const activeTvRerankLocks = new Set<string>();

/**
 * Calculates effective AI weight based on user Dizi DNA confidence.
 * Low confidence profiles receive attenuated AI influence for safety.
 */
export function calculateEffectiveTvAiWeight(
  configuredAiWeight: number,
  profileConfidence: number
): { effectiveMatchWeight: number; effectiveAiWeight: number } {
  const cappedConfiguredAi = Math.max(0, Math.min(TV_AI_WEIGHT_SAFETY_CEILING, configuredAiWeight));

  let effectiveAi = cappedConfiguredAi;
  if (profileConfidence < 0.50) {
    effectiveAi = Math.min(cappedConfiguredAi, 20);
  } else if (profileConfidence < 0.65) {
    effectiveAi = Math.min(cappedConfiguredAi, 30);
  }

  const effectiveMatch = 100 - effectiveAi;
  return { effectiveMatchWeight: effectiveMatch, effectiveAiWeight: effectiveAi };
}

/**
 * Applies AI Promotion Guard to prevent low deterministic candidates
 * from being falsely promoted directly to top ranks by AI.
 */
export function applyTvAiPromotionGuard(
  deterministicMatchScore: number,
  rawAiAffinity: number
): { guardedAffinity: number; isGuarded: boolean } {
  const boundedAffinity = Math.max(0, Math.min(100, Math.round(rawAiAffinity)));

  // Below 65: Excluded from AI promotion (strictly locked to deterministic match)
  if (deterministicMatchScore < TV_AI_RERANK_MIN_DETERMINISTIC_GATE) {
    return { guardedAffinity: deterministicMatchScore, isGuarded: true };
  }

  // 65 to 74: Limited promotion (affinity cannot exceed deterministic match + 15)
  if (deterministicMatchScore < 75) {
    const maxAllowed = deterministicMatchScore + 15;
    if (boundedAffinity > maxAllowed) {
      return { guardedAffinity: maxAllowed, isGuarded: true };
    }
  }

  // 75+: Full flexibility
  return { guardedAffinity: boundedAffinity, isGuarded: false };
}

/**
 * Calculates calibrated hybrid score from deterministic match score and AI affinity.
 */
export function calculateTvHybridScore(
  displayMatchScore: number,
  rawAiAffinity: number,
  effectiveMatchWeight: number,
  effectiveAiWeight: number,
  profileConfidence: number = 0.8,
  hasStrongEvidence: boolean = false
): { rawHybrid: number; displayHybrid: number; guardedAffinity: number } {
  const { guardedAffinity } = applyTvAiPromotionGuard(displayMatchScore, rawAiAffinity);

  const rawWeighted =
    (effectiveMatchWeight * displayMatchScore + effectiveAiWeight * guardedAffinity) / 100;
  const rawHybrid = Number(rawWeighted.toFixed(2));

  // Score calibration maintains trust guards (e.g. 97% max ceiling, 90%+ strong evidence requirement)
  const displayHybrid = calibrateTvMatchScore(rawHybrid, profileConfidence, hasStrongEvidence);

  return {
    rawHybrid,
    displayHybrid,
    guardedAffinity,
  };
}

/**
 * Deterministically generates an order-invariant candidate fingerprint.
 * Invariant to admin weight changes, ensuring 0 AI calls when changing weights.
 */
export function generateTvCandidateFingerprint(
  candidates: ScoredTvCandidate[],
  tvProfileVersion: number,
  tvMatchVersion: number,
  aiTasteVersion: number
): string {
  const sortedIds = [...candidates].map((c) => c.tvShow.id).sort().join(",");
  const payload = `tv_prof${tvProfileVersion}_match${tvMatchVersion}_aitaste${aiTasteVersion}_cands:${sortedIds}`;
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Retrieves or generates TV AI Recommendation Snapshot via DeepSeek batch call.
 * Uses mediaType = TV.
 */
export async function getOrGenerateTvRecommendationSnapshot(
  userId: string,
  deterministicCandidates: ScoredTvCandidate[],
  tvProfile: TvDnaResult,
  aiTasteProfile: TvAiTasteProfile | null,
  options: {
    shortlistSize?: number;
    forceRefresh?: boolean;
    tvProfileVersion?: number;
    tvMatchVersion?: number;
  } = {}
): Promise<{ snapshot: TvAiRerankResult | null; fromCache: boolean; lockSkipped?: boolean }> {
  const shortlistSize = options.shortlistSize || TV_AI_RERANK_SHORTLIST_DEFAULT_SIZE;
  const tvProfileVersion = options.tvProfileVersion || 1;
  const tvMatchVersion = options.tvMatchVersion || 1;
  const aiTasteVersion = aiTasteProfile?.schemaVersion || 1;

  // 1. Take top deterministic shortlist for reranking
  const shortlist = deterministicCandidates.slice(0, shortlistSize);
  if (shortlist.length === 0) {
    return { snapshot: null, fromCache: false };
  }

  // 2. Generate Candidate Fingerprint
  const candidateFingerprint = generateTvCandidateFingerprint(
    shortlist,
    tvProfileVersion,
    tvMatchVersion,
    aiTasteVersion
  );

  const deepseekConfig = await getDeepSeekConfig();
  const currentModel = deepseekConfig.modelId || "deepseek-chat";

  // 3. Query existing Snapshot from database (Cache-First)
  if (!options.forceRefresh) {
    const cached = await db.aiRecommendationSnapshot.findUnique({
      where: {
        userId_mediaType_profileVersion_matchVersion_aiTasteVersion_candidateFingerprint: {
          userId,
          mediaType: "TV",
          profileVersion: tvProfileVersion,
          matchVersion: tvMatchVersion,
          aiTasteVersion,
          candidateFingerprint,
        },
      },
    });

    if (cached) {
      try {
        const parsed = cached.resultJson as unknown as TvAiRerankResult;
        if (parsed && Array.isArray(parsed.rankings) && parsed.rankings.length > 0) {
          return { snapshot: parsed, fromCache: true };
        }
      } catch (err) {
        console.warn("[TV Hybrid Rerank] Corrupted snapshot JSON in database:", err);
      }
    }
  }

  // 4. Concurrency Guard: Check if a request for this candidate fingerprint is already in flight
  const lockKey = `${userId}:TV:${candidateFingerprint}`;
  if (activeTvRerankLocks.has(lockKey)) {
    return { snapshot: null, fromCache: false, lockSkipped: true };
  }

  if (!deepseekConfig.apiKey || !deepseekConfig.enabled) {
    return { snapshot: null, fromCache: false };
  }

  // 5. Acquire Lock
  activeTvRerankLocks.add(lockKey);

  try {
    // 6. Build Compact Candidate Payload for DeepSeek
    const compactCandidates: TvAiRerankCandidateItem[] = shortlist.map((c) => ({
      candidateId: c.tvShow.id,
      title: c.tvShow.name,
      genres: ((c.tvShow.metadata as any)?.genres || []).map((g: any) => g.name || g),
      firstAirYear: c.tvShow.firstAirDate ? new Date(c.tvShow.firstAirDate).getFullYear() : null,
      numberOfSeasons: (c.tvShow.metadata as any)?.numberOfSeasons || null,
      episodeRuntime: (c.tvShow.metadata as any)?.episodeRunTime?.[0] || null,
      status: c.tvShow.status,
      originalLanguage: c.tvShow.originalLanguage,
      networkOrStyle: (c.tvShow.metadata as any)?.networks?.[0]?.name || null,
      bayesianQuality: c.qualityScore,
      deterministicMatch: c.matchScore,
      reasonCodes: c.matchResult.reasonCodes,
    }));

    const systemPrompt = `You are the DeepSeek TV Series Semantic Recommendation Reranker for Filmprint.
Your job is to evaluate a candidate shortlist of TV series against a user's Dizi DNA and AI Taste Profile.

STRICT RULES:
1. ONLY return candidate IDs present in the candidate shortlist. NEVER invent new series or external IDs.
2. Evaluate storytelling style, character dynamics, season commitment, cliffhanger style, and narrative tone.
3. For each candidate, assign an 'affinity' (0 to 100), a 'confidence' (0.0 to 1.0), and 1-3 short semantic 'signals'.
4. Return STRICT JSON conforming to:
{
  "rankings": [
    {
      "candidateId": "exact-candidate-id",
      "affinity": 88,
      "confidence": 0.85,
      "signals": ["slow-burn mystery", "limited series commitment", "morally grey characters"]
    }
  ]
}`;

    const userPrompt = JSON.stringify({
      mediaType: "TV",
      diziDnaSummary: {
        confidence: tvProfile.confidence,
        topGenres: (tvProfile.genres || []).filter((g) => g.state === "POSITIVE").slice(0, 4).map((g) => g.name),
        formatPreference: tvProfile.formatPreference?.preference,
        seriesLengthPreference: tvProfile.seriesLengthPreference?.preference,
        runtimePreference: tvProfile.episodeRuntimePreference?.preference,
        statusPreference: tvProfile.statusPreference?.preference,
        internationalOrientation: tvProfile.internationalOrientation?.orientation,
      },
      aiTasteProfile: aiTasteProfile
        ? {
            corePreferences: aiTasteProfile.corePreferences,
            strongDislikes: aiTasteProfile.strongDislikes,
            storyPreferences: aiTasteProfile.storyPreferences,
            commitmentPreference: aiTasteProfile.commitmentPreference,
            preferredCharacteristics: aiTasteProfile.preferredCharacteristics,
            avoidCharacteristics: aiTasteProfile.avoidCharacteristics,
          }
        : null,
      candidates: compactCandidates,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TV_AI_RERANK_TIMEOUT_MS);

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
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[TV Hybrid Rerank] DeepSeek returned HTTP ${res.status}`);
      return { snapshot: null, fromCache: false };
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content;
    const parsed = rawContent ? JSON.parse(rawContent) : null;

    if (!parsed || !Array.isArray(parsed.rankings)) {
      console.warn("[TV Hybrid Rerank] DeepSeek returned invalid JSON structure");
      return { snapshot: null, fromCache: false };
    }

    // 7. Sanitize and Validate Rankings
    const validCandidateIds = new Set(shortlist.map((c) => c.tvShow.id));
    const sanitizedRankings: TvAiRerankRankingItem[] = [];
    const seenIds = new Set<string>();

    for (const item of parsed.rankings) {
      if (!item || !item.candidateId || !validCandidateIds.has(item.candidateId)) {
        continue;
      }
      if (seenIds.has(item.candidateId)) continue;
      seenIds.add(item.candidateId);

      const affinity = Math.max(0, Math.min(100, Math.round(Number(item.affinity) || 50)));
      const confidence = Math.max(0.0, Math.min(1.0, Number(item.confidence) || 0.7));
      const signals = Array.isArray(item.signals)
        ? item.signals.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 3)
        : [];

      sanitizedRankings.push({
        candidateId: item.candidateId,
        affinity,
        confidence,
        signals,
      });
    }

    const snapshotResult: TvAiRerankResult = {
      rankings: sanitizedRankings,
      model: currentModel,
      tokenUsage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };

    // 8. Persist Snapshot into Database
    await db.aiRecommendationSnapshot.upsert({
      where: {
        userId_mediaType_profileVersion_matchVersion_aiTasteVersion_candidateFingerprint: {
          userId,
          mediaType: "TV",
          profileVersion: tvProfileVersion,
          matchVersion: tvMatchVersion,
          aiTasteVersion,
          candidateFingerprint,
        },
      },
      update: {
        model: currentModel,
        resultJson: snapshotResult as any,
      },
      create: {
        userId,
        mediaType: "TV",
        profileVersion: tvProfileVersion,
        matchVersion: tvMatchVersion,
        aiTasteVersion,
        candidateFingerprint,
        model: currentModel,
        resultJson: snapshotResult as any,
      },
    });

    return { snapshot: snapshotResult, fromCache: false };
  } catch (err: any) {
    console.warn("[TV Hybrid Rerank] Error generating AI snapshot:", err.message || err);
    return { snapshot: null, fromCache: false };
  } finally {
    // Always release lock
    activeTvRerankLocks.delete(lockKey);
  }
}
