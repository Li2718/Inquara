import { prisma } from "@inquara/db";
import { expect, test } from "@playwright/test";

test.beforeEach(async () => {
  await prisma.canvasEdge.deleteMany();
  await prisma.nodeMessage.deleteMany();
  await prisma.canvasNode.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("streams chat updates into two open workspace windows", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Your canvases" })).toBeVisible();

  await page.getByRole("button", { name: "Create" }).click();
  const workspace = page.getByRole("link", { name: /Research canvas/ }).first();
  await expect(workspace).toBeVisible();
  const workspacePath = await workspace.getAttribute("href");
  if (!workspacePath) throw new Error("Expected workspace link.");
  await page.goto(workspacePath);

  await expect(page.getByText("Connection: connected")).toBeVisible();
  await expect(page.getByText("Ask me anything")).toBeVisible();

  const second = await page.context().newPage();
  await second.goto(workspacePath);
  await expect(second.getByText("Connection: connected")).toBeVisible();
  await expect(second.getByText("Ask me anything")).toBeVisible();

  await page.getByPlaceholder("Ask in this node").fill("What is attention?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("What is attention?", { exact: true })).toBeVisible();
  await expect(second.getByText("What is attention?", { exact: true })).toBeVisible();
  await expect(page.getByText(/Here is a focused explanation/)).toBeVisible();
  await expect(second.getByText(/Here is a focused explanation/)).toBeVisible();

  const nodeBox = await page.getByTestId("canvas-node").first().boundingBox();
  if (!nodeBox) throw new Error("Expected canvas node box.");
  await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + 24);
  await page.mouse.down();
  await page.mouse.move(nodeBox.x + nodeBox.width / 2 + 180, nodeBox.y + 104, { steps: 12 });
  await page.mouse.up();
  await expect(second.getByTestId("canvas-node").first()).not.toHaveAttribute("data-position", "120,120");

  await second.close();
});
