import { prisma } from "./client";

const user = await prisma.user.upsert({
  where: { email: "demo@inquara.local" },
  update: {},
  create: { email: "demo@inquara.local", name: "Demo User" }
});

const workspace = await prisma.workspace.create({
  data: { ownerId: user.id, title: "First canvas" }
});

const rootNode = await prisma.canvasNode.create({
  data: {
    workspaceId: workspace.id,
    title: "Main chat",
    x: 120,
    y: 120,
    width: 420,
    height: 520,
    collapsed: false
  }
});

await prisma.nodeMessage.create({
  data: {
    workspaceId: workspace.id,
    nodeId: rootNode.id,
    role: "assistant",
    content: "Ask me anything. Select part of an answer to branch into a focused follow-up.",
    status: "complete"
  }
});

console.log(`Seeded ${user.email} with workspace ${workspace.id}`);
await prisma.$disconnect();
