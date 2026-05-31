import { existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { ensureDatabaseUrl, loadDevelopmentEnv } from "./dev-env.mjs";
import {
  areRequiredServicesReady,
  ensureDevComposeExists,
  getDevCommandPlan,
  getDevEnvironmentPaths,
  getExistingServiceAction,
  getHttpHealthUrl,
  getServerConfigFromUrl,
  getUrlFromEnv,
  parseComposePsJson,
  resolveAvailableServerConfig,
  resolveRepoRootFromScript,
  withUrlPort
} from "./dev-environment-lib.mjs";

const rootDir = resolveRepoRootFromScript(import.meta.url);
const paths = getDevEnvironmentPaths(rootDir);
const command = process.argv[2] ?? "dev";
let runtimeUrls = null;

loadDevelopmentEnv(rootDir);
ensureDatabaseUrl(process.env);

function getNpmCommand() {
  const npmBinaryName = process.platform === "win32" ? "npm.cmd" : "npm";
  const siblingNpm = path.join(path.dirname(process.execPath), npmBinaryName);

  if (existsSync(siblingNpm)) {
    return siblingNpm;
  }

  return npmBinaryName;
}

function quoteWindowsArg(value) {
  if (value.length === 0) {
    return '""';
  }

  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function spawnCommand(commandName, args, options = {}) {
  const {
    cwd = rootDir,
    env = process.env,
    stdio = "inherit",
    detached = false,
    windowsHide = false
  } = options;

  if (process.platform === "win32") {
    const commandLine = [quoteWindowsArg(commandName), ...args.map(quoteWindowsArg)].join(" ");

    return spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", commandLine], {
      cwd,
      env,
      stdio,
      detached,
      windowsHide
    });
  }

  return spawn(commandName, args, {
    cwd,
    env,
    stdio,
    detached,
    windowsHide
  });
}

async function runCommand(commandName, args, options = {}) {
  const child = spawnCommand(commandName, args, options);

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", code => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`Command failed (${commandName} ${args.join(" ")}), exit code: ${code ?? "unknown"}`));
    });
  });
}

async function captureCommand(commandName, args, options = {}) {
  const child = spawnCommand(commandName, args, {
    ...options,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";

  child.stdout?.on("data", chunk => {
    stdout += String(chunk);
  });

  child.stderr?.on("data", chunk => {
    stderr += String(chunk);
  });

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", code => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `Command failed (${commandName} ${args.join(" ")}), exit code: ${code ?? "unknown"}\n${stderr || stdout}`
        )
      );
    });
  });
}

function getComposeArgs() {
  ensureDevComposeExists(rootDir);
  return ["compose", "-f", paths.devComposePath];
}

async function readComposeServices() {
  const { stdout } = await captureCommand("docker", [...getComposeArgs(), "ps", "--format", "json"], {
    cwd: rootDir
  });

  return parseComposePsJson(stdout);
}

async function isInfraReady() {
  try {
    const rows = await readComposeServices();
    return areRequiredServicesReady(rows);
  } catch {
    return false;
  }
}

async function waitForInfraReady(timeoutMs = 90_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isInfraReady()) {
      return;
    }

    await sleep(1_000);
  }

  throw new Error("infra_start_failed: postgres did not become ready in time");
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function resolveRuntimeUrls() {
  if (runtimeUrls) {
    return runtimeUrls;
  }

  const configuredApiUrl = getUrlFromEnv(process.env, "API_ORIGIN", "http://localhost:4000");
  const configuredWebUrl = getUrlFromEnv(process.env, "WEB_ORIGIN", "http://localhost:3000");
  const apiServer = await resolveAvailableServerConfig(getServerConfigFromUrl(configuredApiUrl));
  const apiUrl = withUrlPort(configuredApiUrl, apiServer.port);
  process.env.API_ORIGIN = apiUrl.toString().replace(/\/$/u, "");
  process.env.NEXT_PUBLIC_API_ORIGIN = process.env.API_ORIGIN;
  process.env.NEXT_PUBLIC_WS_ORIGIN = process.env.API_ORIGIN.replace(/^http/u, "ws");

  const webServer = await resolveAvailableServerConfig(getServerConfigFromUrl(configuredWebUrl));
  const webUrl = withUrlPort(configuredWebUrl, webServer.port);
  process.env.WEB_ORIGIN = webUrl.toString().replace(/\/$/u, "");

  if (apiServer.port !== getServerConfigFromUrl(configuredApiUrl).port) {
    console.log(`Preferred API port ${getServerConfigFromUrl(configuredApiUrl).port} is unavailable; using ${apiServer.port} instead.`);
  }

  if (webServer.port !== getServerConfigFromUrl(configuredWebUrl).port) {
    console.log(`Preferred web port ${getServerConfigFromUrl(configuredWebUrl).port} is unavailable; using ${webServer.port} instead.`);
  }

  runtimeUrls = { apiServer, apiUrl, webServer, webUrl };
  return runtimeUrls;
}

