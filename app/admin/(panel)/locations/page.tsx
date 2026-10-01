import Link from "next/link";
import { db } from "@/lib/data";
import { loc } from "@/lib/i18n";
import { RecordList } from "@/components/admin/records";

export default async function Locations() {
  const [locations, wilayas, general] = await Promise.all([db().list("locations"), db().list("wilayas"), db().getSetting("general")]);
  const named = wilayas.filter((w) => w.active && loc(w.name_json, "en")).length;
  return (
    <>
      <div className="a-top">
        <div>
          <h1>Locations & Maps</h1>
          <p>Distributors, points of sale, offices and factory. Locations with coordinates appear on the map and light up their wilaya on the network visual.</p>
        </div>
        <div className="a-actions">
          <Link className="a-btn" href="/admin/locations/wilayas">
            Wilaya dataset ({named}/{general.wilaya_target})
          </Link>
          <Link className="a-btn a-btn--primary" href="/admin/locations/new">
            + New location
          </Link>
        </div>
      </div>
      <RecordList
        collection="locations"
        editBase="/admin/locations"
        rows={locations.map((l) => {
          const w = wilayas.find((x) => x.id === l.wilaya);
          return {
            id: l.id,
            title: loc(l.name_json, "en"),
            sub: `${l.location_type} · ${w ? loc(w.name_json, "en") : "no wilaya"}${l.latitude != null ? "" : " · no coordinates"}`,
            visible: l.visible,
          };
        })}
      />
    </>
  );
}
