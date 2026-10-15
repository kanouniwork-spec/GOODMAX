import "server-only";
import type { Metadata } from "next";
import { db } from "@/lib/data";
import { loc } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { LOCALES } from "@/types/content";

/**
 * Address used in canonical links, the sitemap and social previews. In production Vercel's fallback is the
 * project's own domain, never the per-deploy address, which sits behind the Vercel login.
 */
export const siteUrl = () => {
  const vercelHost = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  return (process.env.NEXT_PUBLIC_SITE_URL || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000")).replace(/\/$/, "");
};

export async function buildMetadata(route: string, bucket: string): Promise<Metadata> {
  const [locale, entries, general] = await Promise.all([getLocale(bucket), db().list("seo_entries"), db().getSetting("general")]);
  const e = entries.find((x) => x.route === route);
  const title = loc(e?.title_json, locale) || general.site_name;
  const description = loc(e?.description_json, locale) || loc(general.tagline_json, locale);
  const canonical = e?.canonical_url || `${siteUrl()}${route}`;
  const image = e?.image_url ? (e.image_url.startsWith("http") ? e.image_url : `${siteUrl()}${e.image_url}`) : undefined;
  const robots = e?.robots || "index,follow";
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `${siteUrl()}${route}?lang=${l}`])),
    },
    robots: { index: !robots.includes("noindex"), follow: !robots.includes("nofollow") },
    openGraph: {
      type: "website",
      siteName: general.site_name,
      title,
      description,
      url: canonical,
      locale: { en: "en_US", fr: "fr_FR", ar: "ar_DZ" }[locale],
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}
