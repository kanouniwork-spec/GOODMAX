"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { mailUploadSlot, replyMail, sendMail } from "@/app/admin/mail-actions";
import type { AttachmentRef } from "@/lib/zoho/mail";
import { MailIcon } from "./MailIcons";
import { useAct } from "./ui";

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

function FileList({ files }: { files: ReturnType<typeof useAttachments> }) {
  if (!files.atts.length) return null;
  return (
    <ul className="mail-files mx-compose__files">
      {files.atts.map((a) => (
        <li key={a.key} className={a.error ? "is-error" : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {a.preview ? <img src={a.preview} alt="" /> : <span className="mail-files__icon">{a.name.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}</span>}
          <span className="mail-files__name" dir="auto">
            {a.name}
            <small>{a.error ? a.error : a.ref ? sizeText(a.size) : `${sizeText(a.size)} · uploading…`}</small>
          </span>
          <button type="button" className="mx-iconbtn" aria-label={`Remove ${a.name}`} title="Remove" onClick={() => files.remove(a.key)}>
            <MailIcon name="close" size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- the form ---------------- */

type FormProps = {
  id: string;
  fromOptions: string[];
  initial: Partial<Draft>;
  replyTo?: string;
  autoFocus?: boolean;
  onDirty?: (dirty: boolean) => void;
  onSent?: () => void;
  onDiscard?: () => void;
};

/** The fields of a new mail or a reply, Gmail-style: From, To (+Cc/Bcc), Subject, message, files and a Send bar. */
function ComposeForm({ id, fromOptions, initial, replyTo, autoFocus, onDirty, onSent, onDiscard }: FormProps) {
  const { run, pending } = useAct();
  const blank: Draft = { from: fromOptions[0] ?? "", to: "", cc: "", bcc: "", subject: "", body: "" };
  const start = { ...blank, ...initial };
  const [d, setD] = useState<Draft>(start);
  const [copies, setCopies] = useState(!!(initial.cc || initial.bcc));
  const [dragging, setDragging] = useState(false);
  const files = useAttachments(d.from);
  const anyFile = useRef<HTMLInputElement>(null);
  const photo = useRef<HTMLInputElement>(null);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });
  const ready = files.atts.filter((a) => a.ref).map((a) => a.ref!);
  const failed = files.atts.some((a) => a.error);
  const dirty = d.body.trim() !== "" || d.to !== (start.to ?? "") || d.subject !== (start.subject ?? "") || files.atts.length > 0;
  useEffect(() => {
    onDirty?.(dirty);
  }, [dirty, onDirty]);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) files.add(e.target.files);
    e.target.value = "";
  };
  return (
    <form
      className={`mx-form${dragging ? " is-dragging" : ""}`}
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
          onSent?.();
        });
      }}
    >
      <label className="mx-line">
        <span>From</span>
        <select id={`${id}-from`} value={d.from} onChange={set("from")} disabled={files.atts.length > 0} title={files.atts.length ? "Remove the files to change the sender" : undefined}>
          {fromOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <div className="mx-line">
        <label htmlFor={`${id}-to`}>To</label>
        <input id={`${id}-to`} type="text" inputMode="email" autoComplete="email" required value={d.to} onChange={set("to")} placeholder="name@example.com, …" autoFocus={autoFocus && !d.to} />
        {!copies && (
          <button type="button" className="mx-link" onClick={() => setCopies(true)}>
            Cc Bcc
          </button>
        )}
      </div>
      {copies && (
        <>
          <label className="mx-line">
            <span>Cc</span>
            <input id={`${id}-cc`} type="text" inputMode="email" value={d.cc} onChange={set("cc")} />
          </label>
          <label className="mx-line">
            <span>Bcc</span>
            <input id={`${id}-bcc`} type="text" inputMode="email" value={d.bcc} onChange={set("bcc")} />
          </label>
        </>
      )}
      <label className="mx-line">
        <span>Subject</span>
        <input id={`${id}-subject`} type="text" dir="auto" maxLength={300} value={d.subject} onChange={set("subject")} />
      </label>
      <textarea
        id={`${id}-body`}
        className="mx-form__body"
        aria-label="Message"
        placeholder="Write your message…"
        dir="auto"
        required={!ready.length}
        value={d.body}
        onChange={set("body")}
        autoFocus={autoFocus && !!d.to}
      />
      <FileList files={files} />
      {replyTo && files.atts.length > 0 && <p className="mx-form__note">With files, the reply goes out as a new mail with the same subject.</p>}
      {failed && <p className="mx-form__note mx-form__note--err">Files marked in red will not be sent.</p>}
      <div className="mx-form__bar">
        <button className="mx-send" disabled={pending || files.uploading}>
          {pending ? "Sending…" : files.uploading ? "Uploading…" : "Send"}
          <MailIcon name="send" size={16} />
        </button>
        <button type="button" className="mx-iconbtn" title="Attach files" aria-label="Attach files" disabled={files.full} onClick={() => anyFile.current?.click()}>
          <MailIcon name="clip" />
        </button>
        <button type="button" className="mx-iconbtn" title="Add photos" aria-label="Add photos" disabled={files.full} onClick={() => photo.current?.click()}>
          <MailIcon name="image" />
        </button>
        <small className="mx-form__hint">Up to 10 files, 20 MB each, or drop them here</small>
        {onDiscard && (
          <button type="button" className="mx-iconbtn mx-form__discard" title="Discard" aria-label="Discard" onClick={onDiscard}>
            <MailIcon name="trash" />
          </button>
        )}
        <input ref={anyFile} id={`${id}-files`} type="file" multiple hidden onChange={pick} />
        <input ref={photo} id={`${id}-photos`} type="file" accept="image/*" multiple hidden onChange={pick} />
      </div>
    </form>
  );
}

