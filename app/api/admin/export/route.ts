import { authorize } from "@/lib/auth/session";
import { db } from "@/lib/data";

const esc = (v: unknown) => {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  // neutralise spreadsheet formula injection
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** CSV export of distributor requests or contact messages, honouring the inbox filters. */
export async function GET(req: Request) {
  try {
    await authorize("read");
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "messages" ? "contact_messages" : "distributor_requests";
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const status = url.searchParams.get("status") ?? "";
  const wilaya = url.searchParams.get("wilaya") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const wilayas = await db().list("wilayas");
  let rows = (await db().list(type)) as unknown as Record<string, unknown>[];
  rows = rows.filter(
    (r) =>
      (!q || JSON.stringify(r).toLowerCase().includes(q)) &&
      (!status || r.status === status) &&
      (!wilaya || r.wilaya === wilaya) &&
      (!from || String(r.created_at) >= from) &&
      (!to || String(r.created_at).slice(0, 10) <= to),
  );
  const cols =
    type === "distributor_requests"
      ? ["created_at", "status", "full_name", "company", "email", "phone", "city", "wilaya", "municipality", "commercial_register", "interested_brand", "extra_json", "internal_notes", "locale", "source", "utm_json"]
      : ["created_at", "status", "full_name", "email", "phone", "subject", "message", "internal_notes", "locale", "source"];
  const lines = [cols.join(",")];
  for (const r of rows) {
    lines.push(
      cols
        .map((c) => {
          if (c === "wilaya") {
            const w = wilayas.find((x) => x.id === r.wilaya);
            return esc(w ? `${String(w.code).padStart(2, "0")} ${w.name_json.fr ?? w.name_json.en ?? ""}` : r.wilaya);
          }
          return esc(r[c]);
        })
        .join(","),
    );
  }
  const name = `${type === "distributor_requests" ? "distributor-requests" : "contact-messages"}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
}
