import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/session";
import { db, newId } from "@/lib/data";
import { accountsServerFrom, connect } from "@/lib/zoho/mail";

export const dynamic = "force-dynamic";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Zoho returns here after the admin allows access; the one-time code becomes the saved, encrypted connection. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`/admin/mail?${q}`, req.url));
    res.cookies.delete({ name: "gm_zoho_state", path: "/api/admin/zoho" });
    return res;
  };
  let user;
  try {
    user = await authorize("mail.manage");
  } catch {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  const expected = (await cookies()).get("gm_zoho_state")?.value ?? "";
  const state = url.searchParams.get("state") ?? "";
  if (!expected || !same(expected, state)) return back("error=state");
  if (url.searchParams.get("error")) return back(`error=${encodeURIComponent(url.searchParams.get("error")!.slice(0, 80))}`);
  const code = url.searchParams.get("code");
  const server = accountsServerFrom(url.searchParams.get("accounts-server"));
  if (!code || !server) return back("error=server");
  try {
    const conn = await connect(code, server, user.email);
    try {
      await db().insert("audit_log", { id: newId("log"), actor: user.id, action: "mail.connect", entity: "zoho_mail", entity_id: conn.email, created_at: new Date().toISOString() });
    } catch {
      /* audit is best-effort */
    }
    return back("connected=1");
  } catch (e) {
    return back(`error=${encodeURIComponent((e instanceof Error ? e.message : String(e)).slice(0, 300))}`);
  }
}
