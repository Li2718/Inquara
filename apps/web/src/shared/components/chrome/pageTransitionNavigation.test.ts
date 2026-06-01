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

  it("falls back to plain navigation when startViewTransition is unavailable", async () => {
    const replace = vi.fn();

    const wrapped = await navigateWithPageTransition(
      { push: vi.fn(), replace },
      "/workspaces/workspace-1",
      {
        replace: true,
        document: {} as Document,
        window: { matchMedia: vi.fn(() => ({ matches: false })) } as unknown as Window
      }
    );

    expect(wrapped).toBe(false);
    expect(replace).toHaveBeenCalledWith("/workspaces/workspace-1", undefined);
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
});
