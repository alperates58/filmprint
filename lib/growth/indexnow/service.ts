import crypto from "crypto";
import { db } from "@/lib/db/client";
import { IndexNowMetadata, IndexNowSubmissionHistory } from "../types";

const INDEXNOW_API_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_RETRIES = 3;
const BATCH_SIZE = 100;
const STALE_PROCESSING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

let isProcessingQueue = false;

// Typed helper for IndexNowSubmission model delegate
const indexNowDb = (db as any).indexNowSubmission;

/**
 * Computes deterministic SHA-256 hash for URL deduplication in PostgreSQL.
 */
export function getUrlHash(url: string): string {
  return crypto.createHash("sha256").update(url.trim()).digest("hex");
}

/**
 * Gets or initializes IndexNow configuration credentials from IntegrationSecret
 * and computes real-time statistics from the dedicated IndexNowSubmission PostgreSQL table.
 */
export async function getIndexNowConfig(): Promise<IndexNowMetadata> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");

  let record = await db.integrationSecret.findUnique({
    where: { provider: "indexnow" },
  });

  if (!record || !record.encryptedValue) {
    const newKey = crypto.randomBytes(16).toString("hex");

    record = await db.integrationSecret.upsert({
      where: { provider: "indexnow" },
      update: {
        encryptedValue: newKey,
        lastFour: newKey.slice(-4),
        metadata: { enabled: true } as any,
      },
      create: {
        provider: "indexnow",
        encryptedValue: newKey,
        lastFour: newKey.slice(-4),
        metadata: { enabled: true } as any,
      },
    });
  }

  const activeKey = record.encryptedValue;
  const meta = (record.metadata as Record<string, any>) || {};
  const isEnabled = meta.enabled !== false;

  // Real DB KPI aggregation from IndexNowSubmission table
  let pendingCount = 0;
  let submittedCount = 0;
  let lastSubmittedRecord: any = null;
  let recentRecords: any[] = [];

  if (indexNowDb) {
    const results = await Promise.all([
      indexNowDb.count({ where: { status: "PENDING" } }),
      indexNowDb.count({ where: { status: "SUBMITTED" } }),
      indexNowDb.findFirst({
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        select: { submittedAt: true },
      }),
      indexNowDb.findMany({
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          url: true,
          status: true,
          submittedAt: true,
          updatedAt: true,
          lastError: true,
        },
      }),
    ]).catch(() => [0, 0, null, []]);

    pendingCount = results[0] as number;
    submittedCount = results[1] as number;
    lastSubmittedRecord = results[2];
    recentRecords = results[3] as any[];
  }

  const recentHistory: IndexNowSubmissionHistory[] = recentRecords.map((r: any) => ({
    url: r.url,
    submittedAt: (r.submittedAt || r.updatedAt)?.toISOString() || new Date().toISOString(),
    status: r.status === "SUBMITTED" ? "SUCCESS" : "FAILED",
    error: r.lastError,
  }));

  const lastStatus: "SUCCESS" | "FAILED" | "IDLE" =
    recentRecords.length === 0
      ? "IDLE"
      : recentRecords[0].status === "SUBMITTED"
      ? "SUCCESS"
      : recentRecords[0].status === "FAILED"
      ? "FAILED"
      : "IDLE";

  return {
    key: activeKey,
    keyLocation: `${baseUrl}/indexnow/${activeKey}.txt`,
    enabled: isEnabled,
    totalSubmissions: submittedCount,
    lastSubmittedAt: lastSubmittedRecord?.submittedAt?.toISOString() || null,
    lastStatus,
    lastError: recentRecords.find((r: any) => r.status === "FAILED")?.lastError || null,
    queuedUrlsCount: pendingCount,
    recentHistory,
  };
}

/**
 * Rotates the IndexNow key securely.
 */
export async function rotateIndexNowKey(): Promise<IndexNowMetadata> {
  const newKey = crypto.randomBytes(16).toString("hex");

  await db.integrationSecret.upsert({
    where: { provider: "indexnow" },
    update: {
      encryptedValue: newKey,
      lastFour: newKey.slice(-4),
      metadata: { enabled: true } as any,
    },
    create: {
      provider: "indexnow",
      encryptedValue: newKey,
      lastFour: newKey.slice(-4),
      metadata: { enabled: true } as any,
    },
  });

  return getIndexNowConfig();
}

