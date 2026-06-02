import { prisma } from "@inquara/db";

const dayMs = 24 * 60 * 60 * 1000;

export type AdminUserListItem = {
  id: string;
  avatarUrl: string | null;
  canvasCount: number;
  chatCount: number;
  createdAt: string;
  email: string;
  lastLoginAt: string | null;
  lastQuestionAt: string | null;
  loginDays: number;
  name: string | null;
  questionCount: number;
  registeredDays: number;
  role: string;
};

export async function listAdminUsers(now = new Date()): Promise<AdminUserListItem[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      avatarUrl: true,
      createdAt: true,
      email: true,
      name: true,
      role: true
    }
  });
  const userIds = users.map(user => user.id);
  const [canvasCounts, chatCounts, questionCounts, lastQuestions, lastLogins, loginDays] = await Promise.all([
    prisma.workspace.groupBy({
      by: ["ownerId"],
      where: { ownerId: { in: userIds }, archivedAt: null },
      _count: { _all: true }
    }),
    prisma.canvasNode.groupBy({
      by: ["workspaceId"],
      where: {
        deletedAt: null,
        workspace: { ownerId: { in: userIds }, archivedAt: null }
      },
      _count: { _all: true }
    }),
    prisma.nodeMessage.groupBy({
      by: ["workspaceId"],
      where: {
        role: "user",
        workspace: { ownerId: { in: userIds }, archivedAt: null }
      },
      _count: { _all: true }
    }),
    prisma.nodeMessage.groupBy({
      by: ["workspaceId"],
      where: {
        role: "user",
        workspace: { ownerId: { in: userIds }, archivedAt: null }
      },
      _max: { createdAt: true }
    }),
    prisma.userSession.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _max: { createdAt: true }
    }),
    prisma.userSession.findMany({
      where: { userId: { in: userIds } },
      select: { createdAt: true, userId: true }
    })
  ]);

  const workspaceOwners = await prisma.workspace.findMany({
    where: { ownerId: { in: userIds }, archivedAt: null },
    select: { id: true, ownerId: true }
  });
  const workspaceOwnerById = new Map(workspaceOwners.map(workspace => [workspace.id, workspace.ownerId]));

  const canvasCountByUser = new Map(canvasCounts.map(item => [item.ownerId, item._count._all]));
  const chatCountByUser = sumWorkspaceCountsByUser(chatCounts, workspaceOwnerById);
  const questionCountByUser = sumWorkspaceCountsByUser(questionCounts, workspaceOwnerById);
  const lastQuestionByUser = maxWorkspaceDatesByUser(lastQuestions, workspaceOwnerById);
  const lastLoginByUser = new Map(lastLogins.map(item => [item.userId, item._max.createdAt ?? null]));
  const loginDaysByUser = countDistinctLoginDays(loginDays);

  return users
    .map(user => ({
      id: user.id,
      avatarUrl: user.avatarUrl,
      canvasCount: canvasCountByUser.get(user.id) ?? 0,
      chatCount: chatCountByUser.get(user.id) ?? 0,
      createdAt: user.createdAt.toISOString(),
      email: user.email,
      lastLoginAt: lastLoginByUser.get(user.id)?.toISOString() ?? null,
      lastQuestionAt: lastQuestionByUser.get(user.id)?.toISOString() ?? null,
      loginDays: loginDaysByUser.get(user.id) ?? 0,
      name: user.name,
      questionCount: questionCountByUser.get(user.id) ?? 0,
      registeredDays: countInclusiveDays(user.createdAt, now),
      role: user.role
    }))
    .sort(compareAdminUsers);
}

function sumWorkspaceCountsByUser(
  counts: Array<{ workspaceId: string; _count: { _all: number } }>,
  workspaceOwnerById: Map<string, string>
): Map<string, number> {
  const result = new Map<string, number>();
  for (const item of counts) {
    const userId = workspaceOwnerById.get(item.workspaceId);
    if (!userId) continue;
    result.set(userId, (result.get(userId) ?? 0) + item._count._all);
  }
  return result;
}

function maxWorkspaceDatesByUser(
  rows: Array<{ workspaceId: string; _max: { createdAt: Date | null } }>,
  workspaceOwnerById: Map<string, string>
): Map<string, Date> {
  const result = new Map<string, Date>();
  for (const row of rows) {
    const userId = workspaceOwnerById.get(row.workspaceId);
    const value = row._max.createdAt;
    if (!userId || !value) continue;
    const current = result.get(userId);
    if (!current || value > current) result.set(userId, value);
  }
  return result;
}

function countDistinctLoginDays(rows: Array<{ userId: string; createdAt: Date }>): Map<string, number> {
  const daysByUser = new Map<string, Set<string>>();
  for (const row of rows) {
    const days = daysByUser.get(row.userId) ?? new Set<string>();
    days.add(row.createdAt.toISOString().slice(0, 10));
    daysByUser.set(row.userId, days);
  }
  return new Map(Array.from(daysByUser.entries(), ([userId, days]) => [userId, days.size]));
}

function countInclusiveDays(from: Date, to: Date): number {
  return Math.max(1, Math.floor((to.getTime() - from.getTime()) / dayMs) + 1);
}

function compareAdminUsers(left: AdminUserListItem, right: AdminUserListItem): number {
  return (
    compareNullableDatesDesc(left.lastQuestionAt, right.lastQuestionAt) ||
    compareNullableDatesDesc(left.lastLoginAt, right.lastLoginAt) ||
    right.createdAt.localeCompare(left.createdAt) ||
    left.email.localeCompare(right.email)
  );
}

function compareNullableDatesDesc(left: string | null, right: string | null): number {
  if (left && right) return right.localeCompare(left);
  if (left) return -1;
  if (right) return 1;
  return 0;
}
