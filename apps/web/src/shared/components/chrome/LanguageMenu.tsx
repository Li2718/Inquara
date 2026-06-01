"use client";

import { useRef, useState } from "react";
import { LOCALE_OPTIONS } from "../../locale";
import { useLocale } from "../../locale/LocaleProvider";
import { FloatingCircleButton, PopupMenu, PopupMenuItem } from "../ui";

export function LanguageMenu() {
  const { locale, messages, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeLocale = LOCALE_OPTIONS.find(option => option.id === locale) ?? LOCALE_OPTIONS[0]!;

  return (
    <div className="app-top-language">
      <FloatingCircleButton
        ref={triggerRef}
        className="app-top-language-button"
        size="sm"
        aria-label={messages.language.ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={messages.language.ariaLabel}
        onClick={() => setIsOpen(value => !value)}
      >
        <span>{activeLocale.shortLabel}</span>
      </FloatingCircleButton>
      <PopupMenu
        className="app-top-language-menu"
        aria-label={messages.language.menuLabel}
        ignoreRef={triggerRef}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        placement="bottom-end"
      >
        {LOCALE_OPTIONS.map(option => (
          <PopupMenuItem
            key={option.id}
            onClick={() => {
              setIsOpen(false);
              setLocale(option.id);
            }}
            disabled={option.id === locale}
          >
            {option.label}
          </PopupMenuItem>
        ))}
      </PopupMenu>
    </div>
  );
}
