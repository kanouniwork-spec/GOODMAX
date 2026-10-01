import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const LOCALES = ["en", "fr", "ar"];
const supabaseEnabled = () =>
  process.env.DATA_BACKEND === "supabase" ||
  (process.env.DATA_BACKEND !== "file" && !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // ?lang=fr — shareable language links (used by hreflang alternates)
  const lang = searchParams.get("lang");
  if (lang && LOCALES.includes(lang)) {
    req.cookies.set("gm_locale", lang);
    const res = NextResponse.next({ request: { headers: req.headers } });
    res.cookies.set("gm_locale", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  }

  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) return NextResponse.next();

  if (supabaseEnabled()) {
    let res = NextResponse.next({ request: req });
    const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await sb.auth.getUser();
    if (!data.user) return NextResponse.redirect(new URL("/admin/login", req.url));
    return res;
  }

  // File backend: the cookie signature and role are verified in the admin layout.
  if (!req.cookies.get("gm_session")) return NextResponse.redirect(new URL("/admin/login", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|media/|favicon|icon|robots.txt|sitemap.xml).*)"],
};
