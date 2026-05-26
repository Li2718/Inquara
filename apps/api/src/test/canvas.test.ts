import { prisma } from "@inquara/db";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  createNodeAtPosition,
  createNodeFromSelection,
  deleteNodeSubtree,
  hideNodeSubtree,
  restoreDeletedNodeSubtree,
  renameNode,
  restoreNodeBranch,
  updateNodePosition,
  updateNodeSize,
  updateNodeScroll
} from "../canvas/service";
import { resetTestDatabase, stopEphemeralTestDatabase } from "./database";

let userId = "";
let workspaceId = "";
let rootNodeId = "";
let sourceMessageId = "";

beforeEach(async () => {
  await resetTestDatabase();

  const user = await prisma.user.create({
    data: { email: "canvas@inquara.local", name: "Canvas User" }
  });
  userId = user.id;

  const workspace = await prisma.workspace.create({
    data: { ownerId: user.id, title: "Canvas" }
  });
  workspaceId = workspace.id;

  const rootNode = await prisma.canvasNode.create({
    data: {
      workspaceId,
      title: "Main chat",
      x: 100,
      y: 100,
      width: 420,
      height: 520,
      collapsed: false
    }
  });
  rootNodeId = rootNode.id;

  const sourceMessage = await prisma.nodeMessage.create({
    data: {
      workspaceId,
      nodeId: rootNode.id,
      role: "assistant",
      content: "Attention decides which context matters.",
      status: "complete"
    }
  });
  sourceMessageId = sourceMessage.id;
});

afterAll(async () => {
  await stopEphemeralTestDatabase();
});