/**
 * Sets a custom user-defined IndexNow key securely.
 */
export async function setIndexNowCustomKey(rawKey: string): Promise<IndexNowMetadata> {
  const cleanKey = rawKey.trim().replace(/[^a-zA-Z0-9-]/g, "");
  if (!cleanKey || cleanKey.length < 8) {
    throw new Error("Geçersiz IndexNow anahtarı (en az 8 karakter alfanümerik olmalıdır).");
  }

  const existing = await db.integrationSecret.findUnique({
    where: { provider: "indexnow" },
  });
  const currentMeta = (existing?.metadata as Record<string, any>) || {};

  await db.integrationSecret.upsert({
    where: { provider: "indexnow" },
    update: {
      encryptedValue: cleanKey,
      lastFour: cleanKey.slice(-4),
      metadata: { ...currentMeta, enabled: currentMeta.enabled !== false } as any,
    },
    create: {
      provider: "indexnow",
      encryptedValue: cleanKey,
      lastFour: cleanKey.slice(-4),
      metadata: { enabled: true } as any,
    },
  });

  return getIndexNowConfig();
}

/**
 * Toggles IndexNow enabled state in IntegrationSecret.
 */
export async function setIndexNowEnabled(enabled: boolean): Promise<void> {
  await db.integrationSecret.upsert({
    where: { provider: "indexnow" },
    update: {
      metadata: { enabled } as any,
    },
    create: {
      provider: "indexnow",
      encryptedValue: crypto.randomBytes(16).toString("hex"),
      lastFour: "0000",
      metadata: { enabled } as any,
    },
  });
}

/**
 * Submits a batch of URLs directly to IndexNow API.
 */
export async function submitUrlsToIndexNow(
  urls: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const config = await getIndexNowConfig();
  if (!config.enabled || !config.key) {
    return { success: false, count: 0, error: "IndexNow entegrasyonu aktif değil." };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");
  const host = new URL(baseUrl).host;

  // Filter out foreign domain URLs for security
  const validUrls = urls.filter((url) => {
    try {
      const u = new URL(url);
      return u.host === host;
    } catch {
      return false;
    }
  });

  if (validUrls.length === 0) {
    return { success: false, count: 0, error: "Geçerli SINEAI domain URL bulunamadı." };
  }

  const payload = {
    host,
    key: config.key,
    keyLocation: `${baseUrl}/indexnow/${config.key}.txt`,
    urlList: validUrls,
  };

  try {
    const response = await fetch(INDEXNOW_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok && response.status !== 200 && response.status !== 202) {
      const errText = await response.text();
      throw new Error(`IndexNow API error (${response.status}): ${errText}`);
    }

    return { success: true, count: validUrls.length };
  } catch (error: any) {
    console.error("[IndexNow Service] Direct submission failed:", error);
    return { success: false, count: 0, error: error?.message || "IndexNow API bağlantı hatası." };
  }
}

/**
 * Enqueues a canonical URL into the dedicated IndexNowSubmission PostgreSQL table.
 * - Deduplicates URLs using SHA-256 urlHash unique constraint.
 * - Survives process and server restarts.
 * - Triggers background queue processing asynchronously.
 */
export async function enqueueUrlForIndexNow(url: string): Promise<void> {
  if (!url || typeof url !== "string" || !indexNowDb) return;

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr").replace(/\/+$/, "");
  try {
    const parsed = new URL(url);
    if (parsed.host !== new URL(baseUrl).host) {
      return; // Foreign domain ignored
    }
  } catch {
    return;
  }

  const cleanUrl = url.trim();
  const urlHash = getUrlHash(cleanUrl);

  try {
    // Atomic Upsert:
    // If pending or processing, do not touch (avoid duplicate queueing)
    // If already submitted or failed, re-open to PENDING with reset retry count
    const existing = await indexNowDb.findUnique({
      where: { urlHash },
      select: { id: true, status: true },
    });

    if (existing) {
      if (existing.status === "PENDING" || existing.status === "PROCESSING") {
        // Already queued or in flight
        return;
      }
      await indexNowDb.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          retryCount: 0,
          lastError: null,
          nextAttemptAt: new Date(),
        },
      });
    } else {
      await indexNowDb.create({
        data: {
          url: cleanUrl,
          urlHash,
          status: "PENDING",
          retryCount: 0,
          nextAttemptAt: new Date(),
        },
      });
    }

    // Trigger queue processing asynchronously (non-blocking)
    processPendingIndexNowJobs().catch((err) => {
      console.error("[IndexNow Queue] Background processing error:", err);
    });
  } catch (err) {
    console.error("[IndexNow Queue] Failed to enqueue URL to DB:", err);
  }
}

