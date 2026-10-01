"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import type { Wilaya } from "@/types/content";
import { saveRecord } from "@/app/admin/actions";
import { Switch, useAct, useAdmin } from "./ui";

/** Edit the administrative dataset: names (EN/FR/AR), coordinates, municipalities, active flag. */
export function WilayaEditor({ wilayas, target }: { wilayas: Wilaya[]; target: number }) {
  const [rows, setRows] = useState(wilayas);
  const [open, setOpen] = useState<string | null>(null);
  const { run, pending } = useAct();
  const { readOnly } = useAdmin();
  const upd = (id: string, patch: Partial<Wilaya>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const save = (w: Wilaya) =>
    run(
      () =>
        saveRecord("wilayas", w.id, {
          name_json: w.name_json,
          municipalities: w.municipalities.map((m) => m.trim()).filter(Boolean),
          latitude: w.latitude,
          longitude: w.longitude,
          active: w.active,
        }),
      `Wilaya ${w.code} saved`,
    );
  const pending59 = rows.filter((r) => !r.active).length;
  return (
    <>
      <div className="a-top">
        <div>
          <Link href="/admin/locations" className="muted" style={{ textDecoration: "none" }}>
            ← Locations
          </Link>
          <h1 style={{ marginTop: 6 }}>Wilaya dataset</h1>
          <p>
            Target: {target} wilayas. Used by the distributor form, locations and the network map. Paste municipalities one per line to turn the
            municipality field into a list for that wilaya.
          </p>
        </div>
      </div>
      {pending59 > 0 && (
        <div className="a-alert">
          {pending59} wilayas (codes without names) are inactive and hidden from the form until their official names are entered and they are switched on.
          They were left blank on purpose rather than guessed.
        </div>
      )}
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>English</th>
              <th>Français</th>
              <th>العربية</th>
              <th>Municipalities</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <Fragment key={w.id}>
                <tr>
                  <td className="mono">{String(w.code).padStart(2, "0")}</td>
                  {(["en", "fr", "ar"] as const).map((l) => (
                    <td key={l}>
                      <input
                        className="a-input"
                        dir={l === "ar" ? "rtl" : "ltr"}
                        readOnly={readOnly}
                        value={w.name_json[l] ?? ""}
                        onChange={(e) => upd(w.id, { name_json: { ...w.name_json, [l]: e.target.value } })}
                        aria-label={`Wilaya ${w.code} ${l}`}
                      />
                    </td>
                  ))}
                  <td>
                    <button type="button" className="a-btn a-btn--sm" onClick={() => setOpen(open === w.id ? null : w.id)}>
                      {w.municipalities.length || "Add"}
                    </button>
                  </td>
                  <td>
                    <Switch checked={w.active} disabled={readOnly} onChange={(v) => upd(w.id, { active: v })} label={`Active ${w.code}`} />
                  </td>
                  <td>
                    {!readOnly && (
                      <button type="button" className="a-btn a-btn--sm a-btn--primary" disabled={pending} onClick={() => save(w)}>
                        Save
                      </button>
                    )}
                  </td>
                </tr>
                {open === w.id && (
                  <tr>
                    <td />
                    <td colSpan={3}>
                      <div className="a-field">
                        <label>Municipalities (one per line)</label>
                        <textarea
                          readOnly={readOnly}
                          rows={8}
                          value={w.municipalities.join("\n")}
                          onChange={(e) => upd(w.id, { municipalities: e.target.value.split("\n") })}
                        />
                      </div>
                    </td>
                    <td colSpan={3}>
                      <div className="a-field">
                        <label>Latitude</label>
                        <input type="number" readOnly={readOnly} value={w.latitude ?? ""} onChange={(e) => upd(w.id, { latitude: e.target.value === "" ? null : Number(e.target.value) })} />
                      </div>
                      <div className="a-field">
                        <label>Longitude</label>
                        <input type="number" readOnly={readOnly} value={w.longitude ?? ""} onChange={(e) => upd(w.id, { longitude: e.target.value === "" ? null : Number(e.target.value) })} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
