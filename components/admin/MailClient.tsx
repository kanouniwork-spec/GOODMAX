"use client";

import { useEffect, useRef, useState } from "react";
import { addMailAlias, createMailbox, disconnectMail, mailUploadSlot, replyMail, sendMail } from "@/app/admin/mail-actions";
import type { AttachmentRef, MailUser } from "@/lib/zoho/mail";
import { Confirm, useAct } from "./ui";

export function DisconnectMail() {
  const { run, pending } = useAct();
  return (
    <Confirm
      className="a-btn a-btn--sm"
      disabled={pending}
      message="Disconnect Zoho Mail? The mail stays in Zoho; Admin stops showing it until someone connects again."
      onConfirm={() => run(disconnectMail, "Zoho Mail disconnected")}
    >
      Disconnect
    </Confirm>
  );
}

type Draft = { from: string; to: string; cc: string; bcc: string; subject: string; body: string };

/* ---------------- attachments ---------------- */

const MB = 1024 * 1024;
const MAX_FILE = 20 * MB;
const MAX_FILES = 10;
const DIRECT_MAX = 4 * MB; // Vercel refuses request bodies over 4.5 MB; bigger files go through the upload bucket
const SHRINK_OVER = 3 * MB;
type Att = { key: string; name: string; size: number; preview?: string; ref?: AttachmentRef; error?: string };

