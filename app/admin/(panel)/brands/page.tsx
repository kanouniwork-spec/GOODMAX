import Link from "next/link";
import { db } from "@/lib/data";
import { loc } from "@/lib/i18n";
import { publishInfo } from "@/lib/admin/info";
import { RecordList } from "@/components/admin/records";
import { StatusBadge } from "@/components/admin/ui";

export default async function Brands() {
  const [brands, products] = await Promise.all([db().list("brands"), db().list("products")]);
  return (
    <>
      <div className="a-top">
        <div>
          <h1>Brands</h1>
          <p>Brand cards on the homepage and the Brands page. Drag to reorder.</p>
        </div>
        <Link className="a-btn a-btn--primary" href="/admin/brands/new">
          + New brand
        </Link>
      </div>
      <RecordList
        collection="brands"
        editBase="/admin/brands"
        deleteMessage="Delete this brand? Products keep existing but lose their brand."
        rows={brands.map((b) => {
          const i = publishInfo("brands", b as never);
          return {
            id: b.id,
            title: loc(b.name_json, "en"),
            sub: `/${b.slug} · ${products.filter((p) => p.brand_id === b.id).length} products`,
            thumb: b.background_url || b.logo_url || "",
            visible: b.visible,
            placeholder: b.is_placeholder,
            badges: <StatusBadge published={i.published} changed={i.changed} />,
          };
        })}
      />
    </>
  );
}
