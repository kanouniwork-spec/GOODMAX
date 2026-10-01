import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createServerClient } from "@supabase/ssr";
import type { Profile } from "@/types/content";
import { backend, db } from "@/lib/data";
import { dataDir } from "@/lib/data/file-store";
import { verifyPassword } from "./password";
import { can, type Permission } from "./permissions";

export const SESSION_COOKIE = "gm_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = Pick<Profile, "id" | "email" | "full_name" | "role">;

/* ---------------- file backend: signed cookie ---------------- */

let secretCache: string | null = null;
async function secret() {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET !== "change-me-to-a-long-random-string") return process.env.AUTH_SECRET;
  if (secretCache) return secretCache;
  const file = path.join(dataDir(), "auth-secret");
  try {
    secretCache = (await fs.readFile(file, "utf8")).trim();
  } catch {
    secretCache = randomBytes(32).toString("hex");
    await fs.mkdir(dataDir(), { recursive: true });
    await fs.writeFile(file, secretCache);
  }
  return secretCache;
}

async function sign(payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", await secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

async function unsign(token: string | undefined): Promise<{ uid: string; exp: number } | null> {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", await secret()).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const data = JSON.parse(Buffer.from(body, "base64url").toString());
  return data.exp > Date.now() ? data : null;
}

/* ---------------- supabase backend ---------------- */

async function supabaseAuth() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          /* called from a Server Component: middleware refreshes the session */
        }
      },
    },
  });
}

/* ---------------- public API ---------------- */

export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  email = email.trim().toLowerCase();
  if (backend() === "supabase") {
    const sb = await supabaseAuth();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { ok: false, error: "invalid" };
    const profile = await db().get("profiles", data.user.id);
    if (!profile?.active) {
      await sb.auth.signOut();
      return { ok: false, error: "inactive" };
    }
    return { ok: true };
  }
  const profiles = await db().list("profiles");
  const user = profiles.find((p) => p.email.toLowerCase() === email);
  if (!user || !(await verifyPassword(password, user.password_hash))) return { ok: false, error: "invalid" };
  if (!user.active) return { ok: false, error: "inactive" };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sign({ uid: user.id, exp: Date.now() + MAX_AGE * 1000 }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return { ok: true };
}

export async function signOut() {
  if (backend() === "supabase") {
    const sb = await supabaseAuth();
    await sb.auth.signOut();
  }
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<SessionUser | null> {
  let id: string | null = null;
  if (backend() === "supabase") {
    const sb = await supabaseAuth();
    const { data } = await sb.auth.getUser();
    id = data.user?.id ?? null;
  } else {
    const s = await unsign((await cookies()).get(SESSION_COOKIE)?.value);
    id = s?.uid ?? null;
  }
  if (!id) return null;
  const p = await db().get("profiles", id);
  if (!p || !p.active) return null;
  return { id: p.id, email: p.email, full_name: p.full_name, role: p.role };
}

/** For pages: redirects to the login screen when not signed in. */
export async function requireUser(permission: Permission = "read") {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  if (!can(user.role, permission)) redirect("/admin?denied=1");
  return user;
}

/** For server actions: throws instead of redirecting. */
export async function authorize(permission: Permission) {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  if (!can(user.role, permission)) throw new Error("You do not have permission to do this");
  return user;
}
