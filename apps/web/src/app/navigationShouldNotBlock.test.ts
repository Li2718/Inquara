import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("top-level product navigation", () => {
  it("does not block admin route entry on server-side API checks", () => {
    const source = readFileSync("apps/web/src/app/admin/layout.tsx", "utf8");

    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("notFound(");
  });

  it("sends app chrome navigation to the admin entry route", () => {
    const appTopBarSource = readFileSync("apps/web/src/shared/components/chrome/AppTopBar.tsx", "utf8");
    const adminSurfaceSource = readFileSync("apps/web/src/features/admin/AdminSurface.tsx", "utf8");

    expect(appTopBarSource).toContain('navigation.push("/admin"');
    expect(appTopBarSource).not.toContain('navigation.push("/admin/users"');
    expect(adminSurfaceSource).toContain('window.location.pathname !== "/admin"');
    expect(adminSurfaceSource).toContain("writeAdminPathSection(initialSection, { replace: true })");
  });

  it("keeps the admin back-to-canvas action available while the user request is loading", () => {
    const appTopBarSource = readFileSync("apps/web/src/shared/components/chrome/AppTopBar.tsx", "utf8");

    expect(appTopBarSource).toContain("const shouldShowAdminMenuDestination = isAdminRoute || isAdmin");
    expect(appTopBarSource).toContain("{shouldShowAdminMenuDestination ? (");
    expect(appTopBarSource).not.toContain("{isAdmin ? (");
  });

  it("does not block canvas route entry on server-side API checks", () => {
    const source = readFileSync("apps/web/src/app/canvases/[canvasId]/page.tsx", "utf8");

    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("notFound(");
  });
});