describe("canvas command services", () => {
  it("creates a node at a position and emits a node created event", async () => {
    const events = await createNodeAtPosition(userId, {
      type: "node.createAtPosition",
      clientMutationId: "mutation-create",
      workspaceId,
      title: "New chat",
      x: 260,
      y: 180
    });

    const nodeCreated = events.find(event => event.type === "workspace.node.created");
    expect(nodeCreated?.clientMutationId).toBe("mutation-create");
    expect(nodeCreated?.version).toBe(1);
    if (nodeCreated?.type !== "workspace.node.created") throw new Error("Expected node created event");
    expect(nodeCreated.node.title).toBe("New chat");
    expect(nodeCreated.node.x).toBe(260);
    expect(nodeCreated.node).not.toHaveProperty("type");
  });

  it("creates a follow-up node and edge from selected source text", async () => {
    const events = await createNodeFromSelection(userId, {
      type: "node.createFromSelection",
      clientMutationId: "mutation-branch",
      workspaceId,
      sourceNodeId: rootNodeId,
      sourceMessageId,
      sourceQuote: "which context matters",
      sourceRangeStart: 18,
      sourceRangeEnd: 39,
      x: 560,
      y: 100
    });

    expect(events.map(event => event.type)).toEqual(["workspace.node.created", "workspace.edge.created"]);
    const childNode = await prisma.canvasNode.findFirstOrThrow({
      where: { workspaceId, sourceMessageId }
    });
    const edge = await prisma.canvasEdge.findFirstOrThrow({
      where: { workspaceId, targetNodeId: childNode.id }
    });

    expect(childNode.parentNodeId).toBe(rootNodeId);
    expect(childNode.sourceQuote).toBe("which context matters");
    expect(childNode.sourceRangeStart).toBe(18);
    expect(childNode.sourceRangeEnd).toBe(39);
    expect(edge.sourceNodeId).toBe(rootNodeId);
    expect(edge.sourceMessageId).toBe(sourceMessageId);
    expect(edge.label).toBe("which context matters");
  });

  it("updates node position and increments workspace version", async () => {
    const events = await updateNodePosition(userId, {
      type: "node.updatePosition",
      clientMutationId: "mutation-position",
      workspaceId,
      nodeId: rootNodeId,
      x: 300,
      y: 340
    });

    const event = events[0];
    expect(event?.type).toBe("workspace.node.updated");
    if (event?.type !== "workspace.node.updated") throw new Error("Expected node updated event");
    expect(event.node.x).toBe(300);
    expect(event.node.y).toBe(340);
    expect(event.version).toBe(1);
  });

  it("updates node size and emits an updated event", async () => {
    const events = await updateNodeSize(userId, {
      type: "node.updateSize",
      clientMutationId: "mutation-size",
      workspaceId,
      nodeId: rootNodeId,
      width: 540,
      height: 680
    });

    const event = events[0];
    expect(event?.type).toBe("workspace.node.updated");
    if (event?.type !== "workspace.node.updated") throw new Error("Expected node updated event");
    expect(event.node.width).toBe(540);
    expect(event.node.height).toBe(680);
    expect(event.version).toBe(1);
  });

  it("renames a node and emits an updated event", async () => {
    const events = await renameNode(userId, {
      type: "node.rename",
      clientMutationId: "mutation-rename",
      workspaceId,
      nodeId: rootNodeId,
      title: "Better title"
    });

    const event = events[0];
    expect(event?.type).toBe("workspace.node.updated");
    if (event?.type !== "workspace.node.updated") throw new Error("Expected node updated event");
    expect(event.node.title).toBe("Better title");
    expect(event.version).toBe(1);
  });

  it("hides a node subtree, stores visibility and scroll state, then restores it", async () => {
    await createNodeFromSelection(userId, {
      type: "node.createFromSelection",
      clientMutationId: "mutation-branch",
      workspaceId,
      sourceNodeId: rootNodeId,
      sourceMessageId,
      sourceQuote: "which context matters",
      sourceRangeStart: 18,
      sourceRangeEnd: 39,
      x: 560,
      y: 100
    });
    const childNode = await prisma.canvasNode.findFirstOrThrow({ where: { workspaceId, parentNodeId: rootNodeId } });
    await updateNodeScroll(userId, {
      type: "node.updateScroll",
      clientMutationId: "mutation-scroll",
      workspaceId,
      nodeId: childNode.id,
      scrollTop: 144
    });

    const hiddenEvents = await hideNodeSubtree(userId, {
      type: "node.hideSubtree",
      clientMutationId: "mutation-hide",
      workspaceId,
      nodeId: childNode.id,
      scrollTop: 233
    });

    expect(hiddenEvents).toHaveLength(1);
    const hiddenChild = await prisma.canvasNode.findUniqueOrThrow({ where: { id: childNode.id } });
    expect(hiddenChild.hiddenAt).toBeTruthy();
    expect(hiddenChild.scrollTop).toBe(233);
    expect(hiddenChild.hiddenStateSnapshot).toMatchObject({
      [childNode.id]: { hiddenAt: null, scrollTop: 233 }
    });

    const restoredEvents = await restoreNodeBranch(userId, {
      type: "node.restoreBranch",
      clientMutationId: "mutation-restore",
      workspaceId,
      nodeId: childNode.id
    });

    expect(restoredEvents).toHaveLength(1);
    const restoredChild = await prisma.canvasNode.findUniqueOrThrow({ where: { id: childNode.id } });
    expect(restoredChild.hiddenAt).toBeNull();
    expect(restoredChild.scrollTop).toBe(233);
  });

  it("soft deletes and restores a node subtree", async () => {
    const createEvents = await createNodeAtPosition(userId, {
      type: "node.createAtPosition",
      clientMutationId: "mutation-create-delete",
      workspaceId,
      title: "Disposable",
      x: 300,
      y: 300
    });
    const created = createEvents[0];
    if (created?.type !== "workspace.node.created") throw new Error("Expected node created event");

    await deleteNodeSubtree(userId, {
      type: "node.deleteSubtree",
      clientMutationId: "mutation-delete",
      workspaceId,
      nodeId: created.node.id
    });
    expect((await prisma.canvasNode.findUniqueOrThrow({ where: { id: created.node.id } })).deletedAt).toBeTruthy();

    await restoreDeletedNodeSubtree(userId, {
      type: "node.restoreDeletedSubtree",
      clientMutationId: "mutation-restore-delete",
      workspaceId,
      nodeId: created.node.id
    });
    const restored = await prisma.canvasNode.findUniqueOrThrow({ where: { id: created.node.id } });
    expect(restored.deletedAt).toBeNull();
    expect(restored.hiddenAt).toBeNull();
  });
});
