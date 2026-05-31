import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create a Prisma client.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });
}

let client: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  client ??= createPrismaClient();
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrismaClient(), property, receiver);
  }
});

export async function replacePrismaClient(): Promise<void> {
  await client?.$disconnect();
  client = createPrismaClient();
}

export type { PrismaClient };
export { createSetupAccount, SetupError, hasCompletedSetup } from "./setup.ts";
export { hashPassword, verifyPassword } from "./password.ts";
