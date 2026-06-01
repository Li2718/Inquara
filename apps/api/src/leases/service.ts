import type { AppConfig } from "@inquara/config";
import { createClient, type RedisClientType } from "redis";

export type LeaseRecord = {
  workspaceId: string;
  holderSessionId: string;
  leaseEpoch: number;
  expiresAt: string;
};

export type AcquireLeaseInput = {
  workspaceId: string;
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
  workspaceId: string;
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
  workspaceId: string;
  sessionId: string;
};

export type LeaseStatusInput = {
  workspaceId: string;
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

export type WorkspaceLeaseStore = {
  acquire(input: AcquireLeaseInput): Promise<AcquireLeaseResult>;
  renew(input: RenewLeaseInput): Promise<RenewLeaseResult>;
  release(input: ReleaseLeaseInput): Promise<void>;
  getStatus(input: LeaseStatusInput): Promise<LeaseStatusResult>;
};

type WaiterRecord = {
  displacedSeq: number;
  lastSeenAt: string;
};

type WorkspaceState = {
  lease: LeaseRecord | null;
  waiters: Map<string, WaiterRecord>;
  displacedCounter: number;
  lastLeaseEpoch: number;
};

const DEFAULT_WAITER_TTL_SECONDS = 45;
const REDIS_KEY_PREFIX = "inquara:workspace-lease";

export class InMemoryWorkspaceLeaseStore implements WorkspaceLeaseStore {
  private readonly state = new Map<string, WorkspaceState>();

  constructor(private readonly waiterTtlSeconds = DEFAULT_WAITER_TTL_SECONDS) {}

  async acquire(input: AcquireLeaseInput): Promise<AcquireLeaseResult> {
    const workspace = this.getWorkspaceState(input.workspaceId);
    this.expireState(workspace, input.now);

    if (workspace.lease?.holderSessionId === input.sessionId) {
      workspace.waiters.delete(input.sessionId);
      workspace.lease = this.bumpExpiry(workspace.lease, input.ttlSeconds, input.now);
      return { status: "active", lease: workspace.lease };
    }

    if (!workspace.lease) {
      const lease = this.createLease(input.workspaceId, input.sessionId, workspace, input.ttlSeconds, input.now);
      workspace.waiters.delete(input.sessionId);
      workspace.lease = lease;
      return {
        status: "active",
        lease
      };
    }

    this.ensureWaiter(workspace, workspace.lease.holderSessionId, input.now);

    const lease = this.createLease(input.workspaceId, input.sessionId, workspace, input.ttlSeconds, input.now);
    workspace.waiters.delete(input.sessionId);
    workspace.lease = lease;
    return {
      status: "active",
      lease
    };
  }

  async renew(input: RenewLeaseInput): Promise<RenewLeaseResult> {
    const workspace = this.getWorkspaceState(input.workspaceId);
    this.expireState(workspace, input.now);

    const lease = workspace.lease;
    if (!lease) return { status: "stale" };
    if (lease.holderSessionId !== input.sessionId || lease.leaseEpoch !== input.leaseEpoch) {
      return { status: "stale" };
    }

    workspace.waiters.delete(input.sessionId);
    workspace.lease = this.bumpExpiry(lease, input.ttlSeconds, input.now);
    return {
      status: "active",
      lease: workspace.lease
    };
  }

  async release(input: ReleaseLeaseInput): Promise<void> {
    const workspace = this.getWorkspaceState(input.workspaceId);
    if (workspace.lease?.holderSessionId === input.sessionId) {
      workspace.lease = null;
    }
  }

  async getStatus(input: LeaseStatusInput): Promise<LeaseStatusResult> {
    const workspace = this.getWorkspaceState(input.workspaceId);
    this.expireState(workspace, input.now);

    if (workspace.lease?.holderSessionId === input.sessionId) {
      return {
        status: "active",
        lease: workspace.lease,
        displacedSeq: null
      };
    }

    const waiter = workspace.waiters.get(input.sessionId);
    const highestPriorityWaiter = this.getHighestPriorityWaiter(workspace);

    if (!workspace.lease && (!highestPriorityWaiter || highestPriorityWaiter.sessionId === input.sessionId)) {
      if (waiter) {
        workspace.waiters.set(input.sessionId, {
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
      workspace.waiters.set(input.sessionId, {
        ...waiter,
        lastSeenAt: input.now.toISOString()
      });
    }

    return {
      status: "blocked",
      currentHolderSessionId: workspace.lease?.holderSessionId ?? null,
      displacedSeq: waiter?.displacedSeq ?? null,
      expiresAt: workspace.lease?.expiresAt ?? null
    };
  }

  private getWorkspaceState(workspaceId: string): WorkspaceState {
    const existing = this.state.get(workspaceId);
    if (existing) return existing;
    const created: WorkspaceState = {
      lease: null,
      waiters: new Map(),
      displacedCounter: 0,
      lastLeaseEpoch: 0
    };
    this.state.set(workspaceId, created);
    return created;
  }

  private expireState(workspace: WorkspaceState, now: Date): void {
    if (workspace.lease && new Date(workspace.lease.expiresAt).getTime() <= now.getTime()) {
      workspace.lease = null;
    }

    for (const [sessionId, waiter] of workspace.waiters.entries()) {
      if (new Date(waiter.lastSeenAt).getTime() + this.waiterTtlSeconds * 1000 <= now.getTime()) {
        workspace.waiters.delete(sessionId);
      }
    }
  }

  private ensureWaiter(workspace: WorkspaceState, sessionId: string, now: Date): void {
    const existing = workspace.waiters.get(sessionId);
    if (existing) {
      workspace.waiters.set(sessionId, {
        ...existing,
        lastSeenAt: now.toISOString()
      });
      return;
    }
    workspace.displacedCounter += 1;
    workspace.waiters.set(sessionId, {
      displacedSeq: workspace.displacedCounter,
      lastSeenAt: now.toISOString()
    });
  }

  private createLease(
    workspaceId: string,
    sessionId: string,
    workspace: WorkspaceState,
    ttlSeconds: number,
    now: Date
  ): LeaseRecord {
    const leaseEpoch = workspace.lastLeaseEpoch + 1;
    workspace.lastLeaseEpoch = leaseEpoch;
    return {
      workspaceId,
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

  private getHighestPriorityWaiter(workspace: WorkspaceState): { sessionId: string; displacedSeq: number } | null {
    let next: { sessionId: string; displacedSeq: number } | null = null;
    for (const [sessionId, waiter] of workspace.waiters.entries()) {
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

export class RedisWorkspaceLeaseStore implements WorkspaceLeaseStore {
  private client: RedisClientType | null = null;
  private connectPromise: Promise<void> | null = null;

  constructor(
    private readonly redisUrl: string,
    private readonly waiterTtlSeconds = DEFAULT_WAITER_TTL_SECONDS
  ) {}

  async acquire(input: AcquireLeaseInput): Promise<AcquireLeaseResult> {
    return this.mutateWorkspace<AcquireLeaseResult>(input.workspaceId, input.now, workspace => {
      const state = deserializeWorkspaceState(workspace);
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
        const lease = createLease(input.workspaceId, input.sessionId, state, input.ttlSeconds, input.now);
        state.waiters.delete(input.sessionId);
        state.lease = lease;
        return {
          state,
          result: { status: "active", lease }
        };
      }

      ensureWaiter(state, state.lease.holderSessionId, input.now);
      const lease = createLease(input.workspaceId, input.sessionId, state, input.ttlSeconds, input.now);
      state.waiters.delete(input.sessionId);
      state.lease = lease;
      return {
        state,
        result: { status: "active", lease }
      };
    });
  }

  async renew(input: RenewLeaseInput): Promise<RenewLeaseResult> {
    return this.mutateWorkspace<RenewLeaseResult>(input.workspaceId, input.now, workspace => {
      const state = deserializeWorkspaceState(workspace);
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
    await this.mutateWorkspace(input.workspaceId, new Date(), workspace => {
      const state = deserializeWorkspaceState(workspace);
      if (state.lease?.holderSessionId === input.sessionId) {
        state.lease = null;
      }
      return { state, result: undefined };
    });
  }

  async getStatus(input: LeaseStatusInput): Promise<LeaseStatusResult> {
    return this.mutateWorkspace<LeaseStatusResult>(input.workspaceId, input.now, workspace => {
      const state = deserializeWorkspaceState(workspace);
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

  private async mutateWorkspace<TResult>(
    workspaceId: string,
    now: Date,
    mutator: (serialized: string | null) => { state: WorkspaceState; result: TResult }
  ): Promise<TResult> {
    const client = await this.getClient();
    const key = getWorkspaceRedisKey(workspaceId);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await client.watch(key);
      try {
        const current = await client.get(key);
        const { state, result } = mutator(current);
        const transaction = client.multi();
        const ttlSeconds = getWorkspaceStateTtlSeconds(state, now, this.waiterTtlSeconds);
        if (state.lease === null && state.waiters.size === 0) {
          transaction.del(key);
        } else {
          transaction.set(key, serializeWorkspaceState(state), {
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

    throw new Error(`Failed to update workspace lease state for ${workspaceId}.`);
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

export function createWorkspaceLeaseStore(config: AppConfig): WorkspaceLeaseStore {
  if (config.REDIS_URL.includes("test.local")) {
    return new InMemoryWorkspaceLeaseStore();
  }
  return new RedisWorkspaceLeaseStore(config.REDIS_URL);
}

function getWorkspaceRedisKey(workspaceId: string): string {
  return `${REDIS_KEY_PREFIX}:${workspaceId}`;
}

function serializeWorkspaceState(state: WorkspaceState): string {
  return JSON.stringify({
    lease: state.lease,
    waiters: Array.from(state.waiters.entries()),
    displacedCounter: state.displacedCounter,
    lastLeaseEpoch: state.lastLeaseEpoch
  });
}

function deserializeWorkspaceState(serialized: string | null): WorkspaceState {
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

function getWorkspaceStateTtlSeconds(state: WorkspaceState, now: Date, waiterTtlSeconds: number): number {
  const leaseSeconds = state.lease
    ? Math.max(1, Math.ceil((new Date(state.lease.expiresAt).getTime() - now.getTime()) / 1000))
    : 0;
  return Math.max(waiterTtlSeconds, leaseSeconds, 1);
}

function expireStateData(state: WorkspaceState, now: Date, waiterTtlSeconds: number): void {
  if (state.lease && new Date(state.lease.expiresAt).getTime() <= now.getTime()) {
    state.lease = null;
  }
  for (const [sessionId, waiter] of state.waiters.entries()) {
    if (new Date(waiter.lastSeenAt).getTime() + waiterTtlSeconds * 1000 <= now.getTime()) {
      state.waiters.delete(sessionId);
    }
  }
}

function ensureWaiter(state: WorkspaceState, sessionId: string, now: Date): void {
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
  workspaceId: string,
  sessionId: string,
  state: WorkspaceState,
  ttlSeconds: number,
  now: Date
): LeaseRecord {
  const leaseEpoch = state.lastLeaseEpoch + 1;
  state.lastLeaseEpoch = leaseEpoch;
  return {
    workspaceId,
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

function getHighestPriorityWaiter(state: WorkspaceState): { sessionId: string; displacedSeq: number } | null {
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
