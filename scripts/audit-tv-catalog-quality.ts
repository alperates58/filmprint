/**
 * SINEAI — TV CATALOG QUALITY DRY-RUN SCRIPT (Phase P1.1)
 *
 * Scans the entire TV catalog using bounded keyset pagination.
 * 100% SELECT-only, zero mutations, zero deletes/updates.
 *
 * Usage:
 *   npx tsx scripts/audit-tv-catalog-quality.ts --dry-run
 */

import { db } from "../lib/db/client";
import * as fs from "fs";
import * as path from "path";

export interface TvQualityAuditSample {
  id: string;
  tmdbId: number;
  name: string;
  genreIds: number[];
  popularity: number;
  voteAverage: number;
  voteCount: number;
  calibrationPriorityScore: number;
  normalizedMinimumAge?: number | null;
  contentRating?: string | null;
  originalLanguage?: string | null;
  overview?: string | null;
  hasUserData: boolean;
  userInteractionsCount: number;
  recommendationFeedbacksCount: number;
  libraryEntriesCount: number;
}

export interface TvQualityAuditReport {
  timestamp: string;
  totalCatalog: number;
  hardExclusions: {
    kidsCount: number; // 10762
    newsCount: number; // 10763
    talkShowCount: number; // 10767
    overlapAdjustedHardExcluded: number;
  };
  auditOnly: {
    animationCount: number; // 16
    familyCount: number; // 10751
    animationAndFamilyCount: number; // 16 + 10751
    realityCount: number; // 10764
    soapCount: number; // 10766
    suspectChildAnimationCount: number; // 16 + 10751 without 10762
  };
  userImpact: {
    kidsWithUserData: number;
    newsWithUserData: number;
    talkShowWithUserData: number;
    hardExcludedWithAnyUserData: number;
    hardExcludedWithoutUserData: number;
  };
  qualityImpact: {
    beforeCount: number;
    afterHardExclusionCount: number;
    removedPercentage: number;
    hardExcludedInTop1000Priority: number;
    hardExcludedInTop1000Popularity: number;
  };
  samples: {
    kids: TvQualityAuditSample[];
    news: TvQualityAuditSample[];
    talkShow: TvQualityAuditSample[];
    suspectChildAnimation: TvQualityAuditSample[];
    reality: TvQualityAuditSample[];
  };
}

