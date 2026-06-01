"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

const CONFIRM_DIALOG_EXIT_MS = 140;

type ConfirmDialogProps = {
  cancelLabel?: string;
  children?: ReactNode;
  confirmLabel: string;
  confirmTone?: "primary" | "danger";
  description?: ReactNode;
  isConfirming?: boolean;
  isOpen: boolean;
  onCancel(): void;
  onConfirm(): void;
  title: string;
};

type DialogContentSnapshot = {
  body: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  isConfirming: boolean;
  confirmTone: "primary" | "danger";
  title: string;
};

export function ConfirmDialog({
  cancelLabel = "Cancel",
  children,
  confirmLabel,
  confirmTone = "primary",
  description,
  isConfirming = false,
  isOpen,
  onCancel,
  onConfirm,
  title
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [isPresent, setIsPresent] = useState(isOpen);
  const [motionState, setMotionState] = useState<"open" | "closing">(isOpen ? "open" : "closing");
  const [contentSnapshot, setContentSnapshot] = useState<DialogContentSnapshot>(() => ({
    body: children ?? description,
    cancelLabel,
    confirmLabel,
    isConfirming,
    confirmTone,
    title
  }));

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setContentSnapshot({
        body: children ?? description,
        cancelLabel,
        confirmLabel,
        isConfirming,
        confirmTone,
        title
      });
      setIsPresent(true);
      setMotionState("open");
      return;
    }

    if (!isPresent) return;
    setMotionState("closing");
    const timeout = window.setTimeout(() => setIsPresent(false), CONFIRM_DIALOG_EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [cancelLabel, children, confirmLabel, confirmTone, description, isConfirming, isOpen, isPresent, title]);

  useEffect(() => {
    if (!isOpen) return;

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isConfirming) onCancel();
    }

    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [isConfirming, isOpen, onCancel]);

  if (!isPresent || !portalRoot) return null;

  const displayedMotionState = isOpen ? motionState : "closing";
  const shouldUseSnapshot = displayedMotionState === "closing";
  const body = shouldUseSnapshot ? contentSnapshot.body : children ?? description;
  const displayedCancelLabel = shouldUseSnapshot ? contentSnapshot.cancelLabel : cancelLabel;
  const displayedConfirmLabel = shouldUseSnapshot ? contentSnapshot.confirmLabel : confirmLabel;
  const displayedConfirmTone = shouldUseSnapshot ? contentSnapshot.confirmTone : confirmTone;
  const displayedIsConfirming = shouldUseSnapshot ? contentSnapshot.isConfirming : isConfirming;
  const displayedTitle = shouldUseSnapshot ? contentSnapshot.title : title;
  const confirmVariant = displayedConfirmTone === "danger" ? "danger" : "primary";

  return createPortal(
    <div
      className="ui-confirm-dialog-backdrop nodrag nowheel"
      data-state={displayedMotionState}
      role="presentation"
      onPointerDown={event => {
        if (displayedMotionState === "closing") return;
        if (event.target === event.currentTarget && !isConfirming) onCancel();
      }}
    >
      <div
        className="ui-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={body ? descriptionId : undefined}
      >
        <h2 id={titleId}>{displayedTitle}</h2>
        {body ? <div id={descriptionId} className="ui-confirm-dialog-body">{body}</div> : null}
        <div className="ui-confirm-dialog-actions">
          <Button variant="secondary" onClick={onCancel} disabled={displayedIsConfirming}>
            {displayedCancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={displayedIsConfirming}>
            {displayedConfirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    portalRoot
  );
}
