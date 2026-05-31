import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { Client } from "pg";
import { ensureDatabaseUrl, loadDevelopmentEnv } from "./dev-env.mjs";
import { getCloneDbPlan, getCreatePlan, getRemovePlan, parseWorktreeCommand } from "./worktree-cli.mjs";
import {
  buildPrivateDatabaseProcessEnv,
  buildWorktreeDatabaseAdminUrl,
  buildPrivateDbEnvText,
  escapePostgresIdentifier,
  getManagedWorktreeRootDir,
  getWorktreeParentDirName,
  parseWorktreeListPorcelain,
  readPrivateDatabaseName,
  selectWorktreeEntry
} from "./worktree-lib.mjs";

const rootDir = getManagedWorktreeRootDir(process.cwd());
const currentDir = process.cwd();

loadDevelopmentEnv(rootDir);
ensureDatabaseUrl(process.env);

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
  if (process.platform === "win32") {
    const commandLine = [quoteWindowsArg(commandName), ...args.map(quoteWindowsArg)].join(" ");

    return spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", commandLine], {
      cwd: options.cwd ?? rootDir,
      env: options.env ?? process.env,
      stdio: options.stdio ?? "inherit",
      windowsHide: options.windowsHide ?? false
    });
  }

  return spawn(commandName, args, {
    cwd: options.cwd ?? rootDir,
    env: options.env ?? process.env,
    stdio: options.stdio ?? "inherit",
    windowsHide: options.windowsHide ?? false
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

function ensureManagedWorktreeDirectory(rootPath) {
  const dotWorktreesPath = path.join(rootPath, ".worktrees");
  const worktreesPath = path.join(rootPath, "worktrees");
  const worktreeParentDirName = getWorktreeParentDirName({
    dotWorktreesExists: existsSync(dotWorktreesPath),
    worktreesExists: existsSync(worktreesPath)
  });
  const worktreeParentPath = path.join(rootPath, worktreeParentDirName);

  mkdirSync(worktreeParentPath, { recursive: true });
  return {
    worktreeParentDirName,
    worktreeParentPath
  };
}

function copyEnvDevIntoWorktree(rootPath, targetPath) {
  const envDevPath = path.join(rootPath, ".env.dev");

  if (!existsSync(envDevPath)) {
    throw new Error("Missing .env.dev in the main worktree. Create it before creating managed worktrees.");
  }

  copyFileSync(envDevPath, path.join(targetPath, ".env.dev"));
}

function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);

  return {
    adminDatabaseUrl: buildWorktreeDatabaseAdminUrl(databaseUrl),
    databaseName: decodeURIComponent(url.pathname.replace(/^\//u, ""))
  };
}

function getPsqlEnv() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Ensure .env.dev is configured before cloning a private database.");
  }

  return parseDatabaseUrl(databaseUrl);
}

async function createPrivateDatabase({ sourceDatabaseName, databaseName }) {
  const { adminDatabaseUrl } = getPsqlEnv();
  const client = new Client({
    connectionString: adminDatabaseUrl
  });

  await client.connect();

  try {
    await client.query(
      `CREATE DATABASE ${escapePostgresIdentifier(databaseName)} WITH TEMPLATE ${escapePostgresIdentifier(sourceDatabaseName)}`
    );
  } finally {
    await client.end();
  }
}

async function dropDatabase(databaseName) {
  const { adminDatabaseUrl } = getPsqlEnv();
  const client = new Client({
    connectionString: adminDatabaseUrl
  });

  await client.connect();

  try {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [databaseName]
    );
    await client.query(`DROP DATABASE IF EXISTS ${escapePostgresIdentifier(databaseName)}`);
  } finally {
    await client.end();
  }
}

async function getCurrentBranchName() {
  const { stdout } = await captureCommand("git", ["branch", "--show-current"], {
    cwd: currentDir
  });

  const branchName = stdout.trim();

  if (!branchName) {
    throw new Error("Could not determine the current branch name.");
  }

  return branchName;
}

async function listWorktrees() {
  const { stdout } = await captureCommand("git", ["worktree", "list", "--porcelain"], {
    cwd: rootDir
  });

  return parseWorktreeListPorcelain(stdout);
}

