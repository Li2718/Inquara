import { describe, expect, it } from "vitest";
import { getAdminNavLinkState, shouldStartAdminNavPendingNavigation } from "./adminNavigation";

describe("admin navigation state", () => {
  it("marks the active local admin section", () => {
    expect(
      getAdminNavLinkState({
        activeSection: "codes",
        href: "/admin/codes"
      })
    ).toEqual({
      ariaCurrent: "page",
      isPending: false,
      isVisuallyActive: true
    });
  });

  it("keeps inactive local admin sections visually quiet", () => {
    expect(
      getAdminNavLinkState({
        activeSection: "codes",
        href: "/admin/users"
      })
    ).toEqual({
      ariaCurrent: undefined,
      isPending: false,
      isVisuallyActive: false
    });
  });

  it("does not start pending feedback for modified clicks", () => {
    expect(shouldStartAdminNavPendingNavigation({ button: 0, defaultPrevented: false, metaKey: true })).toBe(false);
    expect(shouldStartAdminNavPendingNavigation({ button: 1, defaultPrevented: false, metaKey: false })).toBe(false);
  });
});
