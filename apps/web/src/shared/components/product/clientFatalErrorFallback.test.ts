import { describe, expect, it, vi } from "vitest";
import { getClientFatalErrorFallbackScript } from "./clientFatalErrorFallback";

type Listener = () => void;

function createScriptHarness() {
  const listeners = new Map<string, Listener[]>();
  const timeouts: Listener[] = [];
  const reload = vi.fn();
  const reloadListeners: Listener[] = [];
  const documentElement = {
    attributes: new Map<string, string>(),
    setAttribute(name: string, value: string) {
      this.attributes.set(name, value);
    }
  };
  const body = {
    innerHTML: ""
  };
  const fakeWindow = {
    location: { reload },
    addEventListener(type: string, listener: Listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    setTimeout(listener: Listener) {
      timeouts.push(listener);
    }
  };
  const fakeDocument = {
    body,
    documentElement,
    querySelector(selector: string) {
      if (selector === "[data-client-fatal-error-page]") {
        return body.innerHTML.includes("data-client-fatal-error-page") ? {} : null;
      }

      if (selector !== "[data-client-fatal-reload]" || !body.innerHTML.includes("data-client-fatal-reload")) {
        return null;
      }

      return {
        addEventListener(type: string, listener: Listener) {
          if (type === "click") {
            reloadListeners.push(listener);
          }
        }
      };
    }
  };

  const run = new Function("window", "document", getClientFatalErrorFallbackScript());
  run(fakeWindow, fakeDocument);

  return {
    body,
    documentElement,
    listeners,
    reload,
    reloadListeners,
    timeouts
  };
}

describe("client fatal error fallback", () => {
  it("marks the document as fatal and installs the fallback for uncaught client errors", () => {
    const harness = createScriptHarness();

    harness.listeners.get("error")?.[0]?.();

    expect(harness.documentElement.attributes.get("data-client-fatal-error")).toBe("true");
    expect(harness.body.innerHTML).not.toBe("");
    expect(harness.body.innerHTML).not.toContain("Back to canvas");
    expect(harness.body.innerHTML).not.toContain("href=\"/\"");
    expect(harness.reloadListeners).toHaveLength(1);
  });

  it("falls back to English when navigator is unavailable", () => {
    const harness = createScriptHarness();

    harness.listeners.get("error")?.[0]?.();

    expect(harness.body.innerHTML).toContain("The workspace hit a snag.");
  });

  it("handles unhandled promise rejections without rewriting an existing fallback", () => {
    const harness = createScriptHarness();

    harness.listeners.get("unhandledrejection")?.[0]?.();
    const firstHtml = harness.body.innerHTML;
    harness.listeners.get("error")?.[0]?.();

    expect(firstHtml).not.toBe("");
    expect(harness.body.innerHTML).toBe(firstHtml);
  });

  it("restores the fallback if a framework fatal handler overwrites the page afterward", () => {
    const harness = createScriptHarness();

    harness.listeners.get("error")?.[0]?.();
    harness.body.innerHTML = "framework fallback";
    harness.timeouts.at(-1)?.();

    expect(harness.body.innerHTML).not.toBe("framework fallback");
  });

  it("wires the reload action without depending on React", () => {
    const harness = createScriptHarness();

    harness.listeners.get("error")?.[0]?.();
    harness.reloadListeners[0]?.();

    expect(harness.reload).toHaveBeenCalledOnce();
  });
});
