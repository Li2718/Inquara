import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webAppRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(webAppRoot, "..", "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: workspaceRoot,
  webpack(config, { dev }) {
    const debugRootTarget = path.resolve(webAppRoot, "src", "debug", "DebugRoot.target.tsx");
    const debugCanvasSourceTarget = path.resolve(webAppRoot, "src", "debug", "DebugCanvasSource.target.tsx");
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      [debugRootTarget]: path.resolve(
        webAppRoot,
        "src",
        "debug",
        dev ? "DebugRoot.development.tsx" : "DebugRoot.production.tsx"
      ),
      [debugCanvasSourceTarget]: path.resolve(
        webAppRoot,
        "src",
        "debug",
        dev ? "DebugCanvasSource.dev.tsx" : "DebugCanvasSource.production.tsx"
      )
    };
    return config;
  }
};

export default nextConfig;
