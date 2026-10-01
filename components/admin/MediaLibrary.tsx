"use client";

import { useState } from "react";
import type { LocalizedText, MediaItem } from "@/types/content";
import { deleteRecord, mediaUsage, replaceMediaReferences, saveRecord } from "@/app/admin/actions";
import { fmtSize, LocalizedInput, MediaPreview, useAct, useAdmin, useToast, uploadFile } from "./ui";
import { useRouter } from "next/navigation";

export function MediaLibrary({ items }: { items: MediaItem[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "image" | "video">("all");
  const [sel, setSel] = useState<string | null>(null);
  const [uploads, setUploads] = useState<{ name: string; p: number }[]>([]);
  const toast = useToast();
  const router = useRouter();
  const { readOnly } = useAdmin();
  const filtered = items.filter((m) => (kind === "all" || m.mime_type.startsWith(kind)) && (!q || m.file_name.toLowerCase().includes(q.toLowerCase())));
  const selected = items.find((m) => m.id === sel);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      setUploads((u) => [...u, { name: f.name, p: 0 }]);
      try {
        await uploadFile(f, (p) => setUploads((u) => u.map((x) => (x.name === f.name ? { ...x, p } : x))));
        toast(`Uploaded ${f.name}`);
      } catch (e) {
        toast(`${f.name}: ${(e as Error).message}`, true);
      } finally {
        setUploads((u) => u.filter((x) => x.name !== f.name));
      }
    }
    router.refresh();
  };

  return (
    <>
      <div className="a-top">
        <div>
          <h1>Media Library</h1>
          <p>PNG, JPG, WebP, SVG, MP4 and WebM. Files are stored exactly as uploaded, so transparent PNGs keep their transparency.</p>
        </div>
        {!readOnly && (
          <label className="a-btn a-btn--primary">
            Upload files
            <input type="file" multiple hidden accept="image/png,image/jpeg,image/webp,image/svg+xml,video/mp4,video/webm" onChange={(e) => onFiles(e.target.files)} />
          </label>
        )}
      </div>
      {uploads.map((u) => (
        <div key={u.name} style={{ marginBottom: 8 }}>
          <small>{u.name}</small>
          <div className="a-progress">
            <i style={{ width: `${Math.round(u.p * 100)}%` }} />
          </div>
        </div>
      ))}
      <div className="a-toolbar">
        <div className="a-field" style={{ flex: 1 }}>
          <label htmlFor="mq">Search</label>
          <input id="mq" type="text" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="a-field">
          <label htmlFor="mk">Type</label>
          <select id="mk" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="all">All</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
        </div>
      </div>
      <div className="a-split">
        <div className="a-media-grid">
          {filtered.map((m) => (
            <button key={m.id} type="button" className="a-media" aria-pressed={m.id === sel} onClick={() => setSel(m.id)}>
              <div className="a-media__preview">
                <MediaPreview url={m.public_url} mime={m.mime_type} />
              </div>
              <div className="a-media__meta">
                <b>{m.file_name}</b>
                <span>
                  {m.mime_type.split("/")[1]} · {fmtSize(m.size_bytes)} {m.bundled ? "· bundled" : ""}
                </span>
              </div>
            </button>
          ))}
        </div>
        <aside>{selected ? <Details key={selected.id} item={selected} onDeleted={() => setSel(null)} /> : <div className="a-card muted">Select a file to see details.</div>}</aside>
      </div>
    </>
  );
}

function Details({ item, onDeleted }: { item: MediaItem; onDeleted: () => void }) {
  const [alt, setAlt] = useState<LocalizedText>(item.alt_json);
  const [usage, setUsage] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const { run } = useAct();
  const toast = useToast();
  const { readOnly } = useAdmin();
  const check = async () => {
    const u = await mediaUsage(item.public_url);
    setUsage(u);
    return u;
  };
  const del = async () => {
    const u = await check();
    const msg = u.length ? `This file is used in:\n• ${u.join("\n• ")}\n\nDelete anyway? Those places will show a broken file.` : "Delete this file permanently?";
    if (window.confirm(msg)) run(() => deleteRecord("media_library", item.id), "Deleted", onDeleted);
  };
  const replace = async (f: File | undefined) => {
    if (!f) return;
    setProgress(0);
    try {
      const m = await uploadFile(f, setProgress);
      await run(() => replaceMediaReferences(item.public_url, m.public_url), "Replaced everywhere it was used");
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setProgress(null);
    }
  };
  const abs = typeof window !== "undefined" ? new URL(item.public_url, window.location.origin).toString() : item.public_url;
  return (
    <div className="a-card">
      <div className="a-media__preview" style={{ borderRadius: 10, marginBottom: 12 }}>
        {item.mime_type.startsWith("video") ? <video src={item.public_url} controls muted playsInline /> : <MediaPreview url={item.public_url} mime={item.mime_type} />}
      </div>
      <p style={{ wordBreak: "break-all" }}>
        <b>{item.file_name}</b>
      </p>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
        {item.mime_type} · {fmtSize(item.size_bytes)} · {new Date(item.created_at).toLocaleDateString()}
      </p>
      <div className="a-actions" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className="a-btn a-btn--sm"
          onClick={() => {
            navigator.clipboard.writeText(abs);
            toast("URL copied");
          }}
        >
          Copy URL
        </button>
        <button type="button" className="a-btn a-btn--sm" onClick={check}>
          Where is it used?
        </button>
      </div>
      {usage && (
        <div className={`a-alert ${usage.length ? "" : "a-alert--info"}`}>
          {usage.length ? (
            <>
              In use:
              <ul>
                {usage.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </>
          ) : (
            "Not referenced anywhere."
          )}
        </div>
      )}
      <LocalizedInput label="Alt text" value={alt} onChange={setAlt} />
      {!readOnly && (
        <div className="a-actions">
          <button type="button" className="a-btn a-btn--primary a-btn--sm" onClick={() => run(() => saveRecord("media_library", item.id, { alt_json: alt }), "Alt text saved")}>
            Save alt text
          </button>
          <label className="a-btn a-btn--sm">
            Replace…
            <input type="file" hidden accept={item.mime_type} onChange={(e) => replace(e.target.files?.[0])} />
          </label>
          {!item.bundled && (
            <button type="button" className="a-btn a-btn--sm a-btn--danger" onClick={del}>
              Delete
            </button>
          )}
        </div>
      )}
      {progress != null && (
        <div className="a-progress" style={{ marginTop: 10 }}>
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
