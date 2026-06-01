"use client";

import { useEffect, useRef } from "react";
import type { DebugCanvasSourceProps } from "./debugTypes";
import { clearDebugPageSnapshot, setDebugPageSnapshot } from "./debugPageStore.dev";

export function DebugCanvasSource(props: DebugCanvasSourceProps) {
  const ownerRef = useRef(Symbol("debug-canvas-source"));

  useEffect(() => {
    setDebugPageSnapshot(props, ownerRef.current);
  }, [props.connectionStatus, props.pendingClientMutationCount, props.snapshot, props.workspaceId]);

  useEffect(
    () => () => {
      clearDebugPageSnapshot(props.workspaceId, ownerRef.current, { defer: true });
    },
    [props.workspaceId]
  );

  return null;
}
