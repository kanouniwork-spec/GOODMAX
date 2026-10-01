import type { MetadataRoute } from "next";
import { db } from "@/lib/data";
import { siteUrl } from "@/lib/seo";
import { LOCALES } from "@/types/content";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = (await db().list("seo_entries")).filter((e) => e.in_sitemap && !e.robots.includes("noindex"));
  return entries.map((e) => ({
    url: `${siteUrl()}${e.route}`,
    changeFrequency: "weekly",
    priority: e.route === "/" ? 1 : 0.7,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${siteUrl()}${e.route}?lang=${l}`])) },
  }));
}
