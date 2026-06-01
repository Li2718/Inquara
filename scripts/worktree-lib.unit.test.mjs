import { describe, expect, it } from "vitest";
import {
  getSharedDevelopmentFileNames,
  buildPrivateInfraEnvText,
  buildWorktreeDatabaseAdminUrl,
  escapePostgresIdentifier,
  getManagedWorktreeRootDir,
  getWorktreeParentDirName,
  parseWorktreeListPorcelain,
  selectAvailablePort,
  selectWorktreeEntry
} from "./worktree-lib.mjs";

const fixtureMainRoot = "/workspace/inquara";
const fixtureWorktreeRoot = `${fixtureMainRoot}/.worktrees/feature/debug-toolbar`;
const fixtureHyphenatedWorktreeRoot = `${fixtureMainRoot}/.worktrees/feature-debug-toolbar`;

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

  it("builds a maintenance database URL from the app database URL", () => {
    expect(
      buildWorktreeDatabaseAdminUrl("postgresql://dev_user:dev%20password@localhost:55433/inquara_dev?schema=public")
    ).toBe("postgresql://dev_user:dev%20password@localhost:55433/postgres?schema=public");
  });

  it("escapes PostgreSQL identifiers before embedding them in SQL", () => {
    expect(escapePostgresIdentifier('inquara"danger')).toBe('"inquara""danger"');
  });

  it("writes private infrastructure port overrides and removes stale DATABASE_URL values", () => {
    const nextText = buildPrivateInfraEnvText(
      'POSTGRES_DB="inquara_wt_feature"\nDATABASE_URL="postgresql://old.example/inquara"\nAI_PROVIDER="fake"\n',
      {
        postgresPort: 55433,
        redisPort: 56381
      }
    );

    expect(nextText).toBe(
      'POSTGRES_DB="inquara_wt_feature"\nAI_PROVIDER="fake"\nPOSTGRES_PORT="55433"\nREDIS_PORT="56381"\nREDIS_URL="redis://localhost:56381"\n'
    );
  });

  it("skips Docker-published ports when selecting private infrastructure ports", async () => {
    await expect(
      selectAvailablePort("55432", {
        isPortAvailable: async () => true,
        reservedPorts: new Set([55432, 55433]),
        scanLimit: 5
      })
    ).resolves.toBe(55434);
  });

  it("parses git worktree porcelain output", () => {
    const entries = parseWorktreeListPorcelain(
      [
        `worktree ${fixtureMainRoot}`,
        "HEAD abc123",
        "branch refs/heads/main",
        "",
        `worktree ${fixtureWorktreeRoot}`,
        "HEAD def456",
        "branch refs/heads/feature/debug-toolbar",
        ""
      ].join("\n")
    );

    expect(entries).toEqual([
      {
        branchName: "main",
        head: "abc123",
        path: fixtureMainRoot
      },
      {
        branchName: "feature/debug-toolbar",
        head: "def456",
        path: fixtureWorktreeRoot
      }
    ]);
  });

  it("selects a worktree by branch name or path and rejects removing the current worktree", () => {
    const entries = [
      {
        branchName: "main",
        path: fixtureMainRoot
      },
      {
        branchName: "feature/debug-toolbar",
        path: fixtureWorktreeRoot
      }
    ];

    expect(
      selectWorktreeEntry(entries, {
        currentPath: fixtureMainRoot,
        target: "feature/debug-toolbar"
      })
    ).toEqual(entries[1]);
    expect(
      selectWorktreeEntry(entries, {
        currentPath: fixtureMainRoot,
        target: fixtureWorktreeRoot
      })
    ).toEqual(entries[1]);
    expect(() =>
      selectWorktreeEntry(entries, {
        currentPath: fixtureMainRoot,
        target: "main"
      })
    ).toThrow("Refusing to remove the current worktree");
  });

  it("detects the main repo root when run inside a managed worktree", () => {
    expect(getManagedWorktreeRootDir(fixtureHyphenatedWorktreeRoot)).toBe(fixtureMainRoot);
    expect(getManagedWorktreeRootDir(fixtureMainRoot)).toBe(fixtureMainRoot);
  });
});
