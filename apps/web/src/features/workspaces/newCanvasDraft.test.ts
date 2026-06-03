import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearNewCanvasDraft,
  clearPendingStarterMessage,
  getNewCanvasDraft,
  getPendingStarterMessage,
  saveNewCanvasDraft,
  savePendingStarterMessage
} from "./newCanvasDraft";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => {
        storage.delete(key);
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      }
    },
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => {
        storage.delete(key);
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      }
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("new canvas draft cache", () => {
  it("restores the pre-create draft when the user returns to the new canvas entry", () => {
    saveNewCanvasDraft("Compare the two plans");

    expect(getNewCanvasDraft()).toBe("Compare the two plans");
  });

  it("keeps the starter message until the created canvas confirms it was sent", () => {
    savePendingStarterMessage("workspace-1", "Start from this question");

    expect(getPendingStarterMessage("workspace-1")).toBe("Start from this question");
    expect(getPendingStarterMessage("workspace-1")).toBe("Start from this question");

    clearPendingStarterMessage("workspace-1");

    expect(getPendingStarterMessage("workspace-1")).toBeNull();
  });

  it("clears the pre-create draft without clearing pending starter messages", () => {
    saveNewCanvasDraft("Draft");
    savePendingStarterMessage("workspace-1", "Question");

    clearNewCanvasDraft();

    expect(getNewCanvasDraft()).toBe("");
    expect(getPendingStarterMessage("workspace-1")).toBe("Question");
  });
});
