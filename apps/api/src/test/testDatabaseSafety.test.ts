import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const destructiveCleanupFiles = [
  "apps/api/src/test/app.test.ts",
  "apps/api/src/test/canvas.test.ts",
  "apps/api/src/test/messages.test.ts",
  "apps/api/src/test/realtime.test.ts",
  "apps/web/e2e/multi-window-sync.spec.ts"
];

const directDevDatabaseUrlFiles = [
  "apps/api/src/debug/routes.test.ts",
  "apps/api/src/test/app.test.ts",
  "apps/api/src/test/realtime.test.ts",
  "apps/web/playwright.config.ts"
];

describe("test database safety", () => {
  it("keeps destructive cleanup behind the ephemeral test database helper", () => {
    for (const file of destructiveCleanupFiles) {
      const source = readFileSync(file, "utf8");

      expect(source, `${file} must use resetTestDatabase instead of direct table cleanup`).not.toMatch(/\.deleteMany\(/u);
    }
  });

  it("does not default integration or e2e tests to the development database", () => {
    for (const file of directDevDatabaseUrlFiles) {
      const source = readFileSync(file, "utf8");

      expect(source, `${file} must not embed the local development database URL`).not.toContain(
        "localhost:55432/inquara?schema=public"
      );
    }
  });
});
