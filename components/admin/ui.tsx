"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Locale, LocalizedText, MediaItem } from "@/types/content";
import { LOCALES } from "@/types/content";
import type { Field } from "@/lib/sections/schema";
import type { ActionResult } from "@/app/admin/actions";
import { draftTranslation } from "@/app/admin/actions";

/* ------------------------------------------------------------------ */
/* Toasts + action helper                                              */
/* ------------------------------------------------------------------ */

type Toast = { id: number; text: string; error?: boolean };
const ToastCtx = createContext<(text: string, error?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function AdminProviders({ children, canTranslate, readOnly }: { children: React.ReactNode; canTranslate: boolean; readOnly: boolean }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, error?: boolean) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), error ? 7000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      <AdminCtx.Provider value={{ canTranslate, readOnly }}>
        {children}
        <div aria-live="polite">
          {toasts.map((t, i) => (
            <div key={t.id} className={`a-toast${t.error ? " a-toast--err" : ""}`} style={{ bottom: 20 + i * 52 }} role={t.error ? "alert" : "status"}>
              {t.text}
            </div>
          ))}
        </div>
      </AdminCtx.Provider>
    </ToastCtx.Provider>
  );
}

const AdminCtx = createContext({ canTranslate: false, readOnly: false });
export const useAdmin = () => useContext(AdminCtx);

/** Runs a server action, shows a toast, refreshes server data. */
export function useAct() {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = useCallback(
    <T,>(fn: () => Promise<ActionResult<T>>, success?: string, after?: (data: T | undefined) => void) =>
      new Promise<boolean>((resolve) =>
        start(async () => {
          const res = await fn();
          if (res.ok) {
            if (success) toast(success);
            after?.(res.data);
            router.refresh();
            resolve(true);
          } else {
            toast(res.error, true);
            resolve(false);
          }
        }),
      ),
    [toast, router],
  );
  return { run, pending };
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  const btn = (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" disabled={disabled} onClick={() => onChange(!checked)} />
  );
  if (!label) return btn;
  return (
    <span className="switch-label">
      {btn}
      <span onClick={() => !disabled && onChange(!checked)}>{label}</span>
    </span>
  );
}

export function Confirm({
  children,
  message,
  onConfirm,
  className = "a-btn a-btn--sm a-btn--danger",
  disabled,
}: {
  children: React.ReactNode;
  message: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button type="button" className={className} disabled={disabled} onClick={() => window.confirm(message) && onConfirm()}>
      {children}
    </button>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="a-modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-modal" role="dialog" aria-modal="true" aria-label={title} style={wide ? { width: "min(1100px,100%)" } : undefined}>
        <div className="a-modal__head">
          <b>{title}</b>
          <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="a-modal__body">{children}</div>
      </div>
    </div>
  );
}

