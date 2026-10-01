"use client";

import type { Field } from "@/lib/sections/schema";
import { PRODUCT_SEO_FIELDS } from "@/lib/admin/schemas";
import { RecordEditor } from "./records";
import { FieldsForm } from "./ui";

export function ProductEditor({
  id,
  fields,
  initial,
  title,
  info,
}: {
  id: string | null;
  fields: Field[];
  initial: Record<string, unknown>;
  title: string;
  info?: React.ComponentProps<typeof RecordEditor>["publish"];
}) {
  return (
    <RecordEditor
      collection="products"
      id={id}
      fields={fields}
      initial={initial}
      backHref="/admin/products"
      title={title}
      publish={info}
      previewHref={`/products#${String(initial.slug ?? "")}`}
      extraPanels={(value, set) => (
        <div className="a-card">
          <h2>SEO</h2>
          <FieldsForm
            fields={PRODUCT_SEO_FIELDS}
            value={(value.seo_json as Record<string, unknown>) ?? {}}
            onChange={(seo) => set({ ...value, seo_json: seo })}
          />
        </div>
      )}
    />
  );
}
