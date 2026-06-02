import { describe, expect, it } from "vitest";
import { shouldEnterLeaseRecovery } from "./renewFailurePolicy";

describe("renew failure policy", () => {
  it("keeps editing active after transient renewal failures", () => {
    expect(shouldEnterLeaseRecovery(1)).toBe(false);
    expect(shouldEnterLeaseRecovery(2)).toBe(false);
  });

  it("enters recovery after repeated renewal failures", () => {
    expect(shouldEnterLeaseRecovery(3)).toBe(true);
  });
});
