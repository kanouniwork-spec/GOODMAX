import { notFound } from "next/navigation";
import { db } from "@/lib/data";
import { loc } from "@/lib/i18n";
import { locationFields } from "@/lib/admin/schemas";
import { RecordEditor } from "@/components/admin/records";

export default async function EditLocation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wilayas = (await db().list("wilayas"))
    .filter((w) => w.active)
    .map((w) => ({ value: w.id, label: `${String(w.code).padStart(2, "0")} — ${loc(w.name_json, "en")}` }));
  const fields = locationFields(wilayas);
  const row: Record<string, unknown> | null =
    id === "new"
      ? { name_json: {}, location_type: "distributor", wilaya: "", municipality: "", address_json: {}, latitude: null, longitude: null, phone: "", email: "", maps_url: "", hours_json: {}, visible: true }
      : ((await db().get("locations", id)) as unknown as Record<string, unknown> | null);
  if (!row) notFound();
  return (
    <RecordEditor
      collection="locations"
      id={id === "new" ? null : id}
      fields={fields}
      initial={row as never}
      backHref="/admin/locations"
      title={id === "new" ? "New location" : loc((row as { name_json: Record<string, string> }).name_json, "en") || "Location"}
    />
  );
}
