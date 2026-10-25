import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/session";
import { authUrl, zohoConfig } from "@/lib/zoho/mail";

export const dynamic = "force-dynamic";

/** Admin › Mail › "Connect Zoho Mail": sends the admin to Zoho's sign-in page, which returns to ../callback. */
export async function GET(req: Request) {
  try {
    await authorize("mail.manage");
  } catch {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (!zohoConfig()) return NextResponse.redirect(new URL("/admin/mail?error=setup", req.url));
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(authUrl(state));
  res.cookies.set("gm_zoho_state", state, { httpOnly: true, secure: new URL(req.url).protocol === "https:", sameSite: "lax", path: "/api/admin/zoho", maxAge: 600 });
  return res;
}
