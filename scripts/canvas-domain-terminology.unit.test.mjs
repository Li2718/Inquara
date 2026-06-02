import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const textFileExtensions = new Set([
  ".css",
  ".dockerignore",
  ".env",
  ".example",
  ".gitignore",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".prisma",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);

const allowedProductRenameExclusions = [
  /^AGENTS\.md$/u,
  /^\.codex\//u,
  /^package(-lock)?\.json$/u,
  /^apps\/web\/Dockerfile$/u,
  /^apps\/api\/Dockerfile$/u,
  /^apps\/web\/next\.config\.ts$/u,
  /^apps\/web\/playwright\.config\.ts$/u,
  /^apps\/api\/src\/test\/database\.ts$/u,
  /^docs\/deployment\.md$/u,
  /^packages\/db\/prisma\/migrations\/20260602193000_canvas_domain_rename\/migration\.sql$/u,
  /^scripts\//u,
  /^scripts\/.*workspace.*$/u,
  /^scripts\/.*canvas.*$/u,
  /^scripts\/.*worktree.*$/u,
  /^docs\/archive\//u,
  /^docs\/documentation-standards\.md$/u,
  /^docs\/initiatives\/canvas-domain-rename\/README\.md$/u
];

const productWorkspacePattern = /\b(workspace|workspaces|Workspace|Workspaces|workspaceId|workspace_id|WORKSPACE|WORKSPACES)\b|工作区/gu;

function listTrackedAndUntrackedFiles() {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean)
    .map(filePath => filePath.replaceAll("\\", "/"));
}

function isTextFile(filePath) {
  return textFileExtensions.has(path.extname(filePath)) || filePath.endsWith("Dockerfile");
}

function isAllowedExclusion(filePath) {
  return allowedProductRenameExclusions.some(pattern => pattern.test(filePath));
}

function lineNumberForOffset(text, offset) {
  return text.slice(0, offset).split(/\r?\n/u).length;
}

describe("canvas domain terminology", () => {
  it("does not leave product-domain canvas terminology outside tooling and archive exclusions", () => {
    const violations = [];

    for (const filePath of listTrackedAndUntrackedFiles()) {
      if (!existsSync(filePath) || !isTextFile(filePath) || isAllowedExclusion(filePath)) continue;
      const text = readFileSync(filePath, "utf8");
      for (const match of text.matchAll(productWorkspacePattern)) {
        violations.push(`${filePath}:${lineNumberForOffset(text, match.index ?? 0)} ${match[0]}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
