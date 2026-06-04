"use client";

import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiJson } from "../../api";
import { useLocale } from "../../locale/LocaleProvider";
import { interpolate } from "../../messages";
import { usePageTransitionNavigation } from "./usePageTransitionNavigation";
import { AppearanceMenu } from "./AppearanceMenu";
import { LanguageMenu } from "./LanguageMenu";
import { getLastCanvasPath, rememberLastCanvasPath } from "./lastCanvasPath";
import { ConfirmDialog, FloatingCircleButton, InquaraBrandIcon, PopupMenu, PopupMenuItem } from "../ui";

type CurrentUser = {
  email: string;
  name: string | null;
  role: string;
};

type AppTopBarProps = {
  isCanvasSurface?: boolean;
  onCanvasLogoClick?: () => void;
  onNewCanvasRequest?: () => void;
};

export function AppTopBar({ isCanvasSurface, onCanvasLogoClick, onNewCanvasRequest }: AppTopBarProps) {
  const { messages } = useLocale();
  const copy = messages.appTopBar;
  const navigation = usePageTransitionNavigation();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const accountMenuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let isMounted = true;
    apiJson<CurrentUser>("/auth/me")
      .then(user => {
        if (isMounted) setCurrentUser(user);
      })
      .catch(() => {
        if (isMounted) setCurrentUser(null);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function logOut() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await apiJson<void>("/auth/logout", { method: "POST" });
      setIsLogoutDialogOpen(false);
      await navigation.replace("/");
      navigation.router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  }

  const userLabel = currentUser?.name || currentUser?.email || messages.common.account;
  const userInitial = useMemo(() => {
    const source = currentUser?.name || currentUser?.email || "";
    return source.trim().slice(0, 1).toUpperCase() || "A";
  }, [currentUser]);
  const isAdmin = currentUser?.role === "admin";
  const isAdminRoute = pathname.startsWith("/admin");
  const shouldShowAdminMenuDestination = isAdminRoute || isAdmin;
  const isNewCanvasRoute = pathname === "/canvases/new";
  const isCanvasRoute = isCanvasSurface ?? (pathname.startsWith("/canvases/") && !isNewCanvasRoute);

  useEffect(() => {
    rememberLastCanvasPath();
  }, [pathname]);

  async function handleBrandClick() {
    if (isCanvasRoute) {
      onCanvasLogoClick?.();
      return;
    }
    if (onNewCanvasRequest) {
      onNewCanvasRequest();
      return;
    }
    await navigation.push(getLastCanvasPath(), { skipTransition: true });
  }

  async function openAdminMenuDestination() {
    setIsAccountMenuOpen(false);
    if (isAdminRoute) {
      if (onNewCanvasRequest) {
        onNewCanvasRequest();
        return;
      }
      await navigation.push(getLastCanvasPath(), { skipTransition: true });
      return;
    }

    await navigation.push("/admin", { skipTransition: true });
  }

  return (
    <>
      <button
        type="button"
        className="app-top-brand"
        aria-label={isCanvasRoute ? copy.resetCanvasView : copy.backToCanvas}
        title={isCanvasRoute ? copy.resetView : copy.backToCanvas}
        onClick={handleBrandClick}
      >
        <InquaraBrandIcon className="app-top-brand-mark" />
        <span className="app-top-brand-name">
          Inquara
          <span className="app-top-brand-badge">{copy.alpha}</span>
        </span>
      </button>
      <div className="app-top-account">
        <AppearanceMenu />
        <LanguageMenu />
        <FloatingCircleButton
          ref={accountMenuTriggerRef}
          className="app-top-account-button"
          size="md"
          aria-label={interpolate(copy.accountAria, { user: userLabel })}
          aria-expanded={isAccountMenuOpen}
          aria-haspopup="menu"
          title={userLabel}
          onClick={() => setIsAccountMenuOpen(value => !value)}
        >
          <span>{userInitial}</span>
        </FloatingCircleButton>
        <PopupMenu
          className="app-top-account-menu"
          aria-label={copy.accountMenu}
          ignoreRef={accountMenuTriggerRef}
          isOpen={isAccountMenuOpen}
          onClose={() => setIsAccountMenuOpen(false)}
          placement="bottom-end"
        >
          {shouldShowAdminMenuDestination ? (
            <PopupMenuItem
              onClick={() => {
                void openAdminMenuDestination();
              }}
            >
              {isAdminRoute ? copy.backToCanvas : copy.admin}
            </PopupMenuItem>
          ) : null}
          <PopupMenuItem
            tone="danger"
            onClick={() => {
              setIsAccountMenuOpen(false);
              setIsLogoutDialogOpen(true);
            }}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? copy.loggingOut : copy.logOut}
          </PopupMenuItem>
        </PopupMenu>
      </div>
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        title={copy.logOutConfirm}
        description={copy.logOutDescription}
        confirmLabel={isLoggingOut ? copy.loggingOut : copy.logOut}
        confirmTone="danger"
        isConfirming={isLoggingOut}
        onCancel={() => setIsLogoutDialogOpen(false)}
        onConfirm={logOut}
      />
    </>
  );
}
