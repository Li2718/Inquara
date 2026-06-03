import type { AppConfig } from "@inquara/config";
import { fakeAIProvider } from "./fake-provider";
import { createOpenAICompatibleProvider } from "./openai-compatible-provider";
import type { AIProvider } from "./provider";

export function createAIProvider(config: AppConfig): AIProvider {
  if (config.AI_PROVIDER === "fake") {
    return fakeAIProvider;
  }

  return createOpenAICompatibleProvider({
    baseUrl: config.OPENAI_COMPATIBLE_BASE_URL,
    apiKey: config.OPENAI_COMPATIBLE_API_KEY,
    model: config.OPENAI_COMPATIBLE_MODEL,
    smallModel: config.OPENAI_COMPATIBLE_SMALL_MODEL || config.OPENAI_COMPATIBLE_MODEL
  });
}
