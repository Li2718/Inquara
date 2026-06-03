import { describe, expect, it, vi } from "vitest";
import { submitLoginForm } from "./loginSubmission";

describe("login submission", () => {
  it("returns no error after authentication succeeds", async () => {
    const result = await submitLoginForm({
      authenticate: vi.fn().mockResolvedValue(undefined),
      fallbackError: "Login failed.",
      invalidCredentialsError: "Invalid email or password."
    });

    expect(result).toEqual({ error: "" });
  });

  it("localizes the known invalid credentials error", async () => {
    const result = await submitLoginForm({
      authenticate: vi.fn().mockRejectedValue(new Error("Invalid email or password.")),
      fallbackError: "登录失败。",
      invalidCredentialsError: "邮箱或密码无效。"
    });

    expect(result).toEqual({ error: "邮箱或密码无效。" });
  });
});
