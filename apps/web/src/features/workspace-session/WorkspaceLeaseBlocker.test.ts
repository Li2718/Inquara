import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceLeaseBlocker } from "./WorkspaceLeaseBlocker";

vi.mock("../../shared/components/ui", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    React.createElement("button", { ...props }, children)
}));

describe("WorkspaceLeaseBlocker", () => {
  it("uses reconnect language for the recovery action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(WorkspaceLeaseBlocker, {
        isVisible: true,
        isRecovering: false,
        message: null,
        onRetry: () => {}
      })
    );

    expect(markup).toContain("Try reconnecting");
    expect(markup).not.toContain("Check again");
  });
});
