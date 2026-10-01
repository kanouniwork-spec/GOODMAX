"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/types/content";
import { addSection, deleteRecord, duplicateRecord, publishRecord, reorderRecords, setVisible } from "@/app/admin/actions";
import { Confirm, LocaleStatusRow, Modal, SortableList, StatusBadge, Switch, useAct, useAdmin } from "./ui";

type Section = {
  id: string;
  type: string;
  name: string;
  title: string;
  visible: boolean;
  placeholder: boolean;
  published: boolean;
  changed: boolean;
  status: Record<Locale, { missing: number; total: number; changed: boolean; published: boolean }>;
};

const ROUTE: Record<string, string> = { home: "/", about: "/about", brands: "/brands", products: "/products", distributors: "/distributors", locations: "/locations", contact: "/contact" };

export function PageBuilder({
  page,
  pages,
  sections,
  types,
}: {
  page: string;
  pages: { slug: string; title: string }[];
  sections: Section[];
  types: { type: string; name: string; description: string; disabled: boolean }[];
}) {
  const { run, pending } = useAct();
  const { readOnly } = useAdmin();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const byId = Object.fromEntries(sections.map((s) => [s.id, s]));

  return (
    <>
      <div className="a-top">
        <div>
          <h1>Page Builder</h1>
          <p>Drag to reorder, show or hide, and edit each section in English, French and Arabic. Edits stay in draft until you publish.</p>
        </div>
        <div className="a-actions">
          <a className="a-btn" href={`/api/preview?to=${encodeURIComponent(ROUTE[page])}`} target="_blank" rel="noreferrer">
            Preview draft
          </a>
          {!readOnly && (
            <button className="a-btn a-btn--primary" type="button" onClick={() => setAdding(true)}>
              + Add section
            </button>
          )}
        </div>
      </div>
      <nav className="a-tabs" aria-label="Pages">
        {pages.map((p) => (
          <Link key={p.slug} href={`/admin/pages?page=${p.slug}`} aria-current={p.slug === page ? "page" : undefined}>
            {p.title}
          </Link>
        ))}
      </nav>
      {sections.length === 0 && <p className="a-card muted">This page has no sections yet.</p>}
      <SortableList
        ids={sections.map((s) => s.id)}
        disabled={readOnly}
        onReorder={(ids) => run(() => reorderRecords("page_sections", ids), "Section order saved")}
        render={(id, handle) => {
          const s = byId[id];
          return (
            <div className="a-rowitem" aria-busy={pending}>
              {handle}
              <div className="grow">
                <div className="title">
                  <Link href={`/admin/pages/${s.id}`}>{s.name}</Link> {s.placeholder && <span className="badge badge--warn">placeholder content</span>}
                </div>
                <div className="sub">{s.title || "—"}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <StatusBadge published={s.published} changed={s.changed} />
                  <LocaleStatusRow status={s.status} />
                </div>
              </div>
              <Switch checked={s.visible} disabled={readOnly} label={s.visible ? "Visible" : "Hidden"} onChange={(v) => run(() => setVisible("page_sections", id, v), v ? "Section shown" : "Section hidden")} />
              <Link className="a-btn a-btn--sm" href={`/admin/pages/${s.id}`}>
                {readOnly ? "View" : "Edit"}
              </Link>
              {!readOnly && s.changed && (
                <button type="button" className="a-btn a-btn--sm" onClick={() => run(() => publishRecord("page_sections", id, "all"), "Published")}>
                  Publish
                </button>
              )}
              {!readOnly && s.type !== "video_story" && (
                <button type="button" className="a-btn a-btn--sm" onClick={() => run(() => duplicateRecord("page_sections", id), "Section duplicated")}>
                  Duplicate
                </button>
              )}
              {!readOnly && !(s.type === "video_story" && page === "home") && (
                <Confirm message={`Delete the "${s.name}" section?`} onConfirm={() => run(() => deleteRecord("page_sections", id), "Section deleted")}>
                  Delete
                </Confirm>
              )}
            </div>
          );
        }}
      />
      {adding && (
        <Modal title="Add a section" onClose={() => setAdding(false)}>
          <div className="a-grid">
            {types.map((t) => (
              <button
                key={t.type}
                type="button"
                className="a-card"
                style={{ textAlign: "left", cursor: t.disabled ? "not-allowed" : "pointer", opacity: t.disabled ? 0.5 : 1 }}
                disabled={t.disabled || pending}
                onClick={() =>
                  run(() => addSection(page, t.type), "Section added (hidden until you fill it in)", (d) => {
                    setAdding(false);
                    if (d) router.push(`/admin/pages/${d.id}`);
                  })
                }
              >
                <b>{t.name}</b>
                <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  {t.disabled ? "Already on this page" : t.description}
                </p>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
