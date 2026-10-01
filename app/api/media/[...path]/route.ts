import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { dataDir } from "@/lib/data/file-store";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

/** Serves files uploaded through the Media Library when the file backend is active (supports Range for video). */
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const name = path.basename((await params).path.join("/"));
  const file = path.join(dataDir(), "uploads", name);
  let stat;
  try {
    stat = await fs.stat(file);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const type = TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  if (type === "image/svg+xml") headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'";
  const range = req.headers.get("range");
  const fh = await fs.open(file, "r");
  try {
    if (range) {
      const m = range.match(/bytes=(\d*)-(\d*)/);
      const start = m?.[1] ? Number(m[1]) : 0;
      const end = m?.[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
      const buf = Buffer.alloc(end - start + 1);
      await fh.read(buf, 0, buf.length, start);
      return new NextResponse(buf, {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(buf.length) },
      });
    }
    const buf = await fh.readFile();
    return new NextResponse(buf, { headers: { ...headers, "Content-Length": String(stat.size) } });
  } finally {
    await fh.close();
  }
}
