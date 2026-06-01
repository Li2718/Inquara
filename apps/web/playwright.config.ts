import { defineConfig, devices } from "@playwright/test";

const apiPort = 4300;
const webPort = 3300;

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" }
    }
  ],
  webServer: [
    {
      command: [
        "npm --workspace @inquara/api run dev",
        `-- --host 127.0.0.1`
      ].join(" "),
      url: `http://127.0.0.1:${apiPort}/healthz`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? "",
        REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:56379",
        INQUARA_USE_EXISTING_TEST_DB: "1",
        SESSION_SECRET: "e2e-session-secret-with-at-least-32-chars",
        WEB_ORIGIN: `http://127.0.0.1:${webPort}`,
        API_ORIGIN: `http://127.0.0.1:${apiPort}`,
        AI_PROVIDER: "fake",
        PORT: String(apiPort),
        HOST: "127.0.0.1"
      }
    },
    {
      command: `npm --workspace @inquara/web run dev -- --hostname 127.0.0.1 --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NEXT_PUBLIC_API_ORIGIN: `http://127.0.0.1:${apiPort}`
      }
    }
  ]
});
