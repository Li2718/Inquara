"use client";

import type { DebugRootProps } from "./debugTypes";
import { DebugRootDev } from "./DebugRoot.dev";

export function DebugRoot(props: DebugRootProps) {
  return <DebugRootDev {...props} />;
}
