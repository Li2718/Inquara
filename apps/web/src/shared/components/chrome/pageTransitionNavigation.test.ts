import { describe, expect, it, vi } from "vitest";
import {
  navigateWithPageTransition,
  prefersReducedPageTransitionMotion,
  runWithPageTransition,
  startHistoryPageTransition,
  supportsPageTransitions
} from "./pageTransitionNavigation";

describe("page transition navigation", () => {
  it("detects startViewTransition support", () => {
    expect(supportsPageTransitions({ startViewTransition: () => undefined } as unknown as Document)).toBe(true);
    expect(supportsPageTransitions({} as Document)).toBe(false);
  });

  it("detects reduced-motion preference", () => {
    expect(
      prefersReducedPageTransitionMotion({
        matchMedia: vi.fn(() => ({ matches: true }))
      } as unknown as Window)
    ).toBe(true);
  });

  it("wraps navigation in startViewTransition when supported", async () => {
    const push = vi.fn();
    const startViewTransition = vi.fn(update => {
      void update();
      return undefined;
    });

    const wrapped = await navigateWithPageTransition(
      { push, replace: vi.fn() },
      "/admin/codes",
      {
        document: { startViewTransition } as unknown as Document,
        window: { matchMedia: vi.fn(() => ({ matches: false })) } as unknown as Window
      }
    );

    expect(wrapped).toBe(true);
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/admin/codes", undefined);
  });

  it("uses plain navigation when page transition is skipped", async () => {
    const push = vi.fn();
    const startViewTransition = vi.fn(update => {
      void update();
      return undefined;
    });

    const wrapped = await navigateWithPageTransition(
      { push, replace: vi.fn() },
      "/admin",
      {
        document: { startViewTransition } as unknown as Document,
        skipTransition: true,
        window: { matchMedia: vi.fn(() => ({ matches: false })) } as unknown as Window
      }
    );

    expect(wrapped).toBe(false);
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/admin", undefined);
  });

  it("falls back to plain navigation when startViewTransition is unavailable", async () => {
    const replace = vi.fn();

    const wrapped = await navigateWithPageTransition(
      { push: vi.fn(), replace },
      "/canvases/canvas-1",
      {
        replace: true,
        document: {} as Document,
        window: { matchMedia: vi.fn(() => ({ matches: false })) } as unknown as Window
      }
    );

    expect(wrapped).toBe(false);
    expect(replace).toHaveBeenCalledWith("/canvases/canvas-1", undefined);
  });

  it("falls back to plain navigation when reduced motion is requested", () => {
    const update = vi.fn();

    const wrapped = runWithPageTransition(update, {
      document: { startViewTransition: vi.fn() } as unknown as Document,
      window: { matchMedia: vi.fn(() => ({ matches: true })) } as unknown as Window
    });

    expect(wrapped).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("starts a best-effort history transition when supported", () => {
    const requestAnimationFrame = vi.fn(callback => {
      callback(0);
      return 1;
    });
    const startViewTransition = vi.fn(update => {
      void update();
      return undefined;
    });

    const started = startHistoryPageTransition(
      { startViewTransition } as unknown as Document,
      {
        matchMedia: vi.fn(() => ({ matches: false })),
        requestAnimationFrame
      } as unknown as Window
    );

    expect(started).toBe(true);
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it("handles skipped view transition rejections as cancellation", async () => {
    const skippedError = new DOMException("Transition was skipped", "AbortError");
    const readyCatch = vi.fn();
    const finishedCatch = vi.fn();
    const updateCallbackDoneCatch = vi.fn();
    const skippedTransition = {
      ready: { catch: readyCatch },
      finished: { catch: finishedCatch },
      updateCallbackDone: { catch: updateCallbackDoneCatch }
    };
    const startViewTransition = vi.fn(update => {
      void update();
      return skippedTransition as unknown as ViewTransition;
    });

    const wrapped = runWithPageTransition(vi.fn(), {
      document: { startViewTransition } as unknown as Document,
      window: { matchMedia: vi.fn(() => ({ matches: false })) } as unknown as Window
    });

    expect(wrapped).toBe(true);
    expect(readyCatch).toHaveBeenCalledTimes(1);
    expect(finishedCatch).toHaveBeenCalledTimes(1);
    expect(updateCallbackDoneCatch).toHaveBeenCalledTimes(1);
    expect(readyCatch.mock.calls[0]?.[0](skippedError)).toBeUndefined();
  });
});
