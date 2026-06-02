"use client";

import type { WorkspaceCommand, WorkspaceSnapshot } from "@inquara/domain";
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { apiJson, apiRequest } from "../../shared/api";
import { usePageTransitionNavigation } from "../../shared/components/chrome";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { createCommands } from "../commands/createCommands";
import { cancelPendingWorkspaceLeaseRelease, scheduleWorkspaceLeaseRelease } from "./leaseReleaseScheduler";
import { shouldEnterLeaseRecovery } from "./renewFailurePolicy";
import { workspaceSessionStore, type WorkspaceSessionState } from "./store";

type WorkspaceSessionContextValue = {
  state: WorkspaceSessionState;
  commands: ReturnType<typeof createCommands>;
  retryLease(): Promise<void>;
  sendCommand(command: WorkspaceCommand): Promise<void>;
};

type LeaseAcquireResponse =
  | {
      status: "active";
      lease: {
        leaseEpoch: number;
        expiresAt: string;
      };
    }
  | {
      status: "blocked";
      currentHolderSessionId: string | null;
      displacedSeq: number | null;
      expiresAt: string | null;
    };

type LeaseStatusResponse =
  | {
      status: "active";
      lease: {
        leaseEpoch: number;
        expiresAt: string;
      };
    }
  | {
      status: "available";
      displacedSeq: number | null;
      expiresAt: null;
    }
  | {
      status: "blocked";
      currentHolderSessionId: string | null;
      displacedSeq: number | null;
      expiresAt: string | null;
    };

const WorkspaceSessionContext = createContext<WorkspaceSessionContextValue | null>(null);
const workspaceSnapshotCache = new Map<string, WorkspaceSnapshot>();
const renewIntervalMs = 5_000;
const stalePollMinMs = 8_000;
const stalePollJitterMs = 2_000;
const leaseReleaseDelayMs = 250;
const sessionStorageKeyPrefix = "inquara.workspace-session";

