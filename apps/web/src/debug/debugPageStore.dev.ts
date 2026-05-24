"use client";

import { useSyncExternalStore } from "react";
import type { CanvasDebugSnapshot, DebugPageSnapshot } from "./debugTypes";

let snapshot: DebugPageSnapshot = { page: "global" };
const serverSnapshot = { page: "global" } satisfies DebugPageSnapshot;
const listeners = new Set<() => void>();

export function setDebugPageSnapshot(nextSnapshot: CanvasDebugSnapshot) {
  snapshot = nextSnapshot;
  emit();
}

export function clearDebugPageSnapshot(workspaceId: string) {
  if (snapshot.page === "canvas" && snapshot.workspaceId === workspaceId) {
    snapshot = { page: "global" };
    emit();
  }
}

export function useDebugPageSnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

function emit() {
  for (const listener of listeners) listener();
}
