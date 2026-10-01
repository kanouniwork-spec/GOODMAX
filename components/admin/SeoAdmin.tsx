"use client";

import { useState } from "react";
import type { SeoEntry } from "@/types/content";
import type { Field } from "@/lib/sections/schema";
import { saveRecord } from "@/app/admin/actions";
import { FieldsForm, LocaleDots, useAct, useAdmin } from "./ui";

const FIELDS: Field[] = [
  { key: "title_json", type: "ltext", label: "Title", help: "Aim for 50–60 characters" },
  { key: "description_json", type: "ltextarea", label: "Meta description", help: "Aim for 140–160 characters" },
  { key: "image_url", type: "media", label: "Open Graph image" },
  { key: "canonical_url", type: "url", label: "Canonical URL (leave empty for automatic)" },
  {
    key: "robots",
    type: "select",
    label: "Robots",
    options: [
      { value: "index,follow", label: "index, follow" },
      { value: "noindex,follow", label: "noindex, follow" },
      { value: "noindex,nofollow", label: "noindex, nofollow" },
    ],
  },
  { key: "in_sitemap", type: "boolean", label: "Include in sitemap.xml" },
];

export function SeoAdmin({ entries }: { entries: SeoEntry[] }) {
  const [open, setOpen] = useState<string | undefined>(entries[0]?.id);
  const [vals, setVals] = useState(Object.fromEntries(entries.map((e) => [e.id, e])));
  const { run, pending } = useAct();
  const { readOnly } = useAdmin();
  return (
    <>
      <div className="a-top">
        <div>
          <h1>SEO</h1>
          <p>Per-route metadata in three languages. Feeds the page titles, OpenGraph/Twitter cards, sitemap.xml and robots.</p>
        </div>
        <div className="a-actions">
          <a className="a-btn" href="/sitemap.xml" target="_blank">
            sitemap.xml
          </a>
          <a className="a-btn" href="/robots.txt" target="_blank">
            robots.txt
          </a>
        </div>
      </div>
      <div className="a-list">
        {entries.map((e) => {
          const v = vals[e.id];
          return (
            <div key={e.id} className="a-item" style={{ background: "#fff" }}>
              <div className="a-item__head">
                <span className="mono" style={{ width: 110 }}>
                  {e.route}
                </span>
                <span className="grow">{v.title_json.en}</span>
                <LocaleDots value={v.title_json} />
                <LocaleDots value={v.description_json} />
                <button type="button" className="a-btn a-btn--sm" onClick={() => setOpen(open === e.id ? undefined : e.id)}>
                  {open === e.id ? "Close" : "Edit"}
                </button>
              </div>
              {open === e.id && (
                <div className="a-item__body">
                  <FieldsForm fields={FIELDS} value={v as never} onChange={(nv) => setVals({ ...vals, [e.id]: nv as never })} />
                  {!readOnly && (
                    <button type="button" className="a-btn a-btn--primary" disabled={pending} onClick={() => run(() => saveRecord("seo_entries", e.id, v as never), "SEO saved")}>
                      Save
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