export function WorkspaceSessionProvider({
  workspaceId,
  children
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  const navigation = usePageTransitionNavigation();
  const { messages } = useLocale();
  const state = useWorkspaceSessionState();
  const sessionIdRef = useRef<string | null>(null);
  const renewTimerRef = useRef<number | null>(null);
  const consecutiveRenewFailuresRef = useRef(0);
  const blockedPollTimerRef = useRef<number | null>(null);
  const releasedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const commands = useMemo(
    () =>
      createCommands(workspaceId, {
        newChatTitle: messages.canvas.newChat
      }),
    [messages.canvas.newChat, workspaceId]
  );

  useEffect(() => {
    cancelPendingWorkspaceLeaseRelease(workspaceId);
    sessionIdRef.current = getOrCreateSessionId(workspaceId);
    releasedRef.current = false;
    consecutiveRenewFailuresRef.current = 0;
    const cachedSnapshot = workspaceSnapshotCache.get(workspaceId);
    if (cachedSnapshot) {
      workspaceSessionStore.getState().setSnapshot(cachedSnapshot);
    }
    workspaceSessionStore.getState().setLease({
      sessionId: sessionIdRef.current,
      leaseEpoch: null,
      displacedSeq: null,
      expiresAt: null
    });
    workspaceSessionStore.getState().setLeaseState("acquiring");
    workspaceSessionStore.getState().setErrorMessageKey(null);

    void acquireAndLoadWorkspace({ mode: "initial" });

    return () => {
      clearRenewTimer();
      clearBlockedPollTimer();
      if (!releasedRef.current) {
        releasedRef.current = true;
        scheduleWorkspaceLeaseRelease(workspaceId, releaseLease, leaseReleaseDelayMs);
      }
    };
  }, [navigation, workspaceId]);

  const value = useMemo<WorkspaceSessionContextValue>(
    () => ({
      state,
      commands,
      async retryLease() {
        await retryLeaseNow();
      },
      async sendCommand(command) {
        if (stateRef.current.leaseState !== "active") return;
        workspaceSessionStore.getState().applyOptimisticCommand(command);
        try {
          if (command.type === "message.sendUserMessage") {
            await streamMessageCommand(command);
          } else {
            const response = await apiJson<{ events: unknown[] }>(`/workspaces/${workspaceId}/commands`, {
              method: "POST",
              body: JSON.stringify({
                sessionId: sessionIdRef.current,
                leaseEpoch: stateRef.current.lease.leaseEpoch,
                command
              })
            });
            const snapshot = workspaceSessionStore.getState().snapshot;
            if (snapshot) {
              workspaceSnapshotCache.set(workspaceId, snapshot);
            }
            if (!response.events.length) {
              workspaceSessionStore.getState().clearPending(command.clientMutationId);
            }
          }
        } catch (error) {
          if (isLeaseStaleError(error)) {
            await enterBlockedState("activeElsewhereMessage");
            return;
          }
          workspaceSessionStore.getState().setErrorMessageKey("syncFailedMessage");
          workspaceSessionStore.getState().clearPending(command.clientMutationId);
        }
      }
    }),
    [commands, state, workspaceId]
  );

  return <WorkspaceSessionContext.Provider value={value}>{children}</WorkspaceSessionContext.Provider>;

  async function acquireAndLoadWorkspace({ mode }: { mode: "initial" | "retry" }): Promise<void> {
    try {
      const sessionId = sessionIdRef.current;
      if (!sessionId) throw new Error("Workspace session is unavailable.");

      const acquire = await apiJson<LeaseAcquireResponse>(`/workspaces/${workspaceId}/lease/acquire`, {
        method: "POST",
        body: JSON.stringify({ sessionId })
      });

      if (acquire.status === "active") {
        workspaceSessionStore.getState().setLease({
          leaseEpoch: acquire.lease.leaseEpoch,
          displacedSeq: null,
          expiresAt: acquire.lease.expiresAt
        });
        const snapshot = await apiJson<WorkspaceSnapshot>(`/workspaces/${workspaceId}/snapshot`);
        workspaceSnapshotCache.set(workspaceId, snapshot);
        workspaceSessionStore.getState().setSnapshot(snapshot);
        workspaceSessionStore.getState().setLeaseState("active");
        workspaceSessionStore.getState().setErrorMessageKey(null);
        startRenewLoop();
        return;
      }

      workspaceSessionStore.getState().setLease({
        displacedSeq: acquire.displacedSeq,
        expiresAt: acquire.expiresAt
      });
      workspaceSessionStore.getState().setLeaseState("blocked-stale");
      startBlockedPollLoop();
    } catch {
      if (mode === "initial") {
        workspaceSessionStore.getState().setLeaseState("blocked-stale");
        workspaceSessionStore.getState().setErrorMessageKey("acquireFailedMessage");
        workspaceSessionStore.getState().setSnapshot(null);
        void navigation.replace("/");
        return;
      }

      workspaceSessionStore.getState().setErrorMessageKey("recoverFailedMessage");
    }
  }

  async function retryLeaseNow(): Promise<void> {
    consecutiveRenewFailuresRef.current = 0;
    clearBlockedPollTimer();
    if (stateRef.current.leaseState === "recovering") {
      await pollLeaseAvailability();
    } else {
      await acquireAndLoadWorkspace({ mode: "retry" });
    }
    if (stateRef.current.leaseState === "blocked-stale" || stateRef.current.leaseState === "recovering") {
      startBlockedPollLoop();
    }
  }

  function startRenewLoop(): void {
    clearRenewTimer();
    renewTimerRef.current = window.setInterval(() => {
      void renewLease();
    }, renewIntervalMs);
  }

  function clearRenewTimer(): void {
    if (renewTimerRef.current !== null) {
      window.clearInterval(renewTimerRef.current);
      renewTimerRef.current = null;
    }
  }

  async function renewLease(): Promise<void> {
    const sessionId = sessionIdRef.current;
    const leaseEpoch = stateRef.current.lease.leaseEpoch;
    if (!sessionId || !leaseEpoch) return;

    let response: Response;
    try {
      response = await apiRequest(`/workspaces/${workspaceId}/lease/renew`, {
        method: "POST",
        body: JSON.stringify({ sessionId, leaseEpoch })
      });
    } catch {
      handleRenewFailure();
      return;
    }

    if (response.status === 409) {
      consecutiveRenewFailuresRef.current = 0;
      await enterBlockedState("activeElsewhereMessage");
      return;
    }

    if (!response.ok) {
      handleRenewFailure();
      return;
    }

    consecutiveRenewFailuresRef.current = 0;
    const renewed = (await response.json()) as { status: "active"; lease: { leaseEpoch: number; expiresAt: string } };
    workspaceSessionStore.getState().setLease({
      leaseEpoch: renewed.lease.leaseEpoch,
      expiresAt: renewed.lease.expiresAt
    });
    workspaceSessionStore.getState().setLeaseState("active");
    workspaceSessionStore.getState().setErrorMessageKey(null);
  }

  function handleRenewFailure(): void {
    consecutiveRenewFailuresRef.current += 1;
    workspaceSessionStore.getState().setErrorMessageKey("unstableNetworkMessage");
    if (!shouldEnterLeaseRecovery(consecutiveRenewFailuresRef.current)) return;

    workspaceSessionStore.getState().setLeaseState("recovering");
  }

  async function enterBlockedState(messageKey: "activeElsewhereMessage"): Promise<void> {
    clearRenewTimer();
    consecutiveRenewFailuresRef.current = 0;
    workspaceSessionStore.getState().setLeaseState("blocked-stale");
    workspaceSessionStore.getState().setErrorMessageKey(messageKey);
    workspaceSessionStore.getState().setLease({
      leaseEpoch: null,
      expiresAt: null
    });
    startBlockedPollLoop();
  }

  function startBlockedPollLoop(): void {
    clearBlockedPollTimer();
    const run = async () => {
      await pollLeaseAvailability();
      if (stateRef.current.leaseState === "blocked-stale" || stateRef.current.leaseState === "recovering") {
        blockedPollTimerRef.current = window.setTimeout(run, nextBlockedPollDelay());
      }
    };
    blockedPollTimerRef.current = window.setTimeout(run, nextBlockedPollDelay());
  }

  function clearBlockedPollTimer(): void {
    if (blockedPollTimerRef.current !== null) {
      window.clearTimeout(blockedPollTimerRef.current);
      blockedPollTimerRef.current = null;
    }
  }

  async function pollLeaseAvailability(): Promise<void> {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    try {
      const status = await apiJson<LeaseStatusResponse>(
        `/workspaces/${workspaceId}/lease/status?sessionId=${encodeURIComponent(sessionId)}`
      );

      if (status.status === "active") {
        workspaceSessionStore.getState().setLease({
          leaseEpoch: status.lease.leaseEpoch,
          displacedSeq: null,
          expiresAt: status.lease.expiresAt
        });
        workspaceSessionStore.getState().setLeaseState("active");
        workspaceSessionStore.getState().setErrorMessageKey(null);
        startRenewLoop();
        return;
      }

      if (status.status === "available") {
        workspaceSessionStore.getState().setLeaseState("recovering");
        clearBlockedPollTimer();
        await acquireAndLoadWorkspace({ mode: "retry" });
        return;
      }

      workspaceSessionStore.getState().setLease({
        displacedSeq: status.displacedSeq,
        expiresAt: status.expiresAt
      });
      if (stateRef.current.leaseState === "recovering") {
        workspaceSessionStore.getState().setLeaseState("blocked-stale");
        workspaceSessionStore.getState().setErrorMessageKey(null);
      }
    } catch {
      workspaceSessionStore.getState().setErrorMessageKey("recoverFailedMessage");
    }
  }

  async function releaseLease(): Promise<void> {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    try {
      await apiRequest(`/workspaces/${workspaceId}/lease/release`, {
        method: "POST",
        body: JSON.stringify({ sessionId })
      });
    } catch {
      // Best-effort release only.
    }
  }

  async function streamMessageCommand(command: Extract<WorkspaceCommand, { type: "message.sendUserMessage" }>): Promise<void> {
    const response = await apiRequest(`/workspaces/${workspaceId}/messages/stream`, {
      method: "POST",
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        leaseEpoch: stateRef.current.lease.leaseEpoch,
        command
      })
    });

    if (response.status === 409) {
      await enterBlockedState("activeElsewhereMessage");
      return;
    }
    if (!response.ok || !response.body) {
      workspaceSessionStore.getState().setErrorMessageKey("streamFailedMessage");
      throw new Error("Failed to stream the assistant reply.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const payload = JSON.parse(trimmed) as
          | { type: "event"; event: Parameters<WorkspaceSessionState["applyEvent"]>[0] }
          | { type: "error"; error: string };
        if (payload.type === "event") {
          workspaceSessionStore.getState().applyEvent(payload.event);
          const snapshot = workspaceSessionStore.getState().snapshot;
          if (snapshot) workspaceSnapshotCache.set(workspaceId, snapshot);
        } else if (payload.error.includes("stale")) {
          await enterBlockedState("activeElsewhereMessage");
          return;
        } else {
          throw new Error(payload.error);
        }
      }

      if (done) break;
    }
  }
}

export function useWorkspaceSession() {
  const value = useContext(WorkspaceSessionContext);
  if (!value) {
    throw new Error("useWorkspaceSession must be used inside WorkspaceSessionProvider.");
  }
  return value;
}

function useWorkspaceSessionState() {
  return useSyncExternalStore(
    workspaceSessionStore.subscribe,
    workspaceSessionStore.getState,
    workspaceSessionStore.getState
  );
}

function getOrCreateSessionId(workspaceId: string): string {
  const storageKey = `${sessionStorageKeyPrefix}:${workspaceId}`;
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

function nextBlockedPollDelay(): number {
  return stalePollMinMs + Math.floor(Math.random() * stalePollJitterMs);
}

function isLeaseStaleError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes("stale");
}
