import type { AppConfig } from "@inquara/config";
import { createClient, type RedisClientType } from "redis";

export type LeaseRecord = {
  canvasId: string;
  holderSessionId: string;
  leaseEpoch: number;
  expiresAt: string;
};

export type AcquireLeaseInput = {
  canvasId: string;
  sessionId: string;
  ttlSeconds: number;
  now: Date;
};

export type AcquireLeaseResult =
  | {
      status: "active";
      lease: LeaseRecord;
    }
  | {
      status: "blocked";
      currentHolderSessionId: string | null;
      displacedSeq: number | null;
      expiresAt: string | null;
    };

export type RenewLeaseInput = {
  canvasId: string;
  sessionId: string;
  leaseEpoch: number;
  ttlSeconds: number;
  now: Date;
};

export type RenewLeaseResult =
  | {
      status: "active";
      lease: LeaseRecord;
    }
  | {
      status: "stale";
    };

export type ReleaseLeaseInput = {
  canvasId: string;
  sessionId: string;
};

export type LeaseStatusInput = {
  canvasId: string;
  sessionId: string;
  now: Date;
};

export type LeaseStatusResult =
  | {
      status: "active";
      lease: LeaseRecord;
      displacedSeq: null;
    }
  | {
      status: "blocked";
      currentHolderSessionId: string | null;
      displacedSeq: number | null;
      expiresAt: string | null;
    }
  | {
      status: "available";
      currentHolderSessionId: null;
      displacedSeq: number | null;
      expiresAt: null;
    };

export type CanvasLeaseStore = {
  acquire(input: AcquireLeaseInput): Promise<AcquireLeaseResult>;
  renew(input: RenewLeaseInput): Promise<RenewLeaseResult>;
  release(input: ReleaseLeaseInput): Promise<void>;
  getStatus(input: LeaseStatusInput): Promise<LeaseStatusResult>;
};

type WaiterRecord = {
  displacedSeq: number;
  lastSeenAt: string;
};

type CanvasState = {
  lease: LeaseRecord | null;
  waiters: Map<string, WaiterRecord>;
  displacedCounter: number;
  lastLeaseEpoch: number;
};

const DEFAULT_WAITER_TTL_SECONDS = 45;
const REDIS_KEY_PREFIX = "inquara:canvas-lease";

export class InMemoryCanvasLeaseStore implements CanvasLeaseStore {
  private readonly state = new Map<string, CanvasState>();

  constructor(private readonly waiterTtlSeconds = DEFAULT_WAITER_TTL_SECONDS) {}

  async acquire(input: AcquireLeaseInput): Promise<AcquireLeaseResult> {
    const canvas = this.getCanvasState(input.canvasId);
    this.expireState(canvas, input.now);

    if (canvas.lease?.holderSessionId === input.sessionId) {
      canvas.waiters.delete(input.sessionId);
      canvas.lease = this.bumpExpiry(canvas.lease, input.ttlSeconds, input.now);
      return { status: "active", lease: canvas.lease };
    }

    if (!canvas.lease) {
      const lease = this.createLease(input.canvasId, input.sessionId, canvas, input.ttlSeconds, input.now);
      canvas.waiters.delete(input.sessionId);
      canvas.lease = lease;
      return {
        status: "active",
        lease
      };
    }

    this.ensureWaiter(canvas, canvas.lease.holderSessionId, input.now);

    const lease = this.createLease(input.canvasId, input.sessionId, canvas, input.ttlSeconds, input.now);
    canvas.waiters.delete(input.sessionId);
    canvas.lease = lease;
    return {
      status: "active",
      lease
    };
  }

  async renew(input: RenewLeaseInput): Promise<RenewLeaseResult> {
    const canvas = this.getCanvasState(input.canvasId);
    this.expireState(canvas, input.now);

    const lease = canvas.lease;
    if (!lease) return { status: "stale" };
    if (lease.holderSessionId !== input.sessionId || lease.leaseEpoch !== input.leaseEpoch) {
      return { status: "stale" };
    }

    canvas.waiters.delete(input.sessionId);
    canvas.lease = this.bumpExpiry(lease, input.ttlSeconds, input.now);
    return {
      status: "active",
      lease: canvas.lease
    };
  }