const sizeText = (n: number) => (n >= MB ? `${(n / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Phone photos are often 5–10 MB: above 3 MB they are re-encoded as JPEG, at most 2560 px wide or high. */
async function shrinkPhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) || file.size <= SHRINK_OVER) return file;
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 2560 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; // transparent PNG areas become white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
  } catch {
    return file; // a format this browser cannot open (HEIC outside Safari): sent as it is
  }
}

async function answer(res: Response): Promise<AttachmentRef> {
  const json = (await res.json().catch(() => ({}))) as AttachmentRef & { error?: string };
  if (!res.ok || !json.storeName) throw new Error(json.error || `Upload failed (${res.status})`);
  return { storeName: json.storeName, attachmentPath: json.attachmentPath, attachmentName: json.attachmentName };
}

/** Puts one file in Zoho's file store of the sending mailbox (app/api/admin/zoho/attachment). */
async function uploadToZoho(file: File, from: string): Promise<AttachmentRef> {
  if (file.size > DIRECT_MAX) {
    const slot = await mailUploadSlot(file.name);
    if (!slot.ok) throw new Error(slot.error);
    if (slot.data) {
      const { createClient } = await import("@supabase/supabase-js"); // only when a file is too big for a direct upload
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
      const up = await sb.storage.from(slot.data.bucket).uploadToSignedUrl(slot.data.path, slot.data.token, file, { contentType: file.type || "application/octet-stream" });
      if (up.error) throw new Error(up.error.message);
      return answer(await fetch("/api/admin/zoho/attachment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from, path: slot.data.path, name: file.name }) }));
    }
  }
  const form = new FormData();
  form.append("from", from);
  form.append("file", file);
  return answer(await fetch("/api/admin/zoho/attachment", { method: "POST", body: form }));
}

function useAttachments(from: string) {
  const [atts, setAtts] = useState<Att[]>([]);
  const live = useRef(atts);
  live.current = atts;
  useEffect(() => () => live.current.forEach((a) => a.preview && URL.revokeObjectURL(a.preview)), []);
  const patch = (key: string, p: Partial<Att>) => setAtts((list) => list.map((a) => (a.key === key ? { ...a, ...p } : a)));
  const add = (files: FileList | File[]) => {
    const room = MAX_FILES - live.current.length;
    [...files].slice(0, Math.max(0, room)).forEach(async (original) => {
      const key = `${Date.now()}-${Math.random()}`;
      const preview = original.type.startsWith("image/") ? URL.createObjectURL(original) : undefined;
      setAtts((list) => [...list, { key, name: original.name, size: original.size, preview }]);
      try {
        const file = await shrinkPhoto(original);
        if (file.size > MAX_FILE) throw new Error("Larger than 20 MB");
        patch(key, { name: file.name, size: file.size });
        patch(key, { ref: await uploadToZoho(file, from) });
      } catch (e) {
        patch(key, { error: e instanceof Error ? e.message : String(e) });
      }
    });
  };
  const remove = (key: string) =>
    setAtts((list) =>
      list.filter((a) => {
        if (a.key === key && a.preview) URL.revokeObjectURL(a.preview);
        return a.key !== key;
      }),
    );
  const clear = () => {
    live.current.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
    setAtts([]);
  };
  return { atts, add, remove, clear, uploading: atts.some((a) => !a.ref && !a.error), full: atts.length >= MAX_FILES };
}

function AttachmentPicker({ files, id }: { files: ReturnType<typeof useAttachments>; id: string }) {
  const anyFile = useRef<HTMLInputElement>(null);
  const photo = useRef<HTMLInputElement>(null);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) files.add(e.target.files);
    e.target.value = "";
  };
  return (
    <div className="mail-attach">
      <div className="a-actions">
        <button type="button" className="a-btn a-btn--sm" disabled={files.full} onClick={() => anyFile.current?.click()}>
          + Attach files
        </button>
        <button type="button" className="a-btn a-btn--sm" disabled={files.full} onClick={() => photo.current?.click()}>
          + Add photos
        </button>
        <small className="muted">Up to 10 files, 20 MB each. You can also drop files here.</small>
        <input ref={anyFile} id={`${id}-files`} type="file" multiple hidden onChange={pick} />
        <input ref={photo} id={`${id}-photos`} type="file" accept="image/*" multiple hidden onChange={pick} />
      </div>
      {files.atts.length > 0 && (
        <ul className="mail-files">
          {files.atts.map((a) => (
            <li key={a.key} className={a.error ? "is-error" : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {a.preview ? <img src={a.preview} alt="" /> : <span className="mail-files__icon">{a.name.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}</span>}
              <span className="mail-files__name" dir="auto">
                {a.name}
                <small>{a.error ? a.error : a.ref ? sizeText(a.size) : `${sizeText(a.size)} · uploading…`}</small>
              </span>
              <button type="button" className="a-btn a-btn--sm a-btn--ghost" aria-label={`Remove ${a.name}`} onClick={() => files.remove(a.key)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** New mail (Write tab) or a reply under an open message. Plain text, sent as simple HTML, with files and photos. */
export function MailCompose({ fromOptions, initial, replyTo }: { fromOptions: string[]; initial: Partial<Draft>; replyTo?: string }) {
  const { run, pending } = useAct();
  const blank: Draft = { from: fromOptions[0] ?? "", to: "", cc: "", bcc: "", subject: "", body: "" };
  const [d, setD] = useState<Draft>({ ...blank, ...initial });
  const [copies, setCopies] = useState(!!(initial.cc || initial.bcc));
  const [dragging, setDragging] = useState(false);
  const files = useAttachments(d.from);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });
  const id = replyTo ? "r" : "w";
  const ready = files.atts.filter((a) => a.ref).map((a) => a.ref!);
  const failed = files.atts.some((a) => a.error);
  return (
    <form
      className={`a-card mail-compose${dragging ? " is-dragging" : ""}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget as Node) || setDragging(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        files.add(e.dataTransfer.files);
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const draft = { ...d, attachments: ready };
        run(() => (replyTo ? replyMail(replyTo, draft) : sendMail(draft)), replyTo ? "Reply sent" : "Mail sent", () => {
          setD(replyTo ? { ...d, body: "" } : { ...blank, from: d.from });
          files.clear();
        });
      }}
    >
      <h2>{replyTo ? "Reply" : "New mail"}</h2>
      <div className="a-row">
        <div className="a-field">
          <label htmlFor={`${id}-from`}>From</label>
          <select id={`${id}-from`} value={d.from} onChange={set("from")} disabled={files.atts.length > 0} title={files.atts.length ? "Remove the files to change the sender" : undefined}>
            {fromOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="a-field">
          <label htmlFor={`${id}-to`}>To</label>
          <input id={`${id}-to`} type="text" inputMode="email" required value={d.to} onChange={set("to")} placeholder="name@example.com, …" />
        </div>
      </div>
      {copies ? (
        <div className="a-row">
          <div className="a-field">
            <label htmlFor={`${id}-cc`}>Cc</label>
            <input id={`${id}-cc`} type="text" inputMode="email" value={d.cc} onChange={set("cc")} />
          </div>
          <div className="a-field">
            <label htmlFor={`${id}-bcc`}>Bcc</label>
            <input id={`${id}-bcc`} type="text" inputMode="email" value={d.bcc} onChange={set("bcc")} />
          </div>
        </div>
      ) : (
        <button type="button" className="a-btn a-btn--sm a-btn--ghost" style={{ marginBottom: 12 }} onClick={() => setCopies(true)}>
          + Cc / Bcc
        </button>
      )}
      <div className="a-field">
        <label htmlFor={`${id}-subject`}>Subject</label>
        <input id={`${id}-subject`} type="text" dir="auto" maxLength={300} value={d.subject} onChange={set("subject")} />
      </div>
      <div className="a-field">
        <label htmlFor={`${id}-body`}>Message</label>
        <textarea id={`${id}-body`} dir="auto" rows={replyTo ? 7 : 12} required={!ready.length} value={d.body} onChange={set("body")} />
      </div>
      <AttachmentPicker files={files} id={id} />
      {replyTo && files.atts.length > 0 && <p className="muted">With files, the reply goes out as a new mail with the same subject.</p>}
      <div className="a-actions">
        <button className="a-btn a-btn--primary" disabled={pending || files.uploading}>
          {pending ? "Sending…" : files.uploading ? "Uploading files…" : replyTo ? "Send reply" : "Send"}
        </button>
        {failed && <span className="muted">Files marked in red will not be sent.</span>}
      </div>
    </form>
  );
}

