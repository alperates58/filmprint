import { db } from "@/lib/db/client";
import type { MediaType } from "./types";

const LEASE_DURATION_MS = 60_000; // 60 seconds lease TTL

export class CatalogWorkerLock {
  private mediaType: MediaType;
  private workerId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isHeld: boolean = false;

  constructor(mediaType: MediaType, workerId?: string) {
    this.mediaType = mediaType;
    this.workerId =
      workerId ||
      `worker-${process.pid}-${Math.random().toString(36).substring(2, 9)}`;
  }

  public getWorkerId(): string {
    return this.workerId;
  }

  public async acquire(): Promise<boolean> {
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() - LEASE_DURATION_MS);

    try {
      // 1. Try to take or renew DB lease on CatalogIngestionState
      const result = await db.catalogIngestionState.updateMany({
        where: {
          mediaType: this.mediaType,
          OR: [
            { lockedAt: null },
            { lockedAt: { lt: expiryThreshold } },
            { lockedBy: this.workerId },
          ],
        },
        data: {
          lockedAt: now,
          lockedBy: this.workerId,
        },
      });

      if (result.count > 0) {
        this.isHeld = true;
        this.startHeartbeat();
        return true;
      }

      this.isHeld = false;
      return false;
    } catch (e) {
      console.error(`[CatalogLock] Error acquiring lock for ${this.mediaType}:`, e);
      this.isHeld = false;
      return false;
    }
  }

  public async refresh(): Promise<boolean> {
    if (!this.isHeld) return false;
    const now = new Date();

    try {
      const result = await db.catalogIngestionState.updateMany({
        where: {
          mediaType: this.mediaType,
          lockedBy: this.workerId,
        },
        data: {
          lockedAt: now,
        },
      });

      if (result.count === 0) {
        this.isHeld = false;
        this.stopHeartbeat();
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  public async release(): Promise<void> {
    this.stopHeartbeat();
    this.isHeld = false;

    try {
      await db.catalogIngestionState.updateMany({
        where: {
          mediaType: this.mediaType,
          lockedBy: this.workerId,
        },
        data: {
          lockedAt: null,
          lockedBy: null,
        },
      });
    } catch (e) {
      console.error(`[CatalogLock] Error releasing lock for ${this.mediaType}:`, e);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.refresh().catch(() => {});
    }, 15_000); // Heartbeat every 15s
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
