"use client";

import type { MouseEvent } from "react";

type NavigateOptions = {
  scroll?: boolean;
};

export type PageTransitionRouter = {
  push(href: string, options?: NavigateOptions): void;
  replace(href: string, options?: NavigateOptions): void;
};

type PageTransitionUpdate = () => void | Promise<void>;

type PageTransitionRunOptions = {
  document?: Document;
  window?: Window;
};

export type PageTransitionNavigateOptions = PageTransitionRunOptions & {
  beforeNavigate?: () => void | Promise<void>;
  replace?: boolean;
  scroll?: boolean;
};

type ViewTransitionLike = {
  finished?: Promise<unknown>;
  ready?: Promise<unknown>;
  updateCallbackDone?: Promise<unknown>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: PageTransitionUpdate) => ViewTransitionLike | undefined;
};

function getDocument(): ViewTransitionDocument | null {
  if (typeof document === "undefined") {
    return null;
  }

  return document as ViewTransitionDocument;
}

function getWindow(): Window | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window;
}

export function supportsPageTransitions(documentRef: Document | null | undefined = getDocument()): boolean {
  return typeof (documentRef as ViewTransitionDocument | null | undefined)?.startViewTransition === "function";
}

export function prefersReducedPageTransitionMotion(windowRef: Window | null | undefined = getWindow()): boolean {
  return windowRef?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

export function runWithPageTransition(
  update: PageTransitionUpdate,
  options: PageTransitionRunOptions = {}
): boolean {
  const documentRef = (options.document as ViewTransitionDocument | undefined) ?? getDocument();
  const windowRef = options.window ?? getWindow();

  if (!supportsPageTransitions(documentRef) || prefersReducedPageTransitionMotion(windowRef)) {
    void update();
    return false;
  }

  try {
    documentRef?.startViewTransition?.(update);
    return true;
  } catch {
    void update();
    return false;
  }
}

export async function navigateWithPageTransition(
  router: PageTransitionRouter,
  href: string,
  options: PageTransitionNavigateOptions = {}
): Promise<boolean> {
  await options.beforeNavigate?.();
  const navigateOptions = options.scroll === undefined ? undefined : { scroll: options.scroll };

  return runWithPageTransition(() => {
    if (options.replace) {
      router.replace(href, navigateOptions);
      return;
    }

    router.push(href, navigateOptions);
  }, options);
}

export function shouldHandlePageTransitionLinkClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
}

export function isInternalPageTransitionHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export function startHistoryPageTransition(
  documentRef: Document | null | undefined = getDocument(),
  windowRef: Window | null | undefined = getWindow()
): boolean {
  const nextDocument = documentRef as ViewTransitionDocument | null | undefined;

  if (!supportsPageTransitions(nextDocument) || prefersReducedPageTransitionMotion(windowRef)) {
    return false;
  }

  try {
    nextDocument?.startViewTransition?.(
      () =>
        new Promise<void>(resolve => {
          windowRef?.requestAnimationFrame(() => resolve());
        })
    );
    return true;
  } catch {
    return false;
  }
}
