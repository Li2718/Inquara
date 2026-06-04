import { describe, expect, it, vi } from "vitest";
import { adminPathForSection, parseAdminPathSection, writeAdminPathSection } from "./adminUrlState";

describe("admin URL state", () => {
  it("parses admin paths into local sections", () => {
    expect(parseAdminPathSection("/admin/users")).toBe("users");
    expect(parseAdminPathSection("/admin/users/extra")).toBe("users");
    expect(parseAdminPathSection("/admin/codes")).toBe("codes");
    expect(parseAdminPathSection("/admin")).toBe("users");
    expect(parseAdminPathSection("/canvases/canvas-1")).toBeNull();
  });

  it("maps sections to canonical admin paths", () => {
    expect(adminPathForSection("users")).toBe("/admin/users");
    expect(adminPathForSection("codes")).toBe("/admin/codes");
  });

  it("writes admin section changes with history without router navigation", () => {
    const pushState = vi.fn();
    const replaceState = vi.fn();
    const windowRef = {
      history: { pushState, replaceState },
      location: { pathname: "/admin/users" }
    } as unknown as Window;

    writeAdminPathSection("codes", { windowRef });
    writeAdminPathSection("users", { replace: true, windowRef });

    expect(pushState).toHaveBeenCalledWith(null, "", "/admin/codes");
    expect(replaceState).not.toHaveBeenCalled();
  });
});
