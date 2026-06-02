"use client";

import React from "react";
import { Button } from "../../shared/components/ui";
import { useLocale } from "../../shared/locale/LocaleProvider";
import type { CanvasSessionMessageKey } from "./store";

export function CanvasLeaseBlocker({
  isVisible,
  isRecovering,
  messageKey,
  onRetry
}: {
  isVisible: boolean;
  isRecovering: boolean;
  messageKey: CanvasSessionMessageKey | null;
  onRetry(): void;
}) {
  const { messages } = useLocale();
  const copy = messages.lease;
  if (!isVisible) return null;

  return (
    <div
      className={["canvas-lease-blocker", shouldBlockCanvasInteraction({ isRecovering }) ? null : "canvas-lease-blocker-banner"]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="canvas-lease-blocker-card">
        <p className="canvas-lease-blocker-eyebrow">{isRecovering ? copy.recoveringEyebrow : copy.blockedEyebrow}</p>
        <h2>{isRecovering ? copy.recoveringTitle : copy.blockedTitle}</h2>
        <p>{messageKey ? copy[messageKey] : copy.defaultMessage}</p>
        {shouldShowLeaseAction() ? (
          <div className="canvas-lease-blocker-actions">
            <Button type="button" onClick={onRetry}>
              {copy[getCanvasLeaseActionLabelKey({ isRecovering })]}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function shouldShowLeaseAction(): boolean {
  return true;
}

export function getCanvasLeaseActionLabelKey({ isRecovering }: { isRecovering: boolean }): "reconnect" | "takeOver" {
  return isRecovering ? "reconnect" : "takeOver";
}

export function shouldBlockCanvasInteraction({ isRecovering }: { isRecovering: boolean }): boolean {
  return !isRecovering;
}
