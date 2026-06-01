"use client";

import type { Workspace } from "@inquara/domain";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiJson } from "../../api";
import { usePageTransitionNavigation } from "./usePageTransitionNavigation";
import { ConfirmDialog, FloatingCircleButton, InquaraBrandIcon, PopupMenu, PopupMenuItem } from "../ui";

type CurrentUser = {
  email: string;
  name: string | null;
  role: string;
};

type AppTopBarProps = {
  onCanvasLogoClick?: () => void;
};

export function AppTopBar({ onCanvasLogoClick }: AppTopBarProps) {
  const navigation = usePageTransitionNavigation();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpeningCanvas, setIsOpeningCanvas] = useState(false);
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

  async function openCanvas() {
    if (isOpeningCanvas) return;
    setIsOpeningCanvas(true);
    try {
      const items = await apiJson<Workspace[]>("/workspaces");
      const workspace =
        items[0] ??
        (await apiJson<Workspace>("/workspaces", {
          method: "POST",
          body: JSON.stringify({ title: "Research canvas" })
        }));
      await navigation.push(`/workspaces/${workspace.id}`);
    } finally {
      setIsOpeningCanvas(false);
    }
  }

  const userLabel = currentUser?.name || currentUser?.email || "Account";
  const userInitial = useMemo(() => {
    const source = currentUser?.name || currentUser?.email || "";
    return source.trim().slice(0, 1).toUpperCase() || "A";
  }, [currentUser]);
  const isAdmin = currentUser?.role === "admin";
  const isAdminRoute = pathname.startsWith("/admin");
  const isCanvasRoute = pathname.startsWith("/workspaces/");

  async function handleBrandClick() {
    if (isCanvasRoute) {
      onCanvasLogoClick?.();
      return;
    }
    await openCanvas();
  }

  return (
    <>
      <button
        type="button"
        className="app-top-brand"
        aria-label={isCanvasRoute ? "Reset canvas view" : "Back to canvas"}
        title={isCanvasRoute ? "Reset view" : "Back to canvas"}
        onClick={handleBrandClick}
      >
        <InquaraBrandIcon className="app-top-brand-mark" />
        <span className="app-top-brand-name">
          Inquara
          <span className="app-top-brand-badge">Alpha</span>
        </span>
      </button>
      <div className="app-top-account">
        <FloatingCircleButton
          ref={accountMenuTriggerRef}
          className="app-top-account-button"
          size="md"
          aria-label={`Account: ${userLabel}`}
          aria-expanded={isAccountMenuOpen}
          aria-haspopup="menu"
          title={userLabel}
          onClick={() => setIsAccountMenuOpen(value => !value)}
        >
          <span>{userInitial}</span>
        </FloatingCircleButton>
        <PopupMenu
          className="app-top-account-menu"
          aria-label="Account menu"
          ignoreRef={accountMenuTriggerRef}
          isOpen={isAccountMenuOpen}
          onClose={() => setIsAccountMenuOpen(false)}
          placement="bottom-end"
        >
          {isAdmin ? (
            <PopupMenuItem
              onClick={async () => {
                setIsAccountMenuOpen(false);
                if (isAdminRoute) {
                  await openCanvas();
                } else {
                  await navigation.push("/admin");
                }
              }}
              disabled={isOpeningCanvas}
            >
              {isAdminRoute ? (isOpeningCanvas ? "Opening canvas..." : "回到画布") : "管理后台"}
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
            {isLoggingOut ? "Logging out..." : "Log out"}
          </PopupMenuItem>
        </PopupMenu>
      </div>
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        title="Log out?"
        description="You will need to sign in again on this device."
        confirmLabel={isLoggingOut ? "Logging out..." : "Log out"}
        confirmTone="danger"
        isConfirming={isLoggingOut}
        onCancel={() => setIsLogoutDialogOpen(false)}
        onConfirm={logOut}
      />
    </>
  );
}
