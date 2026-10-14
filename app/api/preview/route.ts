import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { PREVIEW_COOKIE } from "@/lib/content/queries";

/** /api/preview?to=/about turns draft preview on (admins only); ?off=1 turns it off. */
export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") || "/";
  const safe = to.startsWith("/") && !to.startsWith("//") ? to : "/";
  const draft = await draftMode();
  if (req.nextUrl.searchParams.get("off")) {
    draft.disable();
    const res = NextResponse.redirect(new URL(safe, req.url));
    res.cookies.delete(PREVIEW_COOKIE);
    return res;
  }
  if (!(await currentUser())) return NextResponse.redirect(new URL("/admin/login", req.url));
  draft.enable();
  return NextResponse.redirect(new URL(safe, req.url));
}
