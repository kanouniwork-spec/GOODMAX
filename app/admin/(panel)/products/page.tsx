import Link from "next/link";
import { db } from "@/lib/data";
import { loc } from "@/lib/i18n";
import { publishInfo } from "@/lib/admin/info";
import { RecordList } from "@/components/admin/records";
import { StatusBadge } from "@/components/admin/ui";

export default async function Products() {
  const [products, brands] = await Promise.all([db().list("products"), db().list("brands")]);
  return (
    <>
      <div className="a-top">
        <div>
          <h1>Products</h1>
          <p>Drag to set the order on the Products page. Toggle to enable or disable.</p>
        </div>
        <Link className="a-btn a-btn--primary" href="/admin/products/new">
          + New product
        </Link>
      </div>
      <RecordList
        collection="products"
        editBase="/admin/products"
        rows={products.map((p) => {
          const i = publishInfo("products", p as never);
          const b = brands.find((x) => x.id === p.brand_id);
          return {
            id: p.id,
            title: loc(p.name_json, "en"),
            sub: `${b ? loc(b.name_json, "en") : "No brand"} · ${p.features.length} characteristics · ${p.media.length} media`,
            thumb: p.media.find((m) => m.is_primary && m.media_type === "image")?.url ?? p.media.find((m) => m.media_type === "image")?.url ?? "",
            visible: p.visible,
            placeholder: p.is_placeholder,
            badges: <StatusBadge published={i.published} changed={i.changed} />,
          };
        })}
      />
    </>
  );
}
