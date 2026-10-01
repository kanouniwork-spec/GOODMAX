import { notFound } from "next/navigation";
import { db } from "@/lib/data";
import { loc } from "@/lib/i18n";
import { BRAND_FIELDS } from "@/lib/admin/schemas";
import { publishInfo } from "@/lib/admin/info";
import { RecordEditor } from "@/components/admin/records";

export default async function EditBrand({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") {
    return (
      <RecordEditor
        collection="brands"
        id={null}
        fields={BRAND_FIELDS}
        initial={{ name_json: {}, slug: "", description_json: {}, cta_json: { en: "View products", fr: "Voir les produits", ar: "عرض المنتجات" }, logo_url: "", background_url: "", accent_color: "#1d5bd8", visible: true }}
        backHref="/admin/brands"
        title="New brand"
      />
    );
  }
  const b = await db().get("brands", id);
  if (!b) notFound();
  return (
    <RecordEditor
      collection="brands"
      id={id}
      fields={BRAND_FIELDS}
      initial={b as never}
      backHref="/admin/brands"
      title={loc(b.name_json, "en") || "Brand"}
      publish={publishInfo("brands", b as never)}
      previewHref="/brands"
    />
  );
}