  async release(input: ReleaseLeaseInput): Promise<void> {
    const canvas = this.getCanvasState(input.canvasId);
    if (canvas.lease?.holderSessionId === input.sessionId) {
      canvas.lease = null;
    }
  }

  async getStatus(input: LeaseStatusInput): Promise<LeaseStatusResult> {
    const canvas = this.getCanvasState(input.canvasId);
    this.expireState(canvas, input.now);

    if (canvas.lease?.holderSessionId === input.sessionId) {
      return {
        status: "active",
        lease: canvas.lease,
        displacedSeq: null
      };
    }

    const waiter = canvas.waiters.get(input.sessionId);
    const highestPriorityWaiter = this.getHighestPriorityWaiter(canvas);

    if (!canvas.lease && (!highestPriorityWaiter || highestPriorityWaiter.sessionId === input.sessionId)) {
      if (waiter) {
        canvas.waiters.set(input.sessionId, {
          ...waiter,
          lastSeenAt: input.now.toISOString()
        });
      }
      return {
        status: "available",
        currentHolderSessionId: null,
        displacedSeq: waiter?.displacedSeq ?? null,
        expiresAt: null
      };
    }

    if (waiter) {
      canvas.waiters.set(input.sessionId, {
        ...waiter,
        lastSeenAt: input.now.toISOString()
      });
    }

    return {
      status: "blocked",
      currentHolderSessionId: canvas.lease?.holderSessionId ?? null,
      displacedSeq: waiter?.displacedSeq ?? null,
      expiresAt: canvas.lease?.expiresAt ?? null
    };
  }

  private getCanvasState(canvasId: string): CanvasState {
    const existing = this.state.get(canvasId);
    if (existing) return existing;
    const created: CanvasState = {
      lease: null,
      waiters: new Map(),
      displacedCounter: 0,
      lastLeaseEpoch: 0
    };
    this.state.set(canvasId, created);
    return created;
  }

  private expireState(canvas: CanvasState, now: Date): void {
    if (canvas.lease && new Date(canvas.lease.expiresAt).getTime() <= now.getTime()) {
      canvas.lease = null;
    }

    for (const [sessionId, waiter] of canvas.waiters.entries()) {
      if (new Date(waiter.lastSeenAt).getTime() + this.waiterTtlSeconds * 1000 <= now.getTime()) {
        canvas.waiters.delete(sessionId);
      }
    }
  }

  private ensureWaiter(canvas: CanvasState, sessionId: string, now: Date): void {
    const existing = canvas.waiters.get(sessionId);
    if (existing) {
      canvas.waiters.set(sessionId, {
        ...existing,
        lastSeenAt: now.toISOString()
      });
      return;
    }
    canvas.displacedCounter += 1;
    canvas.waiters.set(sessionId, {
      displacedSeq: canvas.displacedCounter,
      lastSeenAt: now.toISOString()
    });
  }

  private createLease(
    canvasId: string,
    sessionId: string,
    canvas: CanvasState,
    ttlSeconds: number,
    now: Date
  ): LeaseRecord {
    const leaseEpoch = canvas.lastLeaseEpoch + 1;
    canvas.lastLeaseEpoch = leaseEpoch;
    return {
      canvasId,
      holderSessionId: sessionId,
      leaseEpoch,
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString()
    };
  }

  private bumpExpiry(lease: LeaseRecord, ttlSeconds: number, now: Date): LeaseRecord {
    return {
      ...lease,
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString()
    };
  }

  private getHighestPriorityWaiter(canvas: CanvasState): { sessionId: string; displacedSeq: number } | null {
    let next: { sessionId: string; displacedSeq: number } | null = null;
    for (const [sessionId, waiter] of canvas.waiters.entries()) {
      if (!next || waiter.displacedSeq < next.displacedSeq) {
        next = {
          sessionId,
          displacedSeq: waiter.displacedSeq
        };
      }
    }
    return next;
  }
}

export class RedisCanvasLeaseStore implements CanvasLeaseStore {
  private client: RedisClientType | null = null;
  private connectPromise: Promise<void> | null = null;

  constructor(
    private readonly redisUrl: string,
    private readonly waiterTtlSeconds = DEFAULT_WAITER_TTL_SECONDS
  ) {}

