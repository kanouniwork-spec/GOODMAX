import { LOCALES, type Locale, type LocalizedText } from "@/types/content";

export const LOCALE_COOKIE = "gm_locale";
export const LOCALE_META: Record<Locale, { label: string; native: string; dir: "ltr" | "rtl"; hreflang: string }> = {
  en: { label: "EN", native: "English", dir: "ltr", hreflang: "en" },
  fr: { label: "FR", native: "Français", dir: "ltr", hreflang: "fr" },
  ar: { label: "AR", native: "العربية", dir: "rtl", hreflang: "ar" },
};

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** Localized value with fallback: requested locale → English → French → first non-empty. */
export function loc(text: LocalizedText | undefined | null, locale: Locale): string {
  if (!text) return "";
  return text[locale]?.trim() || text.en?.trim() || text.fr?.trim() || Object.values(text).find((v) => v?.trim()) || "";
}

export const hasText = (text: LocalizedText | undefined | null) => !!text && Object.values(text).some((v) => v?.trim());
