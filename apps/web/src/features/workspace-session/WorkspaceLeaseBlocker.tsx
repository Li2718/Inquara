"use client";

import React from "react";
import { Button } from "../../shared/components/ui";
import { useLocale } from "../../shared/locale/LocaleProvider";

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
  const { messages } = useLocale();
  const copy = messages.lease;
  if (!isVisible) return null;

  return (
    <div className="workspace-lease-blocker" role="alert" aria-live="assertive">
      <div className="workspace-lease-blocker-card">
        <p className="workspace-lease-blocker-eyebrow">{isRecovering ? copy.recoveringEyebrow : copy.blockedEyebrow}</p>
        <h2>{isRecovering ? copy.recoveringTitle : copy.blockedTitle}</h2>
        <p>
          {message ??
            copy.defaultMessage}
        </p>
        <div className="workspace-lease-blocker-actions">
          <Button type="button" onClick={onRetry}>
            {copy.takeOver}
          </Button>
        </div>
      </div>
    </div>
  );
}
