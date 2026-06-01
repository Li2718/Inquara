"use client";

import type { PointerEvent } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "../../shared/locale/LocaleProvider";

type SelectionFollowupToolbarProps = {
  x: number;
  y: number;
  onFollowUp(): void;
};

export function SelectionFollowupToolbar({ x, y, onFollowUp }: SelectionFollowupToolbarProps) {
  const { messages } = useLocale();

  function keepSelection(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  return createPortal(
    <div className="selection-toolbar" style={{ left: x, top: y }} onPointerDown={keepSelection}>
      <button type="button" onClick={onFollowUp}>
        {messages.canvas.askFollowUp}
      </button>
    </div>,
    document.body
  );
}
