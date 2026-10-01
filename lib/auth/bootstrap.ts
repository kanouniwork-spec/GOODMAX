import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import type { Profile } from "@/types/content";
import { hashPassword } from "./password";

/**
 * File backend only: creates the first admin account when none exists.
 * Password comes from ADMIN_BOOTSTRAP_PASSWORD, or is generated and written
 * to .data/initial-admin.txt (never committed).
 */
export async function ensureBootstrapAdmin(profiles: Profile[], dir: string) {
  if (profiles.length) return;
  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@goodmax.local").toLowerCase();
  let password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!password) {
    password = randomBytes(9).toString("base64url");
    await fs.writeFile(path.join(dir, "initial-admin.txt"), `email: ${email}\npassword: ${password}\n`);
    console.log(`[goodmax] Created admin ${email}. Password written to ${path.join(dir, "initial-admin.txt")}`);
  }
  profiles.push({
    id: "user-admin",
    email,
    full_name: "Administrator",
    role: "admin",
    active: true,
    created_at: new Date().toISOString(),
    password_hash: await hashPassword(password),
  });
}
