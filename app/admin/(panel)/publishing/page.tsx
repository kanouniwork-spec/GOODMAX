import { db } from "@/lib/data";
import { loc } from "@/lib/i18n";
import { SECTION_DEFINITIONS } from "@/lib/sections/schema";
import { publishInfo } from "@/lib/admin/info";
import { PublishingCenter, type PubRow } from "@/components/admin/PublishingCenter";

const ROUTE: Record<string, string> = { home: "/", about: "/about", brands: "/brands", products: "/products", distributors: "/distributors", locations: "/locations", contact: "/contact" };

export default async function Publishing({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const sp = await searchParams;
  const [sections, brands, products] = await Promise.all([db().list("page_sections"), db().list("brands"), db().list("products")]);
  const rows: PubRow[] = [
    ...sections.map((s) => ({
      collection: "page_sections" as const,
      id: s.id,
      kind: "Section",
      name: `${s.page_slug} › ${SECTION_DEFINITIONS[s.section_type].name}`,
      edit: `/admin/pages/${s.id}`,
      preview: ROUTE[s.page_slug],
      visible: s.visible,
      placeholder: !!s.is_placeholder,
      ...publishInfo("page_sections", s as never),
    })),
    ...brands.map((b) => ({
      collection: "brands" as const,
      id: b.id,
      kind: "Brand",
      name: loc(b.name_json, "en"),
      edit: `/admin/brands/${b.id}`,
      preview: "/brands",
      visible: b.visible,
      placeholder: !!b.is_placeholder,
      ...publishInfo("brands", b as never),
    })),
    ...products.map((p) => ({
      collection: "products" as const,
      id: p.id,
      kind: "Product",
      name: loc(p.name_json, "en"),
      edit: `/admin/products/${p.id}`,
      preview: "/products",
      visible: p.visible,
      placeholder: !!p.is_placeholder,
      ...publishInfo("products", p as never),
    })),
  ];
  return <PublishingCenter rows={rows} initialFilter={sp.filter === "placeholder" ? "placeholder" : "all"} />;
}
