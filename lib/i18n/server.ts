import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Locale } from "@/types/content";
import { db } from "@/lib/data";
import { DICTIONARIES, type Dictionary, type UiKey } from "./dictionaries";
import { isLocale, LOCALE_COOKIE } from "./index";

export const getLocale = cache(async (): Promise<Locale> => {
  const general = await db().getSetting("general");
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(v) && general.enabled_locales.includes(v)) return v;
  return general.default_locale;
});

export const getDictionary = cache(async (locale: Locale): Promise<Dictionary> => {
  const overrides = (await db().getSetting("ui_strings"))[locale] ?? {};
  const base = DICTIONARIES[locale];
  const merged = { ...base } as Dictionary;
  for (const [k, v] of Object.entries(overrides)) if (v?.trim() && k in base) merged[k as UiKey] = v;
  return merged;
});

export async function getI18n() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return { locale, dict, t: (k: UiKey) => dict[k] };
}
