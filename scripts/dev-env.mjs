import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

export const DEV_ENV_FILES = [".env.dev.local", ".env.dev"];

export function loadDevelopmentEnv(rootDir, { files = DEV_ENV_FILES, override = false } = {}) {
  const loadedFiles = [];

  for (const fileName of files) {
    const filePath = path.join(rootDir, fileName);

    if (existsSync(filePath)) {
      config({ path: filePath, override, quiet: true });
      loadedFiles.push(fileName);
    }
  }

  return loadedFiles;
}

export function buildDatabaseUrl(env = process.env) {
  const user = env.POSTGRES_USER ?? "inquara";
  const password = env.POSTGRES_PASSWORD ?? "inquara";
  const host = env.POSTGRES_HOST ?? "localhost";
  const port = env.POSTGRES_PORT ?? "55432";
  const database = env.POSTGRES_DB ?? "inquara";
  const schema = env.POSTGRES_SCHEMA ?? "public";

  const url = new URL("postgresql://localhost");
  url.username = user;
  url.password = password;
  url.hostname = host;
  url.port = port;
  url.pathname = `/${database}`;
  url.searchParams.set("schema", schema);

  return url.toString();
}

export function ensureDatabaseUrl(env = process.env) {
  if (!env.DATABASE_URL) {
    env.DATABASE_URL = buildDatabaseUrl(env);
  }

  return env.DATABASE_URL;
}
