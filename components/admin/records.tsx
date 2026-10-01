"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CollectionName, Locale } from "@/types/content";
import { LOCALES } from "@/types/content";
import type { Field } from "@/lib/sections/schema";
import type { PublishableCollection } from "@/lib/content/publish";
import {
  deleteRecord,
  duplicateRecord,
  publishRecord,
  reorderRecords,
  revertToPublished,
  saveRecord,
  setVisible,
  unpublishRecord,
} from "@/app/admin/actions";
import { Confirm, FieldsForm, LocaleStatusRow, SortableList, StatusBadge, Switch, useAct, useAdmin } from "./ui";

type Obj = Record<string, unknown>;

export type RowView = {
  id: string;
  title: string;
  sub?: string;
  thumb?: string;
  visible?: boolean;
  badges?: React.ReactNode;
  placeholder?: boolean;
};

/** Sortable list with show/hide, edit, duplicate and delete — all persisted. */
export function RecordList({
  collection,
  rows,
  editBase,
  sortable = true,
  canDuplicate = true,
  deleteMessage = "Delete this item permanently?",
}: {
  collection: CollectionName;
  rows: RowView[];
  /** e.g. "/admin/brands" — rows link to `${editBase}/${id}` */
  editBase?: string;
  sortable?: boolean;
  canDuplicate?: boolean;
  deleteMessage?: string;
}) {
  const { run, pending } = useAct();
  const { readOnly } = useAdmin();
  const router = useRouter();
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const editHref = editBase ? (id: string) => `${editBase}/${id}` : undefined;
  if (!rows.length) return <p className="a-card muted">Nothing here yet.</p>;
  return (
    <SortableList
      ids={rows.map((r) => r.id)}
      disabled={!sortable || readOnly}
      onReorder={(ids) => run(() => reorderRecords(collection, ids), "Order saved")}
      render={(id, handle) => {
        const r = byId[id];
        return (
          <div className="a-rowitem" aria-busy={pending}>
            {handle}
            {r.thumb !== undefined &&
              (r.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="a-thumb" src={r.thumb} alt="" />
              ) : (
                <span className="a-thumb" />
              ))}
            <div className="grow">
              <div className="title">
                {editHref ? <Link href={editHref(id)}>{r.title || "(untitled)"}</Link> : r.title}{" "}
                {r.placeholder && <span className="badge badge--warn">placeholder</span>}
              </div>
              {r.sub && <div className="sub">{r.sub}</div>}
            </div>
            {r.badges}
            {r.visible !== undefined && (
              <Switch checked={r.visible} disabled={readOnly} label={r.visible ? "Visible" : "Hidden"} onChange={(v) => run(() => setVisible(collection, id, v), v ? "Shown" : "Hidden")} />
            )}
            {editHref && (
              <Link className="a-btn a-btn--sm" href={editHref(id)}>
                {readOnly ? "View" : "Edit"}
              </Link>
            )}
            {!readOnly && canDuplicate && (
              <button
                type="button"
                className="a-btn a-btn--sm"
                onClick={() => run(() => duplicateRecord(collection, id), "Duplicated", (d) => d && editHref && router.push(editHref(d.id)))}
              >
                Duplicate
              </button>
            )}
            {!readOnly && (
              <Confirm message={deleteMessage} onConfirm={() => run(() => deleteRecord(collection, id), "Deleted")}>
                Delete
              </Confirm>
            )}
          </div>
        );
      }}
    />
  );
}

