import { db } from "@/lib/data";
import { loc } from "@/lib/i18n";
import { DICTIONARIES, UI_KEYS } from "@/lib/i18n/dictionaries";
import { collectLocalized, SECTION_DEFINITIONS } from "@/lib/sections/schema";
import { BRAND_FIELDS, productFields } from "@/lib/admin/schemas";
import { LOCALES } from "@/types/content";
import { TranslationsAdmin } from "@/components/admin/TranslationsAdmin";

export default async function Translations() {
  const [overrides, sections, brands, products] = await Promise.all([
    db().getSetting("ui_strings"),
    db().list("page_sections"),
    db().list("brands"),
    db().list("products"),
  ]);
  const missing: { where: string; field: string; locales: string[]; href: string }[] = [];
  const check = (where: string, href: string, list: { path: string; value: Record<string, string | undefined> }[]) => {
    for (const { path, value } of list) {
      const filled = LOCALES.filter((l) => value[l]?.trim());
      if (filled.length && filled.length < LOCALES.length) missing.push({ where, field: path, locales: LOCALES.filter((l) => !filled.includes(l)), href });
    }
  };
  for (const s of sections) check(`${s.page_slug} › ${SECTION_DEFINITIONS[s.section_type].name}`, `/admin/pages/${s.id}`, collectLocalized(SECTION_DEFINITIONS[s.section_type].fields, s.content_json));
  for (const b of brands) check(`Brand ${loc(b.name_json, "en")}`, `/admin/brands/${b.id}`, collectLocalized(BRAND_FIELDS, b as never));
  for (const p of products) check(`Product ${loc(p.name_json, "en")}`, `/admin/products/${p.id}`, collectLocalized(productFields([]), p as never));
  return (
    <TranslationsAdmin
      keys={UI_KEYS}
      defaults={DICTIONARIES}
      overrides={overrides}
      missing={missing}
    />
  );
}
