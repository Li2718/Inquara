import { prisma, type PrismaClient } from "@inquara/db";
import { Prisma } from "@prisma/client";
import { randomInt } from "node:crypto";
import { getRedemptionCodeLength, increaseRedemptionCodeLength } from "../settings/service";

export const registrationEligibilityTarget = "registration_eligibility";
export const adminSource = "admin";
export const registrationAction = "user_registration";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const maxGenerationAttempts = 20;
const collisionUpgradeThreshold = 5;
const namespaceUpgradeThreshold = 0.2;
const unavailableCodeMessage = "Invitation code is unavailable or expired.";

type RedemptionCodeClient = PrismaClient | Prisma.TransactionClient;

export class RedemptionCodeError extends Error {
  constructor(
    message = unavailableCodeMessage,
    public readonly statusCode = 403
  ) {
    super(message);
    this.name = "RedemptionCodeError";
  }
}

export type CreateRedemptionCodeInput = {
  expiresAt?: Date | null;
  maxRedemptions?: number;
  note?: string | null;
};

export async function createRegistrationRedemptionCode(adminUserId: string, input: CreateRedemptionCodeInput = {}) {
  const maxRedemptions = input.maxRedemptions ?? 1;
  if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1) {
    throw new RedemptionCodeError("Max redemptions must be at least 1.", 400);
  }

  let codeLength = await getRedemptionCodeLength();
  let consecutiveCollisions = 0;
  for (let attempt = 0; attempt < maxGenerationAttempts; attempt += 1) {
    const code = generateAvailableCode(codeLength);
    try {
      return toRedemptionCodeDto(
        await prisma.redemptionCode.create({
          data: {
            code,
            createdById: adminUserId,
            expiresAt: input.expiresAt ?? null,
            maxRedemptions,
            note: normalizeNote(input.note),
            source: adminSource,
            target: registrationEligibilityTarget
          },
          include: redemptionCodeInclude
        })
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        consecutiveCollisions += 1;
        if (consecutiveCollisions >= collisionUpgradeThreshold) {
          if (await isCodeLengthNamespaceCrowded(codeLength)) {
            codeLength = await increaseRedemptionCodeLength(codeLength);
          }
          consecutiveCollisions = 0;
        }
        continue;
      }
      throw error;
    }
  }

  throw new RedemptionCodeError("Could not generate a unique redemption code.", 500);
}

export async function listRegistrationRedemptionCodes() {
  const codes = await prisma.redemptionCode.findMany({
    where: { target: registrationEligibilityTarget },
    include: redemptionCodeInclude,
    orderBy: { createdAt: "desc" }
  });
  return codes.map(toRedemptionCodeDto);
}

export async function disableRegistrationRedemptionCode(code: string) {
  const normalizedCode = normalizeRedemptionCode(code);
  const existing = await findRegistrationRedemptionCode(normalizedCode);
  assertCodeExists(existing);
  assertCodeIsNotExpired(existing);
  assertCodeIsNotExhausted(existing);

  const disabled = await prisma.redemptionCode.update({
    where: { code: normalizedCode },
    data: { disabledAt: new Date() },
    include: redemptionCodeInclude
  });
  return toRedemptionCodeDto(disabled);
}

export async function enableRegistrationRedemptionCode(code: string) {
  const normalizedCode = normalizeRedemptionCode(code);
  const existing = await findRegistrationRedemptionCode(normalizedCode);
  assertCodeExists(existing);
  assertCodeIsNotExpired(existing);
  assertCodeIsNotExhausted(existing);

  const enabled = await prisma.redemptionCode.update({
    where: { code: normalizedCode },
    data: { disabledAt: null },
    include: redemptionCodeInclude
  });
  return toRedemptionCodeDto(enabled);
}

export async function deleteRegistrationRedemptionCode(code: string) {
  const normalizedCode = normalizeRedemptionCode(code);
  const existing = await findRegistrationRedemptionCode(normalizedCode);
  assertCodeExists(existing);
  if (existing.redemptions.length > 0) {
    throw new RedemptionCodeError("Only unused invitation codes can be deleted.", 400);
  }

  await prisma.redemptionCode.delete({
    where: { code: normalizedCode }
  });
}

