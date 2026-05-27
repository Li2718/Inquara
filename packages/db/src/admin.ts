import type { PrismaClient } from "./client";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function seedAdminUser(
  prisma: PrismaClient,
  options: { email: string; password: string }
): Promise<{ id: string; email: string; role: string }> {
  return seedPasswordUser(prisma, {
    email: options.email,
    password: options.password,
    role: "admin"
  });
}

export async function seedPasswordUser(
  prisma: PrismaClient,
  options: { email: string; password: string; name?: string; role?: string }
): Promise<{ id: string; email: string; role: string }> {
  const email = options.email.trim().toLowerCase();
  const passwordHash = await hashPassword(options.password);
  return prisma.user.upsert({
    where: { email },
    update: {
      role: options.role ?? "user",
      passwordHash,
      ...(options.name !== undefined ? { name: options.name } : {}),
      identities: {
        upsert: {
          where: { provider_providerUserId: { provider: "password", providerUserId: email } },
          update: { email },
          create: { provider: "password", providerUserId: email, email }
        }
      }
    },
    create: {
      email,
      name: options.name ?? email.split("@")[0] ?? null,
      role: options.role ?? "user",
      passwordHash,
      identities: {
        create: { provider: "password", providerUserId: email, email }
      }
    }
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("base64url")}`;
}
