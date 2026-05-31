import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn()
  })
}));

vi.mock("../../api", () => ({
  apiJson: vi.fn(() => new Promise(() => {}))
}));

vi.mock("../ui", async () => {
  const ReactModule = await import("react");

  return {
    ConfirmDialog: () => null,
    FloatingCircleButton: ReactModule.forwardRef(function FloatingCircleButton(
      props: React.ButtonHTMLAttributes<HTMLButtonElement>,
      ref: React.Ref<HTMLButtonElement>
    ) {
      return ReactModule.createElement("button", { ...props, ref }, props.children);
    }),
    InquaraBrandIcon: (props: React.HTMLAttributes<HTMLSpanElement>) => ReactModule.createElement("span", props, "brand"),
    PopupMenu: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children),
    PopupMenuItem: ({ children, disabled }: { children?: React.ReactNode; disabled?: boolean }) =>
      ReactModule.createElement("button", { disabled, type: "button" }, children)
  };
});

describe("AppTopBar", () => {
  beforeEach(() => {
    pathname = "/admin";
  });

  it.each(["/admin", "/workspaces/workspace-1"])("never renders the Inquara brand button as disabled on %s", async nextPathname => {
    pathname = nextPathname;

    const { AppTopBar } = await import("./AppTopBar");
    const markup = renderToStaticMarkup(React.createElement(AppTopBar));
    const brandButton = markup.match(/<button[^>]*class="app-top-brand"[^>]*>/)?.[0] ?? null;

    expect(brandButton).not.toBeNull();
    expect(brandButton).not.toContain("disabled");
  });
});
