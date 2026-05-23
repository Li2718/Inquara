import { prisma } from "@inquara/db";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createNodeAtPosition, createNodeFromSelection, updateNodePosition } from "../canvas/service";

let userId = "";
let workspaceId = "";
let rootNodeId = "";
let sourceMessageId = "";

beforeEach(async () => {
  await prisma.canvasEdge.deleteMany();
  await prisma.nodeMessage.deleteMany();
  await prisma.canvasNode.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

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
  await prisma.$disconnect();
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
});