/** Admin › Mail › Addresses: extra addresses for an existing mailbox, and new mailboxes. */
export function MailAddresses({ users, domain }: { users: MailUser[]; domain: string }) {
  const { run, pending } = useAct();
  const [alias, setAlias] = useState({ zuid: users[0]?.zuid ?? "", local: "" });
  const [box, setBox] = useState({ firstName: "", lastName: "", local: "", password: "" });
  const [note, setNote] = useState<{ alias?: string; box?: string }>({});
  return (
    <>
      <div className="a-table-wrap" style={{ marginBottom: 16 }}>
        <table className="a-table">
          <thead>
            <tr>
              <th>Mailbox</th>
              <th>Also receives</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  No mailboxes yet.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.zuid || u.email}>
                <td>
                  <b>{u.email}</b> {!u.enabled && <span className="badge badge--warn">disabled</span>}
                  <div className="muted">{u.name}</div>
                </td>
                <td>
                  <div className="mail-aliases">
                    {u.aliases.length ? u.aliases.map((a) => <span key={a} className="badge">{a}</span>) : <span className="muted">—</span>}
                  </div>
                </td>
                <td>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mail-forms">
        <form
          className="a-card"
          onSubmit={(e) => {
            e.preventDefault();
            const owner = users.find((u) => u.zuid === alias.zuid)?.email;
            run(
              () => addMailAlias(alias.zuid, alias.local),
              undefined,
              (address) => {
                setNote({ alias: `${address} now arrives in ${owner}.` });
                setAlias({ ...alias, local: "" });
              },
            );
          }}
        >
          <h2>Add an address to a mailbox</h2>
          <p className="muted">Mail sent to the new address arrives in the chosen mailbox, and that mailbox can send from it.</p>
          <div className="a-field">
            <label htmlFor="al-local">New address</label>
            <div className="mail-local">
              <input id="al-local" type="text" required value={alias.local} onChange={(e) => setAlias({ ...alias, local: e.target.value })} placeholder="contact" />
              <span>@{domain}</span>
            </div>
          </div>
          <div className="a-field">
            <label htmlFor="al-box">Arrives in</label>
            <select id="al-box" value={alias.zuid} onChange={(e) => setAlias({ ...alias, zuid: e.target.value })}>
              {users.map((u) => (
                <option key={u.zuid} value={u.zuid}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>
          {note.alias && <div className="a-alert a-alert--info">{note.alias}</div>}
          <button className="a-btn a-btn--primary" disabled={pending || !users.length}>
            Add address
          </button>
        </form>
        <form
          className="a-card"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => createMailbox(box),
              undefined,
              (address) => {
                setNote({ box: `Mailbox ${address} created. Its owner signs in at mail.zoho.com with the first password, then Zoho asks for a new one.` });
                setBox({ firstName: "", lastName: "", local: "", password: "" });
              },
            );
          }}
        >
          <h2>Create a mailbox for a person</h2>
          <p className="muted">
            A separate inbox with its own password, read at mail.zoho.com or in the Zoho Mail app. Each mailbox uses one of the organisation&apos;s Zoho user licences.
          </p>
          <div className="a-row">
            <div className="a-field">
              <label htmlFor="mb-first">First name</label>
              <input id="mb-first" type="text" required value={box.firstName} onChange={(e) => setBox({ ...box, firstName: e.target.value })} />
            </div>
            <div className="a-field">
              <label htmlFor="mb-last">Last name</label>
              <input id="mb-last" type="text" value={box.lastName} onChange={(e) => setBox({ ...box, lastName: e.target.value })} />
            </div>
          </div>
          <div className="a-field">
            <label htmlFor="mb-local">Address</label>
            <div className="mail-local">
              <input id="mb-local" type="text" required value={box.local} onChange={(e) => setBox({ ...box, local: e.target.value })} placeholder="sales" />
              <span>@{domain}</span>
            </div>
          </div>
          <div className="a-field">
            <label htmlFor="mb-pw">First password (10+ characters)</label>
            <input id="mb-pw" type="password" autoComplete="new-password" required minLength={10} value={box.password} onChange={(e) => setBox({ ...box, password: e.target.value })} />
            <small>Give it to the person face to face or by phone. Zoho asks them to change it at the first sign-in.</small>
          </div>
          {note.box && <div className="a-alert a-alert--info">{note.box}</div>}
          <button className="a-btn a-btn--primary" disabled={pending}>
            Create mailbox
          </button>
        </form>
      </div>
    </>
  );
}
