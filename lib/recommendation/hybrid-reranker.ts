import { db } from "../db/client";
import { getDeepSeekConfig } from "../config/service";
import { calibrateMatchScore } from "./matcher";
import {
  AI_RERANK_MIN_DETERMINISTIC_GATE,
  AI_RERANK_SHORTLIST_DEFAULT_SIZE,
  AI_RERANK_TIMEOUT_MS,
  AI_WEIGHT_SAFETY_CEILING,
  DEFAULT_MATCH_WEIGHT,
  DEFAULT_AI_WEIGHT,
} from "./ai-taste-constants";
import type {
  AiTasteProfile,
  AiRerankCandidateItem,
  AiRerankRankingItem,
  AiRerankResult,
  HybridScoreBreakdown,
  MediaDomain,
} from "./ai-taste-types";
import type { ScoredCandidate } from "./service";
import type { FilmDnaResult } from "../profile/types";
import { createHash } from "crypto";

// In-memory set of active rerank execution keys to prevent duplicate in-flight API calls
const activeRerankLocks = new Set<string>();

/**
 * Calculates effective AI weight based on user profile confidence.
 * Low confidence profiles receive attenuated AI influence for safety.
 */
export function calculateEffectiveAiWeight(
  configuredAiWeight: number,
  profileConfidence: number
): { effectiveMatchWeight: number; effectiveAiWeight: number } {
  // Ensure configured AI weight does not exceed the 50% safety ceiling
  const cappedConfiguredAi = Math.max(0, Math.min(AI_WEIGHT_SAFETY_CEILING, configuredAiWeight));

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
 * Applies AI Promotion Guard to prevent low-to-moderate deterministic candidates
 * from being artificially promoted directly to the top ranks.
 */
export function applyAiPromotionGuard(
  deterministicMatchScore: number,
  rawAiAffinity: number
): { guardedAffinity: number; isGuarded: boolean } {
  const boundedAffinity = Math.max(0, Math.min(100, Math.round(rawAiAffinity)));

  // Below 65: Excluded from promotion (strictly locked to deterministic match)
  if (deterministicMatchScore < AI_RERANK_MIN_DETERMINISTIC_GATE) {
    return { guardedAffinity: deterministicMatchScore, isGuarded: true };
  }

  // 65 to 74: Limited promotion (affinity cannot exceed deterministic match + 15)
  if (deterministicMatchScore < 75) {
    const maxAllowed = deterministicMatchScore + 15;
    if (boundedAffinity > maxAllowed) {
      return { guardedAffinity: maxAllowed, isGuarded: true };
    }
  }

  // 75+: Normal rerank flexibility
  return { guardedAffinity: boundedAffinity, isGuarded: false };
}

/**
 * Calculates calibrated hybrid score from deterministic match score and AI affinity.
 */
export function calculateHybridScore(
  displayMatchScore: number,
  rawAiAffinity: number,
  effectiveMatchWeight: number,
  effectiveAiWeight: number,
  hasStrongEvidence: boolean = false
): { rawHybrid: number; displayHybrid: number; guardedAffinity: number } {
  const { guardedAffinity } = applyAiPromotionGuard(displayMatchScore, rawAiAffinity);

  const rawWeighted =
    (effectiveMatchWeight * displayMatchScore + effectiveAiWeight * guardedAffinity) / 100;
  const rawHybrid = Number(rawWeighted.toFixed(2));

  // Score calibration maintains trust guards (e.g. 97% max ceiling, 90%+ strong evidence requirement)
  const displayHybrid = calibrateMatchScore(Math.round(rawHybrid), hasStrongEvidence);

  return {
    rawHybrid,
    displayHybrid,
    guardedAffinity,
  };
}

/**
 * Generates deterministic candidate fingerprint.
 * NOTE: Hybrid weights are intentionally OMITTED from this fingerprint
 * so admin weight adjustments recompute scores with ZERO additional AI calls.
 */
export function generateCandidateFingerprint(
  candidateIds: string[],
  profileVersion: number,
  aiTasteVersion: number,
  modelId: string
): string {
  const sortedIds = [...candidateIds].sort().join(",");
  const payload = `prof:${profileVersion}_ai:${aiTasteVersion}_model:${modelId}_candidates:${sortedIds}`;
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Builds compact payload for batch DeepSeek recommendation reranker.
 */
export function buildAiRerankPromptPayload(
  aiTasteProfile: AiTasteProfile,
  candidates: ScoredCandidate[],
  feedbackSummary?: { recentLikes: string[]; recentDislikes: string[]; recentWatchlist: string[] }
) {
  const formattedCandidates: AiRerankCandidateItem[] = candidates.map((sc) => {
    const meta = ((sc.movie as any).metadata as Record<string, any>) || {};
    return {
      candidateId: sc.movie.id,
      tmdbId: sc.movie.tmdbId,
      title: sc.movie.title,
      genres: sc.movie.genres || [],
      year: sc.movie.releaseYear || null,
      qualityScore: sc.qualityScore,
      deterministicMatch: sc.displayMatchScore,
      tasteFit: sc.components?.tasteFit || 0.5,
      candidateSource: sc.candidateSource,
      director: meta.director || undefined,
      keywords: Array.isArray(meta.keywords) ? meta.keywords.slice(0, 4) : undefined,
    };
  });

  return {
    userTasteProfile: {
      corePreferences: aiTasteProfile.corePreferences,
      strongDislikes: aiTasteProfile.strongDislikes,
      storyPreferences: aiTasteProfile.storyPreferences,
      preferredCharacteristics: aiTasteProfile.preferredCharacteristics,
      avoidCharacteristics: aiTasteProfile.avoidCharacteristics,
      ...(feedbackSummary && (feedbackSummary.recentLikes.length > 0 || feedbackSummary.recentDislikes.length > 0 || feedbackSummary.recentWatchlist.length > 0)
        ? {
            feedbackSignals: {
              recentLikes: feedbackSummary.recentLikes,
              recentDislikes: feedbackSummary.recentDislikes,
              recentWatchlist: feedbackSummary.recentWatchlist,
            },
          }
        : {}),
    },
    candidates: formattedCandidates,
  };
}

/**
 * Calls DeepSeek API to perform single batch semantic reranking on candidate shortlist.
 */
export async function callDeepSeekBatchReranker(
  promptPayload: any
): Promise<AiRerankResult | null> {
  const config = await getDeepSeekConfig();

  if (!config.enabled || !config.apiKey) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_RERANK_TIMEOUT_MS);

    const targetUrl = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

    const systemPrompt = `Sen SineAI ikinci aşama semantik öneri sıralayıcısısın (Recommendation Semantic Reranker).
Verilen kullanıcının semantik zevk profilini ve aday film listesini incele.
Her adayın kullanıcı zevkine semantik yakınlık (affinity) puanını (0 - 100) ve 2-3 anahtar sinyalini belirle.

STRICT RULES:
1. Yalnızca verilen listedeki candidateId'leri kullan. ASLA yeni film veya bilinmeyen ID ekleme.
2. Yalnızca aşağıdaki JSON formatında yanıt ver, başka metin ekleme:
{
  "rankings": [
    {
      "candidateId": "...",
      "affinity": 0-100,
      "confidence": 0.0-1.0,
      "signals": ["sinyal 1", "sinyal 2"]
    }
  ]
}`;

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
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[HybridReranker] DeepSeek API returned status ${response.status}`);
      return null;
    }

    const data = await response.json();
    let rawContent = data.choices?.[0]?.message?.content || "";

    // Strip markdown code fence if present
    if (rawContent.includes("```json")) {
      rawContent = rawContent.replace(/```json\s*/g, "").replace(/```\s*$/g, "");
    } else if (rawContent.includes("```")) {
      rawContent = rawContent.replace(/```\s*/g, "");
    }

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.rankings)) {
          return {
            rankings: parsed.rankings,
            modelUsed: config.modelId,
            promptTokens: data.usage?.prompt_tokens,
            completionTokens: data.usage?.completion_tokens,
            totalTokens: data.usage?.total_tokens,
          };
        }
      } catch (parseErr) {
        console.warn("[HybridReranker] JSON parsing failed, attempting fallback regex extraction");
      }
    }

    return null;
  } catch (err) {
    console.error("[HybridReranker] DeepSeek rerank call failed:", err);
    return null;
  }
}

export interface HybridRerankOptions {
  matchWeight?: number;
  aiWeight?: number;
  shortlistSize?: number;
  matchVersion?: number;
}

export interface HybridScoredCandidate extends ScoredCandidate {
  hybridBreakdown?: HybridScoreBreakdown;
}

export interface HybridRerankOptions {
  matchWeight?: number;
  aiWeight?: number;
  shortlistSize?: number;
  matchVersion?: number;
  frozenRankingMap?: Map<string, { affinity: number; signals: string[] }>;
  forceGenerate?: boolean;
  feedbackSummary?: {
    recentLikes: string[];
    recentDislikes: string[];
    recentWatchlist: string[];
  };
}

/**
 * Core Hybrid Reranker Engine.
 * Takes deterministically scored candidates, applies AI Taste semantic reranking,
 * computes calibrated hybrid scores, and returns re-ordered candidate list.
 */
export async function rerankCandidatesWithAi(
  userId: string,
  mediaType: MediaDomain = "FILM",
  candidates: ScoredCandidate[],
  dnaProfile: FilmDnaResult,
  aiTasteProfile: AiTasteProfile | null,
  options: HybridRerankOptions = {}
): Promise<{
  rankedCandidates: HybridScoredCandidate[];
  isAiApplied: boolean;
  hybridPending?: boolean;
  candidateFingerprint?: string;
  source: "snapshot_cache" | "generated" | "deterministic_fallback";
  effectiveWeights?: { matchWeight: number; aiWeight: number };
}> {
  // Fallback: If no AI Taste profile or empty candidate list, return deterministic order immediately
  if (candidates.length === 0) {
    return {
      rankedCandidates: candidates,
      isAiApplied: false,
      hybridPending: false,
      source: "deterministic_fallback",
    };
  }

  if (!aiTasteProfile) {
    return {
      rankedCandidates: candidates,
      isAiApplied: false,
      hybridPending: true,
      source: "deterministic_fallback",
    };
  }

  const matchWeight = options.matchWeight ?? DEFAULT_MATCH_WEIGHT;
  const aiWeight = options.aiWeight ?? DEFAULT_AI_WEIGHT;
  const shortlistSize = options.shortlistSize ?? AI_RERANK_SHORTLIST_DEFAULT_SIZE;
  const matchVersion = options.matchVersion ?? 32;

  // 1. Candidate Shortlist Selection: Gated at minimum deterministic match (>= 65)
  const eligibleForRerank = candidates.filter(
    (c) => c.displayMatchScore >= AI_RERANK_MIN_DETERMINISTIC_GATE
  );

  const shortlist = eligibleForRerank.slice(0, shortlistSize);
  const remainingCandidates = candidates.filter(
    (c) => !shortlist.some((sc) => sc.movie.id === c.movie.id)
  );

  if (shortlist.length === 0) {
    return {
      rankedCandidates: candidates,
      isAiApplied: false,
      hybridPending: false,
      source: "deterministic_fallback",
    };
  }

  const candidateIds = shortlist.map((c) => c.movie.id);
  const config = await getDeepSeekConfig();
  const candidateFingerprint = generateCandidateFingerprint(
    candidateIds,
    dnaProfile.version || 1,
    aiTasteProfile.schemaVersion || 1,
    config.modelId
  );

  const lockKey = `${userId}:${candidateFingerprint}`;

  // 2. Check Database Snapshot Cache or Injected Frozen Ranking Map
  let rankingMap = new Map<string, { affinity: number; signals: string[] }>();
  let source: "snapshot_cache" | "generated" | "deterministic_fallback" = "snapshot_cache";

  if (options.frozenRankingMap && options.frozenRankingMap.size > 0) {
    rankingMap = options.frozenRankingMap;
  } else {
    const cachedSnapshot = await db.aiRecommendationSnapshot.findUnique({
      where: {
        userId_mediaType_profileVersion_matchVersion_aiTasteVersion_candidateFingerprint: {
          userId,
          mediaType: "FILM",
          profileVersion: dnaProfile.version || 1,
          matchVersion,
          aiTasteVersion: aiTasteProfile.schemaVersion || 1,
          candidateFingerprint,
        },
      },
    });

    if (cachedSnapshot && cachedSnapshot.resultJson) {
      // CACHE HIT: 0 DeepSeek API calls
      const parsed = cachedSnapshot.resultJson as any;
      if (Array.isArray(parsed.rankings)) {
        for (const r of parsed.rankings) {
          if (r.candidateId && typeof r.affinity === "number") {
            rankingMap.set(r.candidateId, {
              affinity: r.affinity,
              signals: Array.isArray(r.signals) ? r.signals : [],
            });
          }
        }
      }
    }
  }

  const { effectiveMatchWeight, effectiveAiWeight } = calculateEffectiveAiWeight(
    aiWeight,
    dnaProfile.confidence || 0.5
  );

  // 3. Cache Miss: Execute Batch DeepSeek Reranker only if forceGenerate is requested
  if (rankingMap.size === 0) {
    if (!options.forceGenerate) {
      // Non-blocking: Return deterministic immediately and signal client to trigger background refresh
      return {
        rankedCandidates: candidates,
        isAiApplied: false,
        hybridPending: true,
        candidateFingerprint,
        source: "deterministic_fallback",
        effectiveWeights: { matchWeight: effectiveMatchWeight, aiWeight: effectiveAiWeight },
      };
    }

    if (activeRerankLocks.has(lockKey)) {
      return {
        rankedCandidates: candidates,
        isAiApplied: false,
        hybridPending: true,
        candidateFingerprint,
        source: "deterministic_fallback",
        effectiveWeights: { matchWeight: effectiveMatchWeight, aiWeight: effectiveAiWeight },
      };
    }

    try {
      activeRerankLocks.add(lockKey);

      const promptPayload = buildAiRerankPromptPayload(
        aiTasteProfile,
        shortlist,
        options.feedbackSummary
      );
      const aiResult = await callDeepSeekBatchReranker(promptPayload);

      if (aiResult && aiResult.rankings && aiResult.rankings.length > 0) {
        const validShortlistIdSet = new Set(candidateIds);
        const validatedRankings: AiRerankRankingItem[] = [];

        for (const r of aiResult.rankings) {
          if (validShortlistIdSet.has(r.candidateId) && typeof r.affinity === "number") {
            const cleanAffinity = Math.max(0, Math.min(100, Math.round(r.affinity)));
            rankingMap.set(r.candidateId, {
              affinity: cleanAffinity,
              signals: Array.isArray(r.signals) ? r.signals.map(String).slice(0, 3) : [],
            });

            validatedRankings.push({
              candidateId: r.candidateId,
              affinity: cleanAffinity,
              confidence: r.confidence ?? 0.8,
              signals: Array.isArray(r.signals) ? r.signals.map(String).slice(0, 3) : [],
            });
          }
        }

        // Persist snapshot to database
        await db.aiRecommendationSnapshot.upsert({
          where: {
            userId_mediaType_profileVersion_matchVersion_aiTasteVersion_candidateFingerprint: {
              userId,
              mediaType: "FILM",
              profileVersion: dnaProfile.version || 1,
              matchVersion,
              aiTasteVersion: aiTasteProfile.schemaVersion || 1,
              candidateFingerprint,
            },
          },
          update: {
            model: aiResult.modelUsed,
            resultJson: { rankings: validatedRankings } as any,
          },
          create: {
            userId,
            mediaType: "FILM",
            profileVersion: dnaProfile.version || 1,
            matchVersion,
            aiTasteVersion: aiTasteProfile.schemaVersion || 1,
            candidateFingerprint,
            model: aiResult.modelUsed,
            resultJson: { rankings: validatedRankings } as any,
          },
        });

        source = "generated";
      }
    } finally {
      activeRerankLocks.delete(lockKey);
    }
  }

  // 4. If AI failed or produced no rankings, fallback cleanly to deterministic
  if (rankingMap.size === 0) {
    return {
      rankedCandidates: candidates,
      isAiApplied: false,
      hybridPending: false,
      candidateFingerprint,
      source: "deterministic_fallback",
      effectiveWeights: { matchWeight: effectiveMatchWeight, aiWeight: effectiveAiWeight },
    };
  }

  // 5. Score Candidates with Calibrated Hybrid Formula
  const hybridShortlist: HybridScoredCandidate[] = shortlist.map((item) => {
    const aiData = rankingMap.get(item.movie.id);
    const rawAiAffinity = aiData ? aiData.affinity : item.displayMatchScore;
    const aiSignals = aiData ? aiData.signals : [];

    const hasStrongEvidence = item.evidence?.hasStrongReference ?? false;
    const { rawHybrid, displayHybrid, guardedAffinity } = calculateHybridScore(
      item.displayMatchScore,
      rawAiAffinity,
      effectiveMatchWeight,
      effectiveAiWeight,
      hasStrongEvidence
    );

    const breakdown: HybridScoreBreakdown = {
      rawHybridScore: rawHybrid,
      displayHybridScore: displayHybrid,
      deterministicMatchScore: item.displayMatchScore,
      aiAffinityScore: guardedAffinity,
      effectiveMatchWeight,
      effectiveAiWeight,
      aiSignals,
      isAiPromoted: displayHybrid > item.displayMatchScore,
    };

    return {
      ...item,
      rawMatchScore: Math.round(rawHybrid),
      displayMatchScore: displayHybrid,
      hybridBreakdown: breakdown,
    };
  });

  // 6. Sort Hybrid Shortlist by Calibrated Display Score, then tasteFit, then popularity
  const sortedHybridShortlist = hybridShortlist.sort(
    (a, b) =>
      b.displayMatchScore - a.displayMatchScore ||
      (b.components.tasteFit * 100 + b.rawMatchScore) - (a.components.tasteFit * 100 + a.rawMatchScore) ||
      b.movie.popularity - a.movie.popularity
  );

  // Combine with remaining non-shortlisted candidates (which retain deterministic scores)
  const allFinalCandidates = [...sortedHybridShortlist, ...remainingCandidates];

  return {
    rankedCandidates: allFinalCandidates,
    isAiApplied: true,
    source,
  };
}
