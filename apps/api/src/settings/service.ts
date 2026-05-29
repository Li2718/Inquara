import { prisma, type PrismaClient } from "@inquara/db";
import type { Prisma } from "@prisma/client";

const invitationOnlyRegistrationKey = "registration.invitationOnly";
const redemptionCodeLengthKey = "redemptionCode.length";
const defaultRedemptionCodeLength = 6;
const maxRedemptionCodeLength = 24;

type SettingsClient = PrismaClient | Prisma.TransactionClient;

export async function getInvitationOnlyRegistration(client: SettingsClient = prisma): Promise<boolean> {
  const setting = await client.systemSetting.findUnique({
    where: { key: invitationOnlyRegistrationKey }
  });
  if (!setting) return process.env.NODE_ENV === "production";

  return parseBooleanSetting(setting.value);
}

export async function setInvitationOnlyRegistration(enabled: boolean): Promise<{ invitationOnly: boolean }> {
  await prisma.systemSetting.upsert({
    where: { key: invitationOnlyRegistrationKey },
    update: { value: enabled },
    create: { key: invitationOnlyRegistrationKey, value: enabled }
  });
  return { invitationOnly: enabled };
}

export async function getRedemptionCodeLength(client: SettingsClient = prisma): Promise<number> {
  const setting = await client.systemSetting.findUnique({
    where: { key: redemptionCodeLengthKey }
  });
  if (!setting) return defaultRedemptionCodeLength;

  return parseCodeLengthSetting(setting.value);
}

export async function increaseRedemptionCodeLength(currentLength: number): Promise<number> {
  const nextLength = Math.min(currentLength + 1, maxRedemptionCodeLength);
  await prisma.systemSetting.upsert({
    where: { key: redemptionCodeLengthKey },
    update: { value: nextLength },
    create: { key: redemptionCodeLengthKey, value: nextLength }
  });
  return nextLength;
}

function parseBooleanSetting(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value && typeof value === "object" && !Array.isArray(value) && "enabled" in value) {
    return (value as { enabled?: unknown }).enabled === true;
  }
  return false;
}

function parseCodeLengthSetting(value: unknown): number {
  const rawLength =
    typeof value === "number"
      ? value
      : value && typeof value === "object" && !Array.isArray(value) && "length" in value
        ? (value as { length?: unknown }).length
        : undefined;
  if (typeof rawLength !== "number" || !Number.isInteger(rawLength)) return defaultRedemptionCodeLength;
  return Math.min(Math.max(rawLength, defaultRedemptionCodeLength), maxRedemptionCodeLength);
}
