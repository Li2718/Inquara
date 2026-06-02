import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRootFromFile = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const repoRootFromCwd = process.cwd();
const repoRoots = [repoRootFromCwd, repoRootFromFile];

const destructiveCleanupFiles = [
  "apps/api/src/test/app.test.ts",
  "apps/api/src/test/canvas.test.ts",
  "apps/api/src/test/messages.test.ts",
  "apps/api/src/test/canvas-http.test.ts",
  "apps/web/e2e/multi-window-sync.spec.ts"
];

const directDevDatabaseUrlFiles = [
  "apps/api/src/debug/routes.test.ts",
  "apps/api/src/test/app.test.ts",
  "apps/api/src/test/canvas-http.test.ts",
  "apps/web/playwright.config.ts"
];

describe("test database safety", () => {
  it("keeps destructive cleanup behind the ephemeral test database helper", () => {
    for (const file of destructiveCleanupFiles) {
      const source = readFileSync(resolveExistingRepoPath(file), "utf8");

      expect(source, `${file} must use resetTestDatabase instead of direct table cleanup`).not.toMatch(/\.deleteMany\(/u);
    }
  });

  it("does not default integration or e2e tests to the development database", () => {
    for (const file of directDevDatabaseUrlFiles) {
      const source = readFileSync(resolveExistingRepoPath(file), "utf8");

      expect(source, `${file} must not embed the local development database URL`).not.toContain(
        "localhost:55432/inquara?schema=public"
      );
    }
  });
});

function resolveExistingRepoPath(relativePath: string): string {
  for (const root of repoRoots) {
    const candidate = resolve(root, relativePath);
    if (existsSync(candidate)) return candidate;
  }
  return resolve(repoRoots[0] ?? process.cwd(), relativePath);
}
