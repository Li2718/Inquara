"use client";

import { useSyncExternalStore } from "react";
import type { CanvasDebugSnapshot, DebugPageSnapshot } from "./debugTypes";

type DebugPageOwner = symbol;

type DebugPageState = {
  owner: DebugPageOwner | null;
  snapshot: DebugPageSnapshot;
};

type ClearDebugPageSnapshotOptions = {
  defer?: boolean;
};

let state: DebugPageState = {
  owner: null,
  snapshot: { page: "global" }
};
const serverSnapshot = { page: "global" } satisfies DebugPageSnapshot;
const listeners = new Set<() => void>();

export function setDebugPageSnapshot(nextSnapshot: CanvasDebugSnapshot, owner: DebugPageOwner) {
  state = {
    owner,
    snapshot: nextSnapshot
  };
  emit();
}

export function clearDebugPageSnapshot(
  canvasId: string,
  owner: DebugPageOwner,
  options: ClearDebugPageSnapshotOptions = {}
) {
  if (options.defer) {
    queueMicrotask(() => {
      clearDebugPageSnapshot(canvasId, owner);
    });
    return;
  }

  if (state.snapshot.page === "canvas" && state.snapshot.canvasId === canvasId && state.owner === owner) {
    state = {
      owner: null,
      snapshot: { page: "global" }
    };
    emit();
  }
}

export function useDebugPageSnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function readDebugPageSnapshotForTest() {
  return state.snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state.snapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

function emit() {
  for (const listener of listeners) listener();
}
