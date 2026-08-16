import type { CircuitBreakerState } from "./types";

export class CatalogCircuitBreaker {
  private consecutiveFailures: number = 0;
  private failureThreshold: number;
  private cooldownMs: number;
  private openUntilTimestamp: number = 0;
  private state: CircuitBreakerState = "CLOSED";

  constructor(failureThreshold: number = 10, cooldownMs: number = 300000) {
    this.failureThreshold = Math.max(3, failureThreshold);
    this.cooldownMs = Math.max(10000, cooldownMs);
  }

  public updateConfig(threshold: number, cooldownMs: number): void {
    this.failureThreshold = Math.max(3, threshold);
    this.cooldownMs = Math.max(10000, cooldownMs);
  }

  public getState(externalOpenUntil?: Date | null): CircuitBreakerState {
    const now = Date.now();
    const openUntil = externalOpenUntil ? externalOpenUntil.getTime() : this.openUntilTimestamp;

    if (openUntil > now) {
      this.state = "OPEN";
      return "OPEN";
    }

    if (this.state === "OPEN" || (openUntil > 0 && openUntil <= now)) {
      this.state = "HALF_OPEN";
      return "HALF_OPEN";
    }

    return this.state;
  }

  public canAttempt(externalOpenUntil?: Date | null): boolean {
    const currentState = this.getState(externalOpenUntil);
    return currentState !== "OPEN";
  }

  public getOpenUntilDate(): Date | null {
    if (this.openUntilTimestamp > Date.now()) {
      return new Date(this.openUntilTimestamp);
    }
    return null;
  }

  public getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openUntilTimestamp = 0;
    this.state = "CLOSED";
  }

  public recordFailure(): { opened: boolean; openUntil: Date | null; consecutiveFailures: number } {
    this.consecutiveFailures += 1;

    if (this.consecutiveFailures >= this.failureThreshold || this.state === "HALF_OPEN") {
      this.openUntilTimestamp = Date.now() + this.cooldownMs;
      this.state = "OPEN";
      return {
        opened: true,
        openUntil: new Date(this.openUntilTimestamp),
        consecutiveFailures: this.consecutiveFailures,
      };
    }

    return {
      opened: false,
      openUntil: null,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  public reset(): void {
    this.consecutiveFailures = 0;
    this.openUntilTimestamp = 0;
    this.state = "CLOSED";
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(public readonly openUntil: Date) {
    super(`Catalog ingestion circuit breaker is OPEN until ${openUntil.toISOString()}`);
    this.name = "CircuitBreakerOpenError";
  }
}
