import { authorize } from "@/lib/auth/session";
import { downloadAttachment } from "@/lib/zoho/mail";
import { safeFileName } from "@/lib/zoho/uploads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IMAGES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
const id = (v: string | null) => (v && /^\d{1,30}$/.test(v) ? v : null);

/** A file attached to a received mail: ?account&folder&id&att&name, plus &view=1 to show a photo instead of saving it. */
export async function GET(req: Request) {
  try {
    await authorize("mail.manage");
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  const q = new URL(req.url).searchParams;
  const [account, folder, message, att] = [id(q.get("account")), id(q.get("folder")), id(q.get("id")), id(q.get("att"))];
  if (!account || !folder || !message || !att) return new Response("Bad request", { status: 400 });
  const name = safeFileName(q.get("name") ?? "attachment");
  const image = IMAGES[name.split(".").pop()?.toLowerCase() ?? ""];
  const view = q.get("view") === "1" && !!image;
  try {
    const upstream = await downloadAttachment(account, folder, message, att);
    return new Response(upstream.body, {
      headers: {
        "Content-Type": view ? image : "application/octet-stream",
        "Content-Disposition": `${view ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=300",
        ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length")! } : {}),
      },
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Error", { status: 502 });
  }
}
