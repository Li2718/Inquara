import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "scripts/**/*.test.mjs"],
    environment: "node",
    fileParallelism: false,
    setupFiles: ["apps/api/src/test/setup.ts"],
    hookTimeout: 120_000,
    testTimeout: 120_000,
    passWithNoTests: true
  }
});
