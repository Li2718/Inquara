import path from "node:path";
import { buildWorktreeDatabaseName, buildWorktreeDirName } from "./worktree-lib.mjs";

const USAGE = "Usage: node scripts/worktree.mjs <create|clonedb|cloneinfra|remove>";

export function parseWorktreeCommand(argv) {
  const [command, value] = argv;

  if (command === "create") {
    if (!value) {
      throw new Error(USAGE);
    }

    return {
      branchName: value,
      command
    };
  }

  if (command === "clonedb") {
    return {
      command
    };
  }

  if (command === "cloneinfra") {
    return {
      command
    };
  }

  if (command === "remove") {
    if (!value) {
      throw new Error(USAGE);
    }

    return {
      command,
      target: value
    };
  }

  throw new Error(USAGE);
}

export function getCreatePlan({ branchName, rootDir, worktreeParentDirName }) {
  return {
    branchName,
    copyEnvDev: true,
    mode: "shared",
    targetPath: path.join(rootDir, worktreeParentDirName, buildWorktreeDirName(branchName))
  };
}

export function getCloneDbPlan({ branchName, currentPath }) {
  return {
    branchName,
    currentPath,
    databaseName: buildWorktreeDatabaseName(branchName)
  };
}

export function getCloneInfraPlan({ currentPath }) {
  return {
    composePath: path.join(currentPath, "docker-compose.dev.yml"),
    currentPath,
    envLocalPath: path.join(currentPath, ".env.dev.local"),
    sourceComposePath: path.join(currentPath, "docker-compose.dev.example.yml")
  };
}

export function getRemovePlan({ currentPath, targetEntry, trackedDatabaseName }) {
  return {
    branchName: targetEntry.branchName,
    currentPath,
    databaseName: trackedDatabaseName,
    targetPath: targetEntry.path
  };
}
