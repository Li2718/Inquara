import { describe, expect, it } from "vitest";
import { getMiddleDragScrollVelocity, hasScrollableOverflow, isScrolledNearBottom, stickToBottom } from "./scrollStickiness";

describe("message list scroll stickiness", () => {
  it("treats lists at or near the bottom as sticky", () => {
    expect(isScrolledNearBottom({ scrollHeight: 1000, scrollTop: 500, clientHeight: 500 })).toBe(true);
    expect(isScrolledNearBottom({ scrollHeight: 1000, scrollTop: 477, clientHeight: 500 })).toBe(true);
  });

  it("does not treat manually scrolled-up lists as sticky", () => {
    expect(isScrolledNearBottom({ scrollHeight: 1000, scrollTop: 200, clientHeight: 500 })).toBe(false);
  });

  it("scrolls to the current bottom when sticky", () => {
    const element = { scrollHeight: 1200, scrollTop: 100 };

    stickToBottom(element);

    expect(element.scrollTop).toBe(1200);
  });

  it("detects actual scrollable overflow with a small tolerance", () => {
    expect(hasScrollableOverflow({ scrollHeight: 501.5, clientHeight: 500 })).toBe(true);
    expect(hasScrollableOverflow({ scrollHeight: 500.5, clientHeight: 500 })).toBe(false);
    expect(hasScrollableOverflow({ scrollHeight: 400, clientHeight: 500 })).toBe(false);
  });

  it("calculates middle-drag velocity from distance outside a dead zone", () => {
    expect(getMiddleDragScrollVelocity(4)).toBe(0);
    expect(getMiddleDragScrollVelocity(18)).toBeCloseTo(1.8);
    expect(getMiddleDragScrollVelocity(-18)).toBeCloseTo(-1.8);
    expect(getMiddleDragScrollVelocity(240)).toBe(24);
  });
});
