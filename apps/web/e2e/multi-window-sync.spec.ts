import { expect, test, type Page } from "@playwright/test";
import { resetTestDatabase, stopEphemeralTestDatabase } from "../../api/src/test/database";

test.beforeEach(async () => {
  await resetTestDatabase();
});

test.afterAll(async () => {
  await stopEphemeralTestDatabase();
});

test("new workspace window takes over and blocks the previous client", async ({ page }) => {
  await clearDebugPosition(page);
  await page.goto("/");
  await register(page);
  await expect(page).toHaveURL(/\/workspaces\/[^/]+$/);
  await expect(page.getByTestId("canvas-node")).toHaveCount(1);
  const workspacePath = new URL(page.url()).pathname;

  await page.getByPlaceholder("Ask in this node").fill("What is attention?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("What is attention?", { exact: true })).toBeVisible();

  const second = await page.context().newPage();
  await second.goto(workspacePath);
  await expect(second.getByTestId("canvas-node")).toHaveCount(1);
  await expect(second.getByPlaceholder("Ask in this node")).toBeEnabled();

  await expect(page.getByRole("heading", { name: "This workspace is active in another client" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();

  await second.getByPlaceholder("Ask in this node").fill("Give me one concrete example.");
  await second.getByRole("button", { name: "Send" }).click();
  await expect(second.getByText("Give me one concrete example.", { exact: true })).toBeVisible();

  await second.close();
});

async function register(page: Page) {
  await page.getByRole("button", { name: "Register" }).click();
  await page.getByLabel("Email").fill(`e2e-${Date.now()}@inquara.local`);
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create account" }).click();
}

async function clearDebugPosition(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.removeItem("inquara.debug_position");
    window.localStorage.removeItem("inquara.debug_open");
  });
}