export async function runTvCatalogQualityAudit(options: {
  outputPath?: string;
  batchSize?: number;
  logToConsole?: boolean;
} = {}): Promise<TvQualityAuditReport> {
  const { outputPath, batchSize = 250, logToConsole = true } = options;
  const startTime = Date.now();

  const totalCatalog = await db.tvShow.count();

  let kidsCount = 0;
  let newsCount = 0;
  let talkShowCount = 0;
  let animationCount = 0;
  let familyCount = 0;
  let animationAndFamilyCount = 0;
  let realityCount = 0;
  let soapCount = 0;
  let suspectChildAnimationCount = 0;

  let kidsWithUserData = 0;
  let newsWithUserData = 0;
  let talkShowWithUserData = 0;
  let hardExcludedWithAnyUserData = 0;
  let hardExcludedWithoutUserData = 0;

  const hardExcludedIds = new Set<string>();

  const samplesKids: TvQualityAuditSample[] = [];
  const samplesNews: TvQualityAuditSample[] = [];
  const samplesTalkShow: TvQualityAuditSample[] = [];
  const samplesSuspectChild: TvQualityAuditSample[] = [];
  const samplesReality: TvQualityAuditSample[] = [];

  let cursor: string | undefined = undefined;
  let processed = 0;

  // 1. Keyset pagination across entire TvShow table (Bounded batches)
  while (true) {
    const batch: any[] = await db.tvShow.findMany({
      take: batchSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: "asc" },
      select: {
        id: true,
        tmdbId: true,
        name: true,
        genreIds: true,
        popularity: true,
        voteAverage: true,
        voteCount: true,
        calibrationPriorityScore: true,
        normalizedMinimumAge: true,
        contentRating: true,
        originalLanguage: true,
        overview: true,
        _count: {
          select: {
            interactions: true,
            recommendationFeedbacks: true,
            libraryEntries: true,
          },
        },
      },
    });

    if (batch.length === 0) break;

    for (const show of batch) {
      processed++;
      cursor = show.id;

      const genres = show.genreIds || [];
      const isKids = genres.includes(10762);
      const isNews = genres.includes(10763);
      const isTalkShow = genres.includes(10767);
      const isAnimation = genres.includes(16);
      const isFamily = genres.includes(10751);
      const isReality = genres.includes(10764);
      const isSoap = genres.includes(10766);
      const isSuspectChild = isAnimation && isFamily && !isKids;

      const userInteractionsCount = show._count?.interactions || 0;
      const recommendationFeedbacksCount = show._count?.recommendationFeedbacks || 0;
      const libraryEntriesCount = show._count?.libraryEntries || 0;
      const hasUserData = userInteractionsCount > 0 || recommendationFeedbacksCount > 0 || libraryEntriesCount > 0;

      const sampleObj: TvQualityAuditSample = {
        id: show.id,
        tmdbId: show.tmdbId,
        name: show.name,
        genreIds: genres,
        popularity: show.popularity,
        voteAverage: show.voteAverage,
        voteCount: show.voteCount || 0,
        calibrationPriorityScore: show.calibrationPriorityScore,
        normalizedMinimumAge: show.normalizedMinimumAge,
        contentRating: show.contentRating,
        originalLanguage: show.originalLanguage,
        overview: show.overview,
        hasUserData,
        userInteractionsCount,
        recommendationFeedbacksCount,
        libraryEntriesCount,
      };

      if (isKids) {
        kidsCount++;
        if (hasUserData) kidsWithUserData++;
        samplesKids.push(sampleObj);
      }

      if (isNews) {
        newsCount++;
        if (hasUserData) newsWithUserData++;
        samplesNews.push(sampleObj);
      }

      if (isTalkShow) {
        talkShowCount++;
        if (hasUserData) talkShowWithUserData++;
        samplesTalkShow.push(sampleObj);
      }

      const isHardExcluded = isKids || isNews || isTalkShow;
      if (isHardExcluded) {
        hardExcludedIds.add(show.id);
        if (hasUserData) {
          hardExcludedWithAnyUserData++;
        } else {
          hardExcludedWithoutUserData++;
        }
      }

      if (isAnimation) animationCount++;
      if (isFamily) familyCount++;
      if (isAnimation && isFamily) animationAndFamilyCount++;
      if (isReality) {
        realityCount++;
        samplesReality.push(sampleObj);
      }
      if (isSoap) soapCount++;
      if (isSuspectChild) {
        suspectChildAnimationCount++;
        samplesSuspectChild.push(sampleObj);
      }
    }

    if (batch.length < batchSize) break;
  }

  // 2. Sample ranking: Sort top 30 per group by priority desc, popularity desc
  const sampleSorter = (a: TvQualityAuditSample, b: TvQualityAuditSample) =>
    b.calibrationPriorityScore - a.calibrationPriorityScore || b.popularity - a.popularity;

  samplesKids.sort(sampleSorter);
  samplesNews.sort(sampleSorter);
  samplesTalkShow.sort(sampleSorter);
  samplesSuspectChild.sort(sampleSorter);
  samplesReality.sort(sampleSorter);

  // 3. Top 1000 Analysis (Priority & Popularity)
  const top1000Priority = await db.tvShow.findMany({
    take: 1000,
    orderBy: { calibrationPriorityScore: "desc" },
    select: { id: true },
  });
  const hardExcludedInTop1000Priority = top1000Priority.filter((s) => hardExcludedIds.has(s.id)).length;

  const top1000Popularity = await db.tvShow.findMany({
    take: 1000,
    orderBy: { popularity: "desc" },
    select: { id: true },
  });
  const hardExcludedInTop1000Popularity = top1000Popularity.filter((s) => hardExcludedIds.has(s.id)).length;

  const overlapAdjustedHardExcluded = hardExcludedIds.size;
  const afterHardExclusionCount = totalCatalog - overlapAdjustedHardExcluded;
  const removedPercentage = totalCatalog > 0 ? (overlapAdjustedHardExcluded / totalCatalog) * 100 : 0;

  const report: TvQualityAuditReport = {
    timestamp: new Date().toISOString(),
    totalCatalog,
    hardExclusions: {
      kidsCount,
      newsCount,
      talkShowCount,
      overlapAdjustedHardExcluded,
    },
    auditOnly: {
      animationCount,
      familyCount,
      animationAndFamilyCount,
      realityCount,
      soapCount,
      suspectChildAnimationCount,
    },
    userImpact: {
      kidsWithUserData,
      newsWithUserData,
      talkShowWithUserData,
      hardExcludedWithAnyUserData,
      hardExcludedWithoutUserData,
    },
    qualityImpact: {
      beforeCount: totalCatalog,
      afterHardExclusionCount,
      removedPercentage: parseFloat(removedPercentage.toFixed(2)),
      hardExcludedInTop1000Priority,
      hardExcludedInTop1000Popularity,
    },
    samples: {
      kids: samplesKids.slice(0, 30),
      news: samplesNews.slice(0, 30),
      talkShow: samplesTalkShow.slice(0, 30),
      suspectChildAnimation: samplesSuspectChild.slice(0, 30),
      reality: samplesReality.slice(0, 30),
    },
  };

  if (logToConsole) {
    console.log("\n===============================================================================");
    console.log("             SINEAI TV CATALOG QUALITY DRY-RUN AUDIT REPORT (v1.0)");
    console.log("===============================================================================");
    console.log(`Scan Date / Time          : ${report.timestamp}`);
    console.log(`Total TV Shows Scanned    : ${report.totalCatalog.toLocaleString()}`);
    console.log(`Scan Duration             : ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    console.log("-------------------------------------------------------------------------------");
    console.log("1. CANONICAL HARD EXCLUSIONS (Discovery Surfaces)");
    console.log(`  - Kids (10762)            : ${kidsCount.toLocaleString()}`);
    console.log(`  - News (10763)            : ${newsCount.toLocaleString()}`);
    console.log(`  - Talk Show (10767)       : ${talkShowCount.toLocaleString()}`);
    console.log(`  - Total Unique Excluded   : ${overlapAdjustedHardExcluded.toLocaleString()} (${report.qualityImpact.removedPercentage}% of catalog)`);
    console.log("-------------------------------------------------------------------------------");
    console.log("2. AUDIT-ONLY CATEGORIES (Preserved in Discovery for Now)");
    console.log(`  - Animation (16)          : ${animationCount.toLocaleString()}`);
    console.log(`  - Family (10751)          : ${familyCount.toLocaleString()}`);
    console.log(`  - Animation + Family      : ${animationAndFamilyCount.toLocaleString()}`);
    console.log(`  - Reality (10764)         : ${realityCount.toLocaleString()}`);
    console.log(`  - Soap / Pembe Dizi (10766): ${soapCount.toLocaleString()}`);
    console.log(`  - SUSPECT CHILD ANIMATION : ${suspectChildAnimationCount.toLocaleString()} (Animation + Family without Kids)`);
    console.log("-------------------------------------------------------------------------------");
    console.log("3. USER IMPACT AUDIT (Historical & Library Data Safety)");
    console.log(`  - Hard Excluded with User Data    : ${hardExcludedWithAnyUserData.toLocaleString()}`);
    console.log(`  - Hard Excluded WITHOUT User Data : ${hardExcludedWithoutUserData.toLocaleString()}`);
    console.log("-------------------------------------------------------------------------------");
    console.log("4. QUALITY & QUEUE DOMINATION IMPACT");
    console.log(`  - Usable Discovery Catalog: ${totalCatalog} -> ${afterHardExclusionCount} shows`);
    console.log(`  - Excluded in Top 1,000 Priority  : ${hardExcludedInTop1000Priority} / 1,000`);
    console.log(`  - Excluded in Top 1,000 Popularity: ${hardExcludedInTop1000Popularity} / 1,000`);
    console.log("===============================================================================\n");
  }

  // 4. Export JSON/CSV to filesystem (Non-fatal, resilient in read-only containers)
  try {
    const targetFile = outputPath || path.join(process.cwd(), "artifacts", "tv-catalog-quality-dry-run.json");
    const targetDir = path.dirname(targetFile);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetFile, JSON.stringify(report, null, 2), "utf-8");
    if (logToConsole) {
      console.log(`[Dry-Run Artifact Saved]: ${targetFile}`);
    }
  } catch (err) {
    if (logToConsole) {
      console.warn(`[Dry-Run Note]: Could not write artifact file (${(err as Error).message}), stdout report completed successfully.`);
    }
  }

  return report;
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  if (!isDryRun && args.length === 0) {
    console.log("Notice: Defaulting to --dry-run mode (100% SELECT-only audit).");
  }

  const outputArg = args.find((a) => a.startsWith("--output="));
  const outputPath = outputArg ? outputArg.split("=")[1] : undefined;

  runTvCatalogQualityAudit({ outputPath })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[TV Quality Dry-Run Error]:", err);
      process.exit(1);
    });
}