  async acquire(input: AcquireLeaseInput): Promise<AcquireLeaseResult> {
    return this.mutateCanvas<AcquireLeaseResult>(input.canvasId, input.now, canvas => {
      const state = deserializeCanvasState(canvas);
      expireStateData(state, input.now, this.waiterTtlSeconds);

      if (state.lease?.holderSessionId === input.sessionId) {
        state.waiters.delete(input.sessionId);
        state.lease = bumpExpiry(state.lease, input.ttlSeconds, input.now);
        return {
          state,
          result: { status: "active", lease: state.lease }
        };
      }

      if (!state.lease) {
        const lease = createLease(input.canvasId, input.sessionId, state, input.ttlSeconds, input.now);
        state.waiters.delete(input.sessionId);
        state.lease = lease;
        return {
          state,
          result: { status: "active", lease }
        };
      }

      ensureWaiter(state, state.lease.holderSessionId, input.now);
      const lease = createLease(input.canvasId, input.sessionId, state, input.ttlSeconds, input.now);
      state.waiters.delete(input.sessionId);
      state.lease = lease;
      return {
        state,
        result: { status: "active", lease }
      };
    });
  }

  async renew(input: RenewLeaseInput): Promise<RenewLeaseResult> {
    return this.mutateCanvas<RenewLeaseResult>(input.canvasId, input.now, canvas => {
      const state = deserializeCanvasState(canvas);
      expireStateData(state, input.now, this.waiterTtlSeconds);
      const lease = state.lease;
      if (!lease) {
        return { state, result: { status: "stale" } };
      }
      if (lease.holderSessionId !== input.sessionId || lease.leaseEpoch !== input.leaseEpoch) {
        return { state, result: { status: "stale" } };
      }
      state.waiters.delete(input.sessionId);
      state.lease = bumpExpiry(lease, input.ttlSeconds, input.now);
      return {
        state,
        result: {
          status: "active",
          lease: state.lease
        }
      };
    });
  }

  async release(input: ReleaseLeaseInput): Promise<void> {
    await this.mutateCanvas(input.canvasId, new Date(), canvas => {
      const state = deserializeCanvasState(canvas);
      if (state.lease?.holderSessionId === input.sessionId) {
        state.lease = null;
      }
      return { state, result: undefined };
    });
  }

  async getStatus(input: LeaseStatusInput): Promise<LeaseStatusResult> {
    return this.mutateCanvas<LeaseStatusResult>(input.canvasId, input.now, canvas => {
      const state = deserializeCanvasState(canvas);
      expireStateData(state, input.now, this.waiterTtlSeconds);

      if (state.lease?.holderSessionId === input.sessionId) {
        return {
          state,
          result: {
            status: "active",
            lease: state.lease,
            displacedSeq: null
          }
        };
      }

      const waiter = state.waiters.get(input.sessionId);
      const highestPriorityWaiter = getHighestPriorityWaiter(state);

      if (!state.lease && (!highestPriorityWaiter || highestPriorityWaiter.sessionId === input.sessionId)) {
        if (waiter) {
          state.waiters.set(input.sessionId, {
            ...waiter,
            lastSeenAt: input.now.toISOString()
          });
        }
        return {
          state,
          result: {
            status: "available",
            currentHolderSessionId: null,
            displacedSeq: waiter?.displacedSeq ?? null,
            expiresAt: null
          }
        };
      }

      if (waiter) {
        state.waiters.set(input.sessionId, {
          ...waiter,
          lastSeenAt: input.now.toISOString()
        });
      }

      return {
        state,
        result: {
          status: "blocked",
          currentHolderSessionId: state.lease?.holderSessionId ?? null,
          displacedSeq: waiter?.displacedSeq ?? null,
          expiresAt: state.lease?.expiresAt ?? null
        }
      };
    });
  }

  private async mutateCanvas<TResult>(
    canvasId: string,
    now: Date,
    mutator: (serialized: string | null) => { state: CanvasState; result: TResult }
  ): Promise<TResult> {
    const client = await this.getClient();
    const key = getCanvasRedisKey(canvasId);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await client.watch(key);
      try {
        const current = await client.get(key);
        const { state, result } = mutator(current);
        const transaction = client.multi();
        const ttlSeconds = getCanvasStateTtlSeconds(state, now, this.waiterTtlSeconds);
        if (state.lease === null && state.waiters.size === 0) {
          transaction.del(key);
        } else {
          transaction.set(key, serializeCanvasState(state), {
            EX: ttlSeconds
          });
        }
        const committed = await transaction.exec();
        if (committed !== null) {
          return result;
        }
      } finally {
        await client.unwatch();
      }
    }

