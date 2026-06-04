"use client";

import { useRef, useState } from "react";
import type { AppearancePreference } from "../../appearance";
import { useAppearance } from "../../appearance/AppearanceProvider";
import { useLocale } from "../../locale/LocaleProvider";
import { FloatingCircleButton, MoonIcon, PopupMenu, PopupMenuItem, SunIcon, SystemAppearanceIcon } from "../ui";

export function AppearanceMenu() {
  const { messages } = useLocale();
  const { mode, preference, setPreference } = useAppearance();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ActiveIcon = mode === "dark" ? MoonIcon : SunIcon;
  const options: Array<{
    id: AppearancePreference;
    label: string;
  }> = [
    { id: "system", label: messages.appearance.system },
    { id: "light", label: messages.appearance.light },
    { id: "dark", label: messages.appearance.dark }
  ];

  return (
    <div className="app-top-appearance">
      <FloatingCircleButton
        ref={triggerRef}
        className="app-top-appearance-button"
        size="sm"
        aria-label={messages.appearance.ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={messages.appearance.ariaLabel}
        onClick={() => setIsOpen(value => !value)}
      >
        <ActiveIcon className="app-top-appearance-icon" />
      </FloatingCircleButton>
      <PopupMenu
        className="app-top-appearance-menu"
        aria-label={messages.appearance.menuLabel}
        ignoreRef={triggerRef}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        placement="bottom-end"
      >
        {options.map(option => {
          const OptionIcon = option.id === "system" ? SystemAppearanceIcon : option.id === "dark" ? MoonIcon : SunIcon;

          return (
            <PopupMenuItem
              key={option.id}
              onClick={() => {
                setIsOpen(false);
                setPreference(option.id);
              }}
              disabled={option.id === preference}
            >
              <span className="app-top-appearance-menu-item">
                <OptionIcon className="app-top-appearance-menu-icon" />
                <span>{option.label}</span>
              </span>
            </PopupMenuItem>
          );
        })}
      </PopupMenu>
    </div>
  );
}
