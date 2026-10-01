import type { Locale, LocalizedText, Publishable } from "@/types/content";
import { LOCALES } from "@/types/content";

/** Content fields of each publishable collection (structure like visible/sort_order applies immediately). */
export const CONTENT_FIELDS = {
  page_sections: ["content_json"],
  brands: ["slug", "name_json", "description_json", "cta_json", "logo_url", "accent_color", "background_url"],
  products: [
    "brand_id",
    "slug",
    "name_json",
    "short_description_json",
    "description_json",
    "cta_json",
    "cta_url",
    "features",
    "media",
    "seo_json",
  ],
} as const;
export type PublishableCollection = keyof typeof CONTENT_FIELDS;

export function draftOf(c: PublishableCollection, row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of CONTENT_FIELDS[c]) out[f] = row[f];
  return JSON.parse(JSON.stringify(out)) as Record<string, unknown>;
}

const isLocalized = (v: unknown): v is LocalizedText =>
  !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0 && Object.keys(v).every((k) => (LOCALES as readonly string[]).includes(k));

/**
 * Builds the snapshot to publish. With `locales`, only those languages'
 * strings are taken from the draft; other languages keep their published
 * text, so publishing French never ships an unfinished Arabic edit.
 */
export function mergeForPublish(draft: unknown, published: unknown, locales: Locale[] | "all"): unknown {
  if (locales === "all" || published === undefined || published === null) return draft;
  if (isLocalized(draft) || (isLocalized(published) && draft && typeof draft === "object" && !Array.isArray(draft))) {
    const d = (draft ?? {}) as LocalizedText;
    const p = (published ?? {}) as LocalizedText;
    const out: LocalizedText = { ...p };
    for (const l of locales) {
      if (d[l] !== undefined) out[l] = d[l];
      else delete out[l];
    }
    return out;
  }
  if (Array.isArray(draft)) {
    const pa = Array.isArray(published) ? published : [];
    return draft.map((item, i) => mergeForPublish(item, pa[i], locales));
  }
  if (draft && typeof draft === "object") {
    const p = (published && typeof published === "object" ? published : {}) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft)) out[k] = mergeForPublish(v, p[k], locales);
    return out;
  }
  return draft;
}

/** Walks content and reports, per locale, whether text exists and whether the draft differs from published. */
export function localeStatus(draft: unknown, published: unknown) {
  const res = {} as Record<Locale, { missing: number; total: number; changed: boolean; published: boolean }>;
  for (const l of LOCALES) res[l] = { missing: 0, total: 0, changed: false, published: published != null };
  const walk = (d: unknown, p: unknown) => {
    if (isLocalized(d) || (d && typeof d === "object" && !Array.isArray(d) && Object.keys(d).length === 0 && isLocalized(p))) {
      const dd = (d ?? {}) as LocalizedText;
      const pp = (p ?? {}) as LocalizedText;
      for (const l of LOCALES) {
        res[l].total += 1;
        if (!dd[l]?.trim()) res[l].missing += 1;
        if ((dd[l] ?? "") !== (pp[l] ?? "")) res[l].changed = true;
      }
      return;
    }
    if (Array.isArray(d)) {
      d.forEach((x, i) => walk(x, Array.isArray(p) ? p[i] : undefined));
      return;
    }
    if (d && typeof d === "object") {
      for (const [k, v] of Object.entries(d)) walk(v, p && typeof p === "object" ? (p as Record<string, unknown>)[k] : undefined);
    }
  };
  walk(draft, published);
  return res;
}

export function hasUnpublishedChanges(c: PublishableCollection, row: Publishable & Record<string, unknown>) {
  if (!row.published_snapshot) return true;
  return JSON.stringify(draftOf(c, row)) !== JSON.stringify(row.published_snapshot);
}

/** What the public site sees: the published snapshot (or the draft in preview mode). */
export function view<T extends Publishable>(c: PublishableCollection, row: T, preview: boolean): T | null {
  if (preview) return row;
  if (!row.published_snapshot) return null;
  return { ...row, ...(row.published_snapshot as Partial<T>) };
}
