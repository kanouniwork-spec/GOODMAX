"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/types/content";
import { publishRecord, unpublishRecord } from "@/app/admin/actions";
import type { PublishableCollection } from "@/lib/content/publish";
import { Confirm, LocaleStatusRow, StatusBadge, useAct, useAdmin } from "./ui";

export type PubRow = {
  collection: PublishableCollection;
  id: string;
  kind: string;
  name: string;
  edit: string;
  preview: string;
  visible: boolean;
  placeholder: boolean;
  published: boolean;
  changed: boolean;
  publishedAt: string | null;
  updatedAt: string;
  updatedBy: string | null;
  status: Record<Locale, { missing: number; total: number; changed: boolean; published: boolean }>;
};

export function PublishingCenter({ rows, initialFilter }: { rows: PubRow[]; initialFilter: "all" | "placeholder" }) {
  const [filter, setFilter] = useState<"all" | "pending" | "draft" | "missing" | "placeholder">(initialFilter);
  const { run, pending } = useAct();
  const { readOnly } = useAdmin();
  const shown = rows.filter((r) =>
    filter === "pending"
      ? r.published && r.changed
      : filter === "draft"
        ? !r.published
        : filter === "missing"
          ? Object.values(r.status).some((s) => s.missing > 0)
          : filter === "placeholder"
            ? r.placeholder
            : true,
  );
  return (
    <>
      <div className="a-top">
        <div>
          <h1>Publishing</h1>
          <p>Every section, brand and product with its per-language state. Visitors only see published versions; drafts are visible through Preview.</p>
        </div>
      </div>
      <div className="a-tabs" role="tablist">
        {(
          [
            ["all", "All"],
            ["pending", "Unpublished changes"],
            ["draft", "Never published"],
            ["missing", "Missing translations"],
            ["placeholder", "Placeholder content"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>State</th>
              <th>Languages</th>
              <th>Last updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.collection + r.id}>
                <td>
                  <span className="muted">{r.kind}</span>
                  <div>
                    <Link href={r.edit}>
                      <b>{r.name}</b>
                    </Link>{" "}
                    {!r.visible && <span className="badge">hidden</span>} {r.placeholder && <span className="badge badge--warn">placeholder</span>}
                  </div>
                </td>
                <td>
                  <StatusBadge published={r.published} changed={r.changed} />
                </td>
                <td>
                  <LocaleStatusRow status={r.status} />
                </td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {new Date(r.updatedAt).toLocaleString()}
                  <br />
                  {r.updatedBy}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <a className="a-btn a-btn--sm" href={`/api/preview?to=${encodeURIComponent(r.preview)}`} target="_blank" rel="noreferrer">
                    Preview
                  </a>{" "}
                  {!readOnly && r.changed && (
                    <button type="button" className="a-btn a-btn--sm a-btn--primary" disabled={pending} onClick={() => run(() => publishRecord(r.collection, r.id, "all"), "Published")}>
                      Publish
                    </button>
                  )}{" "}
                  {!readOnly && r.published && (
                    <Confirm className="a-btn a-btn--sm a-btn--danger" message={`Unpublish "${r.name}"?`} onConfirm={() => run(() => unpublishRecord(r.collection, r.id), "Unpublished")}>
                      Unpublish
                    </Confirm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
