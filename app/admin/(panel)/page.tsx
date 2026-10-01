import Link from "next/link";
import { db } from "@/lib/data";
import { hasText } from "@/lib/i18n";
import { hasUnpublishedChanges } from "@/lib/content/publish";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const sp = await searchParams;
  const store = db();
  const [requests, messages, sections, brands, products, locations, wilayas, general, media, socials] = await Promise.all([
    store.list("distributor_requests"),
    store.list("contact_messages"),
    store.list("page_sections"),
    store.list("brands"),
    store.list("products"),
    store.list("locations"),
    store.list("wilayas"),
    store.getSetting("general"),
    store.list("media_library"),
    store.list("social_links"),
  ]);
  const placeholders = [...sections, ...brands, ...products].filter((r) => r.is_placeholder).length;
  const unpublished =
    sections.filter((s) => hasUnpublishedChanges("page_sections", s as never)).length +
    brands.filter((b) => hasUnpublishedChanges("brands", b as never)).length +
    products.filter((p) => hasUnpublishedChanges("products", p as never)).length;
  const missing: string[] = [];
  if (!general.general_email) missing.push("General contact email (Site Settings)");
  if (!general.phone) missing.push("Phone number (Site Settings)");
  if (!hasText(general.address_json)) missing.push("Company / factory address (Site Settings)");
  const pendingW = wilayas.filter((w) => !w.active || !hasText(w.name_json)).length;
  if (pendingW) missing.push(`${pendingW} of ${general.wilaya_target} wilayas still need their official names (Locations › Wilaya dataset)`);
  if (!media.some((m) => m.mime_type === "image/png" && !m.file_name.startsWith("goodmax-logo")))
    missing.push("A transparent product PNG (Media Library) — product cards currently use stills from the video");
  if (!socials.some((s) => s.visible)) missing.push("Social media links (Social Links)");
  if (!locations.length) missing.push("Distributor / point-of-sale locations (Locations & Maps)");
  const recent = requests.slice(0, 5);
  return (
    <>
      {sp.denied && <div className="a-alert a-alert--err">Your role does not have access to that page.</div>}
      <div className="a-top">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of content, requests and what GOODMAX still needs to supply.</p>
        </div>
      </div>
      <div className="a-grid" style={{ marginBottom: 16 }}>
        {[
          ["New distributor requests", requests.filter((r) => r.status === "new").length, "/admin/requests"],
          ["New contact messages", messages.filter((m) => m.status === "new").length, "/admin/requests?tab=messages"],
          ["Unpublished changes", unpublished, "/admin/publishing"],
          ["Placeholder items to replace", placeholders, "/admin/publishing?filter=placeholder"],
          ["Published products", products.filter((p) => p.published_snapshot && p.visible).length, "/admin/products"],
          ["Locations", locations.length, "/admin/locations"],
        ].map(([label, n, href]) => (
          <Link key={String(label)} href={String(href)} className="a-card a-stat" style={{ textDecoration: "none" }}>
            <b>{n}</b>
            <span>{label}</span>
          </Link>
        ))}
      </div>
      {missing.length > 0 && (
        <div className="a-alert">
          <b>Still needed from GOODMAX</b>
          <ul>
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="a-card">
        <h2>Latest distributor requests</h2>
        {recent.length === 0 ? (
          <p className="muted">No requests yet.</p>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <b>{r.company}</b>
                      <div className="muted">{r.full_name}</div>
                    </td>
                    <td>{wilayas.find((w) => w.id === r.wilaya)?.name_json.fr ?? r.wilaya}</td>
                    <td>
                      <span className="badge">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
