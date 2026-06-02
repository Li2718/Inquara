import { prisma } from "@inquara/db";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  createNodeAtPosition,
  createNodeFromSelection,
  deleteNodeSubtree,
  hideNodeSubtree,
  organizeCanvasNodes,
  restoreDeletedNodeSubtree,
  renameNode,
  restoreNodeBranch,
  updateNodePosition,
  updateNodeSize,
  updateNodeScroll
} from "../canvas/service";
import { resetTestDatabase, stopEphemeralTestDatabase } from "./database";

let userId = "";
let canvasId = "";
let rootNodeId = "";
let sourceMessageId = "";

beforeEach(async () => {
  await resetTestDatabase();

  const user = await prisma.user.create({
    data: { email: "canvas@inquara.local", name: "Canvas User" }
  });
  userId = user.id;

  const canvas = await prisma.canvas.create({
    data: { ownerId: user.id, title: "Canvas" }
  });
  canvasId = canvas.id;

  const rootNode = await prisma.canvasNode.create({
    data: {
      canvasId,
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
      canvasId,
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
      canvasId,
      nodeId: "node-created-1",
      title: "New chat",
      x: 260,
      y: 180
    });

    const nodeCreated = events.find(event => event.type === "canvas.node.created");
    expect(nodeCreated?.clientMutationId).toBe("mutation-create");
    expect(nodeCreated?.version).toBe(1);
    if (nodeCreated?.type !== "canvas.node.created") throw new Error("Expected node created event");
    expect(nodeCreated.node.title).toBe("New chat");
    expect(nodeCreated.node.x).toBe(260);
    expect(nodeCreated.node).not.toHaveProperty("type");
  });

  it("creates a follow-up node and edge from selected source text", async () => {
    const events = await createNodeFromSelection(userId, {
      type: "node.createFromSelection",
      clientMutationId: "mutation-branch",
      canvasId,
      nodeId: "node-followup-1",
      edgeId: "edge-followup-1",
      sourceNodeId: rootNodeId,
      sourceMessageId,
      sourceQuote: "which context matters",
      sourceRangeStart: 18,
      sourceRangeEnd: 39,
      x: 560,
      y: 100
    });

    expect(events.map(event => event.type)).toEqual(["canvas.node.created", "canvas.edge.created"]);
    const childNode = await prisma.canvasNode.findFirstOrThrow({
      where: { canvasId, sourceMessageId }
    });
    const edge = await prisma.canvasEdge.findFirstOrThrow({
      where: { canvasId, targetNodeId: childNode.id }
    });

    expect(childNode.parentNodeId).toBe(rootNodeId);
    expect(childNode.sourceQuote).toBe("which context matters");
    expect(childNode.sourceRangeStart).toBe(18);
    expect(childNode.sourceRangeEnd).toBe(39);
    expect(edge.sourceNodeId).toBe(rootNodeId);
    expect(edge.sourceMessageId).toBe(sourceMessageId);
    expect(edge.label).toBe("which context matters");
  });

  it("updates node position and increments canvas version", async () => {
    const events = await updateNodePosition(userId, {
      type: "node.updatePosition",
      clientMutationId: "mutation-position",
      canvasId,
      nodeId: rootNodeId,
      x: 300,
      y: 340
    });

    const event = events[0];
    expect(event?.type).toBe("canvas.node.updated");
    if (event?.type !== "canvas.node.updated") throw new Error("Expected node updated event");
    expect(event.node.x).toBe(300);
    expect(event.node.y).toBe(340);
    expect(event.version).toBe(1);
  });

  it("updates node size and emits an updated event", async () => {
    const events = await updateNodeSize(userId, {
      type: "node.updateSize",
      clientMutationId: "mutation-size",
      canvasId,
      nodeId: rootNodeId,
      width: 540,
      height: 680
    });

    const event = events[0];
    expect(event?.type).toBe("canvas.node.updated");
    if (event?.type !== "canvas.node.updated") throw new Error("Expected node updated event");
    expect(event.node.width).toBe(540);
    expect(event.node.height).toBe(680);
    expect(event.version).toBe(1);
  });

  it("renames a node and emits an updated event", async () => {
    const events = await renameNode(userId, {
      type: "node.rename",
      clientMutationId: "mutation-rename",
      canvasId,
      nodeId: rootNodeId,
      title: "Better title"
    });

    const event = events[0];
    expect(event?.type).toBe("canvas.node.updated");
    if (event?.type !== "canvas.node.updated") throw new Error("Expected node updated event");
    expect(event.node.title).toBe("Better title");
    expect(event.version).toBe(1);
  });

  it("hides a node subtree, stores visibility and scroll state, then restores it", async () => {
    await createNodeFromSelection(userId, {
      type: "node.createFromSelection",
      clientMutationId: "mutation-branch",
      canvasId,
      nodeId: "node-followup-2",
      edgeId: "edge-followup-2",
      sourceNodeId: rootNodeId,
      sourceMessageId,
      sourceQuote: "which context matters",
      sourceRangeStart: 18,
      sourceRangeEnd: 39,
      x: 560,
      y: 100
    });
    const childNode = await prisma.canvasNode.findFirstOrThrow({ where: { canvasId, parentNodeId: rootNodeId } });
    await updateNodeScroll(userId, {
      type: "node.updateScroll",
      clientMutationId: "mutation-scroll",
      canvasId,
      nodeId: childNode.id,
      scrollTop: 144
    });

    const hiddenEvents = await hideNodeSubtree(userId, {
      type: "node.hideSubtree",
      clientMutationId: "mutation-hide",
      canvasId,
      nodeId: childNode.id,
      scrollTop: 233
    });

    expect(hiddenEvents).toHaveLength(1);
    const hiddenChild = await prisma.canvasNode.findUniqueOrThrow({ where: { id: childNode.id } });
    expect(hiddenChild.hiddenAt).toBeTruthy();
    expect(hiddenChild.scrollTop).toBe(233);
    expect(hiddenChild.hiddenStateSnapshot).toMatchObject({
      [childNode.id]: { hiddenAt: null, scrollTop: 233, offsetX: 460, offsetY: 0 }
    });

    const restoredEvents = await restoreNodeBranch(userId, {
      type: "node.restoreBranch",
      clientMutationId: "mutation-restore",
      canvasId,
      nodeId: childNode.id
    });

    expect(restoredEvents).toHaveLength(1);
    const restoredChild = await prisma.canvasNode.findUniqueOrThrow({ where: { id: childNode.id } });
    expect(restoredChild.hiddenAt).toBeNull();
    expect(restoredChild.scrollTop).toBe(233);
  });

  it("always makes the restored branch root visible even if its saved state was hidden", async () => {
    await createNodeFromSelection(userId, {
      type: "node.createFromSelection",
      clientMutationId: "mutation-branch",
      canvasId,
      nodeId: "node-followup-3",
      edgeId: "edge-followup-3",
      sourceNodeId: rootNodeId,
      sourceMessageId,
      sourceQuote: "which context matters",
      sourceRangeStart: 18,
      sourceRangeEnd: 39,
      x: 560,
      y: 100
    });
    const childNode = await prisma.canvasNode.findFirstOrThrow({ where: { canvasId, parentNodeId: rootNodeId } });
    await prisma.canvasNode.update({
      where: { id: childNode.id },
      data: {
        hiddenAt: new Date("2026-05-28T00:00:00.000Z"),
        hiddenStateSnapshot: {
          [childNode.id]: {
            hiddenAt: "2026-05-28T00:00:00.000Z",
            scrollTop: 144
          }
        }
      }
    });

    await restoreNodeBranch(userId, {
      type: "node.restoreBranch",
      clientMutationId: "mutation-restore-root",
      canvasId,
      nodeId: childNode.id
    });

    const restoredChild = await prisma.canvasNode.findUniqueOrThrow({ where: { id: childNode.id } });
    expect(restoredChild.hiddenAt).toBeNull();
    expect(restoredChild.scrollTop).toBe(144);
  });

  it("moves the restored branch root when a restore position is provided", async () => {
    await createNodeFromSelection(userId, {
      type: "node.createFromSelection",
      clientMutationId: "mutation-branch",
      canvasId,
      nodeId: "node-followup-4",
      edgeId: "edge-followup-4",
      sourceNodeId: rootNodeId,
      sourceMessageId,
      sourceQuote: "which context matters",
      sourceRangeStart: 18,
      sourceRangeEnd: 39,
      x: 560,
      y: 100
    });
    const childNode = await prisma.canvasNode.findFirstOrThrow({ where: { canvasId, parentNodeId: rootNodeId } });
    await hideNodeSubtree(userId, {
      type: "node.hideSubtree",
      clientMutationId: "mutation-hide",
      canvasId,
      nodeId: childNode.id
    });

    await restoreNodeBranch(userId, {
      type: "node.restoreBranch",
      clientMutationId: "mutation-restore-position",
      canvasId,
      nodeId: childNode.id,
      x: 860,
      y: 240
    });

    const restoredChild = await prisma.canvasNode.findUniqueOrThrow({ where: { id: childNode.id } });
    expect(restoredChild.hiddenAt).toBeNull();
    expect(restoredChild.x).toBe(860);
    expect(restoredChild.y).toBe(240);
  });

  it("restores nested hidden descendants from parent-relative offsets", async () => {
    const childNode = await prisma.canvasNode.create({
      data: {
        canvasId,
        title: "Branch",
        x: 560,
        y: 100,
        width: 420,
        height: 520,
        collapsed: false,
        parentNodeId: rootNodeId,
        sourceNodeId: rootNodeId,
        sourceMessageId
      }
    });
    const grandchildNode = await prisma.canvasNode.create({
      data: {
        canvasId,
        title: "Nested branch",
        x: 1_040,
        y: 180,
        width: 420,
        height: 520,
        collapsed: false,
        parentNodeId: childNode.id,
        sourceNodeId: childNode.id
      }
    });

    await hideNodeSubtree(userId, {
      type: "node.hideSubtree",
      clientMutationId: "mutation-hide-nested",
      canvasId,
      nodeId: childNode.id
    });

    await updateNodePosition(userId, {
      type: "node.updatePosition",
      clientMutationId: "mutation-move-root",
      canvasId,
      nodeId: rootNodeId,
      x: 320,
      y: 412
    });

    await restoreNodeBranch(userId, {
      type: "node.restoreBranch",
      clientMutationId: "mutation-restore-nested",
      canvasId,
      nodeId: childNode.id
    });

    const restoredChild = await prisma.canvasNode.findUniqueOrThrow({ where: { id: childNode.id } });
    const restoredGrandchild = await prisma.canvasNode.findUniqueOrThrow({ where: { id: grandchildNode.id } });
    expect(restoredChild.hiddenAt).toBeNull();
    expect(restoredGrandchild.hiddenAt).toBeNull();
    expect(restoredChild.x).toBe(780);
    expect(restoredChild.y).toBe(412);
    expect(restoredGrandchild.x).toBe(1_260);
    expect(restoredGrandchild.y).toBe(492);
  });

  it("organizes only visible nodes and keeps hidden nodes untouched", async () => {
    const visibleChild = await prisma.canvasNode.create({
      data: {
        canvasId,
        title: "Visible branch",
        x: 900,
        y: 40,
        width: 420,
        height: 520,
        collapsed: false,
        parentNodeId: rootNodeId,
        sourceNodeId: rootNodeId,
        sourceMessageId
      }
    });
    const hiddenChild = await prisma.canvasNode.create({
      data: {
        canvasId,
        title: "Hidden branch",
        x: 900,
        y: 700,
        width: 420,
        height: 520,
        collapsed: false,
        parentNodeId: rootNodeId,
        sourceNodeId: rootNodeId,
        sourceMessageId,
        hiddenAt: new Date("2026-05-28T00:00:00.000Z")
      }
    });

    const events = await organizeCanvasNodes(userId, {
      type: "node.organize",
      clientMutationId: "mutation-organize",
      canvasId
    });

    expect(events.map(event => event.type)).toEqual(["canvas.node.updated", "canvas.node.updated"]);

    const refreshedRoot = await prisma.canvasNode.findUniqueOrThrow({ where: { id: rootNodeId } });
    const refreshedVisibleChild = await prisma.canvasNode.findUniqueOrThrow({ where: { id: visibleChild.id } });
    const refreshedHiddenChild = await prisma.canvasNode.findUniqueOrThrow({ where: { id: hiddenChild.id } });

    expect(refreshedRoot.x).toBe(100);
    expect(refreshedRoot.y).toBe(120);
    expect(refreshedVisibleChild.x).toBe(584);
    expect(refreshedVisibleChild.y).toBe(120);
    expect(refreshedHiddenChild.x).toBe(900);
    expect(refreshedHiddenChild.y).toBe(700);
    expect(refreshedHiddenChild.hiddenAt?.toISOString()).toBe("2026-05-28T00:00:00.000Z");
  });

  it("soft deletes and restores a node subtree", async () => {
    const createEvents = await createNodeAtPosition(userId, {
      type: "node.createAtPosition",
      clientMutationId: "mutation-create-delete",
      canvasId,
      nodeId: "node-disposable-1",
      title: "Disposable",
      x: 300,
      y: 300
    });
    const created = createEvents[0];
    if (created?.type !== "canvas.node.created") throw new Error("Expected node created event");

    await deleteNodeSubtree(userId, {
      type: "node.deleteSubtree",
      clientMutationId: "mutation-delete",
      canvasId,
      nodeId: created.node.id
    });
    expect((await prisma.canvasNode.findUniqueOrThrow({ where: { id: created.node.id } })).deletedAt).toBeTruthy();

    await restoreDeletedNodeSubtree(userId, {
      type: "node.restoreDeletedSubtree",
      clientMutationId: "mutation-restore-delete",
      canvasId,
      nodeId: created.node.id
    });
    const restored = await prisma.canvasNode.findUniqueOrThrow({ where: { id: created.node.id } });
    expect(restored.deletedAt).toBeNull();
    expect(restored.hiddenAt).toBeNull();
  });
});
