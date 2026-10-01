"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ContactMessage, DistributorRequest } from "@/types/content";
import { REQUEST_STATUSES } from "@/types/content";
import { deleteRecord, saveRecord } from "@/app/admin/actions";
import { Confirm, useAct, useAdmin } from "./ui";

const STATUS_CLASS: Record<string, string> = {
  new: "badge--blue",
  contacted: "",
  qualified: "badge--warn",
  approved: "badge--ok",
  rejected: "badge--danger",
  read: "",
  archived: "",
};
const MSG_STATUSES = ["new", "read", "archived"] as const;

export function Inbox({
  tab,
  requests,
  messages,
  wilayas,
}: {
  tab: "requests" | "messages";
  requests: DistributorRequest[];
  messages: ContactMessage[];
  wilayas: { id: string; label: string }[];
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const wName = (id: string) => wilayas.find((w) => w.id === id)?.label ?? id;
  const rows = (tab === "requests" ? requests : messages) as (DistributorRequest | ContactMessage)[];
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase())) &&
          (!status || r.status === status) &&
          (!wilaya || (r as DistributorRequest).wilaya === wilaya) &&
          (!from || r.created_at >= from) &&
          (!to || r.created_at.slice(0, 10) <= to),
      ),
    [rows, q, status, wilaya, from, to],
  );
  const qs = new URLSearchParams({ type: tab, q, status, wilaya, from, to }).toString();
  const open = rows.find((r) => r.id === openId);
  const statuses = tab === "requests" ? REQUEST_STATUSES : MSG_STATUSES;

  return (
    <>
      <div className="a-top">
        <div>
          <h1>Distributor Requests</h1>
          <p>Applications from the distributor form and messages from the contact form.</p>
        </div>
        <a className="a-btn" href={`/api/admin/export?${qs}`}>
          Export CSV ({filtered.length})
        </a>
      </div>
      <nav className="a-tabs">
        <Link href="/admin/requests" aria-current={tab === "requests" ? "page" : undefined}>
          Distributor requests ({requests.length})
        </Link>
        <Link href="/admin/requests?tab=messages" aria-current={tab === "messages" ? "page" : undefined}>
          Contact messages ({messages.length})
        </Link>
      </nav>
      <div className="a-toolbar">
        <div className="a-field" style={{ flex: 1 }}>
          <label htmlFor="iq">Search</label>
          <input id="iq" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, company, email…" />
        </div>
        <div className="a-field">
          <label htmlFor="is">Status</label>
          <select id="is" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {tab === "requests" && (
          <div className="a-field">
            <label htmlFor="iw">Wilaya</label>
            <select id="iw" value={wilaya} onChange={(e) => setWilaya(e.target.value)}>
              <option value="">All</option>
              {wilayas.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="a-field">
          <label htmlFor="if">From</label>
          <input id="if" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="a-field">
          <label htmlFor="it">To</label>
          <input id="it" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>{tab === "requests" ? "Company / contact" : "From"}</th>
              <th>{tab === "requests" ? "Wilaya" : "Subject"}</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No results.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => setOpenId(r.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpenId(r.id)}>
                <td className="mono">{new Date(r.created_at).toLocaleString()}</td>
                <td>
                  <b>{"company" in r ? r.company : r.full_name}</b>
                  {"company" in r && <div className="muted">{r.full_name}</div>}
                </td>
                <td>{"wilaya" in r ? wName(r.wilaya) : (r as ContactMessage).subject}</td>
                <td>{r.email}</td>
                <td>
                  <span className={`badge ${STATUS_CLASS[r.status] ?? ""}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <Detail key={open.id} row={open} kind={tab} wName={wName} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Detail({ row, kind, wName, onClose }: { row: DistributorRequest | ContactMessage; kind: "requests" | "messages"; wName: (id: string) => string; onClose: () => void }) {
  const [status, setStatus] = useState(row.status);
  const [notes, setNotes] = useState(row.internal_notes);
  const { run, pending } = useAct();
  const { readOnly } = useAdmin();
  const collection = kind === "requests" ? "distributor_requests" : "contact_messages";
  const r = row as DistributorRequest & ContactMessage;
  const fields: [string, string | undefined][] =
    kind === "requests"
      ? [
          ["Full name", r.full_name],
          ["Company", r.company],
          ["Email", r.email],
          ["Phone", r.phone],
          ["City", r.city],
          ["Wilaya", wName(r.wilaya)],
          ["Municipality", r.municipality],
          ["Commercial register", r.commercial_register],
          ["Interested brand", r.interested_brand],
          ...Object.entries(r.extra_json ?? {}).map(([k, v]) => [k, v] as [string, string]),
          ["Language", r.locale],
          ["Source", r.source],
          ["UTM", Object.entries(r.utm_json ?? {}).map(([k, v]) => `${k}=${v}`).join(", ")],
        ]
      : [
          ["Name", r.full_name],
          ["Email", r.email],
          ["Phone", r.phone],
          ["Subject", r.subject],
          ["Message", r.message],
          ["Language", r.locale],
        ];
  return (
    <>
      <div className="a-modal-bg" onClick={onClose} style={{ background: "rgba(6,24,47,.25)" }} />
      <div className="a-drawer" role="dialog" aria-modal="true" aria-label="Request details">
        <div className="a-modal__head">
          <b>{kind === "requests" ? r.company : r.full_name}</b>
          <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="a-modal__body">
          <p className="muted" style={{ marginBottom: 12 }}>
            Received {new Date(r.created_at).toLocaleString()}
          </p>
          <dl style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "8px 12px", margin: "0 0 20px" }}>
            {fields
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt className="muted">{k}</dt>
                  <dd style={{ margin: 0, whiteSpace: "pre-wrap" }}>{k === "Email" ? <a href={`mailto:${v}`}>{v}</a> : v}</dd>
                </div>
              ))}
          </dl>
          <div className="a-field">
            <label htmlFor="d-status">Status</label>
            <select id="d-status" value={status} disabled={readOnly} onChange={(e) => setStatus(e.target.value as never)}>
              {(kind === "requests" ? REQUEST_STATUSES : MSG_STATUSES).map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="a-field">
            <label htmlFor="d-notes">Internal notes</label>
            <textarea id="d-notes" rows={5} readOnly={readOnly} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {!readOnly && (
            <div className="a-actions">
              <button
                type="button"
                className="a-btn a-btn--primary"
                disabled={pending}
                onClick={() => run(() => saveRecord(collection, r.id, { status, internal_notes: notes, updated_at: new Date().toISOString() }), "Saved")}
              >
                Save
              </button>
              <Confirm message="Delete this entry permanently?" onConfirm={() => run(() => deleteRecord(collection, r.id), "Deleted", onClose)}>
                Delete
              </Confirm>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
