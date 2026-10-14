import "server-only";
import { cache } from "react";
import type { Locale } from "@/types/content";
import { db } from "@/lib/data";
import { DICTIONARIES, type Dictionary, type UiKey } from "./dictionaries";
import { isLocale, LOCALE_BUCKETS } from "./index";

/**
 * Public pages are cached once per language. middleware.ts files each visit under the language the
 * visitor picked (the "bucket"), or "default" before they pick one, which means Settings › default language.
 */
export function generateLocaleParams() {
  return LOCALE_BUCKETS.map((locale) => ({ locale }));
}

export const getLocale = cache(async (bucket: string): Promise<Locale> => {
  const general = await db().getSetting("general");
  if (isLocale(bucket) && general.enabled_locales.includes(bucket)) return bucket;
  return general.default_locale;
});

export const getDictionary = cache(async (locale: Locale): Promise<Dictionary> => {
  const overrides = (await db().getSetting("ui_strings"))[locale] ?? {};
  const base = DICTIONARIES[locale];
  const merged = { ...base } as Dictionary;
  for (const [k, v] of Object.entries(overrides)) if (v?.trim() && k in base) merged[k as UiKey] = v;
  return merged;
});

export async function getI18n(bucket: string) {
  const locale = await getLocale(bucket);
  const dict = await getDictionary(locale);
  return { locale, dict, t: (k: UiKey) => dict[k] };
}
