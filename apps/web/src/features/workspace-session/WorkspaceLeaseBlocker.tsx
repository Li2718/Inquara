"use client";

import React from "react";
import { Button } from "../../shared/components/ui";

export function WorkspaceLeaseBlocker({
  isVisible,
  isRecovering,
  message,
  onRetry
}: {
  isVisible: boolean;
  isRecovering: boolean;
  message: string | null;
  onRetry(): void;
}) {
  if (!isVisible) return null;

  return (
    <div className="workspace-lease-blocker" role="alert" aria-live="assertive">
      <div className="workspace-lease-blocker-card">
        <p className="workspace-lease-blocker-eyebrow">{isRecovering ? "Recovering workspace" : "Workspace blocked"}</p>
        <h2>{isRecovering ? "Waiting to restore editing" : "This workspace is active in another client"}</h2>
        <p>
          {message ??
            "The content shown here may be out of date. Editing stays disabled until this client reconnects and becomes active again."}
        </p>
        <div className="workspace-lease-blocker-actions">
          <Button type="button" onClick={onRetry}>
            Take over here
          </Button>
        </div>
      </div>
    </div>
  );
}
