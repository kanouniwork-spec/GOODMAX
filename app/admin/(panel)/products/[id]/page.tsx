// AI drafts from a photo can take a while on the free Gemini tier
export const maxDuration = 60;

import { notFound } from "next/navigation";
import { db } from "@/lib/data";
import { loc } from "@/lib/i18n";
import { productFields } from "@/lib/admin/schemas";
import { publishInfo } from "@/lib/admin/info";
import { ProductEditor } from "@/components/admin/ProductEditor";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = (await db().list("brands")).map((b) => ({ value: b.id, label: loc(b.name_json, "en") }));
  const fields = productFields(brands);
  if (id === "new") {
    return (
      <ProductEditor
        id={null}
        fields={fields}
        initial={{
          name_json: {},
          slug: "",
          brand_id: brands[0]?.value ?? "",
          short_description_json: {},
          description_json: {},
          features: [],
          media: [],
          cta_json: {},
          cta_url: "/locations",
          seo_json: {},
          visible: true,
        }}
        title="New product"
      />
    );
  }
  const p = await db().get("products", id);
  if (!p) notFound();
  return <ProductEditor id={id} fields={fields} initial={p as never} title={loc(p.name_json, "en") || "Product"} info={publishInfo("products", p as never)} />;
}
