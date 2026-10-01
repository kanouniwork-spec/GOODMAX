import "server-only";
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | undefined) {
  if (!stored?.startsWith("scrypt$")) return false;
  const [, saltB64, keyB64] = stored.split("$");
  const key = Buffer.from(keyB64, "base64");
  const test = await scrypt(password, Buffer.from(saltB64, "base64"), key.length);
  return timingSafeEqual(key, test);
}
