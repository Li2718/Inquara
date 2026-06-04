"use client";

import type { CanvasCommand, CanvasSnapshot } from "@inquara/domain";
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { apiJson, apiRequest } from "../../shared/api";
import { usePageTransitionNavigation } from "../../shared/components/chrome";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { createCommands } from "../commands/createCommands";
import { cancelPendingCanvasLeaseRelease, scheduleCanvasLeaseRelease } from "./leaseReleaseScheduler";
import { shouldEnterLeaseRecovery } from "./renewFailurePolicy";
import { canvasSessionStore, type CanvasSessionState } from "./store";

type CanvasSessionContextValue = {
  state: CanvasSessionState;
  commands: ReturnType<typeof createCommands>;
  refreshSnapshot(): Promise<void>;
  retryLease(): Promise<void>;
  sendCommand(command: CanvasCommand): Promise<void>;
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

const CanvasSessionContext = createContext<CanvasSessionContextValue | null>(null);
const canvasSnapshotCache = new Map<string, CanvasSnapshot>();
const renewIntervalMs = 5_000;
const streamingRefreshIntervalMs = 700;
const stalePollMinMs = 8_000;
const stalePollJitterMs = 2_000;
const leaseReleaseDelayMs = 250;
const sessionStorageKeyPrefix = "inquara.canvas-session";

export function CanvasSessionProvider({
  canvasId,
  children,
  initialStarterMessage,
  onInitialStarterMessageSent
}: {
  canvasId: string;
  children: ReactNode;
  initialStarterMessage?: string | null;
  onInitialStarterMessageSent?(canvasId: string): void;
}) {
  const navigation = usePageTransitionNavigation();
  const { messages } = useLocale();
  const state = useCanvasSessionState();
  const sessionIdRef = useRef<string | null>(null);
  const renewTimerRef = useRef<number | null>(null);
  const consecutiveRenewFailuresRef = useRef(0);
  const blockedPollTimerRef = useRef<number | null>(null);
  const sentInitialStarterCanvasRef = useRef<string | null>(null);
  const releasedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const commands = useMemo(
    () =>
      createCommands(canvasId, {
        newChatTitle: messages.canvas.newChat
      }),
    [messages.canvas.newChat, canvasId]
  );

  useEffect(() => {
    cancelPendingCanvasLeaseRelease(canvasId);
    sessionIdRef.current = getOrCreateSessionId(canvasId);
    releasedRef.current = false;
    consecutiveRenewFailuresRef.current = 0;
    const cachedSnapshot = canvasSnapshotCache.get(canvasId);
    if (cachedSnapshot) {
      canvasSessionStore.getState().setSnapshot(cachedSnapshot);
    }
    canvasSessionStore.getState().setLease({
      sessionId: sessionIdRef.current,
      leaseEpoch: null,
      displacedSeq: null,
      expiresAt: null
    });
    canvasSessionStore.getState().setLeaseState("acquiring");
    canvasSessionStore.getState().setErrorMessageKey(null);

    void acquireAndLoadCanvas({ mode: "initial" });

    return () => {
      clearRenewTimer();
      clearBlockedPollTimer();
      if (!releasedRef.current) {
        releasedRef.current = true;
        scheduleCanvasLeaseRelease(canvasId, releaseLease, leaseReleaseDelayMs);
      }
    };
  }, [navigation, canvasId]);

  useEffect(() => {
    if (state.leaseState !== "active") return;
    if (!state.snapshot || state.snapshot.canvas.id !== canvasId) return;
    if (state.pendingClientMutationIds.length > 0) return;
    if (!state.snapshot.messages.some(message => message.status === "streaming")) return;
    const timeout = window.setTimeout(() => {
      void refreshCanvasSnapshot();
    }, streamingRefreshIntervalMs);
    return () => window.clearTimeout(timeout);
  }, [state.leaseState, state.pendingClientMutationIds.length, state.snapshot, canvasId]);

  const value = useMemo<CanvasSessionContextValue>(
    () => ({
      state,
      commands,
      async refreshSnapshot() {
        await refreshCanvasSnapshot();
      },
      async retryLease() {
        await retryLeaseNow();
      },
      async sendCommand(command) {
        stateRef.current = canvasSessionStore.getState();
        if (stateRef.current.leaseState !== "active") return;
        canvasSessionStore.getState().applyOptimisticCommand(command);
        try {
          if (command.type === "message.sendUserMessage") {
            await streamMessageCommand(command);
            await refreshCanvasSnapshot();
          } else {
            const response = await apiJson<{ events: unknown[] }>(`/canvases/${canvasId}/commands`, {
              method: "POST",
              body: JSON.stringify({
                sessionId: sessionIdRef.current,
                leaseEpoch: stateRef.current.lease.leaseEpoch,
                command
              })
            });
            const snapshot = canvasSessionStore.getState().snapshot;
            if (snapshot) {
              canvasSnapshotCache.set(canvasId, snapshot);
            }
            if (!response.events.length) {
              canvasSessionStore.getState().clearPending(command.clientMutationId);
            }
          }
        } catch (error) {
          if (isLeaseStaleError(error)) {
            await enterBlockedState("activeElsewhereMessage");
            return;
          }
          canvasSessionStore.getState().setErrorMessageKey("syncFailedMessage");
          canvasSessionStore.getState().clearPending(command.clientMutationId);
        }
      }
    }),
    [commands, state, canvasId]
  );

  return <CanvasSessionContext.Provider value={value}>{children}</CanvasSessionContext.Provider>;

  async function acquireAndLoadCanvas({ mode }: { mode: "initial" | "retry" }): Promise<void> {
    try {
      const sessionId = sessionIdRef.current;
      if (!sessionId) throw new Error("Canvas session is unavailable.");

      const acquire = await apiJson<LeaseAcquireResponse>(`/canvases/${canvasId}/lease/acquire`, {
        method: "POST",
        body: JSON.stringify({ sessionId })
      });

      if (acquire.status === "active") {
        canvasSessionStore.getState().setLease({
          leaseEpoch: acquire.lease.leaseEpoch,
          displacedSeq: null,
          expiresAt: acquire.lease.expiresAt
        });
        const snapshot = await refreshCanvasSnapshot();
        canvasSessionStore.getState().setLeaseState("active");
        canvasSessionStore.getState().setErrorMessageKey(null);
        sendInitialStarterMessage(snapshot);
        startRenewLoop();
        return;
      }

      canvasSessionStore.getState().setLease({
        displacedSeq: acquire.displacedSeq,
        expiresAt: acquire.expiresAt
      });
      canvasSessionStore.getState().setLeaseState("blocked-stale");
      startBlockedPollLoop();
    } catch {
      if (mode === "initial") {
        canvasSessionStore.getState().setLeaseState("blocked-stale");
        canvasSessionStore.getState().setErrorMessageKey("acquireFailedMessage");
        canvasSessionStore.getState().setSnapshot(null);
        void navigation.replace("/");
        return;
      }

      canvasSessionStore.getState().setErrorMessageKey("recoverFailedMessage");
    }
  }

  async function retryLeaseNow(): Promise<void> {
    consecutiveRenewFailuresRef.current = 0;
    clearBlockedPollTimer();
    if (stateRef.current.leaseState === "recovering") {
      await pollLeaseAvailability();
    } else {
      await acquireAndLoadCanvas({ mode: "retry" });
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
      response = await apiRequest(`/canvases/${canvasId}/lease/renew`, {
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
    canvasSessionStore.getState().setLease({
      leaseEpoch: renewed.lease.leaseEpoch,
      expiresAt: renewed.lease.expiresAt
    });
    canvasSessionStore.getState().setLeaseState("active");
    canvasSessionStore.getState().setErrorMessageKey(null);
  }

  function handleRenewFailure(): void {
    consecutiveRenewFailuresRef.current += 1;
    canvasSessionStore.getState().setErrorMessageKey("unstableNetworkMessage");
    if (!shouldEnterLeaseRecovery(consecutiveRenewFailuresRef.current)) return;

    canvasSessionStore.getState().setLeaseState("recovering");
  }

  async function enterBlockedState(messageKey: "activeElsewhereMessage"): Promise<void> {
    clearRenewTimer();
    consecutiveRenewFailuresRef.current = 0;
    canvasSessionStore.getState().setLeaseState("blocked-stale");
    canvasSessionStore.getState().setErrorMessageKey(messageKey);
    canvasSessionStore.getState().setLease({
      leaseEpoch: null,
      expiresAt: null
    });
    startBlockedPollLoop();
  }

  async function refreshCanvasSnapshot(): Promise<CanvasSnapshot> {
    const snapshot = await apiJson<CanvasSnapshot>(`/canvases/${canvasId}/snapshot`);
    canvasSnapshotCache.set(canvasId, snapshot);
    canvasSessionStore.getState().setSnapshot(snapshot);
    return snapshot;
  }

  function sendInitialStarterMessage(snapshot: CanvasSnapshot): void {
    const content = initialStarterMessage?.trim();
    if (!content) return;
    if (sentInitialStarterCanvasRef.current === canvasId) return;
    if (snapshot.canvas.id !== canvasId) return;
    const rootNode = snapshot.nodes.find(node => !node.parentNodeId && !node.hiddenAt && !node.deletedAt);
    if (!rootNode) return;
    if (
      snapshot.messages.some(
        message =>
          message.canvasId === canvasId &&
          message.nodeId === rootNode.id &&
          message.role === "user" &&
          message.status === "complete" &&
          message.content === content
      )
    ) {
      sentInitialStarterCanvasRef.current = canvasId;
      onInitialStarterMessageSent?.(canvasId);
      return;
    }

    sentInitialStarterCanvasRef.current = canvasId;
    onInitialStarterMessageSent?.(canvasId);
    void value.sendCommand(commands.sendUserMessage(rootNode.id, content));
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
        `/canvases/${canvasId}/lease/status?sessionId=${encodeURIComponent(sessionId)}`
      );

      if (status.status === "active") {
        canvasSessionStore.getState().setLease({
          leaseEpoch: status.lease.leaseEpoch,
          displacedSeq: null,
          expiresAt: status.lease.expiresAt
        });
        canvasSessionStore.getState().setLeaseState("active");
        canvasSessionStore.getState().setErrorMessageKey(null);
        startRenewLoop();
        return;
      }

      if (status.status === "available") {
        canvasSessionStore.getState().setLeaseState("recovering");
        clearBlockedPollTimer();
        await acquireAndLoadCanvas({ mode: "retry" });
        return;
      }

      canvasSessionStore.getState().setLease({
        displacedSeq: status.displacedSeq,
        expiresAt: status.expiresAt
      });
      if (stateRef.current.leaseState === "recovering") {
        canvasSessionStore.getState().setLeaseState("blocked-stale");
        canvasSessionStore.getState().setErrorMessageKey(null);
      }
    } catch {
      canvasSessionStore.getState().setErrorMessageKey("recoverFailedMessage");
    }
  }

  async function releaseLease(): Promise<void> {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    try {
      await apiRequest(`/canvases/${canvasId}/lease/release`, {
        method: "POST",
        body: JSON.stringify({ sessionId })
      });
    } catch {
      // Best-effort release only.
    }
  }

  async function streamMessageCommand(command: Extract<CanvasCommand, { type: "message.sendUserMessage" }>): Promise<void> {
    const response = await apiRequest(`/canvases/${canvasId}/messages/stream`, {
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
      canvasSessionStore.getState().setErrorMessageKey("streamFailedMessage");
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
          | { type: "event"; event: Parameters<CanvasSessionState["applyEvent"]>[0] }
          | { type: "error"; error: string };
        if (payload.type === "event") {
          canvasSessionStore.getState().applyEvent(payload.event);
          const snapshot = canvasSessionStore.getState().snapshot;
          if (snapshot) canvasSnapshotCache.set(canvasId, snapshot);
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

export function useCanvasSession() {
  const value = useContext(CanvasSessionContext);
  if (!value) {
    throw new Error("useCanvasSession must be used inside CanvasSessionProvider.");
  }
  return value;
}

function useCanvasSessionState() {
  return useSyncExternalStore(
    canvasSessionStore.subscribe,
    canvasSessionStore.getState,
    canvasSessionStore.getState
  );
}

function getOrCreateSessionId(canvasId: string): string {
  const storageKey = `${sessionStorageKeyPrefix}:${canvasId}`;
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
