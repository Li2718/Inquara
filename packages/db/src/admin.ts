import type { PrismaClient } from "./client";
import { hashPassword } from "./password.ts";

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
