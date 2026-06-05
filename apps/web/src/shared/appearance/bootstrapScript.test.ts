import { describe, expect, it, vi } from "vitest";
import { getAppearanceBootstrapScript } from "./bootstrapScript";

function createScriptHarness({
  cookie = "",
  localStorageValue = null,
  prefersDark = false
}: {
  cookie?: string;
  localStorageValue?: string | null;
  prefersDark?: boolean;
} = {}) {
  const documentElement = {
    dataset: {} as Record<string, string>,
    style: {} as { colorScheme?: string }
  };
  const localStorage = {
    getItem: vi.fn(() => localStorageValue)
  };
  const matchMedia = vi.fn(() => ({ matches: prefersDark }));
  const fakeWindow = {
    localStorage,
    matchMedia
  };
  const fakeDocument = {
    cookie,
    documentElement
  };

  const run = new Function("window", "document", getAppearanceBootstrapScript());
  run(fakeWindow, fakeDocument);

  return {
    documentElement,
    localStorage,
    matchMedia
  };
}

describe("appearance bootstrap script", () => {
  it("applies the dark system mode before React hydrates when preference is system", () => {
    const harness = createScriptHarness({
      cookie: "inquara_appearance=system",
      prefersDark: true
    });

    expect(harness.documentElement.dataset.appearance).toBe("dark");
    expect(harness.documentElement.style.colorScheme).toBe("dark");
    expect(harness.matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
  });

  it("keeps explicit light preference even when the browser prefers dark", () => {
    const harness = createScriptHarness({
      cookie: "inquara_appearance=light",
      localStorageValue: "system",
      prefersDark: true
    });

    expect(harness.documentElement.dataset.appearance).toBe("light");
    expect(harness.documentElement.style.colorScheme).toBe("light");
  });

  it("uses stored preference when no appearance cookie exists", () => {
    const harness = createScriptHarness({
      localStorageValue: "dark",
      prefersDark: false
    });

    expect(harness.documentElement.dataset.appearance).toBe("dark");
    expect(harness.documentElement.style.colorScheme).toBe("dark");
  });
});
