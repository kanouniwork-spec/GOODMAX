import "server-only";
import type { Metadata } from "next";
import { db } from "@/lib/data";
import { loc } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { LOCALES } from "@/types/content";

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");

export async function buildMetadata(route: string): Promise<Metadata> {
  const [locale, entries, general] = await Promise.all([getLocale(), db().list("seo_entries"), db().getSetting("general")]);
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
