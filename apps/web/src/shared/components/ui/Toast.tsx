"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ToastTone = "danger" | "success";

type ToastProps = {
  message: string | null;
  onDismiss(): void;
  tone?: ToastTone;
};

export function Toast({ message, onDismiss, tone = "danger" }: ToastProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(onDismiss, 2600);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message || !portalRoot) return null;

  return createPortal(
    <div className="ui-toast" data-tone={tone} role="status" aria-live="polite">
      {message}
    </div>,
    portalRoot
  );
}
