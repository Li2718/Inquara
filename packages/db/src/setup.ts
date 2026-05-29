import { Prisma } from "@prisma/client";
import { prisma, type PrismaClient } from "./client.ts";
import { hashPassword } from "./password.ts";

export class SetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupError";
  }
}

export type SetupAccountInput = {
  email: string;
  displayName?: string;
  password: string;
};

export type SetupAccount = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export async function hasCompletedSetup(client: PrismaClient = prisma): Promise<boolean> {
  const user = await client.user.findFirst({
    select: { id: true }
  });
  return Boolean(user);
}

export async function createSetupAccount(
  input: SetupAccountInput,
  client: PrismaClient = prisma
): Promise<SetupAccount> {
  const email = normalizeEmail(input.email);
  const password = input.password;
  if (!isValidEmail(email)) {
    throw new SetupError("Enter a valid email.");
  }
  if (password.length < 6) {
    throw new SetupError("Password must be at least 6 characters.");
  }

  const name = normalizeDisplayName(input.displayName, email);
  const passwordHash = await hashPassword(password);

  try {
    return await client.$transaction(async tx => {
      await tx.$executeRaw`LOCK TABLE "users" IN EXCLUSIVE MODE`;

      const existingUser = await tx.user.findFirst({
        select: { id: true }
      });
      if (existingUser) {
        throw new SetupError("Setup is no longer available.");
      }

      return tx.user.create({
        data: {
          email,
          name,
          role: "admin",
          passwordHash,
          identities: {
            create: {
              provider: "password",
              providerUserId: email,
              email
            }
          }
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });
    });
  } catch (error) {
    if (error instanceof SetupError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new SetupError("Setup is no longer available.");
    }
    throw error;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(displayName: string | undefined, email: string): string {
  const trimmed = displayName?.trim();
  return trimmed || email.split("@")[0] || "Admin";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email);
}
