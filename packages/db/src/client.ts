import { PrismaClient } from "@prisma/client";

let client = new PrismaClient();

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(client, property, receiver);
  }
});

export async function replacePrismaClient(): Promise<void> {
  await client.$disconnect();
  client = new PrismaClient();
}

export type { PrismaClient };
