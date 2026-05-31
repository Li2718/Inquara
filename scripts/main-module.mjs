import { pathToFileURL } from "node:url";

const WINDOWS_DRIVE_PATH = /^[A-Za-z]:[\\/]/;

export function argvPathToFileUrlHref(argvPath) {
  if (WINDOWS_DRIVE_PATH.test(argvPath)) {
    return `file:///${argvPath.replaceAll("\\", "/").split("/").map(encodeWindowsPathSegment).join("/")}`;
  }
  return pathToFileURL(argvPath).href;
}

export function isMainModule(importMetaUrl, argvPath) {
  return Boolean(argvPath) && importMetaUrl === argvPathToFileUrlHref(argvPath);
}

function encodeWindowsPathSegment(segment, index) {
  if (index === 0) return segment;
  return encodeURIComponent(segment);
}
