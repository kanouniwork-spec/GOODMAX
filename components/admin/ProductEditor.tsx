"use client";

import { useState } from "react";
import type { Field } from "@/lib/sections/schema";
import type { ProductMedia } from "@/types/content";
import { PRODUCT_SEO_FIELDS } from "@/lib/admin/schemas";
import { draftProductFromImage } from "@/app/admin/actions";
import { RecordEditor } from "./records";
import { FieldsForm, MediaField, useAdmin, useToast } from "./ui";

type Obj = Record<string, unknown>;

export function ProductEditor({
  id,
  fields,
  initial,
  title,
  info,
}: {
  id: string | null;
  fields: Field[];
  initial: Obj;
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
      topPanel={(value, set) => <AiFromPhoto value={value} set={set} />}
      extraPanels={(value, set) => (
        <div className="a-card">
          <h2>SEO</h2>
          <FieldsForm
            fields={PRODUCT_SEO_FIELDS}
            value={(value.seo_json as Obj) ?? {}}
            onChange={(seo) => set({ ...value, seo_json: seo })}
          />
        </div>
      )}
    />
  );
}

/** Resizes the photo in the browser (max 1568px, JPEG) and returns base64 without the data: prefix. */
async function photoToBase64(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load that image.");
  const bitmap = await createImageBitmap(await res.blob());
  const scale = Math.min(1, 1568 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

function AiFromPhoto({ value, set }: { value: Obj; set: (v: Obj) => void }) {
  const { canTranslate, readOnly } = useAdmin();
  const toast = useToast();
  const media = (value.media as ProductMedia[] | undefined) ?? [];
  const firstImage = (media.find((m) => m.is_primary && m.media_type === "image") ?? media.find((m) => m.media_type === "image"))?.url ?? "";
  const [photo, setPhoto] = useState(firstImage);
  const [busy, setBusy] = useState(false);
  if (readOnly) return null;

  const generate = async () => {
    const hasText = Object.values((value.name_json as Obj) ?? {}).some((t) => String(t ?? "").trim());
    if (hasText && !window.confirm("Replace the current name, descriptions and characteristics with the AI draft?")) return;
    setBusy(true);
    try {
      const res = await draftProductFromImage(await photoToBase64(photo), "image/jpeg");
      if (!res.ok || !res.data) throw new Error(res.ok ? "No draft returned" : res.error);
      const d = res.data;
      const nextMedia = media.some((m) => m.url === photo)
        ? media
        : [...media, { id: crypto.randomUUID(), media_type: "image" as const, url: photo, alt_json: d.alt_json, is_primary: !media.some((m) => m.is_primary) }];
      set({
        ...value,
        name_json: d.name_json,
        short_description_json: d.short_description_json,
        description_json: d.description_json,
        features: d.features.map((f, i) => ({
          id: crypto.randomUUID(),
          label_json: { en: String(i + 1).padStart(2, "0"), fr: String(i + 1).padStart(2, "0"), ar: String(i + 1).padStart(2, "0") },
          title_json: f.title_json,
          body_json: f.body_json,
          visible: true,
        })),
        media: nextMedia,
        slug: value.slug || d.name_json.en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      });
      toast("Draft written in EN, FR and AR. Review it, then save.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "AI draft failed", true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="a-card">
      <h2>Write with AI from a photo</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
        Pick or upload a product photo. AI fills in the name, descriptions and the characteristics it can see, in English, French and Arabic. Nothing is saved until you click Save draft.
      </p>
      <MediaField label="Product photo" value={photo} onChange={setPhoto} />
      {canTranslate ? (
        <button type="button" className="a-btn a-btn--primary" style={{ marginTop: 10 }} onClick={generate} disabled={busy || !photo}>
          {busy ? "Writing…" : "Write with AI"}
        </button>
      ) : (
        <div className="a-alert" style={{ marginTop: 10, marginBottom: 0 }}>
          Add ANTHROPIC_API_KEY in Vercel to turn this on.
        </div>
      )}
    </div>
  );
}
