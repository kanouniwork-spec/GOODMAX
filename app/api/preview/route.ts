import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { PREVIEW_COOKIE } from "@/lib/content/queries";

/** /api/preview?to=/about turns draft preview on (admins only); ?off=1 turns it off. */
export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") || "/";
  const safe = to.startsWith("/") && !to.startsWith("//") ? to : "/";
  if (req.nextUrl.searchParams.get("off")) {
    const res = NextResponse.redirect(new URL(safe, req.url));
    res.cookies.delete(PREVIEW_COOKIE);
    return res;
  }
  if (!(await currentUser())) return NextResponse.redirect(new URL("/admin/login", req.url));
  const res = NextResponse.redirect(new URL(safe, req.url));
  res.cookies.set(PREVIEW_COOKIE, "1", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 });
  return res;
}