/* ---------------- the pop-up window and the "+" button ---------------- */

type Ctx = { open: (prefill?: Partial<Draft>) => void };
const ComposeCtx = createContext<Ctx>({ open: () => {} });

/** Holds the Gmail-style pop-up composer for every Admin › Mail page. */
export function ComposeProvider({ fromOptions, start, children }: { fromOptions: string[]; start?: Partial<Draft> | null; children: React.ReactNode }) {
  const [win, setWin] = useState<{ key: number; prefill: Partial<Draft> } | null>(start ? { key: 1, prefill: start } : null);
  const [size, setSize] = useState<"normal" | "min" | "max">("normal");
  const dirty = useRef(false);
  const onDirty = useCallback((v: boolean) => {
    dirty.current = v;
  }, []);
  const open = useCallback((prefill: Partial<Draft> = {}) => {
    if (win && dirty.current && !window.confirm("Discard the mail you are writing?")) return setSize("normal");
    dirty.current = false;
    setSize("normal");
    setWin({ key: Date.now(), prefill });
  }, [win]);
  const close = (ask: boolean) => {
    if (ask && dirty.current && !window.confirm("Discard this mail?")) return;
    dirty.current = false;
    setWin(null);
  };
  return (
    <ComposeCtx.Provider value={{ open }}>
      {children}
      {win && (
        <section className={`mx-compose mx-compose--${size}`} role="dialog" aria-label="New message">
          <header className="mx-compose__head" onClick={() => size === "min" && setSize("normal")}>
            <b>New message</b>
            <span className="mx-compose__tools" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="mx-iconbtn" title={size === "min" ? "Open" : "Minimise"} aria-label={size === "min" ? "Open" : "Minimise"} onClick={() => setSize(size === "min" ? "normal" : "min")}>
                <MailIcon name="minus" size={16} />
              </button>
              <button type="button" className="mx-iconbtn mx-compose__max" title={size === "max" ? "Smaller" : "Full screen"} aria-label={size === "max" ? "Smaller" : "Full screen"} onClick={() => setSize(size === "max" ? "normal" : "max")}>
                <MailIcon name={size === "max" ? "shrink" : "expand"} size={16} />
              </button>
              <button type="button" className="mx-iconbtn" title="Close" aria-label="Close" onClick={() => close(true)}>
                <MailIcon name="close" size={16} />
              </button>
            </span>
          </header>
          <div className="mx-compose__body" hidden={size === "min"}>
            <ComposeForm key={win.key} id="w" fromOptions={fromOptions} initial={win.prefill} autoFocus onDirty={onDirty} onSent={() => close(false)} onDiscard={() => close(true)} />
          </div>
        </section>
      )}
    </ComposeCtx.Provider>
  );
}

export const useCompose = () => useContext(ComposeCtx);

/** "+ New message" at the top of the folder list, and the round "+" button on phones. */
export function ComposeButton({ variant }: { variant: "rail" | "fab" }) {
  const { open } = useCompose();
  return variant === "rail" ? (
    <button type="button" className="mx-new" onClick={() => open()}>
      <MailIcon name="plus" size={20} />
      New message
    </button>
  ) : (
    <button type="button" className="mx-fab" aria-label="New message" title="New message" onClick={() => open()}>
      <MailIcon name="plus" size={26} />
    </button>
  );
}

/** Under an open mail: Reply opens the answer form in place (Gmail's inline reply). */
export function ReplyBox({ fromOptions, initial, replyTo }: { fromOptions: string[]; initial: Partial<Draft>; replyTo: string }) {
  const [open, setOpen] = useState(false);
  const dirty = useRef(false);
  const onDirty = useCallback((v: boolean) => {
    dirty.current = v;
  }, []);
  if (!open)
    return (
      <div className="mx-replybar">
        <button type="button" className="mx-pill" onClick={() => setOpen(true)}>
          <MailIcon name="reply" size={16} />
          Reply
        </button>
      </div>
    );
  return (
    <div className="mx-reply">
      <ComposeForm
        id="r"
        fromOptions={fromOptions}
        initial={initial}
        replyTo={replyTo}
        autoFocus
        onDirty={onDirty}
        onSent={() => setOpen(false)}
        onDiscard={() => (!dirty.current || window.confirm("Discard this reply?")) && setOpen(false)}
      />
    </div>
  );
}
