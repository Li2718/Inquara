"use client";

import type { WorkspaceCommand, WorkspaceSnapshot } from "@inquara/domain";
import { useRouter } from "next/navigation";
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { apiJson } from "../../shared/api";
import { createCommands } from "../commands/createCommands";
import { createRealtimeClient, type RealtimeClient } from "../realtime/client";
import { workspaceSessionStore, type WorkspaceSessionState } from "./store";

type WorkspaceSessionContextValue = {
  state: WorkspaceSessionState;
  commands: ReturnType<typeof createCommands>;
  sendCommand(command: WorkspaceCommand): void;
};

const WorkspaceSessionContext = createContext<WorkspaceSessionContextValue | null>(null);

const workspaceSnapshotCache = new Map<string, WorkspaceSnapshot>();

export function WorkspaceSessionProvider({
  workspaceId,
  children
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  const realtimeRef = useRef<RealtimeClient | null>(null);
  const router = useRouter();
  const state = useWorkspaceSessionState();
  const commands = useMemo(() => createCommands(workspaceId), [workspaceId]);

  useEffect(() => {
    let cancelled = false;
    const cachedSnapshot = workspaceSnapshotCache.get(workspaceId);
    if (cachedSnapshot) {
      workspaceSessionStore.getState().setSnapshot(cachedSnapshot);
    }
    workspaceSessionStore.getState().setConnectionStatus("connecting");

    async function start() {
      const snapshot = await apiJson<WorkspaceSnapshot>(`/workspaces/${workspaceId}/snapshot`);
      if (cancelled) return;
      workspaceSnapshotCache.set(workspaceId, snapshot);
      workspaceSessionStore.getState().setSnapshot(snapshot);
      realtimeRef.current = createRealtimeClient({
        workspaceId,
        onEvent: event => {
          workspaceSessionStore.getState().applyEvent(event);
          const nextSnapshot = workspaceSessionStore.getState().snapshot;
          if (nextSnapshot) workspaceSnapshotCache.set(workspaceId, nextSnapshot);
        },
        onStatusChange: status => workspaceSessionStore.getState().setConnectionStatus(status),
        onError: () => workspaceSessionStore.getState().setConnectionStatus("disconnected")
      });
    }

    void start().catch(() => {
      if (cancelled) return;
      workspaceSessionStore.getState().setConnectionStatus("disconnected");
      workspaceSessionStore.getState().setSnapshot(null);
      router.replace("/");
    });

    return () => {
      cancelled = true;
      realtimeRef.current?.close();
      realtimeRef.current = null;
    };
  }, [router, workspaceId]);

  const value = useMemo<WorkspaceSessionContextValue>(
    () => ({
      state,
      commands,
      sendCommand(command) {
        workspaceSessionStore.getState().markPending(command.clientMutationId);
        realtimeRef.current?.sendCommand(command);
      }
    }),
    [commands, state]
  );

  return <WorkspaceSessionContext.Provider value={value}>{children}</WorkspaceSessionContext.Provider>;
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
