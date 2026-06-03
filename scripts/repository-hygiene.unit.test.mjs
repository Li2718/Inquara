import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const textFileExtensions = new Set([
  ".cjs",
  ".css",
  ".dockerignore",
  ".env",
  ".example",
  ".gitignore",
  ".html",
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

const pathBoundary = String.raw`(?:^|[\s"'([{=])`;
const pathChar = String.raw`[^\s"'` + "`" + String.raw`<>|)]`;
const pathEndChar = String.raw`[^\s"'` + "`" + String.raw`<>|).,;:]`;
const userSegment = String.raw`[^/\s"'` + "`" + String.raw`<>|):]+`;

function localPathPattern(label, expression) {
  return {
    label,
    pattern: new RegExp(`${pathBoundary}(${expression})`, "gu")
  };
}

function localPosixRootPattern(parts) {
  return localPathPattern("POSIX workstation absolute path", `/${parts.join("/")}/${pathChar}*${pathEndChar}`);
}

const localPathPatterns = [
  localPathPattern("Windows drive absolute path", String.raw`[A-Za-z]:[\\/]${pathChar}*${pathEndChar}`),
  localPathPattern("UNC absolute path", String.raw`\\\\[^\\\s"'` + "`" + String.raw`<>|)]+\\${pathChar}*${pathEndChar}`),
  ...[
    ["Users", userSegment],
    ["home", userSegment],
    ["workspace"],
    ["tmp"],
    ["Volumes", userSegment],
    ["private", "tmp"],
    ["private", "var", "folders"],
    ["mnt", "[a-z]"],
    ["cygdrive", "[a-z]"]
  ].map(localPosixRootPattern),
  localPathPattern(
    "POSIX workstation absolute path",
    String.raw`/workspaces/${userSegment}/(?:\.git|\.github|\.worktrees|apps|docs|packages|scripts|prisma|node_modules|test-results|coverage)(?:/${pathChar}+)*`
  ),
  localPathPattern(
    "POSIX workstation absolute path",
    String.raw`/workspaces/${userSegment}/${userSegment}/(?:\.git|\.github|\.worktrees|apps|docs|packages|scripts|prisma|node_modules|test-results|coverage)(?:/${pathChar}+)*`
  )
];

function listTrackedFiles() {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
}

function isTextFile(filePath) {
  return Array.from(textFileExtensions).some(extension => filePath.endsWith(extension));
}

function lineNumberForOffset(text, offset) {
  return text.slice(0, offset).split(/\r?\n/u).length;
}

function findLocalPathViolations(filePath, text) {
  const violations = [];

  for (const { label, pattern } of localPathPatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const matchedPath = match[1];
      const pathOffset = (match.index ?? 0) + match[0].lastIndexOf(matchedPath);
      violations.push(`${filePath}:${lineNumberForOffset(text, pathOffset)} ${label}: ${matchedPath}`);
    }
  }

  return violations;
}

describe("repository hygiene", () => {
  it("detects local workstation absolute paths across common platforms", () => {
    const windowsDrivePath = ["C:", "Users", "collaborator", "repo", "file.ts"].join("\\");
    const uncPath = ["", "", "dev-share", "collaborator", "repo", "file.ts"].join("\\");
    const macHomePath = ["", "Users", "collaborator", "repo", "file.ts"].join("/");
    const linuxHomePath = ["", "home", "collaborator", "repo", "file.ts"].join("/");
    const workspacePath = ["", "workspaces", "collaborator", "repo", "scripts", "task.mjs"].join("/");
    const wslPath = ["", "mnt", "c", "Users", "collaborator", "repo", "file.ts"].join("/");
    const tempPath = ["", "tmp", "repo", "file.ts"].join("/");

    expect(
      findLocalPathViolations(
        "fixture.txt",
        [windowsDrivePath, uncPath, macHomePath, linuxHomePath, workspacePath, wslPath, tempPath].join("\n")
      )
    ).toHaveLength(7);
  });

  it("allows repository-relative paths, URLs, container paths, and product routes", () => {
    expect(
      findLocalPathViolations(
        "fixture.txt",
        [
          "apps/web/src/app/canvases/[canvasId]/page.tsx",
          "http://localhost:3000/canvases/canvas-1",
          "postgresql://inquara:inquara@localhost:5432/inquara?schema=public",
          "/canvases/:canvasId/snapshot",
          "/var/lib/postgresql/data",
          "/app/packages/api"
        ].join("\n")
      )
    ).toEqual([]);
  });

  it("does not commit local workstation absolute paths", () => {
    const violations = [];

    for (const filePath of listTrackedFiles()) {
      if (!existsSync(filePath)) continue;
      if (!isTextFile(filePath)) continue;
      const text = readFileSync(filePath, "utf8");
      violations.push(...findLocalPathViolations(filePath, text));
    }

    expect(violations).toEqual([]);
  });
});
