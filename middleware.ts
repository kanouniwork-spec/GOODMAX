import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isLocale, isLocaleBucket, LOCALE_COOKIE } from "@/lib/i18n";

const supabaseEnabled = () =>
  process.env.DATA_BACKEND === "supabase" ||
  (process.env.DATA_BACKEND !== "file" && !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const BRAND_SLUG = /^[a-z0-9-]{1,80}$/;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return admin(req);
  return publicPage(req);
}

/**
 * Public pages keep their plain addresses (/products) but are built and cached once per language
 * under app/(site)/[locale]: the visitor's language decides which copy they get, so no page has to
 * be rendered per visit.
 */
function publicPage(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Someone typed an internal address (/fr/products): send them to the public one.
  const first = pathname.split("/")[1];
  if (isLocaleBucket(first)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(first.length + 1) || "/";
    if (isLocale(first)) url.searchParams.set("lang", first);
    return NextResponse.redirect(url);
  }

  // ?lang=fr — shareable language links (used by hreflang alternates), else the visitor's saved choice
  const lang = searchParams.get("lang");
  const chosen = isLocale(lang) ? lang : req.cookies.get(LOCALE_COOKIE)?.value;

  // The products list filtered by brand is its own cached page.
  const brand = searchParams.get("brand");
  const path = pathname === "/products" && brand && BRAND_SLUG.test(brand) ? `/products/${brand}` : pathname === "/" ? "" : pathname;

  const url = req.nextUrl.clone();
  url.pathname = `/${isLocale(chosen) ? chosen : "default"}${path}`;
  const res = NextResponse.rewrite(url);
  if (isLocale(lang)) res.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

async function admin(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin/login")) return NextResponse.next();

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
  // everything but Next.js internals, API routes and files (anything with a dot: /media/…, /icon.png, /robots.txt)
  matcher: ["/((?!_next/|_vercel/|api/|.*\\.).*)"],
};
