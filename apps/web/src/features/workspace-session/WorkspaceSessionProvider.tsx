"use client";

import type { WorkspaceCommand, WorkspaceSnapshot } from "@inquara/domain";
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

export function WorkspaceSessionProvider({
  workspaceId,
  children
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  const realtimeRef = useRef<RealtimeClient | null>(null);
  const state = useWorkspaceSessionState();
  const commands = useMemo(() => createCommands(workspaceId), [workspaceId]);

  useEffect(() => {
    let cancelled = false;
    workspaceSessionStore.getState().setConnectionStatus("connecting");

    async function start() {
      const snapshot = await apiJson<WorkspaceSnapshot>(`/workspaces/${workspaceId}/snapshot`);
      if (cancelled) return;
      workspaceSessionStore.getState().setSnapshot(snapshot);
      realtimeRef.current = createRealtimeClient({
        workspaceId,
        onEvent: event => workspaceSessionStore.getState().applyEvent(event),
        onStatusChange: status => workspaceSessionStore.getState().setConnectionStatus(status),
        onError: () => workspaceSessionStore.getState().setConnectionStatus("disconnected")
      });
    }

    void start().catch(() => {
      if (!cancelled) workspaceSessionStore.getState().setConnectionStatus("disconnected");
    });

    return () => {
      cancelled = true;
      realtimeRef.current?.close();
      realtimeRef.current = null;
    };
  }, [workspaceId]);

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
