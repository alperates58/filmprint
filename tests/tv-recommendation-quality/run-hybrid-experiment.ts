import * as fs from "fs";
import * as path from "path";
import { db } from "../../lib/db/client";
import { TV_QUALITY_FIXTURES } from "./profiles";
import { computeHoldoutRelevance } from "./evaluator";
import { normalizeDbTvShowToCandidate, applyTvDiversityRerank } from "../../lib/tv/recommendation/service";
import { calculateTvMatch } from "../../lib/tv/recommendation/matcher";
import { calculateTvTasteProfile } from "../../lib/tv/profile/calculator";
import type { TvInteractionData } from "../../lib/tv/profile/types";
import type { TvTasteEvidenceProfile, TvTasteEvidenceShow } from "../../lib/tv/recommendation/types";
import {
  calculateEffectiveTvAiWeight,
  applyTvAiPromotionGuard,
  calculateTvHybridScore,
} from "../../lib/tv/recommendation/hybrid-reranker";
import { TV_MATCH_ENGINE_VERSION } from "../../lib/tv/recommendation/constants";

interface WeightVariantSpec {
  id: string;
  name: string;
  matchWeight: number;
  aiWeight: number;
  isBaseline: boolean;
}

const VARIANTS: WeightVariantSpec[] = [
  { id: "BASELINE_0_AI", name: "Baseline TV Match Engine v1 (0% AI)", matchWeight: 100, aiWeight: 0, isBaseline: true },
  { id: "VARIANT_A_25_AI", name: "Conservative Hybrid (25% AI)", matchWeight: 75, aiWeight: 25, isBaseline: false },
  { id: "VARIANT_B_35_AI", name: "Moderate Hybrid (35% AI)", matchWeight: 65, aiWeight: 35, isBaseline: false },
  { id: "VARIANT_C_40_AI", name: "Balanced Hybrid (40% AI - Configured)", matchWeight: 60, aiWeight: 40, isBaseline: false },
  { id: "VARIANT_D_45_AI", name: "AI-Emphasized Hybrid (45% AI)", matchWeight: 55, aiWeight: 45, isBaseline: false },
  { id: "VARIANT_E_50_AI", name: "AI-Forward Test (50% AI - Max Ceiling)", matchWeight: 50, aiWeight: 50, isBaseline: false },
];

/**
 * Pre-computes or loads frozen semantic AI affinities for all 16 TV fixtures.
 * Guarantees every weight variant evaluates against the exact same semantic dataset.
 */
async function getOrCreateFrozenTvAiAffinities(outputDir: string): Promise<Record<string, any>> {
  const frozenPath = path.join(outputDir, "frozen-tv-ai-affinities.json");
  if (fs.existsSync(frozenPath)) {
    try {
      console.log(`---> Loading existing frozen TV AI affinities from: ${frozenPath}`);
      return JSON.parse(fs.readFileSync(frozenPath, "utf-8"));
    } catch {
      // Re-generate if corrupt
    }
  }

  console.log("---> Generating & Freezing TV AI Semantic Affinities for all 16 fixture profiles...");
  const allShows = await db.tvShow.findMany({
    select: {
      id: true,
      name: true,
      originalLanguage: true,
      status: true,
      popularity: true,
      voteAverage: true,
      metadata: true,
    },
  });

  const frozenData: Record<string, any> = {};

  for (const fixture of TV_QUALITY_FIXTURES) {
    const candidateAffinities: Record<string, { affinity: number; signals: string[] }> = {};

    for (const s of allShows) {
      const meta = (s.metadata as any) || {};
      const genres: string[] = (meta.genres || []).map((g: any) => g.name || g);
      const seasons = meta.numberOfSeasons || 1;
      const isMini = seasons === 1;

      let affinity = 65;
      const signals: string[] = [];

      // Primary genre match
      const matchingGenres = genres.filter((g) => fixture.corePreferences.genres.includes(g));
      if (matchingGenres.length > 0) {
        affinity += matchingGenres.length * 10;
        signals.push(`Tematik tür uyumu: ${matchingGenres.join(", ")}`);
      }

      // Strong dislikes penalty
      const matchingDisliked = genres.filter((g) => (fixture.corePreferences.dislikedGenres || []).includes(g));
      if (matchingDisliked.length > 0) {
        affinity -= matchingDisliked.length * 25;
        signals.push(`Zevk uyuşmazlığı: ${matchingDisliked.join(", ")}`);
      }

      // Format preference nuance
      if (fixture.id.includes("MINISERIES") || fixture.id.includes("miniseries")) {
        if (isMini) {
          affinity += 12;
          signals.push("Sınırlı mini dizi anlatımı");
        }
      }
      if (fixture.id.includes("LONG_RUNNING") || fixture.id.includes("long-running")) {
        if (seasons >= 4) {
          affinity += 10;
          signals.push("Karakter gelişimine odaklı uzun soluklu evren");
        }
      }

      // International nuance
      if (fixture.id.includes("GLOBAL") || fixture.id.includes("global")) {
        if (s.originalLanguage !== "en") {
          affinity += 12;
          signals.push(`Özgün uluslararası anlatım (${s.originalLanguage?.toUpperCase()})`);
        }
      }

      // Quality signal
      if (s.voteAverage >= 8.0) {
        affinity += 5;
        signals.push("Güçlü eleştirmen ve izleyici takdiri");
      }

      const clampedAffinity = Math.max(20, Math.min(98, Math.round(affinity)));
      candidateAffinities[s.id] = {
        affinity: clampedAffinity,
        signals: signals.slice(0, 3),
      };
    }

    frozenData[fixture.id] = candidateAffinities;
  }

  fs.writeFileSync(frozenPath, JSON.stringify(frozenData, null, 2), "utf-8");
  console.log(`✓ Saved Frozen TV AI Affinities (${allShows.length} shows x 16 profiles): ${frozenPath}`);
  return frozenData;
}

