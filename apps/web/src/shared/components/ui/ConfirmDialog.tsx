"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

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

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

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

  if (!isOpen || !portalRoot) return null;

  const body = children ?? description;
  const confirmVariant = confirmTone === "danger" ? "danger" : "primary";

  return createPortal(
    <div
      className="ui-confirm-dialog-backdrop nodrag nowheel"
      role="presentation"
      onPointerDown={event => {
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
        <h2 id={titleId}>{title}</h2>
        {body ? <div id={descriptionId} className="ui-confirm-dialog-body">{body}</div> : null}
        <div className="ui-confirm-dialog-actions">
          <Button variant="secondary" onClick={onCancel} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={isConfirming}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    portalRoot
  );
}
