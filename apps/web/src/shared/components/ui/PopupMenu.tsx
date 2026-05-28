"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

const POPUP_MENU_EXIT_MS = 110;

type PopupMenuProps = {
  "aria-label": string;
  children: ReactNode;
  className?: string;
  ignoreRef?: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose(): void;
  placement?: "bottom-start" | "bottom-end";
  style?: CSSProperties | undefined;
};

type PopupMenuItemProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick(): void;
  tone?: "default" | "danger";
};

export function PopupMenu({ "aria-label": ariaLabel, children, className, ignoreRef, isOpen, onClose, placement = "bottom-start", style }: PopupMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isPresent, setIsPresent] = useState(isOpen);
  const [motionState, setMotionState] = useState<"open" | "closing">(isOpen ? "open" : "closing");

  useEffect(() => {
    if (isOpen) {
      setIsPresent(true);
      setMotionState("open");
      return;
    }

    if (!isPresent) return;
    setMotionState("closing");
    const timeout = window.setTimeout(() => setIsPresent(false), POPUP_MENU_EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [isOpen, isPresent]);

  useEffect(() => {
    if (!isPresent || motionState === "closing") return;

    function closeFromOutside(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (ignoreRef?.current?.contains(target)) return;
      onClose();
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [ignoreRef, isPresent, motionState, onClose]);

  if (!isPresent) return null;

  return (
    <div
      ref={menuRef}
      className={["ui-popup-menu", className].filter(Boolean).join(" ")}
      data-state={motionState}
      data-placement={placement}
      role="menu"
      aria-label={ariaLabel}
      style={style}
    >
      {children}
    </div>
  );
}

export function PopupMenuItem({ children, className, disabled, onClick, tone = "default" }: PopupMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={["ui-popup-menu-item", className].filter(Boolean).join(" ")}
      data-tone={tone}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
