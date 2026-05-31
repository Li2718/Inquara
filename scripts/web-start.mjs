import { spawn } from "node:child_process";
import { hasCompletedSetup } from "@inquara/db";
import { isMainModule as isMainModuleUrlMatch } from "./main-module.mjs";
import { startSetupServer } from "./setup-server.mjs";

export function decideWebStartupMode(setupCompleted) {
  return setupCompleted ? "normal" : "setup";
}

export function buildNormalWebCommand({
  serverHost = process.env.SERVER_HOST ?? "0.0.0.0",
  serverPort = process.env.SERVER_PORT ?? "3000"
} = {}) {
  return {
    command: "npm",
    args: ["run", "start", "--workspace", "@inquara/web", "--", "-H", serverHost, "-p", serverPort]
  };
}

export function runNormalWeb() {
  const { command, args } = buildNormalWebCommand();
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  child.on("exit", code => {
    process.exit(code ?? 1);
  });

  child.on("error", error => {
    console.error(error);
    process.exit(1);
  });
}

export async function startWeb({
  hasCompletedSetup: setupCompleted = hasCompletedSetup,
  startSetupServer: startSetup = startSetupServer,
  runNormalWeb: runNormal = runNormalWeb,
  logger = console
} = {}) {
  const mode = decideWebStartupMode(await setupCompleted());

  if (mode === "setup") {
    logger.log("Setup is required. Starting Inquara setup app.");
    startSetup();
    return;
  }

  logger.log("Setup is complete. Starting Inquara web app.");
  runNormal();
}

export function isMainModule(importMetaUrl, argvPath = process.argv[1]) {
  return isMainModuleUrlMatch(importMetaUrl, argvPath);
}

if (isMainModule(import.meta.url)) {
  await startWeb();
}
