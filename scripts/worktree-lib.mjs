import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

export function getSharedDevelopmentFileNames({ envDevExists }) {
  const sharedFiles = [];

  if (envDevExists) {
    sharedFiles.push(".env.dev");
  }

  return sharedFiles;
}

export function getWorktreeParentDirName({ dotWorktreesExists, worktreesExists }) {
  if (dotWorktreesExists) {
    return ".worktrees";
  }

  if (worktreesExists) {
    return "worktrees";
  }

  return ".worktrees";
}

export function getManagedWorktreeRootDir(rootDir) {
  const parentDirName = path.basename(path.dirname(rootDir));

  if (parentDirName === ".worktrees" || parentDirName === "worktrees") {
    return path.dirname(path.dirname(rootDir));
  }

  return rootDir;
}

export function buildWorktreeDirName(branchName) {
  return branchName
    .trim()
    .replace(/[^A-Za-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase();
}

export function buildPrivateInfraEnvText(currentText, { postgresPort, redisPort }) {
  const lines = currentText.length === 0 ? [] : currentText.replace(/\r\n/gu, "\n").split("\n");
  const managedKeys = new Set(["DATABASE_URL", "POSTGRES_PORT", "REDIS_PORT", "REDIS_URL"]);
  const nextLines = [];

  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/u);

    if (match && managedKeys.has(match[1])) {
      continue;
    }

    if (line.length > 0) {
      nextLines.push(line);
    }
  }

  nextLines.push(`POSTGRES_PORT="${postgresPort}"`);
  nextLines.push(`REDIS_PORT="${redisPort}"`);
  nextLines.push(`REDIS_URL="redis://localhost:${redisPort}"`);

  return `${nextLines.join("\n")}\n`;
}

export async function selectAvailablePort(
  preferredPort,
  { isPortAvailable, reservedPorts = new Set(), scanLimit = 100 } = {}
) {
  const startPort = Number(preferredPort);

  if (!Number.isInteger(startPort) || startPort <= 0) {
    throw new Error(`Invalid port: ${preferredPort}`);
  }

  for (let offset = 0; offset < scanLimit; offset += 1) {
    const port = startPort + offset;

    if (reservedPorts.has(port)) {
      continue;
    }

    if (!isPortAvailable || (await isPortAvailable(port))) {
      return port;
    }
  }

  throw new Error(`Could not find an available port starting at ${startPort}.`);
}

export function buildWorktreeDatabaseAdminUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

export function escapePostgresIdentifier(value) {
  return `"${String(value).replace(/"/gu, '""')}"`;
}

export function readEnvKeyFromText(text, key) {
  const lines = text.replace(/\r\n/gu, "\n").split("\n");

  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);

    if (!match || match[1] !== key) {
      continue;
    }

    return match[2].trim().replace(/^"(.*)"$/u, "$1").replace(/^'(.*)'$/u, "$1");
  }

  return null;
}

export function readPrivateDatabaseName(worktreePath) {
  const envLocalPath = path.join(worktreePath, ".env.dev.local");

  if (!existsSync(envLocalPath)) {
    return null;
  }

  return readEnvKeyFromText(readFileSync(envLocalPath, "utf8"), "POSTGRES_DB");
}

export function parseWorktreeListPorcelain(rawOutput) {
  const blocks = rawOutput
    .trim()
    .split(/\n\s*\n/gu)
    .map(block => block.trim())
    .filter(block => block.length > 0);

  return blocks.map(block => {
    const entry = {};

    for (const line of block.split(/\r?\n/gu)) {
      const [key, ...rest] = line.split(" ");
      const value = rest.join(" ");

      if (key === "worktree") {
        entry.path = value;
        continue;
      }

      if (key === "HEAD") {
        entry.head = value;
        continue;
      }

      if (key === "branch") {
        entry.branchName = value.replace(/^refs\/heads\//u, "");
      }
    }

    return entry;
  });
}

export function selectWorktreeEntry(entries, { currentPath, target }) {
  const normalizedTarget = path.normalize(target);
  const currentPathNormalized = path.normalize(currentPath);
  const selectedEntry = entries.find(entry => {
    if (entry.branchName === target) {
      return true;
    }

    return path.normalize(entry.path) === normalizedTarget;
  });

  if (!selectedEntry) {
    throw new Error(`Could not find a worktree matching "${target}"`);
  }

  if (path.normalize(selectedEntry.path) === currentPathNormalized) {
    throw new Error("Refusing to remove the current worktree");
  }

  return selectedEntry;
}

export function getRuntimePidPaths(rootDir) {
  const runtimeDir = path.join(rootDir, ".local", "dev");

  return {
    apiPidPath: path.join(runtimeDir, "api.pid"),
    webPidPath: path.join(runtimeDir, "web.pid")
  };
}

export function shouldStopWorktreeDevServicesBeforeRemoval(worktreePath, { pathExists = existsSync } = {}) {
  const { apiPidPath, webPidPath } = getRuntimePidPaths(worktreePath);
  return pathExists(apiPidPath) || pathExists(webPidPath);
}

export function readPid(pidPath) {
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

export function isPidRunning(pid) {
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
