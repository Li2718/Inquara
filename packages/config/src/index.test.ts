import { describe, expect, it } from "vitest";
import { loadConfig } from "./index";

const validEnv = {
  DATABASE_URL: "postgresql://inquara:inquara@localhost:5432/inquara?schema=public",
  SESSION_SECRET: "replace-with-at-least-32-random-characters",
  REDIS_URL: "redis://localhost:6379"
};

describe("loadConfig", () => {
  it("loads required values and applies local defaults", () => {
    const config = loadConfig(validEnv);

    expect(config.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(config.SESSION_SECRET).toBe(validEnv.SESSION_SECRET);
    expect(config.WEB_ORIGIN).toBe("http://localhost:3000");
    expect(config.AI_PROVIDER).toBe("fake");
    expect(config.REDIS_URL).toBe("redis://localhost:6379");
    expect(config).not.toHaveProperty("ADMIN_EMAIL");
    expect(config).not.toHaveProperty("ADMIN_PASSWORD");
  });

  it("rejects a short session secret", () => {
    expect(() =>
      loadConfig({
        ...validEnv,
        SESSION_SECRET: "short"
      })
    ).toThrow();
  });

  it("accepts an OpenAI-compatible provider configuration", () => {
    const config = loadConfig({
      ...validEnv,
      AI_PROVIDER: "openai-compatible",
      OPENAI_COMPATIBLE_BASE_URL: "https://api.example.com/v1",
      OPENAI_COMPATIBLE_API_KEY: "secret-key",
      OPENAI_COMPATIBLE_MODEL: "example-model",
      OPENAI_COMPATIBLE_SMALL_MODEL: "small-model"
    });

    expect(config.AI_PROVIDER).toBe("openai-compatible");
    expect(config.OPENAI_COMPATIBLE_MODEL).toBe("example-model");
    expect(config.OPENAI_COMPATIBLE_SMALL_MODEL).toBe("small-model");
  });
});