    throw new Error(`Failed to update canvas lease state for ${canvasId}.`);
  }

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = createClient({ url: this.redisUrl });
      this.client.on("error", () => {
        // The route layer treats Redis failures as request failures.
      });
    }
    if (!this.connectPromise) {
      this.connectPromise = this.client.connect().then(() => undefined);
    }
    await this.connectPromise;
    return this.client;
  }
}

export function createCanvasLeaseStore(config: AppConfig): CanvasLeaseStore {
  if (config.REDIS_URL.includes("test.local")) {
    return new InMemoryCanvasLeaseStore();
  }
  return new RedisCanvasLeaseStore(config.REDIS_URL);
}

function getCanvasRedisKey(canvasId: string): string {
  return `${REDIS_KEY_PREFIX}:${canvasId}`;
}

function serializeCanvasState(state: CanvasState): string {
  return JSON.stringify({
    lease: state.lease,
    waiters: Array.from(state.waiters.entries()),
    displacedCounter: state.displacedCounter,
    lastLeaseEpoch: state.lastLeaseEpoch
  });
}

function deserializeCanvasState(serialized: string | null): CanvasState {
  if (!serialized) {
    return {
      lease: null,
      waiters: new Map(),
      displacedCounter: 0,
      lastLeaseEpoch: 0
    };
  }
  const parsed = JSON.parse(serialized) as {
    lease: LeaseRecord | null;
    waiters: Array<[string, WaiterRecord]>;
    displacedCounter: number;
    lastLeaseEpoch: number;
  };
  return {
    lease: parsed.lease,
    waiters: new Map(parsed.waiters),
    displacedCounter: parsed.displacedCounter,
    lastLeaseEpoch: parsed.lastLeaseEpoch
  };
}

function getCanvasStateTtlSeconds(state: CanvasState, now: Date, waiterTtlSeconds: number): number {
  const leaseSeconds = state.lease
    ? Math.max(1, Math.ceil((new Date(state.lease.expiresAt).getTime() - now.getTime()) / 1000))
    : 0;
  return Math.max(waiterTtlSeconds, leaseSeconds, 1);
}

function expireStateData(state: CanvasState, now: Date, waiterTtlSeconds: number): void {
  if (state.lease && new Date(state.lease.expiresAt).getTime() <= now.getTime()) {
    state.lease = null;
  }
  for (const [sessionId, waiter] of state.waiters.entries()) {
    if (new Date(waiter.lastSeenAt).getTime() + waiterTtlSeconds * 1000 <= now.getTime()) {
      state.waiters.delete(sessionId);
    }
  }
}

function ensureWaiter(state: CanvasState, sessionId: string, now: Date): void {
  const existing = state.waiters.get(sessionId);
  if (existing) {
    state.waiters.set(sessionId, {
      ...existing,
      lastSeenAt: now.toISOString()
    });
    return;
  }
  state.displacedCounter += 1;
  state.waiters.set(sessionId, {
    displacedSeq: state.displacedCounter,
    lastSeenAt: now.toISOString()
  });
}

function createLease(
  canvasId: string,
  sessionId: string,
  state: CanvasState,
  ttlSeconds: number,
  now: Date
): LeaseRecord {
  const leaseEpoch = state.lastLeaseEpoch + 1;
  state.lastLeaseEpoch = leaseEpoch;
  return {
    canvasId,
    holderSessionId: sessionId,
    leaseEpoch,
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString()
  };
}

function bumpExpiry(lease: LeaseRecord, ttlSeconds: number, now: Date): LeaseRecord {
  return {
    ...lease,
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString()
  };
}

function getHighestPriorityWaiter(state: CanvasState): { sessionId: string; displacedSeq: number } | null {
  let next: { sessionId: string; displacedSeq: number } | null = null;
  for (const [sessionId, waiter] of state.waiters.entries()) {
    if (!next || waiter.displacedSeq < next.displacedSeq) {
      next = {
        sessionId,
        displacedSeq: waiter.displacedSeq
      };
    }
  }
  return next;
}
