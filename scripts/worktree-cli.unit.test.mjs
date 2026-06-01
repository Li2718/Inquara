import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  getCloneDbPlan,
  getCloneInfraPlan,
  getCreatePlan,
  getRemovePlan,
  parseWorktreeCommand
} from "./worktree-cli.mjs";

describe("worktree command parsing", () => {
  it("parses create, clonedb, cloneinfra, and remove commands", () => {
    expect(parseWorktreeCommand(["create", "feature/debug-toolbar"])).toEqual({
      branchName: "feature/debug-toolbar",
      command: "create"
    });
    expect(parseWorktreeCommand(["clonedb"])).toEqual({
      command: "clonedb"
    });
    expect(parseWorktreeCommand(["cloneinfra"])).toEqual({
      command: "cloneinfra"
    });
    expect(parseWorktreeCommand(["remove", "feature/debug-toolbar"])).toEqual({
      command: "remove",
      target: "feature/debug-toolbar"
    });
  });

  it("rejects missing required command arguments", () => {
    expect(() => parseWorktreeCommand(["create"])).toThrow(
      "Usage: node scripts/worktree.mjs <create|clonedb|cloneinfra|remove>"
    );
    expect(() => parseWorktreeCommand(["remove"])).toThrow(
      "Usage: node scripts/worktree.mjs <create|clonedb|cloneinfra|remove>"
    );
  });
});

describe("worktree plans", () => {
  it("creates a new worktree under the managed directory and copies .env.dev", () => {
    expect(
      getCreatePlan({
        branchName: "feature/debug-toolbar",
        rootDir: "/workspace/inquara",
        worktreeParentDirName: ".worktrees"
      })
    ).toEqual({
      branchName: "feature/debug-toolbar",
      copyEnvDev: true,
      mode: "shared",
      targetPath: path.join("/workspace/inquara", ".worktrees", "feature-debug-toolbar")
    });
  });

  it("creates a private database plan for the current worktree", () => {
    expect(
      getCloneDbPlan({
        branchName: "feature/debug-toolbar",
        currentPath: "/workspace/inquara/.worktrees/feature-debug-toolbar"
      })
    ).toEqual({
      branchName: "feature/debug-toolbar",
      currentPath: "/workspace/inquara/.worktrees/feature-debug-toolbar",
      databaseName: "inquara_wt_feature_debug_toolbar"
    });
  });

  it("creates a private infrastructure plan for the current worktree", () => {
    expect(
      getCloneInfraPlan({
        currentPath: "/workspace/inquara/.worktrees/feature-debug-toolbar"
      })
    ).toEqual({
      composePath: path.join(
        "/workspace/inquara/.worktrees/feature-debug-toolbar",
        "docker-compose.dev.yml"
      ),
      currentPath: "/workspace/inquara/.worktrees/feature-debug-toolbar",
      envLocalPath: path.join("/workspace/inquara/.worktrees/feature-debug-toolbar", ".env.dev.local"),
      sourceComposePath: path.join(
        "/workspace/inquara/.worktrees/feature-debug-toolbar",
        "docker-compose.dev.example.yml"
      )
    });
  });

  it("removes the target worktree and its tracked private database", () => {
    expect(
      getRemovePlan({
        currentPath: "/workspace/inquara",
        targetEntry: {
          branchName: "feature/debug-toolbar",
          path: "/workspace/inquara/.worktrees/feature-debug-toolbar"
        },
        trackedDatabaseName: "inquara_wt_feature_debug_toolbar"
      })
    ).toEqual({
      branchName: "feature/debug-toolbar",
      currentPath: "/workspace/inquara",
      databaseName: "inquara_wt_feature_debug_toolbar",
      targetPath: "/workspace/inquara/.worktrees/feature-debug-toolbar"
    });
  });
});
