/**
 * Token Bucket Rate Limiter with Global & Per-Worker Hierarchy,
 * 429 Retry-After Support, and Exponential Backoff.
 */

export class TokenBucketLimiter {
  private capacity: number;
  private tokens: number;
  private refillRate: number; // tokens per second
  private lastRefillTimestamp: number;
  private backoffUntilTimestamp: number = 0;

  constructor(rps: number, capacityMultiplier: number = 2) {
    this.refillRate = Math.max(0.1, rps);
    this.capacity = Math.max(1, Math.round(this.refillRate * capacityMultiplier));
    this.tokens = this.capacity;
    this.lastRefillTimestamp = Date.now();
  }

  public updateRate(newRps: number): void {
    this.refill();
    this.refillRate = Math.max(0.1, newRps);
    this.capacity = Math.max(1, Math.round(this.refillRate * 2));
    this.tokens = Math.min(this.tokens, this.capacity);
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    if (elapsedSeconds > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
      this.lastRefillTimestamp = now;
    }
  }

  public getRate(): number {
    return this.refillRate;
  }

  public setBackoff(durationMs: number): void {
    const target = Date.now() + durationMs;
    if (target > this.backoffUntilTimestamp) {
      this.backoffUntilTimestamp = target;
    }
  }

  public isBackedOff(): boolean {
    return Date.now() < this.backoffUntilTimestamp;
  }

  public getBackoffRemainingMs(): number {
    return Math.max(0, this.backoffUntilTimestamp - Date.now());
  }

  public async acquire(): Promise<void> {
    while (true) {
      const now = Date.now();
      if (now < this.backoffUntilTimestamp) {
        const waitMs = this.backoffUntilTimestamp - now;
        await sleep(Math.min(waitMs, 5000));
        continue;
      }

      this.refill();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      // Calculate required sleep to get at least 1 token
      const missingTokens = 1 - this.tokens;
      const waitMs = Math.ceil((missingTokens / this.refillRate) * 1000);
      await sleep(Math.max(25, Math.min(waitMs, 1000)));
    }
  }
}

export function parseRetryAfterHeader(headerValue: string | null | undefined): number {
  if (!headerValue) return 2000;

  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(500, Math.min(seconds * 1000, 60000));
  }

  const parsedDate = Date.parse(headerValue);
  if (!Number.isNaN(parsedDate)) {
    const delta = parsedDate - Date.now();
    return Math.max(500, Math.min(delta, 60000));
  }

  return 2000;
}

export function calculateExponentialBackoff(attempt: number, baseMs: number = 1000, maxMs: number = 16000): number {
  const backoff = baseMs * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 200);
  return Math.min(backoff + jitter, maxMs);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Global Shared Limiter Instance
class GlobalCatalogRateLimiterManager {
  private globalLimiter: TokenBucketLimiter;
  private workerLimiters: Map<string, TokenBucketLimiter> = new Map();

  constructor() {
    this.globalLimiter = new TokenBucketLimiter(4.0, 2);
  }

  public setGlobalMaxRps(maxRps: number): void {
    this.globalLimiter.updateRate(Math.min(maxRps, 10.0));
  }

  public getWorkerLimiter(workerKey: string, defaultRps: number = 1.0): TokenBucketLimiter {
    let limiter = this.workerLimiters.get(workerKey);
    if (!limiter) {
      limiter = new TokenBucketLimiter(defaultRps, 2);
      this.workerLimiters.set(workerKey, limiter);
    }
    return limiter;
  }

  public async acquireToken(workerKey: string): Promise<void> {
    const workerLimiter = this.getWorkerLimiter(workerKey);

    // Both global hard cap and worker limiter must permit
    await Promise.all([
      this.globalLimiter.acquire(),
      workerLimiter.acquire(),
    ]);
  }

  public reportRateLimited429(workerKey: string, retryAfterMs: number): void {
    this.globalLimiter.setBackoff(retryAfterMs);
    const workerLimiter = this.workerLimiters.get(workerKey);
    if (workerLimiter) {
      workerLimiter.setBackoff(retryAfterMs);
    }
  }
}

export const sharedCatalogLimiter = new GlobalCatalogRateLimiterManager();
