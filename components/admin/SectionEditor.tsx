"use client";

import type { Field } from "@/lib/sections/schema";
import { RecordEditor } from "./records";

/** Edits a page section's content_json through the generic record editor. */
export function SectionEditor(props: {
  id: string;
  page: string;
  name: string;
  description: string;
  fields: Field[];
  content: Record<string, unknown>;
  info: React.ComponentProps<typeof RecordEditor>["publish"];
  route: string;
}) {
  return (
    <RecordEditor
      collection="page_sections"
      id={props.id}
      fields={props.fields.map((f) => ({ ...f, key: `content_json.${f.key}` }) as Field)}
      initial={flatten(props.content)}
      backHref={`/admin/pages?page=${props.page}`}
      title={`${props.name} — ${props.page} page`}
      publish={props.info}
      previewHref={props.route}
      extraTop={<p className="muted" style={{ marginTop: -12, marginBottom: 16 }}>{props.description}</p>}
      transform={unflatten}
    />
  );
}

function flatten(content: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(content).map(([k, v]) => [`content_json.${k}`, v]));
}
function unflatten(v: Record<string, unknown>) {
  const content: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) if (k.startsWith("content_json.")) content[k.slice(13)] = val;
  return { content_json: content };
}
