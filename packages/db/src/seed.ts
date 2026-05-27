import { prisma } from "./client";
import { seedAdminUser, seedPasswordUser } from "./admin";

const user = await seedPasswordUser(prisma, {
  email: "demo@inquara.local",
  name: "Demo User",
  password: "111111"
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

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const admin = await seedAdminUser(prisma, {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  });
  console.log(`Seeded admin ${admin.email}`);
}

await prisma.$disconnect();
