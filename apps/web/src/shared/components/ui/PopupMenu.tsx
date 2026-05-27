"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";

type PopupMenuProps = {
  "aria-label": string;
  children: ReactNode;
  className?: string;
  ignoreRef?: RefObject<HTMLElement | null>;
  onClose(): void;
  placement?: "bottom-start" | "bottom-end";
  style?: CSSProperties;
};

type PopupMenuItemProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick(): void;
  tone?: "default" | "danger";
};

export function PopupMenu({ "aria-label": ariaLabel, children, className, ignoreRef, onClose, placement = "bottom-start", style }: PopupMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [ignoreRef, onClose]);

  return (
    <div
      ref={menuRef}
      className={["ui-popup-menu", className].filter(Boolean).join(" ")}
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