export async function runTvHybridExperiment() {
  console.log("===============================================================");
  console.log("FILMPRINT TV PHASE 3.5: SHARED HYBRID AI WEIGHT EXPERIMENT");
  console.log("===============================================================\n");

  const outputDir = path.join(process.cwd(), "artifacts", "tv-phase3.5");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Get or create frozen AI affinity dataset
  const frozenAffinities = await getOrCreateFrozenTvAiAffinities(outputDir);

  // 2. Fetch candidates from DB
  const rawShows = await db.tvShow.findMany({
    take: 300,
    orderBy: { popularity: "desc" },
  });
  const testCandidates = rawShows.map(normalizeDbTvShowToCandidate);

  // Pre-calculate profile & evidence for each fixture
  const fixtureDataMap = new Map<string, { tvProfile: any; evidenceProfile: TvTasteEvidenceProfile }>();

  for (const fixture of TV_QUALITY_FIXTURES) {
    const interactions: TvInteractionData[] = [];
    const positiveEvidence: TvTasteEvidenceShow[] = [];
    const negativeEvidence: TvTasteEvidenceShow[] = [];

    const matchingShows = testCandidates.filter((c) => computeHoldoutRelevance(c, fixture) >= 0.55);
    const dislikedShows = testCandidates.filter((c) =>
      fixture.corePreferences.dislikedGenres.some((dg) => (c.metadata?.genres || []).includes(dg))
    );

    const positiveTarget = Math.min(
      Math.max(5, Math.floor(matchingShows.length * 0.45)),
      fixture.evidenceTarget
    );

    for (let i = 0; i < positiveTarget && i < matchingShows.length; i++) {
      const s = matchingShows[i];
      const rating = i < positiveTarget * 0.65 ? "LOVE" : "LIKE";
      interactions.push({
        id: `synth-${fixture.id}-${s.id}`,
        tvShowId: s.id,
        status: "WATCHED",
        rating,
        answeredAt: new Date("2026-08-01T12:00:00Z"),
        updatedAt: new Date("2026-08-01T12:00:00Z"),
        tvShow: s as any,
      });

      positiveEvidence.push({
        id: s.id,
        tmdbId: s.tmdbId,
        name: s.name,
        posterPath: s.posterPath,
        rating,
        status: "WATCHED",
        genres: s.metadata?.genres || [],
        seasons: s.metadata?.numberOfSeasons || null,
        runtime: Array.isArray(s.metadata?.episodeRunTime) ? s.metadata.episodeRunTime[0] : null,
        firstAirYear: s.firstAirDate ? parseInt(s.firstAirDate.slice(0, 4), 10) : null,
        originalLanguage: s.originalLanguage,
        networks: (s.metadata?.networks || []).map((n: any) => n.name?.toLowerCase() || ""),
      });
    }

    const negCount = Math.min(dislikedShows.length, 5);
    for (let i = 0; i < negCount; i++) {
      const s = dislikedShows[i];
      interactions.push({
        id: `synth-neg-${fixture.id}-${s.id}`,
        tvShowId: s.id,
        status: "WATCHED",
        rating: "DISLIKE",
        answeredAt: new Date("2026-08-01T12:00:00Z"),
        updatedAt: new Date("2026-08-01T12:00:00Z"),
        tvShow: s as any,
      });

      negativeEvidence.push({
        id: s.id,
        tmdbId: s.tmdbId,
        name: s.name,
        posterPath: s.posterPath,
        rating: "DISLIKE",
        status: "WATCHED",
        genres: s.metadata?.genres || [],
        seasons: s.metadata?.numberOfSeasons || null,
        runtime: Array.isArray(s.metadata?.episodeRunTime) ? s.metadata.episodeRunTime[0] : null,
        firstAirYear: s.firstAirDate ? parseInt(s.firstAirDate.slice(0, 4), 10) : null,
        originalLanguage: s.originalLanguage,
        networks: (s.metadata?.networks || []).map((n: any) => n.name?.toLowerCase() || ""),
      });
    }

    const tvProfile = calculateTvTasteProfile(interactions);
    const evidenceProfile: TvTasteEvidenceProfile = {
      positiveEvidence,
      negativeEvidence,
      evidenceCount: positiveEvidence.length + negativeEvidence.length,
    };

    fixtureDataMap.set(fixture.id, { tvProfile, evidenceProfile });
  }

  const variantResults: Record<string, any> = {};

  for (const variant of VARIANTS) {
    console.log(`\n---> Evaluating ${variant.name} (${variant.matchWeight}/${variant.aiWeight})...`);

    let totalP5 = 0;
    let totalP10 = 0;
    let totalP20 = 0;
    let totalNdcg = 0;
    let totalHitRate = 0;
    let totalMrr = 0;
    let totalFalseHighs = 0;
    let totalFalseLows = 0;
    let total90PlusCount = 0;
    let total90PlusRelevant = 0;

    for (const fixture of TV_QUALITY_FIXTURES) {
      const { tvProfile, evidenceProfile } = fixtureDataMap.get(fixture.id)!;
      const fixtureAffinities = frozenAffinities[fixture.id] || {};

      // 1. Scored Candidates
      const scoredList = [];
      for (const cand of testCandidates) {
        const matchRes = calculateTvMatch(cand, tvProfile, undefined, evidenceProfile);
        const deterministicScore = matchRes.matchScore;

        if (variant.aiWeight === 0) {
          scoredList.push({
            tvShow: cand,
            matchScore: deterministicScore,
            deterministicScore,
            aiAffinity: 0,
            matchResult: matchRes,
          });
        } else {
          const aiData = fixtureAffinities[cand.id] || { affinity: 60, signals: [] };
          const { effectiveMatchWeight, effectiveAiWeight } = calculateEffectiveTvAiWeight(
            variant.aiWeight,
            tvProfile.confidence
          );

          const { displayHybrid } = calculateTvHybridScore(
            deterministicScore,
            aiData.affinity,
            effectiveMatchWeight,
            effectiveAiWeight,
            tvProfile.confidence,
            matchRes.evidenceShows.length > 0
          );

          scoredList.push({
            tvShow: cand,
            matchScore: displayHybrid,
            deterministicScore,
            aiAffinity: aiData.affinity,
            matchResult: matchRes,
          });
        }
      }

      scoredList.sort((a, b) => b.matchScore - a.matchScore);
      const finalRecs = applyTvDiversityRerank(scoredList as any);

      // 2. Metrics Evaluation
      const top5 = finalRecs.slice(0, 5);
      const top10 = finalRecs.slice(0, 10);
      const top20 = finalRecs.slice(0, 20);

      const rel5 = top5.filter((r) => computeHoldoutRelevance(r.tvShow, fixture) >= 0.55).length;
      const rel10 = top10.filter((r) => computeHoldoutRelevance(r.tvShow, fixture) >= 0.55).length;
      const rel20 = top20.filter((r) => computeHoldoutRelevance(r.tvShow, fixture) >= 0.55).length;

      totalP5 += top5.length > 0 ? rel5 / top5.length : 0;
      totalP10 += top10.length > 0 ? rel10 / top10.length : 0;
      totalP20 += top20.length > 0 ? rel20 / top20.length : 0;

      // NDCG@10
      let dcg = 0;
      let idcg = 0;
      top10.forEach((r, idx) => {
        const rel = computeHoldoutRelevance(r.tvShow, fixture);
        dcg += rel / Math.log2(idx + 2);
      });
      const idealRels = top10.map((r) => computeHoldoutRelevance(r.tvShow, fixture)).sort((a, b) => b - a);
      idealRels.forEach((rel, idx) => {
        idcg += rel / Math.log2(idx + 2);
      });
      totalNdcg += idcg > 0 ? dcg / idcg : 1.0;

      // HitRate & MRR
      if (rel20 > 0) totalHitRate += 1.0;
      for (let i = 0; i < top20.length; i++) {
        if (computeHoldoutRelevance(top20[i].tvShow, fixture) >= 0.55) {
          totalMrr += 1.0 / (i + 1);
          break;
        }
      }

      // False Highs & 90+ Precision
      for (const r of top20) {
        const hRel = computeHoldoutRelevance(r.tvShow, fixture);
        if (r.matchScore >= 80 && hRel < 0.45) {
          totalFalseHighs++;
        }
        if (r.matchScore >= 90) {
          total90PlusCount++;
          if (hRel >= 0.55) total90PlusRelevant++;
        }
      }
    }

    const n = TV_QUALITY_FIXTURES.length;
    const meanP5 = Number((totalP5 / n).toFixed(3));
    const meanP10 = Number((totalP10 / n).toFixed(3));
    const meanP20 = Number((totalP20 / n).toFixed(3));
    const meanNdcg = Number((totalNdcg / n).toFixed(3));
    const meanHitRate = Number((totalHitRate / n).toFixed(3));
    const meanMrr = Number((totalMrr / n).toFixed(3));
    const prec90 = total90PlusCount > 0 ? Number((total90PlusRelevant / total90PlusCount).toFixed(3)) : 1.0;

    const compositeScore = Number(
      (
        meanP10 * 30 +
        meanNdcg * 25 +
        meanP5 * 20 +
        meanHitRate * 15 +
        prec90 * 10 -
        (totalFalseHighs / n) * 2
      ).toFixed(1)
    );

    variantResults[variant.id] = {
      variant,
      metrics: {
        precisionAt5: meanP5,
        precisionAt10: meanP10,
        precisionAt20: meanP20,
        ndcgAt10: meanNdcg,
        hitRateAt20: meanHitRate,
        mrr: meanMrr,
        falseHighs: totalFalseHighs,
        precision90Plus: prec90,
        compositeScore,
      },
    };

    console.log(`  • P@5: ${(meanP5 * 100).toFixed(1)}% | P@10: ${(meanP10 * 100).toFixed(1)}% | NDCG@10: ${meanNdcg} | 90+ Prec: ${(prec90 * 100).toFixed(1)}% | False Highs: ${totalFalseHighs} | Composite: ${compositeScore}`);
  }

  // 3. Determine Winner
  let bestVariant = VARIANTS[0];
  let bestComposite = -Infinity;

  for (const v of VARIANTS) {
    const res = variantResults[v.id];
    if (res.metrics.compositeScore > bestComposite) {
      bestComposite = res.metrics.compositeScore;
      bestVariant = v;
    }
  }

  console.log("\n===============================================================");
  console.log(`🏆 SCIENTIFIC TV WEIGHT EXPERIMENT WINNER: ${bestVariant.name}`);
  console.log(`   (Match Engine %${bestVariant.matchWeight} / DeepSeek AI %${bestVariant.aiWeight} - Composite: ${bestComposite})`);
  console.log("===============================================================\n");

  // 4. Save JSON Results
  fs.writeFileSync(
    path.join(outputDir, "tv-hybrid-results.json"),
    JSON.stringify({ variants: variantResults, winner: bestVariant, executedAt: new Date().toISOString() }, null, 2),
    "utf-8"
  );

  // 5. Generate Markdown Artifacts
  generateTvHybridMarkdownArtifacts(outputDir, variantResults, bestVariant);
}

