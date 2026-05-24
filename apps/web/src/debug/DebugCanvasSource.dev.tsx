"use client";

import { useEffect } from "react";
import type { DebugCanvasSourceProps } from "./debugTypes";
import { clearDebugPageSnapshot, setDebugPageSnapshot } from "./debugPageStore.dev";

export function DebugCanvasSource(props: DebugCanvasSourceProps) {
  useEffect(() => {
    setDebugPageSnapshot(props);
    return () => clearDebugPageSnapshot(props.workspaceId);
  }, [props]);

  return null;
}
