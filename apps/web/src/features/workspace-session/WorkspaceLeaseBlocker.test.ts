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
  it("uses takeover language for the blocked workspace action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(WorkspaceLeaseBlocker, {
        isVisible: true,
        isRecovering: false,
        message: null,
        onRetry: () => {}
      })
    );

    expect(markup).toContain("Take over here");
    expect(markup).not.toContain("Try reconnecting");
  });
});
