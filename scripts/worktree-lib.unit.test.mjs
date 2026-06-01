import { describe, expect, it } from "vitest";
import {
  getSharedDevelopmentFileNames,
  buildPrivateDbEnvText,
  buildPrivateDatabaseProcessEnv,
  buildWorktreeDatabaseAdminUrl,
  escapePostgresIdentifier,
  buildWorktreeDatabaseName,
  getManagedWorktreeRootDir,
  getWorktreeParentDirName,
  parseWorktreeListPorcelain,
  selectWorktreeEntry
} from "./worktree-lib.mjs";

describe("worktree helpers", () => {
  it("copies only environment defaults for a shared-infra worktree", () => {
    expect(
      getSharedDevelopmentFileNames({
        envDevExists: true
      })
    ).toEqual([".env.dev"]);
  });

  it("prefers .worktrees when picking the managed worktree directory", () => {
    expect(getWorktreeParentDirName({ dotWorktreesExists: true, worktreesExists: true })).toBe(".worktrees");
    expect(getWorktreeParentDirName({ dotWorktreesExists: false, worktreesExists: true })).toBe("worktrees");
    expect(getWorktreeParentDirName({ dotWorktreesExists: false, worktreesExists: false })).toBe(".worktrees");
  });

  it("builds a sanitized database name from the branch", () => {
    expect(buildWorktreeDatabaseName("feature/debug-toolbar")).toBe("inquara_wt_feature_debug_toolbar");
    expect(buildWorktreeDatabaseName("Fix Login")).toBe("inquara_wt_fix_login");
  });

  it("hashes long database names down to the PostgreSQL limit", () => {
    const databaseName = buildWorktreeDatabaseName("feature/" + "very-long-name-".repeat(8));

    expect(databaseName.length).toBeLessThanOrEqual(63);
    expect(databaseName).toMatch(/^inquara_wt_[a-z0-9_]+_[a-f0-9]{8}$/u);
  });

  it("builds a maintenance database URL from the app database URL", () => {
    expect(
      buildWorktreeDatabaseAdminUrl("postgresql://dev_user:dev%20password@localhost:55433/inquara_dev?schema=public")
    ).toBe("postgresql://dev_user:dev%20password@localhost:55433/postgres?schema=public");
  });

  it("escapes PostgreSQL identifiers before embedding them in SQL", () => {
    expect(escapePostgresIdentifier('inquara"danger')).toBe('"inquara""danger"');
  });

  it("writes only the private database override when no local env exists", () => {
    expect(buildPrivateDbEnvText("", "inquara_wt_feature_debug_toolbar")).toBe(
      'POSTGRES_DB="inquara_wt_feature_debug_toolbar"\n'
    );
  });

  it("rebuilds DATABASE_URL when switching a process env to a private database", () => {
    expect(
      buildPrivateDatabaseProcessEnv(
        {
          POSTGRES_USER: "inquara",
          POSTGRES_PASSWORD: "inquara",
          POSTGRES_HOST: "localhost",
          POSTGRES_PORT: "55432",
          POSTGRES_DB: "inquara",
          POSTGRES_SCHEMA: "public",
          DATABASE_URL: "postgresql://inquara:inquara@localhost:55432/inquara?schema=public"
        },
        "inquara_wt_feature_debug_toolbar"
      )
    ).toMatchObject({
      POSTGRES_DB: "inquara_wt_feature_debug_toolbar",
      DATABASE_URL: "postgresql://inquara:inquara@localhost:55432/inquara_wt_feature_debug_toolbar?schema=public"
    });
  });

  it("updates the private database override without dropping unrelated local env keys", () => {
    const nextText = buildPrivateDbEnvText(
      'API_ORIGIN="http://localhost:4999"\nPOSTGRES_DB="old_db"\n',
      "inquara_wt_feature_debug_toolbar"
    );

    expect(nextText).toBe(
      'API_ORIGIN="http://localhost:4999"\nPOSTGRES_DB="inquara_wt_feature_debug_toolbar"\n'
    );
  });

  it("parses git worktree porcelain output", () => {
    const entries = parseWorktreeListPorcelain(
      [
        "worktree /workspace/inquara",
        "HEAD abc123",
        "branch refs/heads/main",
        "",
        "worktree /workspace/inquara/.worktrees/feature/debug-toolbar",
        "HEAD def456",
        "branch refs/heads/feature/debug-toolbar",
        ""
      ].join("\n")
    );

    expect(entries).toEqual([
      {
        branchName: "main",
        head: "abc123",
        path: "/workspace/inquara"
      },
      {
        branchName: "feature/debug-toolbar",
        head: "def456",
        path: "/workspace/inquara/.worktrees/feature/debug-toolbar"
      }
    ]);
  });

  it("selects a worktree by branch name or path and rejects removing the current worktree", () => {
    const entries = [
      {
        branchName: "main",
        path: "/workspace/inquara"
      },
      {
        branchName: "feature/debug-toolbar",
        path: "/workspace/inquara/.worktrees/feature/debug-toolbar"
      }
    ];

    expect(
      selectWorktreeEntry(entries, {
        currentPath: "/workspace/inquara",
        target: "feature/debug-toolbar"
      })
    ).toEqual(entries[1]);
    expect(
      selectWorktreeEntry(entries, {
        currentPath: "/workspace/inquara",
        target: "/workspace/inquara/.worktrees/feature/debug-toolbar"
      })
    ).toEqual(entries[1]);
    expect(() =>
      selectWorktreeEntry(entries, {
        currentPath: "/workspace/inquara",
        target: "main"
      })
    ).toThrow("Refusing to remove the current worktree");
  });

  it("detects the main repo root when run inside a managed worktree", () => {
    expect(getManagedWorktreeRootDir("/workspace/inquara/.worktrees/feature-debug-toolbar")).toBe(
      "/workspace/inquara"
    );
    expect(getManagedWorktreeRootDir("/workspace/inquara")).toBe("/workspace/inquara");
  });
});
