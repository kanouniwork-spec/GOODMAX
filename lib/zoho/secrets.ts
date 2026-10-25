import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { backend } from "@/lib/data";
import { dataDir } from "@/lib/data/file-store";
import { serviceClient } from "@/lib/data/supabase-store";

/**
 * Server-only secrets (the Zoho Mail connection). They live apart from the content database, so they never
 * show up in exports or in the public-readable settings: Supabase table app_secrets (no access policies,
 * service role only, migration 0003) or DATA_DIR/secrets.json. Values are encrypted with AES-256-GCM under
 * a key derived from ZOHO_CLIENT_SECRET, so a copied row is useless without the Vercel environment.
 */

const key = () => createHash("sha256").update(`goodmax-secrets:${process.env.ZOHO_CLIENT_SECRET ?? ""}`).digest();

function seal(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

function open(sealed: string): string | null {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !body) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null; // written under another client secret: treated as not connected
  }
}

const file = () => path.join(dataDir(), "secrets.json");
async function readFile(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(file(), "utf8"));
  } catch {
    return {};
  }
}

async function raw(name: string): Promise<string | null> {
  if (backend() === "supabase") {
    const { data, error } = await serviceClient().from("app_secrets").select("value").eq("key", name).maybeSingle();
    if (error) throw new Error(`Secrets: ${error.message}`);
    return (data?.value as string | undefined) ?? null;
  }
  return (await readFile())[name] ?? null;
}

export async function getSecret<T>(name: string): Promise<T | null> {
  const sealed = await raw(name);
  const plain = sealed ? open(sealed) : null;
  return plain ? (JSON.parse(plain) as T) : null;
}

export async function setSecret(name: string, value: unknown) {
  const sealed = seal(JSON.stringify(value));
  if (backend() === "supabase") {
    const { error } = await serviceClient()
      .from("app_secrets")
      .upsert({ key: name, value: sealed, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(`Secrets: ${error.message}`);
    return;
  }
  const all = await readFile();
  all[name] = sealed;
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(file(), JSON.stringify(all), { mode: 0o600 });
}

export async function deleteSecret(name: string) {
  if (backend() === "supabase") {
    const { error } = await serviceClient().from("app_secrets").delete().eq("key", name);
    if (error) throw new Error(`Secrets: ${error.message}`);
    return;
  }
  const all = await readFile();
  delete all[name];
  await fs.writeFile(file(), JSON.stringify(all), { mode: 0o600 });
}
