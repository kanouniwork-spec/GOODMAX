import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/session";
import { db, mediaStorage, newId } from "@/lib/data";
import type { MediaItem } from "@/types/content";

const ALLOWED: Record<string, number> = {
  "image/png": 15,
  "image/jpeg": 15,
  "image/webp": 15,
  "image/svg+xml": 2,
  "video/mp4": 200,
  "video/webm": 200,
};

/** Upload (multipart: file, optional alt_en/alt_fr/alt_ar). PNG transparency is preserved: bytes are stored as-is. */
export async function POST(req: Request) {
  try {
    await authorize("media.write");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  const maxMb = ALLOWED[file.type];
  if (!maxMb) return NextResponse.json({ error: `Unsupported type ${file.type || "unknown"}. Use PNG, JPG, WebP, SVG, MP4 or WebM.` }, { status: 415 });
  if (file.size > maxMb * 1024 * 1024) return NextResponse.json({ error: `File is larger than ${maxMb} MB` }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "image/svg+xml") {
    const txt = new TextDecoder().decode(bytes);
    if (/<script|on\w+\s*=|javascript:/i.test(txt)) return NextResponse.json({ error: "SVG contains scripts and was rejected" }, { status: 400 });
  }
  const stored = await mediaStorage().put(file.name, file.type, bytes);
  const item: MediaItem = {
    id: newId("media"),
    file_name: file.name,
    storage_path: stored.storage_path,
    public_url: stored.public_url,
    mime_type: file.type,
    size_bytes: file.size,
    alt_json: {
      en: String(form.get("alt_en") ?? ""),
      fr: String(form.get("alt_fr") ?? ""),
      ar: String(form.get("alt_ar") ?? ""),
    },
    created_at: new Date().toISOString(),
  };
  await db().insert("media_library", item);
  return NextResponse.json(item);
}
