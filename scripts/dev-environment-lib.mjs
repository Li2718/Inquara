import { existsSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SERVER_PORT_SCAN_LIMIT = 1_000;

export function resolveRepoRootFromScript(scriptUrl) {
  const normalizedScriptPath = fileURLToPath(scriptUrl);
  return path.resolve(path.dirname(normalizedScriptPath), "..");
}

export function getDevEnvironmentPaths(rootDir) {
  const runtimeDir = path.join(rootDir, ".local", "dev");

  return {
    rootDir,
    devComposePath: path.join(rootDir, "docker-compose.dev.yml"),
    devComposeExamplePath: path.join(rootDir, "docker-compose.dev.example.yml"),
    runtimeDir,
    apiPidPath: path.join(runtimeDir, "api.pid"),
    apiLogPath: path.join(runtimeDir, "api.log"),
    webPidPath: path.join(runtimeDir, "web.pid"),
    webLogPath: path.join(runtimeDir, "web.log"),
    runtimeStatePath: path.join(runtimeDir, "runtime.json")
  };
}

export function getDevComposeProjectName(rootDir) {
  const normalizedRootDir = rootDir.endsWith(path.sep) ? rootDir.slice(0, -1) : rootDir;

  return path.basename(normalizedRootDir)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

export function getManagedRepoRootDir(rootDir) {
  const normalizedRootDir = rootDir.endsWith(path.sep) ? rootDir.slice(0, -1) : rootDir;
  const parentDirName = path.basename(path.dirname(normalizedRootDir));

  if (parentDirName === ".worktrees" || parentDirName === "worktrees") {
    return path.dirname(path.dirname(normalizedRootDir));
  }

  return rootDir;
}

export function resolveDevInfrastructure(rootDir, { exists = existsSync } = {}) {
  const localPaths = getDevEnvironmentPaths(rootDir);
  const mainRootDir = getManagedRepoRootDir(rootDir);
  const mainPaths = getDevEnvironmentPaths(mainRootDir);
  const isManagedWorktree = path.normalize(mainRootDir) !== path.normalize(rootDir);

  if (exists(localPaths.devComposePath)) {
    return {
      composePath: localPaths.devComposePath,
      composeRootDir: rootDir,
      mode: isManagedWorktree ? "private" : "main",
      projectName: getDevComposeProjectName(rootDir)
    };
  }

  if (isManagedWorktree && exists(mainPaths.devComposePath)) {
    return {
      composePath: mainPaths.devComposePath,
      composeRootDir: mainRootDir,
      mode: "shared",
      projectName: getDevComposeProjectName(mainRootDir)
    };
  }

  return {
    composePath: localPaths.devComposePath,
    composeRootDir: rootDir,
    mode: "missing",
    projectName: getDevComposeProjectName(rootDir)
  };
}

export function ensureDevComposeExists(rootDir) {
  const infrastructure = resolveDevInfrastructure(rootDir);

  if (infrastructure.mode === "missing") {
    throw new Error(
      "Missing docker-compose.dev.yml. Copy docker-compose.dev.example.yml to docker-compose.dev.yml, then copy .env.dev.example to .env.dev and adjust them for your machine first."
    );
  }

  return infrastructure;
}

export function parseComposePsJson(rawOutput) {
  const trimmed = rawOutput.trim();

  if (trimmed.length === 0) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  return trimmed
    .split(/\r?\n/u)
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line));
}

function isReadyState(row) {
  const state = String(row.State ?? "").toLowerCase();
  const health = row.Health ? String(row.Health).toLowerCase() : null;

  if (state !== "running") {
    return false;
  }

  if (health && health !== "healthy") {
    return false;
  }

  return true;
}

export function areRequiredServicesReady(rows) {
  const requiredServices = ["postgres", "redis"];

  return requiredServices.every(serviceName => {
    const row = rows.find(entry => entry.Service === serviceName);
    return row ? isReadyState(row) : false;
  });
}

export function getDevCommandPlan({ hasDevInfrastructure, infraReady }) {
  if (!hasDevInfrastructure) {
    throw new Error(
      "Missing docker-compose.dev.yml. Copy docker-compose.dev.example.yml to docker-compose.dev.yml, then copy .env.dev.example to .env.dev and adjust them for your machine first."
    );
  }

  if (!infraReady) {
    return ["bootstrap", "start"];
  }

  return ["start"];
}

export function getExistingServiceAction({ pidRunning }) {
  return pidRunning ? "reuse" : "restart";
}

export function getUrlFromEnv(env, key, fallback) {
  return new URL(env[key] ?? fallback);
}

export function getUrlPort(url) {
  if (url.port) {
    return Number(url.port);
  }

  return url.protocol === "https:" ? 443 : 80;
}

export function getServerConfigFromUrl(url) {
  return {
    host: url.hostname,
    port: getUrlPort(url)
  };
}

export function withUrlPort(url, port) {
  const nextUrl = new URL(url.toString());
  nextUrl.port = String(port);
  return nextUrl;
}

export function toOriginString(url) {
  return url.toString().replace(/\/$/u, "");
}

export function createDevRuntimeState({ apiUrl, webUrl }) {
  const apiOrigin = toOriginString(apiUrl);
  const webOrigin = toOriginString(webUrl);

  return {
    apiOrigin,
    webOrigin,
    nextPublicApiOrigin: apiOrigin,
    nextPublicWsOrigin: apiOrigin.replace(/^http/u, "ws")
  };
}

export function getServiceStateExpectation(serviceName, runtimeState) {
  if (serviceName === "api") {
    return {
      apiOrigin: runtimeState.apiOrigin
    };
  }

  return {
    webOrigin: runtimeState.webOrigin,
    nextPublicApiOrigin: runtimeState.nextPublicApiOrigin,
    nextPublicWsOrigin: runtimeState.nextPublicWsOrigin
  };
}

export function doesRuntimeStateMatchExpectation(runtimeState, expectation) {
  return Object.entries(expectation).every(([key, value]) => runtimeState?.[key] === value);
}

export function getReusableServiceOrigin(serviceName, runtimeState, { pidRunning }) {
  if (!pidRunning || !runtimeState) {
    return null;
  }

  const origin = serviceName === "api" ? runtimeState.apiOrigin : runtimeState.webOrigin;

  if (!origin) {
    return null;
  }

  return new URL(origin);
}

export function getHealthCheckHost(host) {
  return host === "0.0.0.0" || host === "::" || host === "localhost" ? "127.0.0.1" : host;
}

export function getHttpHealthUrl({ host, port }, pathName) {
  return new URL(pathName, `http://${getHealthCheckHost(host)}:${port}`);
}

export async function checkTcpPortAvailable(host, port) {
  return new Promise(resolve => {
    const server = createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, host);
  });
}

export async function resolveAvailableServerConfig(
  serverConfig,
  {
    isPortAvailable = checkTcpPortAvailable,
    scanLimit = DEFAULT_SERVER_PORT_SCAN_LIMIT
  } = {}
) {
  const preferredPort = serverConfig.port;
  const maxPort = Math.min(65_535, preferredPort + scanLimit);

  for (let port = preferredPort; port <= maxPort; port += 1) {
    if (await isPortAvailable(serverConfig.host, port)) {
      return {
        ...serverConfig,
        port
      };
    }
  }

  throw new Error(`No available local app port found from ${preferredPort} to ${maxPort}`);
}
