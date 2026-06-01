import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  AI_PROVIDER: z.enum(["fake", "openai-compatible"]).default("fake"),
  OPENAI_COMPATIBLE_BASE_URL: z.string().optional().default(""),
  OPENAI_COMPATIBLE_API_KEY: z.string().optional().default(""),
  OPENAI_COMPATIBLE_MODEL: z.string().optional().default("")
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return EnvSchema.parse(env);
}