function ensureRuntimeDir() {
  mkdirSync(paths.runtimeDir, { recursive: true });
}

function readPid(pidPath) {
  if (!existsSync(pidPath)) {
    return null;
  }

  const raw = readFileSync(pidPath, "utf8").trim();

  if (raw.length === 0) {
    return null;
  }

  const pid = Number(raw);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function isPidRunning(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function clearPidFile(pidPath) {
  if (existsSync(pidPath)) {
    unlinkSync(pidPath);
  }
}

function writePidFile(pidPath, pid) {
  writeFileSync(pidPath, String(pid), "utf8");
}

async function startDetachedWindowsNpm(args, logPath, env = process.env) {
  const npmCliPath = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  const npmCommand = existsSync(npmCliPath) ? process.execPath : getNpmCommand();
  const npmArgs = existsSync(npmCliPath) ? [npmCliPath, ...args] : args;
  const wrapperPath = path.join(rootDir, "scripts", "dev-service-wrapper.mjs");
  const wrapperOptions = JSON.stringify({
    command: npmCommand,
    args: npmArgs,
    cwd: rootDir,
    logPath,
    env: Object.fromEntries(Object.entries(env).filter(([key, value]) => process.env[key] !== value))
  });
  const wrapperOptionsPath = path.join(
    paths.runtimeDir,
    `service-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
  );

  ensureRuntimeDir();
  writeFileSync(wrapperOptionsPath, wrapperOptions, "utf8");

  const child = spawn(process.execPath, [wrapperPath, `@${wrapperOptionsPath}`], {
    cwd: rootDir,
    env: process.env,
    stdio: "ignore",
    detached: true,
    windowsHide: true
  });

  child.unref();

  if (!child.pid) {
    throw new Error(`Failed to start detached process for: npm ${args.join(" ")}`);
  }

  return child.pid;
}

async function spawnDetachedNpm(args, logPath, options = {}) {
  ensureRuntimeDir();

  if (process.platform === "win32") {
    return startDetachedWindowsNpm(args, logPath, options.env);
  }

  const logFd = openSync(logPath, "a");
  const child = spawnCommand(getNpmCommand(), args, {
    cwd: rootDir,
    env: options.env ?? process.env,
    stdio: ["ignore", logFd, logFd],
    detached: true,
    windowsHide: true
  });

  child.unref();

  if (!child.pid) {
    throw new Error(`Failed to start detached process for: npm ${args.join(" ")}`);
  }

  return child.pid;
}

function getServiceRuntime(serviceName) {
  const urls = runtimeUrls;

  if (!urls) {
    throw new Error("runtime_urls_not_resolved");
  }

  if (serviceName === "api") {
    return {
      pidPath: paths.apiPidPath,
      logPath: paths.apiLogPath,
      args: ["run", "dev", "--workspace", "@inquara/api"],
      env: {
        ...process.env,
        PORT: String(urls.apiServer.port),
        HOST: urls.apiServer.host
      }
    };
  }

  return {
    pidPath: paths.webPidPath,
    logPath: paths.webLogPath,
    args: [
      "run",
      "dev",
      "--workspace",
      "@inquara/web",
      "--",
      "--hostname",
      urls.webServer.host,
      "--port",
      String(urls.webServer.port)
    ],
    env: process.env
  };
}

async function killProcessTree(pid) {
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    await runCommand("taskkill", ["/pid", String(pid), "/t", "/f"], {
      stdio: "ignore"
    }).catch(() => undefined);
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return;
    }
  }
}

async function waitForServiceReady(serviceName, pid, timeoutMs = 120_000) {
  const startedAt = Date.now();
  const urls = runtimeUrls;

  if (!urls) {
    throw new Error("runtime_urls_not_resolved");
  }

  const healthUrl =
    serviceName === "api"
      ? getHttpHealthUrl(urls.apiServer, "/healthz")
      : getHttpHealthUrl(urls.webServer, "/");

  while (Date.now() - startedAt < timeoutMs) {
    if (!isPidRunning(pid)) {
      throw new Error(`${serviceName}_start_failed: ${serviceName} process exited before becoming healthy`);
    }

    try {
      const response = await fetch(healthUrl);

      if (response.ok) {
        return;
      }
    } catch {
      // continue polling until the dev server is ready
    }

    await sleep(1_000);
  }

  throw new Error(`${serviceName}_start_failed: timed out waiting for ${healthUrl.toString()}`);
}

async function bootstrapDevInfra() {
  ensureDevComposeExists(rootDir);

  console.log("Starting local development infrastructure...");
  await runCommand("docker", [...getComposeArgs(), "up", "-d", "postgres"]);
  await waitForInfraReady();

  console.log("Applying database migrations...");
  await runCommand(getNpmCommand(), ["run", "db:migrate:deploy"], {
    cwd: rootDir
  }).catch(error => {
    throw new Error(`migration_failed: ${error.message}`);
  });

  console.log("Development infrastructure is ready.");
}

async function downDevInfra() {
  ensureDevComposeExists(rootDir);
  await runCommand("docker", [...getComposeArgs(), "down"]);
  console.log("Stopped local development infrastructure.");
}

async function startAppService(serviceName) {
  const runtime = getServiceRuntime(serviceName);
  const existingPid = readPid(runtime.pidPath);

  if (existingPid) {
    const pidRunning = isPidRunning(existingPid);
    const action = getExistingServiceAction({ pidRunning });

    if (action === "reuse") {
      console.log(`${serviceName} is already running (pid ${existingPid}).`);
      return { pid: existingPid, started: false, logPath: runtime.logPath };
    }

    clearPidFile(runtime.pidPath);
  }

  clearPidFile(runtime.pidPath);
  const pid = await spawnDetachedNpm(runtime.args, runtime.logPath, {
    env: runtime.env
  });
  writePidFile(runtime.pidPath, pid);

  try {
    await waitForServiceReady(serviceName, pid);
  } catch (error) {
    await killProcessTree(pid);
    clearPidFile(runtime.pidPath);
    throw error;
  }

  console.log(`Started ${serviceName} (pid ${pid}). Logs: ${runtime.logPath}`);
  return { pid, started: true, logPath: runtime.logPath };
}

async function startDevApps() {
  ensureDevComposeExists(rootDir);

  if (!(await isInfraReady())) {
    throw new Error("infra_start_failed: infrastructure is not ready. Run npm run dev:infra:up first.");
  }

  await resolveRuntimeUrls();

  const startedNow = [];

  try {
    const api = await startAppService("api");

    if (api.started) {
      startedNow.push("api");
    }

    const web = await startAppService("web");

    if (web.started) {
      startedNow.push("web");
    }
  } catch (error) {
    for (const serviceName of startedNow.reverse()) {
      await stopAppService(serviceName);
    }

    throw error;
  }

  console.log(`Development app is available at ${runtimeUrls.webUrl.toString()}`);
}

async function stopAppService(serviceName) {
  const runtime = {
    api: {
      pidPath: paths.apiPidPath
    },
    web: {
      pidPath: paths.webPidPath
    }
  }[serviceName];
  const pid = readPid(runtime.pidPath);

  if (!pid) {
    console.log(`${serviceName} is not running.`);
    return;
  }

  if (!isPidRunning(pid)) {
    clearPidFile(runtime.pidPath);
    console.log(`${serviceName} is not running.`);
    return;
  }

  await killProcessTree(pid);
  clearPidFile(runtime.pidPath);
  console.log(`Stopped ${serviceName}.`);
}

async function stopDevApps() {
  await stopAppService("web");
  await stopAppService("api");
}

async function runDev() {
  const hasDevComposeFile = existsSync(paths.devComposePath);
  const plan = getDevCommandPlan({
    hasDevComposeFile,
    infraReady: hasDevComposeFile ? await isInfraReady() : false
  });

  for (const step of plan) {
    if (step === "bootstrap") {
      await bootstrapDevInfra();
      continue;
    }

    await startDevApps();
  }
}

async function main() {
  switch (command) {
    case "dev":
      await runDev();
      return;
    case "infra-up":
      await bootstrapDevInfra();
      return;
    case "infra-down":
      await downDevInfra();
      return;
    case "start":
      await startDevApps();
      return;
    case "stop":
      await stopDevApps();
      return;
    default:
      throw new Error("Usage: node scripts/dev.mjs <dev|infra-up|infra-down|start|stop>");
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
