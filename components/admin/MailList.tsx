"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteMail, restoreMail } from "@/app/admin/mail-actions";
import { Avatar, MailIcon } from "./MailIcons";
import { useAct } from "./ui";

/** Trash and Spam delete for good and can send mail back to the Inbox; every other folder deletes to Trash. */
export type FolderKind = "mail" | "trash" | "spam";
export type MailRow = { id: string; href: string; who: string; to: boolean; subject: string; summary: string; unread: boolean; attachment: boolean; date: string };

const many = (n: number, one: string, more: string) => (n === 1 ? one : `${n} ${more}`);
const backLabel = (kind: FolderKind) => (kind === "spam" ? "Not spam" : "Move to Inbox");

/** In Trash and Spam, Delete is permanent: ask first. */
const sure = (kind: FolderKind, n: number) => kind === "mail" || window.confirm(`Delete ${many(n, "this mail", "mails")} forever? This cannot be undone.`);

/** Delete / Delete forever / Move to Inbox for some mails, with Gmail's wording. */
function useMailActions(accountId: string, folderId: string, kind: FolderKind) {
  const { run, pending } = useAct();
  const remove = (ids: string[], after?: () => void) => {
    const done = kind === "mail" ? many(ids.length, "Mail moved to Trash", "mails moved to Trash") : many(ids.length, "Mail deleted forever", "mails deleted forever");
    return run(() => deleteMail({ accountId, folderId, ids }), done, after);
  };
  const restore = (ids: string[], after?: () => void) =>
    run(() => restoreMail({ accountId, folderId, ids }), many(ids.length, "Mail moved to Inbox", "mails moved to Inbox"), after);
  return { remove, restore, pending };
}

/** A folder's mails, Gmail-style: tick mails (tap the round picture), then delete them; or use the buttons that show on a row. */
export function MailList({ accountId, folderId, kind, title, nav, rows, empty }: {
  accountId: string;
  folderId: string;
  kind: FolderKind;
  title: string;
  nav: React.ReactNode;
  rows: MailRow[];
  empty: React.ReactNode;
}) {
  const { remove, restore, pending } = useMailActions(accountId, folderId, kind);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [gone, setGone] = useState<Set<string>>(new Set()); // hidden at once, like Gmail, until Zoho answers
  const shown = rows.filter((r) => !gone.has(r.id));
  const ids = shown.filter((r) => picked.has(r.id)).map((r) => r.id);
  const all = shown.length > 0 && ids.length === shown.length;
  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const act = async (fn: typeof remove, list: string[]) => {
    if (fn === remove && !sure(kind, list.length)) return;
    setGone((g) => new Set([...g, ...list]));
    const okay = await fn(list, () => setPicked((s) => new Set([...s].filter((id) => !list.includes(id)))));
    if (!okay) setGone((g) => new Set([...g].filter((id) => !list.includes(id))));
  };
  return (
    <section className="mx-card">
      <div className={`mx-toolbar${ids.length ? " is-picking" : ""}`}>
        {shown.length > 0 && (
          <button
            type="button"
            className="mx-pickall"
            role="checkbox"
            aria-checked={all ? true : ids.length ? "mixed" : false}
            aria-label={all ? "Unselect all" : "Select all"}
            title={all ? "Unselect all" : "Select all"}
            onClick={() => setPicked(all ? new Set() : new Set(shown.map((r) => r.id)))}
          >
            <span className="mx-box">{all ? <MailIcon name="check" size={14} /> : ids.length ? <MailIcon name="minus" size={14} /> : null}</span>
          </button>
        )}
        {ids.length ? (
          <>
            <b className="mx-toolbar__picked">{ids.length} selected</b>
            {kind !== "mail" && (
              <button type="button" className="mx-pill mx-pill--sm" disabled={pending} onClick={() => act(restore, ids)}>
                <MailIcon name="restore" size={16} />
                {backLabel(kind)}
              </button>
            )}
            {kind === "mail" ? (
              <button type="button" className="mx-iconbtn mx-iconbtn--danger" disabled={pending} title="Delete" aria-label="Delete" onClick={() => act(remove, ids)}>
                <MailIcon name="trash" />
              </button>
            ) : (
              <button type="button" className="mx-pill mx-pill--sm mx-pill--danger" disabled={pending} onClick={() => act(remove, ids)}>
                <MailIcon name="trash" size={16} />
                Delete forever
              </button>
            )}
            <button type="button" className="mx-iconbtn" title="Clear selection" aria-label="Clear selection" onClick={() => setPicked(new Set())}>
              <MailIcon name="close" />
            </button>
          </>
        ) : (
          <>
            <h2>{title}</h2>
            {nav}
          </>
        )}
      </div>
      {shown.length === 0 ? (
        empty
      ) : (
        <ul className="mx-list">
          {shown.map((r) => {
            const on = picked.has(r.id);
            return (
              <li key={r.id} className={`mx-row${r.unread ? " is-unread" : ""}${on ? " is-picked" : ""}`}>
                <button type="button" className="mx-pick" role="checkbox" aria-checked={on} aria-label={`Select the mail from ${r.who}`} onClick={() => toggle(r.id)}>
                  <Avatar name={r.who} />
                  <span className="mx-pick__tick">
                    <MailIcon name="check" size={18} />
                  </span>
                </button>
                <Link className="mx-row__link" href={r.href}>
                  <span className="mx-row__who" dir="auto">
                    {r.to && <small>To: </small>}
                    {r.who}
                  </span>
                  <span className="mx-row__text">
                    <b dir="auto">{r.subject || "(no subject)"}</b>
                    <span dir="auto">{r.summary}</span>
                  </span>
                  <span className="mx-row__meta">
                    {r.attachment && <MailIcon name="clip" size={15} />}
                    <time>{r.date}</time>
                  </span>
                </Link>
                <span className="mx-row__actions">
                  {kind !== "mail" && (
                    <button type="button" className="mx-iconbtn" disabled={pending} title={backLabel(kind)} aria-label={backLabel(kind)} onClick={() => act(restore, [r.id])}>
                      <MailIcon name="restore" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="mx-iconbtn mx-iconbtn--danger"
                    disabled={pending}
                    title={kind === "mail" ? "Delete" : "Delete forever"}
                    aria-label={kind === "mail" ? "Delete" : "Delete forever"}
                    onClick={() => act(remove, [r.id])}
                  >
                    <MailIcon name="trash" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** The open mail's Delete (and, in Trash or Spam, Move to Inbox); afterwards back to the folder, as in Gmail. */
export function MailReadActions({ accountId, folderId, id, kind, back }: { accountId: string; folderId: string; id: string; kind: FolderKind; back: string }) {
  const router = useRouter();
  const { remove, restore, pending } = useMailActions(accountId, folderId, kind);
  const leave = () => router.push(back);
  return (
    <span className="mx-toolbar__actions">
      {kind !== "mail" && (
        <button type="button" className="mx-iconbtn" disabled={pending} title={backLabel(kind)} aria-label={backLabel(kind)} onClick={() => restore([id], leave)}>
          <MailIcon name="restore" />
        </button>
      )}
      <button
        type="button"
        className="mx-iconbtn mx-iconbtn--danger"
        disabled={pending}
        title={kind === "mail" ? "Delete" : "Delete forever"}
        aria-label={kind === "mail" ? "Delete" : "Delete forever"}
        onClick={() => sure(kind, 1) && remove([id], leave)}
      >
        <MailIcon name="trash" />
      </button>
    </span>
  );
}