export async function updateRegistrationRedemptionCodeNote(code: string, note: string | null | undefined) {
  const normalizedCode = normalizeRedemptionCode(code);
  const updated = await prisma.redemptionCode.update({
    where: { code: normalizedCode },
    data: { note: normalizeNote(note) },
    include: redemptionCodeInclude
  });
  return toRedemptionCodeDto(updated);
}

export async function redeemRegistrationCodeForUser(
  client: RedemptionCodeClient,
  rawCode: string | null | undefined,
  userId: string
): Promise<void> {
  const code = normalizeRedemptionCode(rawCode ?? "");
  if (!code) throw new RedemptionCodeError();

  await lockRedemptionCodeRow(client, code);
  const redemptionCode = await client.redemptionCode.findUnique({
    where: { code },
    include: { redemptions: true }
  });
  if (!redemptionCode || redemptionCode.target !== registrationEligibilityTarget) throw new RedemptionCodeError();
  if (redemptionCode.disabledAt) throw new RedemptionCodeError();
  if (redemptionCode.expiresAt && redemptionCode.expiresAt <= new Date()) throw new RedemptionCodeError();
  if (redemptionCode.redemptions.length >= redemptionCode.maxRedemptions) throw new RedemptionCodeError();

  try {
    await client.redemptionCodeRedemption.create({
      data: {
        action: registrationAction,
        redemptionCodeId: redemptionCode.id,
        target: registrationEligibilityTarget,
        userId
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new RedemptionCodeError();
    throw error;
  }
}

export function normalizeRedemptionCode(value: string): string {
  return value.replace(/[\s-]+/g, "").trim().toUpperCase();
}

function generateAvailableCode(length: number): string {
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}

async function isCodeLengthNamespaceCrowded(length: number): Promise<boolean> {
  const countRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM redemption_codes
    WHERE char_length(code) = ${length}
  `;
  const issuedCount = Number(countRows[0]?.count ?? 0);
  return issuedCount >= alphabet.length ** length * namespaceUpgradeThreshold;
}

function normalizeNote(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

async function findRegistrationRedemptionCode(code: string) {
  return prisma.redemptionCode.findUnique({
    where: { code },
    include: redemptionCodeInclude
  });
}

function assertCodeExists(
  value: Prisma.RedemptionCodeGetPayload<{ include: typeof redemptionCodeInclude }> | null
): asserts value is Prisma.RedemptionCodeGetPayload<{ include: typeof redemptionCodeInclude }> {
  if (!value || value.target !== registrationEligibilityTarget) {
    throw new RedemptionCodeError("Invitation code not found.", 404);
  }
}

function assertCodeIsNotExpired(value: Prisma.RedemptionCodeGetPayload<{ include: typeof redemptionCodeInclude }>) {
  if (value.expiresAt && value.expiresAt <= new Date()) {
    throw new RedemptionCodeError("Expired invitation codes cannot be changed.", 400);
  }
}

function assertCodeIsNotExhausted(value: Prisma.RedemptionCodeGetPayload<{ include: typeof redemptionCodeInclude }>) {
  if (value.redemptions.length >= value.maxRedemptions) {
    throw new RedemptionCodeError("Exhausted invitation codes cannot be changed.", 400);
  }
}

async function lockRedemptionCodeRow(client: RedemptionCodeClient, code: string): Promise<void> {
  await client.$queryRaw`
    SELECT id
    FROM redemption_codes
    WHERE code = ${code}
    FOR UPDATE
  `;
}

const redemptionCodeInclude = {
  createdBy: {
    select: { email: true, id: true, name: true }
  },
  redemptions: {
    include: {
      user: {
        select: { email: true, id: true, name: true }
      }
    },
    orderBy: { createdAt: "asc" as const }
  }
};

function toRedemptionCodeDto(value: Prisma.RedemptionCodeGetPayload<{ include: typeof redemptionCodeInclude }>) {
  return {
    code: value.code,
    createdAt: value.createdAt.toISOString(),
    createdBy: value.createdBy,
    disabledAt: value.disabledAt?.toISOString() ?? null,
    expiresAt: value.expiresAt?.toISOString() ?? null,
    id: value.id,
    maxRedemptions: value.maxRedemptions,
    note: value.note,
    redemptionCount: value.redemptions.length,
    redemptions: value.redemptions.map(redemption => ({
      action: redemption.action,
      createdAt: redemption.createdAt.toISOString(),
      id: redemption.id,
      target: redemption.target,
      user: redemption.user
    })),
    source: value.source,
    target: value.target
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