async function ensureBranchDoesNotExist(branchName) {
  const { stdout } = await captureCommand("git", ["branch", "--list", branchName], {
    cwd: rootDir
  });

  if (stdout.trim().length > 0) {
    throw new Error(`Branch "${branchName}" already exists. Create the worktree manually or choose a new branch name.`);
  }
}

async function createWorktree(branchName) {
  await ensureBranchDoesNotExist(branchName);
  const { worktreeParentDirName } = ensureManagedWorktreeDirectory(rootDir);
  const plan = getCreatePlan({
    branchName,
    rootDir,
    worktreeParentDirName
  });

  await runCommand("git", ["worktree", "add", plan.targetPath, "-b", branchName], {
    cwd: rootDir
  });
  copyEnvDevIntoWorktree(rootDir, plan.targetPath);

  console.log(`Created worktree at ${plan.targetPath}`);
  console.log("Database mode: shared (.env.dev copied from the main worktree)");
}

async function cloneDatabaseForCurrentWorktree() {
  const branchName = await getCurrentBranchName();
  const plan = getCloneDbPlan({
    branchName,
    currentPath: currentDir
  });
  const { databaseName: sourceDatabaseName } = getPsqlEnv();
  const envLocalPath = path.join(currentDir, ".env.dev.local");
  const existingPrivateDatabaseName = readPrivateDatabaseName(currentDir);

  if (existingPrivateDatabaseName) {
    throw new Error(`This worktree is already using the private database "${existingPrivateDatabaseName}".`);
  }

  await createPrivateDatabase({
    sourceDatabaseName,
    databaseName: plan.databaseName
  });

  const existingLocalText = existsSync(envLocalPath) ? readFileSync(envLocalPath, "utf8") : "";
  writeFileSync(envLocalPath, buildPrivateDbEnvText(existingLocalText, plan.databaseName), "utf8");

  await runCommand(getNpmCommand(), ["run", "db:migrate:deploy"], {
    cwd: currentDir,
    env: buildPrivateDatabaseProcessEnv(process.env, plan.databaseName)
  });

  console.log(`Cloned "${sourceDatabaseName}" into private database "${plan.databaseName}".`);
  console.log(`Current worktree now uses ${envLocalPath}.`);
}

function getNpmCommand() {
  const npmBinaryName = process.platform === "win32" ? "npm.cmd" : "npm";
  const siblingNpm = path.join(path.dirname(process.execPath), npmBinaryName);

  if (existsSync(siblingNpm)) {
    return siblingNpm;
  }

  return npmBinaryName;
}

async function removeWorktree(target) {
  const entries = await listWorktrees();
  const selectedEntry = selectWorktreeEntry(entries, {
    currentPath: currentDir,
    target
  });
  const plan = getRemovePlan({
    currentPath: currentDir,
    targetEntry: selectedEntry,
    trackedDatabaseName: readPrivateDatabaseName(selectedEntry.path)
  });
  const { stdout } = await captureCommand("git", ["status", "--porcelain"], {
    cwd: plan.targetPath
  });

  if (stdout.trim().length > 0) {
    throw new Error(`Worktree "${plan.branchName}" has uncommitted changes. Clean it up before removing it.`);
  }

  if (plan.databaseName) {
    await dropDatabase(plan.databaseName);
  }

  await runCommand("git", ["worktree", "remove", plan.targetPath], {
    cwd: rootDir
  });
  await runCommand("git", ["branch", "-D", plan.branchName], {
    cwd: rootDir
  });

  const envLocalPath = path.join(plan.targetPath, ".env.dev.local");

  if (existsSync(envLocalPath)) {
    unlinkSync(envLocalPath);
  }

  console.log(`Removed worktree "${plan.branchName}".`);
  if (plan.databaseName) {
    console.log(`Dropped private database "${plan.databaseName}".`);
  }
}

async function main() {
  const command = parseWorktreeCommand(process.argv.slice(2));

  switch (command.command) {
    case "create":
      await createWorktree(command.branchName);
      return;
    case "clonedb":
      await cloneDatabaseForCurrentWorktree();
      return;
    case "remove":
      await removeWorktree(command.target);
      return;
    default:
      throw new Error("Unknown worktree command.");
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
