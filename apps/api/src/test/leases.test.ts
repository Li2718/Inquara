import { describe, expect, it } from "vitest";
import {
  InMemoryWorkspaceLeaseStore,
  type AcquireLeaseInput,
  type LeaseStatusInput,
  type WorkspaceLeaseStore
} from "../leases/service";

function createInput(overrides: Partial<AcquireLeaseInput> = {}): AcquireLeaseInput {
  return {
    workspaceId: "workspace-1",
    sessionId: "session-1",
    ttlSeconds: 15,
    now: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}

describe("workspace lease store", () => {
  it("acquires a free workspace lease", async () => {
    const store = createStore();

    const result = await store.acquire(createInput());

    expect(result.status).toBe("active");
    if (result.status !== "active") throw new Error("Expected active lease.");
    expect(result.lease.holderSessionId).toBe("session-1");
    expect(result.lease.leaseEpoch).toBe(1);
  });

  it("allows a new session to take over the active lease", async () => {
    const store = createStore();
    await store.acquire(createInput());

    const takeover = await store.acquire(
      createInput({
        sessionId: "session-2",
        now: new Date("2026-06-01T10:00:02.000Z")
      })
    );

    expect(takeover.status).toBe("active");
    if (takeover.status !== "active") throw new Error("Expected active lease.");
    expect(takeover.lease.holderSessionId).toBe("session-2");
    expect(takeover.lease.leaseEpoch).toBe(2);
  });

  it("blocks displaced sessions until they regain priority", async () => {
    const store = createStore();
    await store.acquire(createInput({ sessionId: "session-1" }));
    await store.acquire(createInput({ sessionId: "session-2", now: new Date("2026-06-01T10:00:01.000Z") }));

    const blocked = await store.acquire(
      createInput({
        sessionId: "session-1",
        now: new Date("2026-06-01T10:00:02.000Z")
      })
    );

    expect(blocked.status).toBe("blocked");
    if (blocked.status !== "blocked") throw new Error("Expected blocked lease.");
    expect(blocked.currentHolderSessionId).toBe("session-2");
    expect(blocked.displacedSeq).toBe(1);
  });

  it("returns the earliest displaced waiter to active after release", async () => {
    const store = createStore();
    await store.acquire(createInput({ sessionId: "session-a" }));
    await store.acquire(createInput({ sessionId: "session-b", now: new Date("2026-06-01T10:00:01.000Z") }));
    await store.acquire(createInput({ sessionId: "session-a", now: new Date("2026-06-01T10:00:02.000Z") }));
    await store.acquire(createInput({ sessionId: "session-c", now: new Date("2026-06-01T10:00:03.000Z") }));
    await store.release({
      workspaceId: "workspace-1",
      sessionId: "session-c"
    });

    const reacquired = await store.acquire(
      createInput({
        sessionId: "session-a",
        now: new Date("2026-06-01T10:00:04.000Z")
      })
    );

    expect(reacquired.status).toBe("active");
    if (reacquired.status !== "active") throw new Error("Expected active lease.");
    expect(reacquired.lease.holderSessionId).toBe("session-a");
    expect(reacquired.lease.leaseEpoch).toBe(4);
  });

  it("rejects renew from a stale session", async () => {
    const store = createStore();
    await store.acquire(createInput({ sessionId: "session-1" }));
    await store.acquire(createInput({ sessionId: "session-2", now: new Date("2026-06-01T10:00:01.000Z") }));

    const renewed = await store.renew({
      workspaceId: "workspace-1",
      sessionId: "session-1",
      leaseEpoch: 1,
      ttlSeconds: 15,
      now: new Date("2026-06-01T10:00:02.000Z")
    });

    expect(renewed.status).toBe("stale");
  });

  it("reports blocked waiters as next to recover when the active lease is released", async () => {
    const store = createStore();
    await store.acquire(createInput({ sessionId: "session-a" }));
    await store.acquire(createInput({ sessionId: "session-b", now: new Date("2026-06-01T10:00:01.000Z") }));
    await store.acquire(createInput({ sessionId: "session-c", now: new Date("2026-06-01T10:00:02.000Z") }));
    await store.release({
      workspaceId: "workspace-1",
      sessionId: "session-c"
    });

    const status = await store.getStatus(createStatusInput({ sessionId: "session-a", now: new Date("2026-06-01T10:00:03.000Z") }));

    expect(status.status).toBe("available");
    if (status.status !== "available") throw new Error("Expected available status.");
    expect(status.displacedSeq).toBe(1);
  });

  it("does not let a newer waiter skip ahead when the lease becomes free", async () => {
    const store = createStore();
    await store.acquire(createInput({ sessionId: "session-a" }));
    await store.acquire(createInput({ sessionId: "session-b", now: new Date("2026-06-01T10:00:01.000Z") }));
    await store.acquire(createInput({ sessionId: "session-c", now: new Date("2026-06-01T10:00:02.000Z") }));
    await store.release({
      workspaceId: "workspace-1",
      sessionId: "session-c"
    });

    const status = await store.getStatus(createStatusInput({ sessionId: "session-b", now: new Date("2026-06-01T10:00:03.000Z") }));

    expect(status.status).toBe("blocked");
    if (status.status !== "blocked") throw new Error("Expected blocked status.");
    expect(status.displacedSeq).toBe(2);
    expect(status.currentHolderSessionId).toBeNull();
  });

  it("expires inactive waiters so they do not block recovery forever", async () => {
    const store = createStore();
    await store.acquire(createInput({ sessionId: "session-a" }));
    await store.acquire(createInput({ sessionId: "session-b", now: new Date("2026-06-01T10:00:01.000Z") }));
    await store.acquire(createInput({ sessionId: "session-c", now: new Date("2026-06-01T10:00:02.000Z") }));
    await store.release({
      workspaceId: "workspace-1",
      sessionId: "session-c"
    });

    const status = await store.getStatus(
      createStatusInput({
        sessionId: "session-b",
        now: new Date("2026-06-01T10:01:00.000Z")
      })
    );

    expect(status.status).toBe("available");
    if (status.status !== "available") throw new Error("Expected available status.");
    expect(status.displacedSeq).toBeNull();
  });
});

function createStore(): WorkspaceLeaseStore {
  return new InMemoryWorkspaceLeaseStore();
}

function createStatusInput(overrides: Partial<LeaseStatusInput> = {}): LeaseStatusInput {
  return {
    workspaceId: "workspace-1",
    sessionId: "session-1",
    now: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}