export function LocaleDots({ value }: { value: LocalizedText | undefined }) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {LOCALES.map((l) => (
        <span key={l} title={`${l.toUpperCase()}: ${value?.[l]?.trim() ? "filled" : "missing"}`} className={`dot ${value?.[l]?.trim() ? "dot--ok" : ""}`} />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Localized input: EN / FR / AR tabs with fill status                 */
/* ------------------------------------------------------------------ */

export function LocalizedInput({
  value,
  onChange,
  multiline,
  label,
  help,
}: {
  value: LocalizedText | undefined;
  onChange: (v: LocalizedText) => void;
  multiline?: boolean;
  label: string;
  help?: string;
}) {
  const [tab, setTab] = useState<Locale>("en");
  const { canTranslate, readOnly } = useAdmin();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const v = value ?? {};
  const set = (l: Locale, text: string) => onChange({ ...v, [l]: text });
  const source: Locale | undefined = (["en", "fr", "ar"] as Locale[]).find((l) => l !== tab && v[l]?.trim());
  const draft = async () => {
    if (!source) return;
    setBusy(true);
    const res = await draftTranslation(v[source]!, source, tab);
    setBusy(false);
    if (res.ok && res.data) {
      set(tab, res.data);
      toast(`Drafted ${tab.toUpperCase()} from ${source.toUpperCase()} — review before publishing`);
    } else if (!res.ok) toast(res.error, true);
  };
  const common = {
    value: v[tab] ?? "",
    dir: tab === "ar" ? "rtl" : "ltr",
    lang: tab,
    readOnly,
    "aria-label": `${label} (${tab.toUpperCase()})`,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(tab, e.target.value),
  };
  return (
    <div className="a-field">
      <span className="a-label">{label}</span>
      <div className="a-loc">
        <div className="a-loc__tabs" role="tablist">
          {LOCALES.map((l) => (
            <button key={l} type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)}>
              <span className={`dot ${v[l]?.trim() ? "dot--ok" : ""}`} />
              {l.toUpperCase()}
            </button>
          ))}
          <span className="spacer" />
          {canTranslate && !readOnly && source && !v[tab]?.trim() && (
            <button type="button" onClick={draft} disabled={busy} title="Draft with AI from another language">
              {busy ? "Drafting…" : `Draft from ${source.toUpperCase()}`}
            </button>
          )}
        </div>
        {multiline ? <textarea {...common} rows={4} /> : <input type="text" {...common} />}
      </div>
      {help && <small>{help}</small>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Media picker                                                        */
/* ------------------------------------------------------------------ */

export function uploadFile(file: File, onProgress: (p: number) => void): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(new Error(json.error || `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.open("POST", "/api/admin/media");
    xhr.send(fd);
  });
}

export const fmtSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

let mediaCache: MediaItem[] | null = null;
const MediaListCtx = createContext<MediaItem[]>([]);
export function MediaListProvider({ media, children }: { media: MediaItem[]; children: React.ReactNode }) {
  mediaCache = media;
  return <MediaListCtx.Provider value={media}>{children}</MediaListCtx.Provider>;
}

export function MediaPreview({ url, mime, className }: { url: string; mime?: string; className?: string }) {
  const isVideo = mime ? mime.startsWith("video/") : /\.(mp4|webm)$/i.test(url);
  if (!url) return <div className={className} />;
  return isVideo ? (
    <video className={className} src={url} muted playsInline preload="metadata" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={url} alt="" />
  );
}

export function MediaField({
  value,
  onChange,
  onPicked,
  label,
  help,
}: {
  value: string;
  onChange: (v: string) => void;
  /** called only when a file is chosen or uploaded in the media library (not while typing a URL) */
  onPicked?: (v: string) => void;
  label: string;
  help?: string;
}) {
  const [open, setOpen] = useState(false);
  const { readOnly } = useAdmin();
  return (
    <div className="a-field">
      <span className="a-label">{label}</span>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <MediaPreview url={value} className="a-thumb" />
        <input type="text" className="a-input" value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} placeholder="/media/… or https://…" />
        {!readOnly && (
          <button type="button" className="a-btn" onClick={() => setOpen(true)}>
            Choose
          </button>
        )}
      </div>
      {help && <small>{help}</small>}
      {open && (
        <MediaPicker
          onClose={() => setOpen(false)}
          onPick={(m) => {
            onChange(m.public_url);
            onPicked?.(m.public_url);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

export function MediaPicker({ onPick, onClose }: { onPick: (m: MediaItem) => void; onClose: () => void }) {
  const initial = useContext(MediaListCtx);
  const [items, setItems] = useState<MediaItem[]>(initial.length ? initial : (mediaCache ?? []));
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "image" | "video">("all");
  const [progress, setProgress] = useState<number | null>(null);
  const toast = useToast();
  const filtered = items.filter(
    (m) => (kind === "all" || m.mime_type.startsWith(kind)) && (!q || m.file_name.toLowerCase().includes(q.toLowerCase())),
  );
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setProgress(0);
    try {
      const m = await uploadFile(f, setProgress);
      setItems((list) => [m, ...list]);
      toast("Uploaded");
      onPick(m);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setProgress(null);
    }
  };
  return (
    <Modal title="Media library" onClose={onClose} wide>
      <div className="a-toolbar">
        <div className="a-field">
          <label htmlFor="mp-q">Search</label>
          <input id="mp-q" type="text" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="a-field">
          <label htmlFor="mp-k">Type</label>
          <select id="mp-k" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="all">All</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
        </div>
        <label className="a-btn a-btn--primary" style={{ marginInlineStart: "auto" }}>
          Upload new
          <input type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml,video/mp4,video/webm" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {progress != null && (
        <div className="a-progress" style={{ marginBottom: 12 }}>
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <div className="a-media-grid">
        {filtered.map((m) => (
          <button key={m.id} type="button" className="a-media" onClick={() => onPick(m)}>
            <div className="a-media__preview">
              <MediaPreview url={m.public_url} mime={m.mime_type} />
            </div>
            <div className="a-media__meta">
              <b>{m.file_name}</b>
              <span>
                {m.mime_type.split("/")[1]} · {fmtSize(m.size_bytes)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Schema-driven form (sections, brands, products, locations, …)        */
/* ------------------------------------------------------------------ */

type Obj = Record<string, unknown>;

export function FieldsForm({ fields, value, onChange }: { fields: Field[]; value: Obj; onChange: (v: Obj) => void }) {
  const { readOnly } = useAdmin();
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  return (
    <>
      {fields.map((f) => {
        const v = value[f.key];
        switch (f.type) {
          case "ltext":
          case "ltextarea":
            return <LocalizedInput key={f.key} label={f.label} help={f.help} multiline={f.type === "ltextarea"} value={v as LocalizedText} onChange={(x) => set(f.key, x)} />;
          case "media":
            return <MediaField key={f.key} label={f.label} help={f.help} value={String(v ?? "")} onChange={(x) => set(f.key, x)} />;
          case "boolean":
            return (
              <div key={f.key} className="a-field">
                <Switch checked={v !== false} onChange={(x) => set(f.key, x)} label={f.label} disabled={readOnly} />
              </div>
            );
          case "number":
            return (
              <div key={f.key} className="a-field">
                <label>{f.label}</label>
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  readOnly={readOnly}
                  value={v == null || v === "" ? "" : String(v)}
                  onChange={(e) => set(f.key, e.target.value === "" ? null : Number(e.target.value))}
                />
                {f.help && <small>{f.help}</small>}
              </div>
            );
          case "select":
            return (
              <div key={f.key} className="a-field">
                <label>{f.label}</label>
                <select value={String(v ?? "")} disabled={readOnly} onChange={(e) => set(f.key, e.target.value)}>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {f.help && <small>{f.help}</small>}
              </div>
            );
          case "color":
            return (
              <div key={f.key} className="a-field">
                <label>{f.label}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="color" className="a-swatch" value={String(v || "#000000")} disabled={readOnly} onChange={(e) => set(f.key, e.target.value)} />
                  <input type="text" value={String(v ?? "")} readOnly={readOnly} onChange={(e) => set(f.key, e.target.value)} />
                </div>
              </div>
            );
          case "items":
            return <ItemsField key={f.key} field={f} value={(v as Obj[]) ?? []} onChange={(x) => set(f.key, x)} />;
          default:
            return (
              <div key={f.key} className="a-field">
                <label>{f.label}</label>
                <input type={f.type === "url" ? "text" : "text"} readOnly={readOnly} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} />
                {f.help && <small>{f.help}</small>}
              </div>
            );
        }
      })}
    </>
  );
}

function itemTitle(item: Obj) {
  for (const k of ["title", "title_json", "year", "label", "label_json", "caption", "alt_json", "url", "image_url"]) {
    const v = item[k];
    if (typeof v === "string" && v) return v;
    if (v && typeof v === "object") {
      const t = (v as LocalizedText).en || (v as LocalizedText).fr || (v as LocalizedText).ar;
      if (t) return t;
    }
  }
  return "";
}

function ItemsField({ field, value, onChange }: { field: Extract<Field, { type: "items" }>; value: Obj[]; onChange: (v: Obj[]) => void }) {
  const { readOnly } = useAdmin();
  const [open, setOpen] = useState<number | null>(value.length ? null : null);
  const ids = useMemo(() => value.map((it, i) => String(it.id ?? `i${i}`)), [value]);
  const add = () => {
    const blank: Obj = { id: Math.random().toString(36).slice(2, 10) };
    for (const f of field.fields) {
      blank[f.key] = f.type === "ltext" || f.type === "ltextarea" ? {} : f.type === "boolean" ? true : f.type === "items" ? [] : f.type === "select" ? f.options[0]?.value : "";
    }
    onChange([...value, blank]);
    setOpen(value.length);
  };
  return (
    <div className="a-field">
      <span className="a-label">{field.label}</span>
      <SortableList
        ids={ids}
        disabled={readOnly}
        onReorder={(next) => onChange(next.map((id) => value[ids.indexOf(id)]))}
        render={(id, handle) => {
          const i = ids.indexOf(id);
          const item = value[i];
          return (
            <div className="a-item">
              <div className="a-item__head">
                {handle}
                <span className="grow">
                  {field.itemLabel} {i + 1}
                  {itemTitle(item) && <span className="muted"> — {itemTitle(item)}</span>}
                </span>
                <button type="button" className="a-btn a-btn--sm" onClick={() => setOpen(open === i ? null : i)}>
                  {open === i ? "Close" : "Edit"}
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    className="a-btn a-btn--sm a-btn--danger"
                    onClick={() => window.confirm(`Remove ${field.itemLabel.toLowerCase()} ${i + 1}?`) && onChange(value.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                )}
              </div>
              {open === i && (
                <div className="a-item__body">
                  <FieldsForm fields={field.fields} value={item} onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))} />
                </div>
              )}
            </div>
          );
        }}
      />
      {!readOnly && (
        <div>
          <button type="button" className="a-btn a-btn--sm" onClick={add}>
            + Add {field.itemLabel.toLowerCase()}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sortable list (@dnd-kit) — persists through the onReorder callback    */
/* ------------------------------------------------------------------ */

function SortableRow({ id, render, disabled }: { id: string; render: (id: string, handle: React.ReactNode) => React.ReactNode; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const handle = disabled ? null : (
    <button type="button" className="handle" aria-label="Drag to reorder" {...attributes} {...listeners}>
      ⋮⋮
    </button>
  );
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 5 : undefined, position: "relative" }}>
      {render(id, handle)}
    </div>
  );
}

export function SortableList({
  ids,
  onReorder,
  render,
  disabled,
}: {
  ids: string[];
  onReorder: (ids: string[]) => void;
  render: (id: string, handle: React.ReactNode) => React.ReactNode;
  disabled?: boolean;
}) {
  const dndId = useId();
  const [order, setOrder] = useState(ids);
  const key = ids.join("|");
  const last = useRef(key);
  if (last.current !== key) {
    last.current = key;
    setOrder(ids);
  }
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const end = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(order, order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id)));
    setOrder(next);
    onReorder(next);
  };
  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="a-list">
          {order.map((id) => (
            <SortableRow key={id} id={id} render={render} disabled={disabled} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* ------------------------------------------------------------------ */
/* Publish status helpers                                              */
/* ------------------------------------------------------------------ */

export function StatusBadge({ published, changed }: { published: boolean; changed: boolean }) {
  if (!published) return <span className="badge badge--warn">Draft · not published</span>;
  if (changed) return <span className="badge badge--blue">Published · unpublished changes</span>;
  return <span className="badge badge--ok">Published</span>;
}

export function LocaleStatusRow({ status }: { status: Record<Locale, { missing: number; total: number; changed: boolean; published: boolean }> }) {
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      {LOCALES.map((l) => {
        const s = status[l];
        const cls = !s.published ? "badge--warn" : s.missing ? "badge--danger" : s.changed ? "badge--blue" : "badge--ok";
        const txt = !s.published ? "draft" : s.missing ? `${s.missing} missing` : s.changed ? "changed" : "published";
        return (
          <span key={l} className={`badge ${cls}`} title={`${l.toUpperCase()}: ${s.total - s.missing}/${s.total} fields filled`}>
            {l.toUpperCase()} {txt}
          </span>
        );
      })}
    </span>
  );
}
