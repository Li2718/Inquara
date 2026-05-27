import { expect, test } from "@playwright/test";
import { resetTestDatabase, stopEphemeralTestDatabase } from "../../api/src/test/database";

test.beforeEach(async () => {
  await resetTestDatabase();
});

test.afterAll(async () => {
  await stopEphemeralTestDatabase();
});

test("streams chat updates into two open workspace windows", async ({ page, browser }) => {
  await clearDebugPosition(page);
  await page.goto("/");
  await register(page);
  await expect(page).toHaveURL(/\/workspaces\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Your canvases" })).toHaveCount(0);
  const workspacePath = new URL(page.url()).pathname;

  await expect(page.getByTestId("canvas-node")).toHaveCount(1);
  await expect(page.getByText("Ask me anything")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Canvases" })).toBeVisible();
  const openStageBox = await page.locator(".canvas-stage").boundingBox();
  if (!openStageBox) throw new Error("Expected canvas stage box before toggling sidebar.");
  await page.getByRole("button", { name: "Hide" }).click();
  await expect(page.getByRole("button", { name: "Workspaces" })).toBeVisible();
  await expect.poll(async () => page.locator(".canvas-stage").boundingBox()).toEqual(openStageBox);
  await page.getByRole("button", { name: "Workspaces" }).click();
  await expect(page.getByRole("heading", { name: "Canvases" })).toBeVisible();
  await expect.poll(async () => page.locator(".canvas-stage").boundingBox()).toEqual(openStageBox);

  const second = await page.context().newPage();
  await second.goto(workspacePath);
  await expect(second.getByTestId("canvas-node")).toHaveCount(1);
  await expect(second.getByText("Ask me anything")).toBeVisible();

  await page.getByPlaceholder("Ask in this node").fill("What is attention?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("What is attention?", { exact: true })).toBeVisible();
  await expect(second.getByText("What is attention?", { exact: true })).toBeVisible();
  await expect(page.getByText(/Here is a focused explanation/)).toBeVisible();
  await expect(second.getByText(/Here is a focused explanation/)).toBeVisible();

  for (const question of ["Can you add more detail?", "Give me one concrete example."]) {
    await page.getByPlaceholder("Ask in this node").fill(question);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(question, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("Give me one concrete example.", { exact: true })).toBeVisible();

  const messageList = page.locator(".message-list").first();
  await expect.poll(async () => page.locator(".canvas-node-header").first().evaluate(element => getComputedStyle(element).cursor)).toBe("grab");
  await expect.poll(async () => messageList.evaluate(element => getComputedStyle(element).cursor)).toBe("auto");
  await expect
    .poll(async () => page.locator(".message-assistant p").first().evaluate(element => getComputedStyle(element).cursor))
    .toBe("text");
  await expect.poll(async () => messageList.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  const beforeWheelTop = await messageList.evaluate(element => {
    element.scrollTop = 0;
    return element.scrollTop;
  });
  await messageList.hover();
  await page.mouse.wheel(0, 320);
  await expect.poll(async () => messageList.evaluate(element => element.scrollTop)).toBeGreaterThan(beforeWheelTop);

  await messageList.evaluate(element => {
    element.scrollTop = element.scrollHeight;
  });
  const assistantText = page.locator(".message-assistant p").filter({ hasText: "Give me one concrete example." });
  await assistantText.selectText();
  await assistantText.dispatchEvent("mouseup");
  const followupButton = page.getByRole("button", { name: "Ask follow-up" });
  await expect(followupButton).toBeVisible();
  const selectionBox = await page.evaluate(() => {
    const range = window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) : null;
    const rect = Array.from(range?.getClientRects() ?? []).findLast(item => item.width > 0 && item.height > 0);
    return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
  });
  const followupBox = await followupButton.boundingBox();
  if (!selectionBox || !followupBox) throw new Error("Expected selection and follow-up button boxes.");
  expect(Math.abs(followupBox.x - (selectionBox.x + selectionBox.width - 12))).toBeLessThan(24);
  expect(followupBox.y).toBeGreaterThanOrEqual(selectionBox.y + selectionBox.height);
  expect(followupBox.y).toBeLessThan(selectionBox.y + selectionBox.height + 8);
  const scrollHeightWithToolbar = await messageList.evaluate(element => element.scrollHeight);
  await expect.poll(async () => messageList.evaluate(element => element.scrollHeight)).toBe(scrollHeightWithToolbar);
  await followupButton.click();
  await expect(page.getByTestId("canvas-node")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Ask follow-up" })).toHaveCount(0);

  await assistantText.selectText();
  await assistantText.dispatchEvent("mouseup");
  await expect(followupButton).toBeVisible();
  await page.mouse.click(selectionBox.x + selectionBox.width + 20, selectionBox.y + selectionBox.height + 20);
  await expect(followupButton).toHaveCount(0);

  const nodeBox = await page.getByTestId("canvas-node").first().boundingBox();
  if (!nodeBox) throw new Error("Expected canvas node box.");
  await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + 24);
  await page.mouse.down();
  await page.mouse.move(nodeBox.x + nodeBox.width / 2 + 90, nodeBox.y + 64, { steps: 6 });
  const draggingBox = await page.getByTestId("canvas-node").first().boundingBox();
  if (!draggingBox) throw new Error("Expected canvas node box while dragging.");
  expect(draggingBox.x).toBeGreaterThan(nodeBox.x + 20);
  await page.mouse.move(nodeBox.x + nodeBox.width / 2 + 180, nodeBox.y + 104, { steps: 6 });
  await page.mouse.up();
  await expect(second.getByTestId("canvas-node").first()).not.toHaveAttribute("data-position", "120,120");

  await second.close();
});

test("creates a chat node from the empty canvas menu", async ({ page }) => {
  await clearDebugPosition(page);
  await page.goto("/");
  await register(page);
  await expect(page).toHaveURL(/\/workspaces\/[^/]+$/);
  await expect(page.getByTestId("canvas-node")).toHaveCount(1);

  const paneBox = await page.locator(".react-flow__pane").boundingBox();
  if (!paneBox) throw new Error("Expected canvas pane box.");
  await page.mouse.click(paneBox.x + paneBox.width - 120, paneBox.y + paneBox.height - 120, { button: "right" });

  await expect(page.getByRole("menu", { name: "Canvas actions" })).toBeVisible();
  await expect(page.getByTestId("canvas-node")).toHaveCount(1);
  await page.getByRole("menuitem", { name: "New chat" }).click();

  await expect(page.getByTestId("canvas-node")).toHaveCount(2);
});

test("confirms node deletion with an in-app modal", async ({ page }) => {
  await clearDebugPosition(page);
  await page.goto("/");
  await register(page);
  await expect(page).toHaveURL(/\/workspaces\/[^/]+$/);
  await expect(page.getByTestId("canvas-node")).toHaveCount(1);

  await page.getByRole("button", { name: "More node actions" }).click();
  await expect(page.getByRole("menu", { name: "Node actions" })).toContainText("Rename");
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog", { name: "Move chat to trash?" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("canvas-node")).toHaveCount(1);

  await page.getByRole("button", { name: "More node actions" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Move to trash" }).click();

  await expect(page.getByTestId("canvas-node")).toHaveCount(0);
});

async function register(page: Parameters<typeof clearDebugPosition>[0]) {
  await page.getByRole("button", { name: "Register" }).click();
  await page.getByLabel("Email").fill(`e2e-${Date.now()}@inquara.local`);
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create account" }).click();
}

async function clearDebugPosition(page: { addInitScript: (script: () => void) => Promise<void> }) {
  await page.addInitScript(() => {
    window.localStorage.removeItem("inquara.debug_position");
    window.localStorage.removeItem("inquara.debug_open");
  });
}
