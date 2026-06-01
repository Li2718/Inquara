import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: workspaceRoot,
  webpack(config, { dev }) {
    const debugRootTarget = path.resolve(process.cwd(), "src", "debug", "DebugRoot.target.tsx");
    const debugCanvasSourceTarget = path.resolve(process.cwd(), "src", "debug", "DebugCanvasSource.target.tsx");
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      [debugRootTarget]: path.resolve(
        process.cwd(),
        "src",
        "debug",
        dev ? "DebugRoot.development.tsx" : "DebugRoot.production.tsx"
      ),
      [debugCanvasSourceTarget]: path.resolve(
        process.cwd(),
        "src",
        "debug",
        dev ? "DebugCanvasSource.dev.tsx" : "DebugCanvasSource.production.tsx"
      )
    };
    return config;
  }
};

export default nextConfig;
