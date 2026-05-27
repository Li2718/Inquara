import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);
const keyLength = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = (await scryptAsync(password, salt, keyLength)) as Buffer;
  return `scrypt:${salt}:${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string | null): Promise<boolean> {
  if (!passwordHash) return false;
  const [algorithm, salt, hash] = passwordHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;

  const derived = (await scryptAsync(password, salt, keyLength)) as Buffer;
  const expected = Buffer.from(hash, "base64url");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
