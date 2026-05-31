import { describe, expect, it, vi } from "vitest";
import { createSetupServerHandler, isMainModule } from "./setup-server.mjs";

describe("setup server", () => {
  const silentLogger = { error: vi.fn() };

  it("serves the setup form and redirects unknown entrypoints to setup", async () => {
    const handler = createSetupServerHandler({
      createSetupAccount: vi.fn(),
      scheduleExit: vi.fn(),
      logger: silentLogger
    });

    const root = await handler(new Request("http://localhost/"));
    expect(root.status).toBe(302);
    expect(root.headers.get("location")).toBe("/setup");

    const setup = await handler(new Request("http://localhost/setup"));
    expect(setup.status).toBe(200);
    const html = await setup.text();
    expect(html).toContain("Setup");
    expect(html).toContain("name=\"email\"");
  });

  it("recognizes the script entrypoint on Windows paths", () => {
    expect(isMainModule("file:///Z:/fixture/inquara/scripts/setup-server.mjs", "Z:\\fixture\\inquara\\scripts\\setup-server.mjs")).toBe(true);
  });

  it("does not reflect submitted passwords when validation fails", async () => {
    const handler = createSetupServerHandler({
      createSetupAccount: vi.fn(),
      scheduleExit: vi.fn(),
      logger: silentLogger
    });

    const response = await handler(
      new Request("http://localhost/setup", {
        method: "POST",
        body: new URLSearchParams({
          email: "admin@inquara.local",
          display_name: "Admin",
          password: "super-secret",
          confirm_password: "different"
        })
      })
    );

    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain("admin@inquara.local");
    expect(html).not.toContain("super-secret");
    expect(html).not.toContain("different");
  });

  it("shows generic setup errors instead of raw exception messages", async () => {
    const handler = createSetupServerHandler({
      createSetupAccount: vi.fn(async () => {
        throw new Error("duplicate key value violates unique constraint users_email_key");
      }),
      scheduleExit: vi.fn(),
      logger: silentLogger
    });

    const response = await handler(
      new Request("http://localhost/setup", {
        method: "POST",
        body: new URLSearchParams({
          email: "admin@inquara.local",
          password: "111111",
          confirm_password: "111111"
        })
      })
    );

    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain("Setup failed");
    expect(html).not.toContain("duplicate key");
  });

  it("creates the setup account and schedules setup shutdown after success", async () => {
    const createSetupAccount = vi.fn(async () => ({
      id: "user_1",
      email: "admin@inquara.local",
      role: "admin"
    }));
    const scheduleExit = vi.fn();
    const handler = createSetupServerHandler({
      createSetupAccount,
      scheduleExit,
      logger: silentLogger
    });

    const response = await handler(
      new Request("http://localhost/setup", {
        method: "POST",
        body: new URLSearchParams({
          email: "ADMIN@inquara.local",
          display_name: "Admin",
          password: "111111",
          confirm_password: "111111"
        })
      })
    );

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Setup finished");
    expect(html).toContain("data-setup-status");
    expect(html).toContain("fetch(\"/\"");
    expect(html).toContain("retrySoon");
    expect(createSetupAccount).toHaveBeenCalledWith({
      email: "ADMIN@inquara.local",
      displayName: "Admin",
      password: "111111"
    });
    expect(scheduleExit).toHaveBeenCalledOnce();
  });
});