/** Full editor for one record; publishable collections get draft/publish controls. */
export function RecordEditor({
  collection,
  id,
  fields,
  initial,
  backHref,
  title,
  publish,
  previewHref,
  extraTop,
  topPanel,
  extraPanels,
  transform = (v) => v,
}: {
  collection: CollectionName;
  id: string | null;
  fields: Field[];
  initial: Obj;
  backHref: string;
  title: string;
  publish?: {
    published: boolean;
    changed: boolean;
    publishedAt: string | null;
    updatedAt?: string;
    updatedBy?: string | null;
    status: Record<Locale, { missing: number; total: number; changed: boolean; published: boolean }>;
  };
  previewHref?: string;
  extraTop?: React.ReactNode;
  /** rendered above the main form, with access to the live form value */
  topPanel?: (value: Obj, set: (v: Obj) => void) => React.ReactNode;
  extraPanels?: (value: Obj, set: (v: Obj) => void) => React.ReactNode;
  /** maps the form value to the stored shape before saving */
  transform?: (v: Obj) => Obj;
}) {
  const [value, setValue] = useState<Obj>(initial);
  const [dirty, setDirty] = useState(false);
  const [locales, setLocales] = useState<Locale[]>([...LOCALES]);
  const { run, pending } = useAct();
  const { readOnly } = useAdmin();
  const router = useRouter();
  const set = (v: Obj) => {
    setValue(v);
    setDirty(true);
  };
  const save = () =>
    run(() => saveRecord(collection, id, transform(value)), "Draft saved", (d) => {
      setDirty(false);
      if (!id && d) router.replace(`${backHref}/${d.id}`);
    });

  const pc = collection as PublishableCollection;
  const doPublish = async () => {
    if (dirty && !(await run(() => saveRecord(collection, id, transform(value))))) return;
    setDirty(false);
    const all = locales.length === LOCALES.length;
    run(() => publishRecord(pc, id!, all ? "all" : locales), all ? "Published" : `Published ${locales.map((l) => l.toUpperCase()).join(", ")}`);
  };

  return (
    <>
      <div className="a-top">
        <div>
          <Link href={backHref} className="muted" style={{ textDecoration: "none" }}>
            ← Back
          </Link>
          <h1 style={{ marginTop: 6 }}>{title}</h1>
        </div>
        <div className="a-actions">
          {dirty && <span className="badge badge--warn">Unsaved changes</span>}
          {previewHref && id && (
            <a className="a-btn" href={`/api/preview?to=${encodeURIComponent(previewHref)}`} target="_blank" rel="noreferrer">
              Preview draft
            </a>
          )}
          {!readOnly && (
            <button type="button" className="a-btn a-btn--primary" onClick={save} disabled={pending}>
              {publish || ["page_sections", "brands", "products"].includes(collection) ? "Save draft" : "Save"}
            </button>
          )}
        </div>
      </div>
      {extraTop}
      <div className="a-split">
        <div>
          {topPanel?.(value, set)}
          <div className="a-card">
            <FieldsForm fields={fields} value={value} onChange={set} />
          </div>
          {extraPanels?.(value, set)}
        </div>
        <aside>
          {publish && id && (
            <div className="a-card">
              <h2>Publishing</h2>
              <div style={{ display: "grid", gap: 10 }}>
                <StatusBadge published={publish.published} changed={publish.changed || dirty} />
                <LocaleStatusRow status={publish.status} />
                <p className="muted" style={{ fontSize: 12 }}>
                  {publish.publishedAt ? `Last published ${new Date(publish.publishedAt).toLocaleString()}` : "Never published"}
                  {publish.updatedAt && (
                    <>
                      <br />
                      Last edited {new Date(publish.updatedAt).toLocaleString()} {publish.updatedBy ? `by ${publish.updatedBy}` : ""}
                    </>
                  )}
                </p>
                {!readOnly && (
                  <>
                    <div>
                      <span className="a-label">Languages to publish</span>
                      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                        {LOCALES.map((l) => (
                          <label key={l} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                            <input
                              type="checkbox"
                              checked={locales.includes(l)}
                              onChange={(e) => setLocales((ls) => (e.target.checked ? [...ls, l] : ls.filter((x) => x !== l)))}
                            />
                            {l.toUpperCase()}
                          </label>
                        ))}
                      </div>
                      <small className="muted">Unticked languages keep their currently published text.</small>
                    </div>
                    {LOCALES.some((l) => locales.includes(l) && publish.status[l].missing > 0) && (
                      <div className="a-alert" style={{ margin: 0 }}>
                        Missing translations will fall back to English on the site.
                      </div>
                    )}
                    <button type="button" className="a-btn a-btn--primary" onClick={doPublish} disabled={pending || !locales.length}>
                      Publish
                    </button>
                    {publish.published && publish.changed && (
                      <Confirm className="a-btn" message="Discard draft edits and go back to the published version?" onConfirm={() => run(() => revertToPublished(pc, id), "Reverted")}>
                        Discard draft changes
                      </Confirm>
                    )}
                    {publish.published && (
                      <Confirm className="a-btn a-btn--danger" message="Unpublish? Visitors will no longer see it." onConfirm={() => run(() => unpublishRecord(pc, id), "Unpublished")}>
                        Unpublish
                      </Confirm>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          {!publish && id && !readOnly && (
            <div className="a-card">
              <h2>Item</h2>
              <Confirm
                className="a-btn a-btn--danger"
                message="Delete permanently?"
                onConfirm={() => run(() => deleteRecord(collection, id), "Deleted", () => router.push(backHref))}
              >
                Delete
              </Confirm>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
