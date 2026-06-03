import { describe, expect, it } from "vitest";
import { getAdminNavLinkState, shouldStartAdminNavPendingNavigation } from "./adminNavigation";

describe("admin navigation state", () => {
  it("shows the clicked admin tab as pending while the route is still loading", () => {
    expect(
      getAdminNavLinkState({
        href: "/admin/codes",
        pathname: "/admin/users",
        pendingHref: "/admin/codes"
      })
    ).toEqual({
      ariaCurrent: undefined,
      isPending: true,
      isVisuallyActive: true
    });
  });

  it("keeps aria-current tied to the committed pathname while moving visual focus to the pending tab", () => {
    expect(
      getAdminNavLinkState({
        href: "/admin/users",
        pathname: "/admin/users",
        pendingHref: "/admin/codes"
      })
    ).toEqual({
      ariaCurrent: "page",
      isPending: false,
      isVisuallyActive: false
    });
  });

  it("keeps the current tab visually active when it is clicked again", () => {
    expect(
      getAdminNavLinkState({
        href: "/admin/users",
        pathname: "/admin/users",
        pendingHref: "/admin/users"
      })
    ).toEqual({
      ariaCurrent: "page",
      isPending: false,
      isVisuallyActive: true
    });
  });

  it("does not start pending feedback for modified clicks", () => {
    expect(shouldStartAdminNavPendingNavigation({ button: 0, defaultPrevented: false, metaKey: true })).toBe(false);
    expect(shouldStartAdminNavPendingNavigation({ button: 1, defaultPrevented: false, metaKey: false })).toBe(false);
  });
});
