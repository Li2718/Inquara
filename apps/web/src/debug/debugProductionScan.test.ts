import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("debug production safety", () => {
  it("keeps product modules from importing development-only debug modules directly", () => {
    const productFiles = globSync("apps/web/src/**/*.{ts,tsx}", {
      exclude: ["apps/web/src/debug/**"]
    });

    const offenders = productFiles.filter(file => readFileSync(file, "utf8").includes(".dev"));

    expect(offenders).toEqual([]);
  });

  it("exposes a single guarded DebugRoot entrypoint for product code", () => {
    const source = readFileSync("apps/web/src/debug/DebugRoot.tsx", "utf8");
    const nextConfig = readFileSync("apps/web/next.config.ts", "utf8");

    expect(source).toContain("./DebugRoot.target");
    expect(nextConfig).toContain("DebugRoot.target");
    expect(nextConfig).toContain("DebugRoot.production.tsx");
    expect(nextConfig).toContain("DebugRoot.development.tsx");
  });

  it("does not scan Next trace metadata as production executable content", () => {
    const source = readFileSync("scripts/verify-debug-free.mjs", "utf8");

    expect(source).toContain("path.endsWith(\".nft.json\")");
  });
});
