import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import type { Brand, PageSection, PageSlug, Product } from "@/types/content";
import { db } from "@/lib/data";
import { currentUser } from "@/lib/auth/session";
import { view } from "./publish";

/** Cookie of the preview switch used before Next.js draft mode; only cleared now. */
export const PREVIEW_COOKIE = "gm_preview";

/**
 * Draft preview (turned on by /api/preview) is only honoured for signed-in admin users.
 * Draft mode skips the page cache, so cached pages never contain drafts.
 */
export const isPreview = cache(async () => {
  if (!(await draftMode()).isEnabled) return false;
  return !!(await currentUser());
});

export const getSections = cache(async (slug: PageSlug): Promise<PageSection[]> => {
  const preview = await isPreview();
  const rows = (await db().list("page_sections")).filter((s) => s.page_slug === slug && s.visible);
  return rows.map((s) => view("page_sections", s, preview)).filter((s): s is PageSection => !!s);
});

export const getBrands = cache(async (): Promise<Brand[]> => {
  const preview = await isPreview();
  return (await db().list("brands"))
    .filter((b) => b.visible)
    .map((b) => view("brands", b, preview))
    .filter((b): b is Brand => !!b);
});

export const getProducts = cache(async (): Promise<Product[]> => {
  const preview = await isPreview();
  return (await db().list("products"))
    .filter((p) => p.visible)
    .map((p) => view("products", p, preview))
    .filter((p): p is Product => !!p);
});

export const getLocations = cache(async () => (await db().list("locations")).filter((l) => l.visible));
export const getSocials = cache(async () => (await db().list("social_links")).filter((s) => s.visible && s.url));
export const getWilayas = cache(async () => (await db().list("wilayas")).filter((w) => w.active));
export const getSetting = cache(<K extends Parameters<ReturnType<typeof db>["getSetting"]>[0]>(k: K) => db().getSetting(k));
