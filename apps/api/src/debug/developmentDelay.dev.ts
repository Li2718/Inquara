import type { FastifyInstance } from "fastify";
import { configureDevelopmentDelay } from "./developmentDelay";

export function registerDevelopmentApiDelay(app: FastifyInstance, env: Record<string, string | undefined>): void {
  const delayMs = parseDevelopmentDelay(env.INQUARA_DEV_API_DELAY_MS);
  configureDevelopmentDelay({
    wait: () => wait(delayMs)
  });
  if (delayMs <= 0) return;
  app.addHook("onRequest", async () => {
    await wait(delayMs);
  });
}

function parseDevelopmentDelay(value: string | undefined): number {
  const delayMs = Number(value);
  if (!Number.isFinite(delayMs) || delayMs <= 0) return 0;
  return Math.min(Math.round(delayMs), 10_000);
}

async function wait(delayMs: number): Promise<void> {
  if (delayMs <= 0) return;
  await new Promise(resolve => {
    setTimeout(resolve, delayMs);
  });
}