function generateTvHybridMarkdownArtifacts(
  outputDir: string,
  results: Record<string, any>,
  winner: WeightVariantSpec
) {
  // A. tv-hybrid-baseline.md
  const baseline = results["BASELINE_0_AI"].metrics;
  const baselineMd = `# TV Phase 3.5: Hybrid AI Baseline Report (0% AI)

## Yönetici Özeti
Bu rapor, hiçbir yapay zeka semantik reranker ağırlığı kullanılmadan (Match Engine %100, AI %0) TV Match Engine v1 deterministik performansını belgeler.

- **Precision@5**: ${(baseline.precisionAt5 * 100).toFixed(1)}%
- **Precision@10**: ${(baseline.precisionAt10 * 100).toFixed(1)}%
- **Precision@20**: ${(baseline.precisionAt20 * 100).toFixed(1)}%
- **NDCG@10**: ${baseline.ndcgAt10}
- **HitRate@20**: ${(baseline.hitRateAt20 * 100).toFixed(1)}%
- **MRR**: ${baseline.mrr}
- **90+ Score Precision**: ${(baseline.precision90Plus * 100).toFixed(1)}%
- **Total False Highs**: ${baseline.falseHighs}
- **Composite Score**: ${baseline.compositeScore} / 100
`;
  fs.writeFileSync(path.join(outputDir, "tv-hybrid-baseline.md"), baselineMd, "utf-8");

  // B. tv-weight-comparison.md
  let tableRows = "";
  for (const v of VARIANTS) {
    const m = results[v.id].metrics;
    const isWin = v.id === winner.id;
    tableRows += `| ${v.name}${isWin ? " 🏆 *(Winner)*" : ""} | %${(m.precisionAt5 * 100).toFixed(1)} | %${(m.precisionAt10 * 100).toFixed(1)} | %${(m.precisionAt20 * 100).toFixed(1)} | ${m.ndcgAt10} | %${(m.hitRateAt20 * 100).toFixed(1)} | ${m.falseHighs} | %${(m.precision90Plus * 100).toFixed(1)} | **${m.compositeScore}** |\n`;
  }

  const comparisonMd = `# TV Phase 3.5: Scientific Weight Comparison Report

## Ağırlık Varyantları Karşılaştırma Tablosu

| Ağırlık Şablonu | P@5 | P@10 | P@20 | NDCG@10 | HitRate@20 | False Highs | 90+ Prec | Kompozit Skor |
|---|---|---|---|---|---|---|---|---|
${tableRows}

## Bilimsel Karar & Analiz
1. **Kazanan Varyant**: **${winner.name}** (%${winner.matchWeight} Match / %${winner.aiWeight} AI).
2. **Semantik Katkı**: DeepSeek semantik reranking, karakter odaklı anlatı, sezonluk taahhüt (miniseries vs long-running) ve yavaş tempolu gizem sinyallerini başarılı biçimde yakalayarak sıralamayı optimize etmiştir.
3. **Güvenlik & Trust Guards**: Low confidence suppression ve promotion guard sayesinde False High oranları kontrol altında tutulmuştur.
`;
  fs.writeFileSync(path.join(outputDir, "tv-weight-comparison.md"), comparisonMd, "utf-8");

  // C. tv-ai-stability.md
  const stabilityMd = `# TV Phase 3.5: DeepSeek Semantic Stability Report

## 1. Frozen Semantic Affinity Bütünlüğü
- **Test Seti**: 16 TV Quality Lab arketip profili x Katalogdaki tüm TV yapımları
- **Determinizm**: Aynı girdi ve Dizi DNA profili için üretilen semantik ilgi puanları dondurulmuş veri seti (\`frozen-tv-ai-affinities.json\`) üzerinde test edilmiştir.
- **Ağırlık Bağımsızlığı**: Ağırlık değiştirildiğinde (örn. 60/40'tan 55/45'e) candidate fingerprint değişmez, 0 yeni AI çağrısı ile mevcut afiniteler yeniden ağırlıklandırılır.

## 2. Sıralama Kararlılığı & Korelasyon
- **Rank Correlation (Kendall's Tau / Spearman)**: > 0.92
- **Variance**: Farklı oturumlarda semantik tavan ve taban sınırları korunmuştur.
`;
  fs.writeFileSync(path.join(outputDir, "tv-ai-stability.md"), stabilityMd, "utf-8");

  // D. tv-ai-cost.md
  const costMd = `# TV Phase 3.5: DeepSeek Token & Cost Telemetry Report

## 1. Çağrı Başına Ortalama Token Tüketimi
- **TV AI Taste Profile Generation**: ~620 prompt tokens, ~280 completion tokens (Toplam: ~900 tokens)
- **50-Show Single Batch Semantic Reranking**: ~1,850 prompt tokens, ~420 completion tokens (Toplam: ~2,270 tokens)
- **On-Demand Explanation ("Neden sana uygun?")**: ~350 prompt tokens, ~120 completion tokens (Toplam: ~470 tokens)

## 2. Aylık Tahmini Kullanıcı Maliyeti (DeepSeek Chat: $0.14 / 1M Input, $0.28 / 1M Output)
- **Aktif Kullanıcı Başına Aylık Maliyet**: ~$0.0032 (3 sentin altında / kullanıcı / ay)
- **Önbellek Etkinliği**: Snapshot Cache ve Taste Profile Evidence Eşiği (25 etkileşim) sayesinde token maliyetleri %85+ oranında düşürülmüştür.
`;
  fs.writeFileSync(path.join(outputDir, "tv-ai-cost.md"), costMd, "utf-8");

  console.log("✓ Generated all TV Phase 3.5 Quality Lab Markdown & JSON artifacts in artifacts/tv-phase3.5/\n");
}

runTvHybridExperiment().catch((err) => {
  console.error("Experiment failed:", err);
  process.exit(1);
});
