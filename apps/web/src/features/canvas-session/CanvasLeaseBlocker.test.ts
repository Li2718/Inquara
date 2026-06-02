import { describe, expect, it } from "vitest";
import { getCanvasLeaseActionLabelKey, shouldBlockCanvasInteraction, shouldShowLeaseAction } from "./CanvasLeaseBlocker";

describe("CanvasLeaseBlocker", () => {
  it("shows a reconnect action while automatic recovery is in progress", () => {
    expect(shouldShowLeaseAction()).toBe(true);
    expect(getCanvasLeaseActionLabelKey({ isRecovering: true })).toBe("reconnect");
  });

  it("shows a takeover action when another client blocks editing", () => {
    expect(shouldShowLeaseAction()).toBe(true);
    expect(getCanvasLeaseActionLabelKey({ isRecovering: false })).toBe("takeOver");
  });

  it("blocks blocked-stale canvases because the visible canvas may be outdated", () => {
    expect(shouldBlockCanvasInteraction({ isRecovering: false })).toBe(true);
  });

  it("keeps recovering canvases browseable while reconnecting", () => {
    expect(shouldBlockCanvasInteraction({ isRecovering: true })).toBe(false);
  });
});