/**
 * Atomically claims and processes pending jobs from IndexNowSubmission table.
 * - Uses transaction-based status transition (PENDING -> PROCESSING) to prevent race conditions.
 * - Automatically recovers stale PROCESSING jobs.
 * - Employs exponential backoff on retry (1m, 2m, 4m).
 * - Drops to FAILED state after MAX_RETRIES (3).
 */
export async function processPendingIndexNowJobs(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  if (isProcessingQueue || !indexNowDb) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  isProcessingQueue = true;

  try {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_PROCESSING_THRESHOLD_MS);

    // 1. Recover any stale PROCESSING jobs left from crashes
    await indexNowDb.updateMany({
      where: {
        status: "PROCESSING",
        updatedAt: { lte: staleThreshold },
      },
      data: {
        status: "PENDING",
        nextAttemptAt: now,
      },
    }).catch(() => {});

    // 2. Atomic Claim via Transaction
    const claimedJobs = await db.$transaction(async (tx: any) => {
      const candidates = await tx.indexNowSubmission.findMany({
        where: {
          status: "PENDING",
          OR: [{ nextAttemptAt: { lte: now } }, { nextAttemptAt: null }],
        },
        take: BATCH_SIZE,
        orderBy: { createdAt: "asc" },
        select: { id: true, url: true, retryCount: true },
      });

      if (!candidates || candidates.length === 0) {
        return [];
      }

      const candidateIds = candidates.map((c: any) => c.id);

      await tx.indexNowSubmission.updateMany({
        where: {
          id: { in: candidateIds },
          status: "PENDING",
        },
        data: {
          status: "PROCESSING",
        },
      });

      return candidates;
    });

    if (!claimedJobs || claimedJobs.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    const urlsToSubmit = claimedJobs.map((j: any) => j.url);
    const result = await submitUrlsToIndexNow(urlsToSubmit);

    if (result.success) {
      const claimedIds = claimedJobs.map((j: any) => j.id);
      await indexNowDb.updateMany({
        where: { id: { in: claimedIds } },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          lastError: null,
        },
      });

      return {
        processed: claimedJobs.length,
        succeeded: claimedJobs.length,
        failed: 0,
      };
    } else {
      // Handle bounded retries with persistent backoff
      for (const job of claimedJobs) {
        const nextRetry = job.retryCount + 1;
        if (nextRetry >= MAX_RETRIES) {
          await indexNowDb.update({
            where: { id: job.id },
            data: {
              status: "FAILED",
              retryCount: nextRetry,
              lastError: `Max retries reached (${MAX_RETRIES}): ${result.error || "Submission failed"}`,
            },
          }).catch(() => {});
        } else {
          // Exponential backoff: 2^retry * 60 seconds
          const backoffDelayMs = Math.pow(2, nextRetry) * 60 * 1000;
          const nextAttempt = new Date(Date.now() + backoffDelayMs);

          await indexNowDb.update({
            where: { id: job.id },
            data: {
              status: "PENDING",
              retryCount: nextRetry,
              nextAttemptAt: nextAttempt,
              lastError: result.error || "Submission failed",
            },
          }).catch(() => {});
        }
      }

      return {
        processed: claimedJobs.length,
        succeeded: 0,
        failed: claimedJobs.length,
      };
    }
  } catch (error) {
    console.error("[IndexNow Queue] Processing error:", error);
    return { processed: 0, succeeded: 0, failed: 0 };
  } finally {
    isProcessingQueue = false;
  }
}
